-- Etapa 7: reglas de reserva por club, aplicadas a los jugadores (el admin queda exento).
create table if not exists public.reglas_club (
  club_id uuid primary key references public.clubes(id) on delete cascade,
  anticipacion_min_horas int not null default 1,   -- no reservar con menos de X horas
  cancelacion_min_horas int not null default 2,    -- no cancelar con menos de X horas
  max_reservas_activas int not null default 3,     -- tope de reservas futuras por jugador
  created_at timestamptz not null default now()
);

alter table public.reglas_club enable row level security;

drop policy if exists reglas_select on public.reglas_club;
create policy reglas_select on public.reglas_club for select using (true);

drop policy if exists reglas_write on public.reglas_club;
create policy reglas_write on public.reglas_club for all
  using (club_id = current_user_club_id())
  with check (club_id = current_user_club_id());

-- ===== Triggers de validación (solo aplican al jugador) =====
create or replace function public.reserva_reglas_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_club uuid;
  v_reglas public.reglas_club;
  v_activas int;
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return new; end if;

  select s.club_id into v_club
  from public.canchas c join public.sedes s on s.id = c.sede_id
  where c.id = new.cancha_id;

  -- El admin del club no está sujeto a las reglas de jugador.
  if current_user_club_id() = v_club then return new; end if;

  select * into v_reglas from public.reglas_club where club_id = v_club;
  if not found then return new; end if;

  if new.inicio < now() + make_interval(hours => v_reglas.anticipacion_min_horas) then
    raise exception 'Debés reservar con al menos % horas de anticipación.', v_reglas.anticipacion_min_horas;
  end if;

  select count(*) into v_activas from public.reservas r
  where r.jugador_id = new.jugador_id and r.inicio > now() and r.estado <> 'cancelada';
  if v_activas >= v_reglas.max_reservas_activas then
    raise exception 'Alcanzaste el máximo de % reservas activas.', v_reglas.max_reservas_activas;
  end if;

  return new;
end $$;

drop trigger if exists trg_reserva_reglas_insert on public.reservas;
create trigger trg_reserva_reglas_insert before insert on public.reservas
  for each row execute function public.reserva_reglas_insert();

create or replace function public.reserva_reglas_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_club uuid;
  v_reglas public.reglas_club;
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return old; end if;

  select s.club_id into v_club
  from public.canchas c join public.sedes s on s.id = c.sede_id
  where c.id = old.cancha_id;

  if current_user_club_id() = v_club then return old; end if;

  select * into v_reglas from public.reglas_club where club_id = v_club;
  if not found then return old; end if;

  if now() > old.inicio - make_interval(hours => v_reglas.cancelacion_min_horas) then
    raise exception 'No se puede cancelar con menos de % horas de anticipación.', v_reglas.cancelacion_min_horas;
  end if;

  return old;
end $$;

drop trigger if exists trg_reserva_reglas_delete on public.reservas;
create trigger trg_reserva_reglas_delete before delete on public.reservas
  for each row execute function public.reserva_reglas_delete();
