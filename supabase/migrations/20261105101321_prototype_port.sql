-- 프로토타입 디자인/흐름을 React+Supabase 로 옮기기 위한 스키마 보강

-- ---------------------------------------------------------------
-- 컬럼 추가
-- ---------------------------------------------------------------
alter table public.meetings
  add column place_station text not null default '',
  add column match_stale   boolean not null default false;

alter table public.members
  add column created_at  timestamptz not null default now(),
  add column check_stage int     not null default 0,
  add column near_dest   boolean not null default false,
  add column prev_status text,
  add column risk_key    text;

alter table public.members drop constraint members_group_decision_check;
alter table public.members
  add constraint members_group_decision_check check (group_decision in ('joined', 'declined'));

alter table public.match_groups
  add column n              int  not null default 1,
  add column score          int  not null default 0,
  add column shared_min     int  not null default 0,
  add column spread         int  not null default 0,
  add column split_station  text not null default '',
  add column split_district text not null default '',
  add column reasons        jsonb not null default '[]'::jsonb,
  add column pair_mode      boolean not null default false;

-- ---------------------------------------------------------------
-- create_meeting: 장소(역) 컬럼 추가로 시그니처 변경
-- ---------------------------------------------------------------
drop function public.create_meeting(text, text, time, int, text);

create function public.create_meeting(
  p_name text, p_place text, p_place_station text, p_end_time time, p_capacity int, p_host_name text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code  text;
  v_id    uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.meetings where code = v_code);
  end loop;

  insert into public.meetings (code, name, place, place_station, end_time, capacity, host_user_id)
  values (v_code, p_name, p_place, p_place_station, p_end_time, p_capacity, v_uid)
  returning id into v_id;

  insert into public.members (meeting_id, user_id, name) values (v_id, v_uid, p_host_name);
  return v_code;
end $$;

revoke all on function public.create_meeting(text, text, text, time, int, text) from public, anon;
grant execute on function public.create_meeting(text, text, text, time, int, text) to authenticated;

-- ---------------------------------------------------------------
-- 알림 추가 (같은 모임 멤버만)
-- ---------------------------------------------------------------
create function public.add_notice(
  p_meeting_id uuid, p_text text, p_group_id uuid default null, p_kind text default 'info'
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_meeting_member(p_meeting_id) then raise exception 'forbidden'; end if;
  insert into public.notices (meeting_id, group_id, kind, text)
  values (p_meeting_id, p_group_id, coalesce(p_kind, 'info'), left(p_text, 300));
end $$;

-- ---------------------------------------------------------------
-- 귀가 정보 등록/수정 (등록 후 재매칭 필요 표시)
-- ---------------------------------------------------------------
create function public.register_info(
  p_meeting_id uuid, p_origin text, p_dest text, p_depart_time time, p_mode text, p_privacy text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.members
     set origin = p_origin, dest = p_dest, depart_time = p_depart_time,
         mode = p_mode, privacy = p_privacy, registered = true
   where meeting_id = p_meeting_id and user_id = (select auth.uid());
  if not found then raise exception 'forbidden'; end if;

  update public.meetings set match_stale = (matched_at is not null) where id = p_meeting_id;
end $$;

-- ---------------------------------------------------------------
-- 매칭 결과 저장 (클라이언트 매칭 엔진이 계산한 그룹)
-- p_groups: [{ n, score, sharedMin, spread, splitStation, splitDistrict, reasons[], pairMode, memberIds[] }]
-- ---------------------------------------------------------------
create function public.save_match(p_meeting_id uuid, p_groups jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g    jsonb;
  v_id uuid;
begin
  if not public.is_meeting_member(p_meeting_id) then raise exception 'forbidden'; end if;

  delete from public.match_groups where meeting_id = p_meeting_id;

  for g in select * from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb)) loop
    insert into public.match_groups
      (meeting_id, n, score, shared_min, spread, split_station, split_district, reasons, pair_mode)
    values (
      p_meeting_id, (g->>'n')::int, (g->>'score')::int, (g->>'sharedMin')::int, (g->>'spread')::int,
      coalesce(g->>'splitStation', ''), coalesce(g->>'splitDistrict', ''),
      coalesce(g->'reasons', '[]'::jsonb), coalesce((g->>'pairMode')::boolean, false)
    ) returning id into v_id;

    insert into public.match_group_members (group_id, member_id)
    select v_id, x::uuid
      from jsonb_array_elements_text(g->'memberIds') as x
     where exists (select 1 from public.members m where m.id = x::uuid and m.meeting_id = p_meeting_id);
  end loop;

  update public.members set group_decision = null where meeting_id = p_meeting_id;
  update public.meetings set matched_at = now(), match_stale = false where id = p_meeting_id;
end $$;

-- ---------------------------------------------------------------
-- 안부 확인: 주최자가 요청 / 지정 대상(안부 확인 대상)이 응답
-- ---------------------------------------------------------------
create function public.request_check(p_member_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
begin
  select * into m from public.members where id = p_member_id;
  if not found then raise exception 'not_found'; end if;
  if not exists (select 1 from public.meetings where id = m.meeting_id and host_user_id = (select auth.uid())) then
    raise exception 'forbidden';
  end if;
  if m.status in ('arrived', 'check') then return; end if;

  update public.members set prev_status = m.status, status = 'check' where id = p_member_id;
  insert into public.notices (meeting_id, kind, text)
  values (m.meeting_id, 'warn', m.name || '님의 도착 확인이 필요해요. 안부를 물어봐 주세요.');
end $$;

create function public.resolve_check(p_member_id uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m      public.members;
  v_uid  uuid := (select auth.uid());
  v_by   text;
  v_ok   boolean;
begin
  select * into m from public.members where id = p_member_id;
  if not found then raise exception 'not_found'; end if;

  -- 호출자가 이 멤버의 안부 확인 대상인지 검사
  select name into v_by from public.members where meeting_id = m.meeting_id and user_id = v_uid;
  if m.buddy = 'host' or m.buddy is null then
    v_ok := exists (select 1 from public.meetings where id = m.meeting_id and host_user_id = v_uid);
  else
    v_ok := exists (select 1 from public.members where id::text = m.buddy and user_id = v_uid);
  end if;
  if not v_ok then raise exception 'forbidden'; end if;

  if p_action = 'arrived' then
    update public.members
       set status = 'arrived', arrived_at = now(), check_stage = 0, near_dest = false
     where id = p_member_id;
    insert into public.notices (meeting_id, kind, text)
    values (m.meeting_id, 'ok', m.name || '님이 목적지에 도착했어요.');
  else
    update public.members
       set status = case when prev_status is not null and prev_status <> 'ready' then prev_status else 'started' end,
           check_stage = 0, eta_at = now() + interval '15 minutes'
     where id = p_member_id;
    insert into public.notices (meeting_id, kind, text)
    values (m.meeting_id, 'ok', coalesce(v_by, '확인자') || '님이 ' || m.name || '님의 안부를 확인했어요. 잘 가고 있대요.');
  end if;
end $$;

-- ---------------------------------------------------------------
-- 권한
-- ---------------------------------------------------------------
revoke all on function public.add_notice(uuid, text, uuid, text)                 from public, anon;
revoke all on function public.register_info(uuid, text, text, time, text, text)  from public, anon;
revoke all on function public.save_match(uuid, jsonb)                            from public, anon;
revoke all on function public.request_check(uuid)                                from public, anon;
revoke all on function public.resolve_check(uuid, text)                          from public, anon;
grant execute on function public.add_notice(uuid, text, uuid, text)                 to authenticated;
grant execute on function public.register_info(uuid, text, text, time, text, text)  to authenticated;
grant execute on function public.save_match(uuid, jsonb)                            to authenticated;
grant execute on function public.request_check(uuid)                                to authenticated;
grant execute on function public.resolve_check(uuid, text)                          to authenticated;

-- 실시간 구독 대상 추가
alter publication supabase_realtime add table public.match_groups, public.meetings;
