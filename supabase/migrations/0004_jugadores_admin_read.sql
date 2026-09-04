-- Etapa 4: el admin puede ver los datos de los jugadores que tienen reservas en su club
-- (para listar "quién reservó"). Se suma por OR a jugadores_self.

drop policy if exists jugadores_admin_select on public.jugadores;
create policy jugadores_admin_select on public.jugadores for select
  using (
    exists (
      select 1
      from public.reservas r
      join public.canchas c on c.id = r.cancha_id
      join public.sedes s on s.id = c.sede_id
      where r.jugador_id = jugadores.id and s.club_id = current_user_club_id()
    )
  );
