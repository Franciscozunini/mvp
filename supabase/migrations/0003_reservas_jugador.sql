-- Etapa 3: un jugador puede crear y cancelar (borrar) sus propios turnos.
-- Se suma a las policies de 0002 (RLS combina policies del mismo comando con OR).

drop policy if exists reservas_jugador_insert on public.reservas;
create policy reservas_jugador_insert on public.reservas for insert
  with check (
    jugador_id in (
      select id from public.jugadores where email = auth.jwt() ->> 'email'
    )
  );

drop policy if exists reservas_jugador_delete on public.reservas;
create policy reservas_jugador_delete on public.reservas for delete
  using (
    jugador_id in (
      select id from public.jugadores where email = auth.jwt() ->> 'email'
    )
  );
