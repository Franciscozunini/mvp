-- Etapa 1: esquema base + RLS. Ejecutar en el SQL Editor de Supabase.

-- ===== Tablas =====
create table if not exists public.clubes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text,
  telefono text,
  created_at timestamptz not null default now()
);

create table if not exists public.sedes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id) on delete cascade,
  nombre text not null,
  direccion text,
  created_at timestamptz not null default now()
);

create table if not exists public.canchas (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id) on delete cascade,
  nombre text not null,
  techada boolean not null default false,
  duracion_turno_minutos int not null default 60,
  horario_apertura time not null default '08:00',
  horario_cierre time not null default '23:00',
  created_at timestamptz not null default now()
);

create table if not exists public.usuarios_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id) on delete cascade,
  email text not null,
  rol text not null default 'admin',
  created_at timestamptz not null default now(),
  unique (club_id, email)
);

create table if not exists public.jugadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null unique,
  telefono text,
  created_at timestamptz not null default now()
);

-- ===== Helper: club_id del usuario autenticado (SECURITY DEFINER evita recursión de RLS) =====
create or replace function public.current_user_club_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select club_id
  from public.usuarios_club
  where email = auth.jwt() ->> 'email'
  limit 1;
$$;

-- ===== RLS =====
alter table public.clubes enable row level security;
alter table public.sedes enable row level security;
alter table public.canchas enable row level security;
alter table public.usuarios_club enable row level security;
alter table public.jugadores enable row level security;

-- CLUBES: jugadores (no-admin) leen todo; admin solo su club (lectura y escritura).
drop policy if exists clubes_select on public.clubes;
create policy clubes_select on public.clubes for select
  using (current_user_club_id() is null or id = current_user_club_id());

drop policy if exists clubes_write on public.clubes;
create policy clubes_write on public.clubes for all
  using (id = current_user_club_id())
  with check (id = current_user_club_id());

-- SEDES: idem por club_id.
drop policy if exists sedes_select on public.sedes;
create policy sedes_select on public.sedes for select
  using (current_user_club_id() is null or club_id = current_user_club_id());

drop policy if exists sedes_write on public.sedes;
create policy sedes_write on public.sedes for all
  using (club_id = current_user_club_id())
  with check (club_id = current_user_club_id());

-- CANCHAS: por el club de su sede.
drop policy if exists canchas_select on public.canchas;
create policy canchas_select on public.canchas for select
  using (
    current_user_club_id() is null
    or exists (
      select 1 from public.sedes s
      where s.id = canchas.sede_id and s.club_id = current_user_club_id()
    )
  );

drop policy if exists canchas_write on public.canchas;
create policy canchas_write on public.canchas for all
  using (
    exists (
      select 1 from public.sedes s
      where s.id = canchas.sede_id and s.club_id = current_user_club_id()
    )
  )
  with check (
    exists (
      select 1 from public.sedes s
      where s.id = canchas.sede_id and s.club_id = current_user_club_id()
    )
  );

-- USUARIOS_CLUB: solo el admin de ese club (incluye su propia fila).
drop policy if exists usuarios_club_select on public.usuarios_club;
create policy usuarios_club_select on public.usuarios_club for select
  using (club_id = current_user_club_id());

drop policy if exists usuarios_club_write on public.usuarios_club;
create policy usuarios_club_write on public.usuarios_club for all
  using (club_id = current_user_club_id())
  with check (club_id = current_user_club_id());

-- JUGADORES: cada uno gestiona su propia fila (por email del JWT).
drop policy if exists jugadores_self on public.jugadores;
create policy jugadores_self on public.jugadores for all
  using (email = auth.jwt() ->> 'email')
  with check (email = auth.jwt() ->> 'email');
