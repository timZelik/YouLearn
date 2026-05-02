-- ============================================================
-- 0002 — per-path topic context
--
-- Multi-path support: each learning_path owns its own background/
-- goals/language, so switching between paths or opening an
-- un-generated lesson on an older path uses the correct topic
-- context (not the latest onboarding submission).
-- ============================================================

alter table public.learning_paths
  add column if not exists background text,
  add column if not exists goals text,
  add column if not exists preferred_language text;

-- Backfill existing rows from the user's latest onboarding response.
-- Safe to run multiple times (idempotent on already-filled rows).
update public.learning_paths lp
set
  background = sub.background,
  goals = sub.goals,
  preferred_language = sub.preferred_language
from (
  select distinct on (user_id) user_id, background, goals, preferred_language
  from public.onboarding_responses
  order by user_id, created_at desc
) sub
where lp.user_id = sub.user_id
  and (lp.background is null or lp.goals is null or lp.preferred_language is null);

-- Enforce non-null going forward (after backfill).
alter table public.learning_paths
  alter column background set not null,
  alter column goals set not null,
  alter column preferred_language set not null;

-- ============================================================
-- Replace create_path_stub: now writes per-path context columns.
-- ============================================================
create or replace function public.create_path_stub(payload jsonb)
returns uuid language plpgsql security definer
as $$
declare
  v_user_id uuid;
  v_path_id uuid;
  v_course_id uuid;
  v_course jsonb;
  v_lesson jsonb;
begin
  v_user_id := (payload ->> 'user_id')::uuid;

  insert into public.learning_paths (
    user_id, title, description, background, goals, preferred_language
  )
  values (
    v_user_id,
    payload ->> 'title',
    payload ->> 'description',
    payload ->> 'background',
    payload ->> 'goals',
    payload ->> 'preferred_language'
  )
  returning id into v_path_id;

  for v_course in select * from jsonb_array_elements(payload -> 'courses')
  loop
    insert into public.courses (learning_path_id, user_id, title, description, order_index, status)
    values (
      v_path_id,
      v_user_id,
      v_course ->> 'title',
      v_course ->> 'description',
      (v_course ->> 'order_index')::integer,
      'pending'
    )
    returning id into v_course_id;

    for v_lesson in select * from jsonb_array_elements(v_course -> 'lessons')
    loop
      insert into public.lessons (
        course_id, user_id, title, judge0_language_id, difficulty, order_index, content_status
      )
      values (
        v_course_id,
        v_user_id,
        v_lesson ->> 'title',
        (payload ->> 'judge0_language_id')::integer,
        v_lesson ->> 'difficulty',
        (v_lesson ->> 'order_index')::integer,
        'pending'
      );
    end loop;
  end loop;

  update public.profiles set paths_created = paths_created + 1 where id = v_user_id;

  return v_path_id;
end;
$$;
