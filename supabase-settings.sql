-- BV LANCHES — configurações gerais centralizadas no Supabase
-- Execute este script no Supabase SQL Editor uma única vez.

create table if not exists public.settings (
  id bigint primary key default 1,
  fee numeric(10,2) not null default 0,
  whatsapp text not null default '',
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into public.settings (id, fee, whatsapp)
values (1, 0, '')
on conflict (id) do nothing;

alter table public.settings enable row level security;

-- O app usa a chave publicável do Supabase. Usuários autenticados podem
-- consultar e atualizar as configurações; a aplicação continua usando
-- localStorage como fallback quando a sessão do Supabase não estiver disponível.
drop policy if exists "settings_select_authenticated" on public.settings;
drop policy if exists "settings_insert_authenticated" on public.settings;
drop policy if exists "settings_update_authenticated" on public.settings;

create policy "settings_select_authenticated"
on public.settings for select
to authenticated
using (true);

create policy "settings_insert_authenticated"
on public.settings for insert
to authenticated
with check (true);

create policy "settings_update_authenticated"
on public.settings for update
to authenticated
using (true)
with check (true);
