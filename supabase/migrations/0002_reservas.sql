-- Etapa 2: reservas (modelo + RLS). Ejecutar después de 0001_init.sql.
-- Todos los timestamps se guardan en UTC; la conversión a hora AR es solo de presentación.

create extension if not exists btree_gist;

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid not null references public.canchas(id) on delete cascade,
  jugador_id uuid references public.jugadores(id) on delete set null,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'confirmada',
  created_at timestamptz not null default now(),
  check (fin > inicio)
);

-- Evita doble reserva de una misma cancha en horarios superpuestos.
alter table public.reservas drop constraint if exists reservas_no_overlap;
alter table public.reservas add constraint reservas_no_overlap
  exclude using gist (
    cancha_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado <> 'cancelada');

create index if not exists reservas_cancha_inicio_idx
  on public.reservas (cancha_id, inicio);

-- ===== RLS (mismo criterio que canchas: jugador ve todo, admin solo su club) =====
alter table public.reservas enable row level security;

drop policy if exists reservas_select on public.reservas;
create policy reservas_select on public.reservas for select
  using (
    current_user_club_id() is null
    or exists (
      select 1 from public.canchas c
      join public.sedes s on s.id = c.sede_id
      where c.id = reservas.cancha_id and s.club_id = current_user_club_id()
    )
  );

drop policy if exists reservas_write on public.reservas;
create policy reservas_write on public.reservas for all
  using (
    exists (
      select 1 from public.canchas c
      join public.sedes s on s.id = c.sede_id
      where c.id = reservas.cancha_id and s.club_id = current_user_club_id()
    )
  )
  with check (
    exists (
      select 1 from public.canchas c
      join public.sedes s on s.id = c.sede_id
      where c.id = reservas.cancha_id and s.club_id = current_user_club_id()
    )
  );
