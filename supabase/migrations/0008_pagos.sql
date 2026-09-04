-- Etapa 8: pago de seña. Flujo funcional; el cobro real (MercadoPago) se enchufa
-- reemplazando el insert simulado en /pago/[id] por la creación de preferencia + webhook,
-- que al aprobarse inserta la fila en `pagos` (el trigger marca la reserva).

alter table public.reservas add column if not exists pago_estado text not null default 'pendiente';
alter table public.reglas_club add column if not exists sena_porcentaje int not null default 30;

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  monto numeric(10, 2) not null,
  estado text not null default 'aprobado',
  proveedor text not null default 'simulado',
  created_at timestamptz not null default now()
);

alter table public.pagos enable row level security;

-- El jugador ve/crea pagos de sus reservas; el admin ve los de su club.
drop policy if exists pagos_select on public.pagos;
create policy pagos_select on public.pagos for select using (
  exists (
    select 1 from public.reservas r
    where r.id = pagos.reserva_id and (
      r.jugador_id in (select id from public.jugadores where email = auth.jwt() ->> 'email')
      or exists (
        select 1 from public.canchas c join public.sedes s on s.id = c.sede_id
        where c.id = r.cancha_id and s.club_id = current_user_club_id()
      )
    )
  )
);

drop policy if exists pagos_jugador_insert on public.pagos;
create policy pagos_jugador_insert on public.pagos for insert with check (
  exists (
    select 1 from public.reservas r
    where r.id = pagos.reserva_id
      and r.jugador_id in (select id from public.jugadores where email = auth.jwt() ->> 'email')
  )
);

-- Al registrarse un pago, la reserva pasa a 'senada'.
create or replace function public.pago_marca_reserva()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.reservas set pago_estado = 'senada' where id = new.reserva_id;
  return new;
end $$;

drop trigger if exists trg_pago_marca_reserva on public.pagos;
create trigger trg_pago_marca_reserva after insert on public.pagos
  for each row execute function public.pago_marca_reserva();
