-- ============================================================
-- QR Code SaaS MVP — Schema Inicial
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. Extensão para UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de perfis (estende auth.users)
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text,
  role        text not null default 'client' check (role in ('admin', 'client')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. Tabela de QR Codes
create table public.qrcodes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  slug        text unique,                    -- para QR dinâmico: qr.dominio.com/r/:slug
  label       text not null default '',
  type        text not null check (type in ('url','whatsapp','vcard','pdf','texto')),
  content     text not null,                  -- conteúdo atual do QR
  target_url  text,                           -- URL de destino para QR dinâmico
  is_dynamic  boolean not null default false,
  fg_color    text not null default '#000000',
  bg_color    text not null default '#ffffff',
  ecl         text not null default 'M' check (ecl in ('L','M','Q','H')),
  size        int  not null default 256,
  scan_count  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 4. Tabela de scans
create table public.qr_scans (
  id          uuid primary key default uuid_generate_v4(),
  qr_id       uuid references public.qrcodes(id) on delete cascade not null,
  scanned_at  timestamptz not null default now(),
  ip          text,
  user_agent  text,
  device_type text check (device_type in ('mobile','desktop','tablet','unknown')) default 'unknown',
  country     text,
  city        text,
  referrer    text
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index qrcodes_user_id_idx  on public.qrcodes(user_id);
create index qrcodes_slug_idx     on public.qrcodes(slug) where slug is not null;
create index qr_scans_qr_id_idx   on public.qr_scans(qr_id);
create index qr_scans_date_idx    on public.qr_scans(scanned_at);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at  before update on public.profiles  for each row execute function public.handle_updated_at();
create trigger qrcodes_updated_at   before update on public.qrcodes   for each row execute function public.handle_updated_at();

-- ============================================================
-- TRIGGER: criar perfil automático no signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.qrcodes   enable row level security;
alter table public.qr_scans  enable row level security;

-- Profiles
create policy "Admin vê todos os perfis"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admin atualiza qualquer perfil"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- QR Codes
create policy "Usuário vê próprios QRs"
  on public.qrcodes for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Usuário cria QR para si"
  on public.qrcodes for insert
  with check (user_id = auth.uid());

create policy "Usuário atualiza próprio QR"
  on public.qrcodes for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Usuário deleta próprio QR"
  on public.qrcodes for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Scans
create policy "Usuário vê scans dos próprios QRs"
  on public.qr_scans for select
  using (
    exists (
      select 1 from public.qrcodes q
      where q.id = qr_id
        and (
          q.user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
          )
        )
    )
  );

-- Scans podem ser inseridos por qualquer um (via Edge Function com service_role)
create policy "Service role insere scans"
  on public.qr_scans for insert
  with check (true);

-- ============================================================
-- VIEW: stats por QR (útil para dashboard)
-- ============================================================
create or replace view public.qr_stats as
select
  q.id,
  q.user_id,
  q.label,
  q.type,
  q.slug,
  q.is_dynamic,
  q.created_at,
  count(s.id)                                     as total_scans,
  count(s.id) filter (where s.scanned_at >= now() - interval '7 days')  as scans_7d,
  count(s.id) filter (where s.scanned_at >= now() - interval '30 days') as scans_30d,
  max(s.scanned_at)                               as last_scan_at
from public.qrcodes q
left join public.qr_scans s on s.qr_id = q.id
group by q.id;

-- ============================================================
-- FUNÇÃO: criar usuário cliente (chamada pelo admin)
-- ============================================================
create or replace function public.admin_create_client(
  p_email     text,
  p_password  text,
  p_full_name text default ''
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  -- Só admin pode chamar
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Permissão negada';
  end if;

  -- Cria o usuário via Supabase admin (precisa de service_role no client)
  -- Esta função serve como placeholder; a criação real é feita via API Admin
  return gen_random_uuid();
end;
$$;
