create table if not exists public.device_push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

alter table public.device_push_tokens enable row level security;

drop policy if exists "Users can insert own push token" on public.device_push_tokens;
drop policy if exists "Users can update own push token" on public.device_push_tokens;
drop policy if exists "Users can delete own push token" on public.device_push_tokens;
drop policy if exists "Users can read own push tokens" on public.device_push_tokens;

create policy "Users can insert own push token" on public.device_push_tokens for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own push token" on public.device_push_tokens for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own push token" on public.device_push_tokens for delete to authenticated using (auth.uid() = user_id);
create policy "Users can read own push tokens" on public.device_push_tokens for select to authenticated using (auth.uid() = user_id);
