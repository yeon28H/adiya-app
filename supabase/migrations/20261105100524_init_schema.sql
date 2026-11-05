-- 어디야? 초기 스키마
-- 프로토타입(prototype/js/store.js)의 데이터 모델을 Postgres 로 옮긴 것.
-- 사용자는 Supabase Auth(익명 로그인 포함)의 auth.uid() 로 식별한다.

-- ---------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------
create table public.meetings (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-Z0-9]{6}$'),  -- 초대 코드
  name          text not null check (char_length(name) between 1 and 40),
  place         text not null,                 -- 모임 장소 (역 이름 등)
  end_time      time,                          -- 모임 종료 예정 시각
  capacity      int  not null default 6 check (capacity between 2 and 30),
  host_user_id  uuid not null references auth.users (id) on delete cascade,
  matched_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table public.members (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid not null references public.meetings (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 20),
  registered      boolean not null default false,        -- 귀가 정보 등록 여부
  status          text not null default 'ready'
                  check (status in ('ready', 'started', 'together', 'check', 'arrived')),
  origin          text not null default '',
  dest            text not null default '',
  depart_time     time,
  mode            text not null default '지하철',
  privacy         text not null default 'area' check (privacy in ('area', 'exact', 'status')),
  share_stopped   boolean not null default false,        -- 위치 공유 중단
  arrival_notice  boolean not null default true,
  buddy           text not null default 'host',
  group_decision  text check (group_decision in ('join', 'solo')),
  plan_b          jsonb,
  lat             double precision,
  lng             double precision,
  started_at      timestamptz,
  eta_at          timestamptz,
  arrived_at      timestamptz,
  updated_at      timestamptz not null default now(),
  unique (meeting_id, user_id)
);

create table public.match_groups (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.meetings (id) on delete cascade,
  label       text,
  created_at  timestamptz not null default now()
);

create table public.match_group_members (
  group_id   uuid not null references public.match_groups (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  primary key (group_id, member_id)
);

create table public.notices (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.meetings (id) on delete cascade,
  group_id    uuid references public.match_groups (id) on delete set null,
  kind        text not null default 'info',
  text        text not null,
  created_at  timestamptz not null default now()
);

create index members_meeting_idx on public.members (meeting_id);
create index members_user_idx    on public.members (user_id);
create index notices_meeting_idx on public.notices (meeting_id, created_at desc);

-- updated_at 자동 갱신
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger members_set_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 헬퍼 (RLS 재귀 방지를 위해 security definer)
-- ---------------------------------------------------------------
create function public.is_meeting_member(p_meeting_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members
    where meeting_id = p_meeting_id and user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------
-- RLS: 같은 모임 멤버만 조회 가능
-- ---------------------------------------------------------------
alter table public.meetings            enable row level security;
alter table public.members             enable row level security;
alter table public.match_groups        enable row level security;
alter table public.match_group_members enable row level security;
alter table public.notices             enable row level security;

create policy meetings_select on public.meetings for select to authenticated
  using (public.is_meeting_member(id));
create policy meetings_update_host on public.meetings for update to authenticated
  using (host_user_id = (select auth.uid()))
  with check (host_user_id = (select auth.uid()));

create policy members_select on public.members for select to authenticated
  using (public.is_meeting_member(meeting_id));
-- 본인 행만 수정/삭제 가능 (상태/위치/설정 등)
create policy members_update_self on public.members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy members_delete_self on public.members for delete to authenticated
  using (user_id = (select auth.uid()));

create policy match_groups_select on public.match_groups for select to authenticated
  using (public.is_meeting_member(meeting_id));
create policy match_group_members_select on public.match_group_members for select to authenticated
  using (exists (
    select 1 from public.match_groups g
    where g.id = group_id and public.is_meeting_member(g.meeting_id)
  ));
create policy notices_select on public.notices for select to authenticated
  using (public.is_meeting_member(meeting_id));

-- insert 는 아래 RPC(security definer)로만 가능하도록 별도 정책을 만들지 않는다.

-- ---------------------------------------------------------------
-- RPC: 모임 만들기 / 참여하기
-- ---------------------------------------------------------------
create function public.create_meeting(
  p_name text, p_place text, p_end_time time, p_capacity int, p_host_name text
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

  insert into public.meetings (code, name, place, end_time, capacity, host_user_id)
  values (v_code, p_name, p_place, p_end_time, p_capacity, v_uid)
  returning id into v_id;

  insert into public.members (meeting_id, user_id, name) values (v_id, v_uid, p_host_name);
  return v_code;
end $$;

create function public.join_meeting(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  v_m      public.meetings;
  v_member uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_m from public.meetings
   where code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  if not found then raise exception 'meeting_not_found'; end if;

  select id into v_member from public.members
   where meeting_id = v_m.id and user_id = v_uid;
  if found then return v_m.id; end if;   -- 이미 참여 중

  if (select count(*) from public.members where meeting_id = v_m.id) >= v_m.capacity then
    raise exception 'meeting_full';
  end if;

  insert into public.members (meeting_id, user_id, name) values (v_m.id, v_uid, p_name);
  return v_m.id;
end $$;

revoke all on function public.create_meeting(text, text, time, int, text) from public, anon;
revoke all on function public.join_meeting(text, text)                    from public, anon;
grant execute on function public.create_meeting(text, text, time, int, text) to authenticated;
grant execute on function public.join_meeting(text, text)                    to authenticated;

-- 실시간 구독 (도착 상태/알림 반영)
alter publication supabase_realtime add table public.members, public.notices;
