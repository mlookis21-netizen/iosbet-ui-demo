-- IOSBET support chat schema. Already applied to Supabase project iosbet-ui-demo.
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null default 'Pertanyaan umum' check (char_length(topic) between 1 and 80),
  status text not null default 'open' check (status in ('open','waiting','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_type text not null check (sender_type in ('customer','ai','admin','system')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists support_conversations_user_updated_idx on public.support_conversations (user_id, updated_at desc);
create index if not exists support_messages_conversation_created_idx on public.support_messages (conversation_id, created_at asc);
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
grant select, insert, update on public.support_conversations to authenticated;
grant select, insert on public.support_messages to authenticated;
drop policy if exists "Customers read own support conversations" on public.support_conversations;
create policy "Customers read own support conversations" on public.support_conversations for select to authenticated using (user_id = (select auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'support_admin') = 'true');
drop policy if exists "Customers create own support conversations" on public.support_conversations;
create policy "Customers create own support conversations" on public.support_conversations for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Admins update support conversations" on public.support_conversations;
create policy "Admins update support conversations" on public.support_conversations for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'support_admin') = 'true') with check ((auth.jwt() -> 'app_metadata' ->> 'support_admin') = 'true');
drop policy if exists "Participants read support messages" on public.support_messages;
create policy "Participants read support messages" on public.support_messages for select to authenticated using (exists (select 1 from public.support_conversations c where c.id = conversation_id and (c.user_id = (select auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'support_admin') = 'true')));
drop policy if exists "Admins send support replies" on public.support_messages;
create policy "Admins send support replies" on public.support_messages for insert to authenticated with check (sender_type = 'admin' and sender_id = (select auth.uid()) and (auth.jwt() -> 'app_metadata' ->> 'support_admin') = 'true' and exists (select 1 from public.support_conversations c where c.id = conversation_id));
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages') then
    alter publication supabase_realtime add table public.support_messages;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_conversations') then
    alter publication supabase_realtime add table public.support_conversations;
  end if;
end $$;
