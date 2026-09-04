-- Etapa 5: precio por turno de cada cancha (ARS). Editable por el admin, visible al reservar.
alter table public.canchas
  add column if not exists precio_turno numeric(10, 2) not null default 0;
