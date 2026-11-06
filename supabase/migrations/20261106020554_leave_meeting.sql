-- 모임 나가기: 내 참여 정보(위치·그룹 소속 포함)를 지우고 모임에서 빠진다.
--  - 주최자가 나가면 가장 먼저 참여한 멤버가 주최자가 된다.
--  - 마지막 멤버가 나가면 모임도 삭제된다.
--  - 이미 매칭된 모임이면 "다시 매칭 필요"로 표시한다.
create function public.leave_meeting(p_meeting_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  m      public.meetings;
  v_name text;
  v_next uuid;
begin
  select * into m from public.meetings where id = p_meeting_id;
  if not found then raise exception 'meeting_not_found'; end if;

  select name into v_name from public.members where meeting_id = p_meeting_id and user_id = v_uid;
  if not found then raise exception 'forbidden'; end if;

  delete from public.members where meeting_id = p_meeting_id and user_id = v_uid;

  if not exists (select 1 from public.members where meeting_id = p_meeting_id) then
    delete from public.meetings where id = p_meeting_id;
    return;
  end if;

  if m.host_user_id = v_uid then
    select user_id into v_next from public.members
     where meeting_id = p_meeting_id order by created_at limit 1;
    update public.meetings set host_user_id = v_next where id = p_meeting_id;
  end if;

  update public.meetings set match_stale = (matched_at is not null) where id = p_meeting_id;
  insert into public.notices (meeting_id, kind, text) values (p_meeting_id, 'info', v_name || '님이 모임을 나갔어요.');
end $$;

revoke all on function public.leave_meeting(uuid) from public, anon;
grant execute on function public.leave_meeting(uuid) to authenticated;
