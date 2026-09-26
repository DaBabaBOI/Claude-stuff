-- ============================================================
-- Clarion database schema
-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run
-- ============================================================

-- ---------- PROFILES ----------
-- One row per signed-up user, extending Supabase's built-in auth.users.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('student','teacher')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on profiles for select
  to authenticated
  using (true);

create policy "a user can insert their own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "a user can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- ---------- CLASSES ----------
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references profiles(id) on delete cascade,
  color text not null default '#6D5DFB',
  join_code text not null unique,
  created_at timestamptz not null default now()
);

alter table classes enable row level security;

create policy "classes are readable by any signed-in user"
  on classes for select
  to authenticated
  using (true);

create policy "a teacher can create their own class"
  on classes for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'teacher')
  );

create policy "a teacher can update their own class"
  on classes for update
  to authenticated
  using (teacher_id = auth.uid());

-- ---------- CLASS MEMBERS ----------
create table if not exists class_members (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

alter table class_members enable row level security;

create policy "membership readable by the student, or the class teacher"
  on class_members for select
  to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

create policy "a student can join a class as themselves"
  on class_members for insert
  to authenticated
  with check (student_id = auth.uid());

-- Helper: is the current user allowed to see this class (teacher or member)?
create or replace function is_class_participant(target_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from classes c where c.id = target_class_id and c.teacher_id = auth.uid()
  ) or exists (
    select 1 from class_members m where m.class_id = target_class_id and m.student_id = auth.uid()
  );
$$;

-- ---------- THREADS ----------
create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  pinned boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table threads enable row level security;

create policy "threads readable by class participants"
  on threads for select
  to authenticated
  using (is_class_participant(class_id));

create policy "class participants can start a thread"
  on threads for insert
  to authenticated
  with check (is_class_participant(class_id) and created_by = auth.uid());

create policy "the teacher can update threads in their class (pin, etc)"
  on threads for update
  to authenticated
  using (exists (select 1 from classes c where c.id = class_id and c.teacher_id = auth.uid()));

create policy "the teacher can delete threads in their class"
  on threads for delete
  to authenticated
  using (exists (select 1 from classes c where c.id = class_id and c.teacher_id = auth.uid()));

-- ---------- MESSAGES ----------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "messages readable by class participants"
  on messages for select
  to authenticated
  using (
    exists (
      select 1 from threads t where t.id = thread_id and is_class_participant(t.class_id)
    )
  );

create policy "class participants can post a message"
  on messages for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from threads t where t.id = thread_id and is_class_participant(t.class_id))
  );

create policy "a teacher can delete a message in their class (moderation)"
  on messages for delete
  to authenticated
  using (
    exists (
      select 1 from threads t
      join classes c on c.id = t.class_id
      where t.id = thread_id and c.teacher_id = auth.uid()
    )
  );

create policy "a user can delete their own message"
  on messages for delete
  to authenticated
  using (author_id = auth.uid());

-- ---------- JOIN A CLASS BY CODE ----------
-- Students only know the code, not the class id, so this function looks it
-- up and inserts the membership in one trusted step.
create or replace function join_class_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_class_id uuid;
begin
  select id into found_class_id from classes where join_code = upper(code);
  if found_class_id is null then
    raise exception 'No class found for that code';
  end if;
  insert into class_members (class_id, student_id)
    values (found_class_id, auth.uid())
    on conflict do nothing;
  return found_class_id;
end;
$$;

-- ---------- REALTIME ----------
-- Let Supabase broadcast inserts on these tables so open tabs update live.
alter publication supabase_realtime add table threads;
alter publication supabase_realtime add table messages;
