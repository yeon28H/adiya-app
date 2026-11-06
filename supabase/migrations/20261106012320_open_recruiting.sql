-- 모집 중인 모임 공개 목록: 모르는 사람도 목록에서 골라 바로 참여할 수 있게 한다.

alter table public.meetings
  add column is_public    boolean not null default false,  -- 모집 중으로 공개 여부
  add column from_line    text,                            -- 출발 호선 (예: 2호선)
  add column to_line      text,                            -- 귀가 방향 호선 (예: 7호선)
  add column dest_station text,                            -- 귀가 방향 목적지 역 key
  add column dest_area    text;                            -- 목적지 방면(행정구역)

create index meetings_open_idx on public.meetings (created_at desc) where is_public;

-- ---------------------------------------------------------------
-- 모임 만들기: 공개 모집/방향 정보 추가 (시그니처 변경)
-- ---------------------------------------------------------------
drop function public.create_meeting(text, text, text, time, int, text);

create function public.create_meeting(
  p_name text, p_place text, p_place_station text, p_end_time time, p_capacity int, p_host_name text,
  p_is_public boolean default false, p_from_line text default null, p_to_line text default null,
  p_dest_station text default null, p_dest_area text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
  v_id   uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_code := public.new_meeting_code();

  insert into public.meetings
    (code, name, place, place_station, end_time, capacity, host_user_id, is_public, from_line, to_line, dest_station, dest_area)
  values
    (v_code, p_name, p_place, p_place_station, p_end_time, p_capacity, v_uid, coalesce(p_is_public, false),
     p_from_line, p_to_line, p_dest_station, p_dest_area)
  returning id into v_id;

  insert into public.members (meeting_id, user_id, name) values (v_id, v_uid, p_host_name);
  return v_code;
end $$;

revoke all on function public.create_meeting(text, text, text, time, int, text, boolean, text, text, text, text) from public, anon;
grant execute on function public.create_meeting(text, text, text, time, int, text, boolean, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------
-- 모집 중인 모임: 공개 + 정원 미달 + 최근 12시간 이내
-- ---------------------------------------------------------------
create function public.count_open_meetings() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.meetings m
   where m.is_public and m.created_at > now() - interval '12 hours'
     and (select count(*) from public.members x where x.meeting_id = m.id) < m.capacity;
$$;

create function public.list_open_meetings()
returns table (
  id uuid, name text, place text, from_line text, to_line text, dest_station text, dest_area text,
  end_time time, capacity int, member_count int, host_name text, created_at timestamptz, joined boolean
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.name, m.place, m.from_line, m.to_line, m.dest_station, m.dest_area,
         m.end_time, m.capacity,
         (select count(*)::int from public.members x where x.meeting_id = m.id),
         (select x.name from public.members x where x.meeting_id = m.id and x.user_id = m.host_user_id limit 1),
         m.created_at,
         exists (select 1 from public.members x where x.meeting_id = m.id and x.user_id = (select auth.uid()))
    from public.meetings m
   where m.is_public and m.created_at > now() - interval '12 hours'
     and ((select count(*) from public.members x where x.meeting_id = m.id) < m.capacity
          or exists (select 1 from public.members x where x.meeting_id = m.id and x.user_id = (select auth.uid())))
   order by m.created_at desc
   limit 100;
$$;

-- 목록에서 바로 참여. 반환: 모임 코드
create function public.join_public_meeting(p_meeting_id uuid, p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  m     public.meetings;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into m from public.meetings where id = p_meeting_id and is_public;
  if not found then raise exception 'meeting_not_found'; end if;

  if not exists (select 1 from public.members where meeting_id = m.id and user_id = v_uid) then
    if (select count(*) from public.members where meeting_id = m.id) >= m.capacity then
      raise exception 'meeting_full';
    end if;
    insert into public.members (meeting_id, user_id, name) values (m.id, v_uid, left(trim(p_name), 12));
    insert into public.notices (meeting_id, kind, text) values (m.id, 'info', left(trim(p_name), 12) || '님이 모임에 참여했어요.');
  end if;
  return m.code;
end $$;

revoke all on function public.count_open_meetings() from public;
revoke all on function public.list_open_meetings() from public, anon;
revoke all on function public.join_public_meeting(uuid, text) from public, anon;
-- 개수는 로그인 전에도 보여준다
grant execute on function public.count_open_meetings() to anon, authenticated;
grant execute on function public.list_open_meetings() to authenticated;
grant execute on function public.join_public_meeting(uuid, text) to authenticated;
