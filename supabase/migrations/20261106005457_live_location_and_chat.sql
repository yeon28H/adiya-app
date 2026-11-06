-- 실시간 위치 공유 + 모임 채팅

-- ---------------------------------------------------------------
-- 위치: members.lat/lng 는 모든 멤버에게 조회돼 공개 범위를 지킬 수 없으므로 별도 테이블로 분리
-- ---------------------------------------------------------------
alter table public.members drop column lat, drop column lng;

create table public.member_locations (
  member_id   uuid primary key references public.members (id) on delete cascade,
  meeting_id  uuid not null references public.meetings (id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  accuracy    real,
  label       text,                         -- 주소 등 사람이 읽을 수 있는 위치 설명 (선택)
  updated_at  timestamptz not null default now()
);
create index member_locations_meeting_idx on public.member_locations (meeting_id);

alter table public.member_locations enable row level security;

-- 본인 위치는 항상, 다른 사람 위치는 상대가 '정확한 위치 공개'이고 공유를 중단하지 않았을 때만 조회 가능
create policy member_locations_select on public.member_locations for select to authenticated
  using (
    public.is_meeting_member(meeting_id)
    and exists (
      select 1 from public.members m
      where m.id = member_id
        and (m.user_id = (select auth.uid()) or (m.privacy = 'exact' and not m.share_stopped))
    )
  );
-- insert/update/delete 는 아래 RPC 로만 가능

create function public.set_my_location(
  p_meeting_id uuid, p_lat double precision, p_lng double precision,
  p_accuracy real default null, p_label text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_member uuid;
begin
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location';
  end if;
  select id into v_member from public.members
   where meeting_id = p_meeting_id and user_id = (select auth.uid());
  if not found then raise exception 'forbidden'; end if;

  insert into public.member_locations (member_id, meeting_id, lat, lng, accuracy, label, updated_at)
  values (v_member, p_meeting_id, p_lat, p_lng, p_accuracy, left(p_label, 120), now())
  on conflict (member_id) do update
    set lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy,
        label = coalesce(excluded.label, public.member_locations.label), updated_at = now();
end $$;

create function public.clear_my_location(p_meeting_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.member_locations
   where meeting_id = p_meeting_id
     and member_id in (select id from public.members
                        where meeting_id = p_meeting_id and user_id = (select auth.uid()));
end $$;

revoke all on function public.set_my_location(uuid, double precision, double precision, real, text) from public, anon;
revoke all on function public.clear_my_location(uuid) from public, anon;
grant execute on function public.set_my_location(uuid, double precision, double precision, real, text) to authenticated;
grant execute on function public.clear_my_location(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 채팅
-- ---------------------------------------------------------------
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.meetings (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  sender_name text not null default '',
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index messages_meeting_idx on public.messages (meeting_id, created_at desc);

alter table public.messages enable row level security;

create policy messages_select on public.messages for select to authenticated
  using (public.is_meeting_member(meeting_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_meeting_member(meeting_id));

-- 보낸 사람 이름은 클라이언트 값이 아니라 멤버 정보로 채운다 (사칭 방지)
create function public.set_message_sender() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select name into new.sender_name from public.members
   where meeting_id = new.meeting_id and user_id = new.user_id;
  if new.sender_name is null then raise exception 'forbidden'; end if;
  return new;
end $$;

create trigger messages_set_sender
  before insert on public.messages
  for each row execute function public.set_message_sender();

-- ---------------------------------------------------------------
-- 실시간 구독
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.member_locations, public.messages;
