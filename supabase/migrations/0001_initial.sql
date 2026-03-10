-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  full_name text,
  avatar_url text,
  current_streak integer default 0 not null,
  longest_streak integer default 0 not null,
  last_activity_date date,
  onboarding_completed boolean default false not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- ONBOARDING RESPONSES
-- ============================================================
create table public.onboarding_responses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now() not null,
  background text not null,
  goals text not null,
  preferred_language text not null,
  experience_level text not null
);

alter table public.onboarding_responses enable row level security;

create policy "Users can manage own onboarding"
  on public.onboarding_responses for all
  using (auth.uid() = user_id);

-- ============================================================
-- LEARNING PATHS
-- ============================================================
create table public.learning_paths (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now() not null,
  title text not null,
  description text not null
);

alter table public.learning_paths enable row level security;

create policy "Users can manage own learning paths"
  on public.learning_paths for all
  using (auth.uid() = user_id);

-- ============================================================
-- COURSES
-- ============================================================
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  learning_path_id uuid references public.learning_paths on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now() not null,
  title text not null,
  description text not null,
  order_index integer not null
);

alter table public.courses enable row level security;

create policy "Users can manage own courses"
  on public.courses for all
  using (auth.uid() = user_id);

-- ============================================================
-- LESSONS
-- ============================================================
create table public.lessons (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now() not null,
  title text not null,
  theory_markdown text not null,
  exercise_prompt text not null,
  starter_code text not null,
  solution_code text not null,
  judge0_language_id integer not null,
  difficulty text not null check (difficulty in ('intro','easy','medium','hard','capstone')),
  order_index integer not null
);

alter table public.lessons enable row level security;

-- Users can see their own lessons but NOT solution_code via client
-- solution_code is only accessible via service_role in API routes
create policy "Users can view own lessons"
  on public.lessons for select
  using (auth.uid() = user_id);

create policy "Service role can manage lessons"
  on public.lessons for all
  using (true)
  with check (true);

-- ============================================================
-- TEST CASES
-- ============================================================
create table public.test_cases (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.lessons on delete cascade not null,
  created_at timestamptz default now() not null,
  input text not null,
  expected_output text not null,
  is_hidden boolean default false not null,
  order_index integer not null
);

alter table public.test_cases enable row level security;

-- Users can only see non-hidden test cases
create policy "Users can view visible test cases"
  on public.test_cases for select
  using (
    is_hidden = false and
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.user_id = auth.uid()
    )
  );

-- ============================================================
-- SUBMISSIONS
-- ============================================================
create table public.submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lesson_id uuid references public.lessons on delete cascade not null,
  created_at timestamptz default now() not null,
  code text not null,
  test_results jsonb not null default '[]',
  all_passed boolean default false not null,
  status text not null check (status in ('run','submit'))
);

alter table public.submissions enable row level security;

create policy "Users can manage own submissions"
  on public.submissions for all
  using (auth.uid() = user_id);

-- ============================================================
-- AI FEEDBACK
-- ============================================================
create table public.ai_feedback (
  id uuid default uuid_generate_v4() primary key,
  submission_id uuid references public.submissions on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now() not null,
  score integer not null check (score >= 0 and score <= 100),
  correctness_summary text not null,
  explanation text not null,
  improvement_tips text[] not null default '{}',
  optimized_approach text not null
);

alter table public.ai_feedback enable row level security;

create policy "Users can manage own ai feedback"
  on public.ai_feedback for all
  using (auth.uid() = user_id);

-- ============================================================
-- USER LESSON PROGRESS
-- ============================================================
create table public.user_lesson_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lesson_id uuid references public.lessons on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  best_score integer default 0 not null,
  attempts integer default 0 not null,
  unique (user_id, lesson_id)
);

alter table public.user_lesson_progress enable row level security;

create policy "Users can manage own progress"
  on public.user_lesson_progress for all
  using (auth.uid() = user_id);

create trigger lesson_progress_updated_at
  before update on public.user_lesson_progress
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- STORED PROCEDURE: create_learning_path (atomic insert)
-- ============================================================
create or replace function public.create_learning_path(payload jsonb)
returns uuid language plpgsql security definer
as $$
declare
  v_user_id uuid;
  v_path_id uuid;
  v_course_id uuid;
  v_lesson_id uuid;
  v_course jsonb;
  v_lesson jsonb;
  v_tc jsonb;
begin
  v_user_id := (payload ->> 'user_id')::uuid;

  -- Insert learning path
  insert into public.learning_paths (user_id, title, description)
  values (
    v_user_id,
    payload ->> 'title',
    payload ->> 'description'
  )
  returning id into v_path_id;

  -- Insert courses
  for v_course in select * from jsonb_array_elements(payload -> 'courses')
  loop
    insert into public.courses (learning_path_id, user_id, title, description, order_index)
    values (
      v_path_id,
      v_user_id,
      v_course ->> 'title',
      v_course ->> 'description',
      (v_course ->> 'order_index')::integer
    )
    returning id into v_course_id;

    -- Insert lessons
    for v_lesson in select * from jsonb_array_elements(v_course -> 'lessons')
    loop
      insert into public.lessons (
        course_id, user_id, title, theory_markdown, exercise_prompt,
        starter_code, solution_code, judge0_language_id, difficulty, order_index
      )
      values (
        v_course_id,
        v_user_id,
        v_lesson ->> 'title',
        v_lesson ->> 'theory_markdown',
        v_lesson ->> 'exercise_prompt',
        v_lesson ->> 'starter_code',
        v_lesson ->> 'solution_code',
        (v_lesson ->> 'judge0_language_id')::integer,
        v_lesson ->> 'difficulty',
        (v_lesson ->> 'order_index')::integer
      )
      returning id into v_lesson_id;

      -- Insert test cases
      for v_tc in select * from jsonb_array_elements(v_lesson -> 'test_cases')
      loop
        insert into public.test_cases (lesson_id, input, expected_output, is_hidden, order_index)
        values (
          v_lesson_id,
          v_tc ->> 'input',
          v_tc ->> 'expected_output',
          (v_tc ->> 'is_hidden')::boolean,
          (v_tc ->> 'order_index')::integer
        );
      end loop;

    end loop;
  end loop;

  return v_path_id;
end;
$$;
