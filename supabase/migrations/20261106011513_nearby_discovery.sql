-- 주변에서 같은 방향으로 귀가할 사람 찾기 (닉네임 + 대략적인 거리만 공개) → 초대 → 모임 자동 생성

alter table public.meetings add column kind text not null default 'regular'
  check (kind in ('regular', 'nearby'));

-- ---------------------------------------------------------------
-- 내가 올려 둔 "귀가 동행 찾는 중" 게시 (사용자당 1개, 시간이 지나면 만료)
-- 정확한 좌표·목적지는 본인만 조회 가능. 다른 사람에게는 RPC 로 거리(50m 단위)·방면만 보여준다.
-- ---------------------------------------------------------------
create table public.nearby_posts (
  id            uuid not null default gen_random_uuid() unique,
  user_id       uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 12),
  lat           double precision not null,
  lng           double precision not null,
  label         text,
  origin_key    text not null,
  dest_key      text not null,
  dest_area     text not null default '',
  dest_lat      double precision not null,
  dest_lng      double precision not null,
  bearing       real not null,
  depart_time   time not null,
  mode          text not null default '지하철',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);
create index nearby_posts_expires_idx on public.nearby_posts (expires_at);

alter table public.nearby_posts enable row level security;
create policy nearby_posts_own on public.nearby_posts for select to authenticated
  using (user_id = (select auth.uid()));

create function public.post_nearby(
  p_name text, p_lat double precision, p_lng double precision, p_label text,
  p_origin_key text, p_dest_key text, p_dest_area text,
  p_dest_lat double precision, p_dest_lng double precision, p_bearing real,
  p_depart_time time, p_mode text, p_minutes int default 60
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'invalid_location'; end if;

  insert into public.nearby_posts as n
    (user_id, display_name, lat, lng, label, origin_key, dest_key, dest_area, dest_lat, dest_lng,
     bearing, depart_time, mode, expires_at)
  values
    (v_uid, trim(p_name), p_lat, p_lng, left(p_label, 120), p_origin_key, p_dest_key, coalesce(p_dest_area, ''),
     p_dest_lat, p_dest_lng, p_bearing, p_depart_time, p_mode,
     now() + make_interval(mins => greatest(10, least(coalesce(p_minutes, 60), 180))))
  on conflict (user_id) do update set
    display_name = excluded.display_name, lat = excluded.lat, lng = excluded.lng, label = excluded.label,
    origin_key = excluded.origin_key, dest_key = excluded.dest_key, dest_area = excluded.dest_area,
    dest_lat = excluded.dest_lat, dest_lng = excluded.dest_lng, bearing = excluded.bearing,
    depart_time = excluded.depart_time, mode = excluded.mode,
    updated_at = now(), expires_at = excluded.expires_at
  returning n.id into v_id;
  return v_id;
end $$;

create function public.remove_nearby() returns void
language sql security definer set search_path = '' as $$
  delete from public.nearby_posts where user_id = (select auth.uid());
$$;

create function public.haversine_m(a_lat double precision, a_lng double precision,
                                   b_lat double precision, b_lng double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(b_lat - a_lat) / 2), 2) +
    cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)));
$$;

-- 내 게시를 기준으로 주변(반경 내) 다른 사람을 찾는다.
-- 반환: 닉네임, 거리(50m 단위), 목적지 방면(행정구역), 출발 시간, 이동 수단,
--       방향 차이(도, 5도 단위), 목적지 간 거리(km, 0.5km 단위)
create function public.find_nearby(p_radius_m int default 2000)
returns table (
  id uuid, display_name text, distance_m int, dest_area text, depart_time time, mode text,
  dir_diff int, dest_gap_km numeric, invited boolean, updated_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  me public.nearby_posts;
  v_uid uuid := (select auth.uid());
begin
  select * into me from public.nearby_posts where user_id = v_uid and expires_at > now();
  if not found then return; end if;

  return query
  select b.id, b.display_name,
         greatest(50, (round(public.haversine_m(me.lat, me.lng, b.lat, b.lng) / 50) * 50)::int),
         b.dest_area, b.depart_time, b.mode,
         (round(least(abs(me.bearing - b.bearing)::numeric, 360 - abs(me.bearing - b.bearing)::numeric) / 5) * 5)::int,
         round((public.haversine_m(me.dest_lat, me.dest_lng, b.dest_lat, b.dest_lng) / 1000 * 2))::numeric / 2,
         exists (select 1 from public.nearby_invites i
                  where i.from_user = v_uid and i.to_user = b.user_id and i.status = 'pending'),
         b.updated_at
    from public.nearby_posts b
   where b.user_id <> v_uid
     and b.expires_at > now()
     and public.haversine_m(me.lat, me.lng, b.lat, b.lng) <= greatest(100, least(coalesce(p_radius_m, 2000), 10000))
   order by public.haversine_m(me.lat, me.lng, b.lat, b.lng)
   limit 50;
end $$;

-- ---------------------------------------------------------------
-- 초대
-- ---------------------------------------------------------------
create table public.nearby_invites (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users (id) on delete cascade,
  to_user     uuid not null references auth.users (id) on delete cascade,
  meeting_id  uuid not null references public.meetings (id) on delete cascade,
  from_name   text not null,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now()
);
create index nearby_invites_to_idx   on public.nearby_invites (to_user, status);
create index nearby_invites_from_idx on public.nearby_invites (from_user, status);

alter table public.nearby_invites enable row level security;
create policy nearby_invites_party on public.nearby_invites for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

-- 모임 코드 생성 헬퍼
create function public.new_meeting_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code  text;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.meetings where code = v_code);
  end loop;
  return v_code;
end $$;

-- 게시 정보로 멤버를 등록 상태로 만든다 (출발역·목적지·시간·수단 자동 입력)
create function public.add_member_from_post(p_meeting_id uuid, p public.nearby_posts) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.members where meeting_id = p_meeting_id and user_id = p.user_id;
  if found then return v_id; end if;
  insert into public.members
    (meeting_id, user_id, name, registered, origin, dest, depart_time, mode, privacy)
  values
    (p_meeting_id, p.user_id, p.display_name, true, p.origin_key, p.dest_key, p.depart_time, p.mode, 'exact')
  returning id into v_id;
  insert into public.member_locations (member_id, meeting_id, lat, lng, label)
  values (v_id, p_meeting_id, p.lat, p.lng, p.label)
  on conflict (member_id) do nothing;
  return v_id;
end $$;

-- 주변 사람에게 함께 귀가 제안. 내가 최근에 만든 주변 모임이 있으면 거기에 초대한다.
-- 반환: 모임 코드 (보낸 사람이 바로 들어갈 수 있게)
create function public.send_nearby_invite(p_post_id uuid, p_end_time time default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := (select auth.uid());
  mine     public.nearby_posts;
  target   public.nearby_posts;
  v_m      public.meetings;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into mine from public.nearby_posts where user_id = v_uid and expires_at > now();
  if not found then raise exception 'post_required'; end if;
  select * into target from public.nearby_posts where id = p_post_id and expires_at > now();
  if not found or target.user_id = v_uid then raise exception 'target_not_found'; end if;
  if public.haversine_m(mine.lat, mine.lng, target.lat, target.lng) > 10000 then raise exception 'too_far'; end if;

  -- 이미 보낸 대기 중 초대가 있으면 그 모임을 그대로 사용
  select m.* into v_m from public.nearby_invites i
    join public.meetings m on m.id = i.meeting_id
   where i.from_user = v_uid and i.to_user = target.user_id and i.status = 'pending';

  if not found then
    -- 최근 3시간 안에 내가 만든 주변 모임 재사용
    select * into v_m from public.meetings
     where host_user_id = v_uid and kind = 'nearby' and created_at > now() - interval '3 hours'
       and (select count(*) from public.members where meeting_id = meetings.id) < capacity
     order by created_at desc limit 1;

    if not found then
      insert into public.meetings (code, name, place, place_station, end_time, capacity, host_user_id, kind)
      values (public.new_meeting_code(), left(mine.display_name || '님의 귀가 모임', 40),
              coalesce(mine.label, mine.origin_key), mine.origin_key, p_end_time, 6, v_uid, 'nearby')
      returning * into v_m;
    end if;

    perform public.add_member_from_post(v_m.id, mine);

    if (select count(*) from public.members where meeting_id = v_m.id) >= v_m.capacity then
      raise exception 'meeting_full';
    end if;
    insert into public.nearby_invites (from_user, to_user, meeting_id, from_name)
    values (v_uid, target.user_id, v_m.id, mine.display_name);
  end if;
  return v_m.code;
end $$;

-- 초대 수락/거절. 수락하면 내 게시 정보로 모임에 등록된 상태로 들어간다. 반환: 모임 코드(거절이면 null)
create function public.respond_nearby_invite(p_invite_id uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  inv   public.nearby_invites;
  me    public.nearby_posts;
  v_m   public.meetings;
begin
  select * into inv from public.nearby_invites where id = p_invite_id and to_user = v_uid and status = 'pending';
  if not found then raise exception 'invite_not_found'; end if;

  if not p_accept then
    update public.nearby_invites set status = 'declined' where id = p_invite_id;
    return null;
  end if;

  select * into v_m from public.meetings where id = inv.meeting_id;
  select * into me from public.nearby_posts where user_id = v_uid;
  if not found then raise exception 'post_required'; end if;

  if not exists (select 1 from public.members where meeting_id = v_m.id and user_id = v_uid)
     and (select count(*) from public.members where meeting_id = v_m.id) >= v_m.capacity then
    raise exception 'meeting_full';
  end if;

  perform public.add_member_from_post(v_m.id, me);
  update public.meetings set match_stale = (matched_at is not null) where id = v_m.id;
  update public.nearby_invites set status = 'accepted' where id = p_invite_id;
  insert into public.notices (meeting_id, kind, text)
  values (v_m.id, 'info', me.display_name || '님이 모임에 참여했어요.');
  return v_m.code;
end $$;

-- ---------------------------------------------------------------
-- 권한
-- ---------------------------------------------------------------
revoke all on function public.post_nearby(text, double precision, double precision, text, text, text, text, double precision, double precision, real, time, text, int) from public, anon;
revoke all on function public.remove_nearby() from public, anon;
revoke all on function public.find_nearby(int) from public, anon;
revoke all on function public.send_nearby_invite(uuid, time) from public, anon;
revoke all on function public.respond_nearby_invite(uuid, boolean) from public, anon;
revoke all on function public.add_member_from_post(uuid, public.nearby_posts) from public, anon, authenticated;
revoke all on function public.new_meeting_code() from public, anon, authenticated;
revoke all on function public.haversine_m(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.post_nearby(text, double precision, double precision, text, text, text, text, double precision, double precision, real, time, text, int) to authenticated;
grant execute on function public.remove_nearby() to authenticated;
grant execute on function public.find_nearby(int) to authenticated;
grant execute on function public.send_nearby_invite(uuid, time) to authenticated;
grant execute on function public.respond_nearby_invite(uuid, boolean) to authenticated;
grant execute on function public.haversine_m(double precision, double precision, double precision, double precision) to authenticated;

alter publication supabase_realtime add table public.nearby_invites;
