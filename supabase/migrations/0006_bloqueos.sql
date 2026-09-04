-- Etapa 6: bloqueos de cancha (mantenimiento/torneo). Franjas no reservables.
create table if not exists public.bloqueos (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid not null references public.canchas(id) on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  motivo text,
  created_at timestamptz not null default now(),
  check (fin > inicio)
);
create index if not exists bloqueos_cancha_inicio_idx on public.bloqueos (cancha_id, inicio);

alter table public.bloqueos enable row level security;

-- Lectura: todos (para disponibilidad). Admin escribe solo su club.
drop policy if exists bloqueos_select on public.bloqueos;
create policy bloqueos_select on public.bloqueos for select
  using (
    current_user_club_id() is null
    or exists (
      select 1 from public.canchas c join public.sedes s on s.id = c.sede_id
      where c.id = bloqueos.cancha_id and s.club_id = current_user_club_id()
    )
  );

drop policy if exists bloqueos_write on public.bloqueos;
create policy bloqueos_write on public.bloqueos for all
  using (
    exists (
      select 1 from public.canchas c join public.sedes s on s.id = c.sede_id
      where c.id = bloqueos.cancha_id and s.club_id = current_user_club_id()
    )
  )
  with check (
    exists (
      select 1 from public.canchas c join public.sedes s on s.id = c.sede_id
      where c.id = bloqueos.cancha_id and s.club_id = current_user_club_id()
    )
  );
