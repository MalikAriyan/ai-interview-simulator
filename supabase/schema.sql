-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
-- References auth.users from Supabase Auth schema
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can view their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- 2. INTERVIEWS TABLE
create table public.interviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null, -- e.g., 'Frontend Dev'
  level text not null, -- e.g., 'Junior', 'Senior'
  status text default 'in-progress' check (status in ('in-progress', 'completed')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Interviews
alter table public.interviews enable row level security;

-- Interviews Policies
create policy "Users can view their own interviews"
  on public.interviews for select
  using (auth.uid() = user_id);

create policy "Users can create their own interviews"
  on public.interviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own interviews"
  on public.interviews for update
  using (auth.uid() = user_id);

create policy "Users can delete their own interviews"
  on public.interviews for delete
  using (auth.uid() = user_id);

-- 3. TRANSCRIPTS TABLE
create table public.transcripts (
  id uuid default gen_random_uuid() primary key,
  interview_id uuid references public.interviews(id) on delete cascade not null,
  speaker text check (speaker in ('ai', 'user')) not null,
  message text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Transcripts
alter table public.transcripts enable row level security;

-- Transcripts Policies
create policy "Users can view transcripts for their own interviews"
  on public.transcripts for select
  using (
    exists (
      select 1 from public.interviews
      where public.interviews.id = public.transcripts.interview_id
      and public.interviews.user_id = auth.uid()
    )
  );

create policy "Users can insert transcripts for their own interviews"
  on public.transcripts for insert
  with check (
    exists (
      select 1 from public.interviews
      where public.interviews.id = public.transcripts.interview_id
      and public.interviews.user_id = auth.uid()
    )
  );

-- TRIGGER TO AUTO-CREATE PROFILE ON SIGNUP
-- Automatically runs when a user inserts into auth.users (on signup)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- MIGRATION: Add resume_text column to profiles table
alter table public.profiles add column if not exists resume_text text;

