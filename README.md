# Pádel Reservas — Etapa 1 (fundación técnica)

Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + RLS).
Solo fundación: clubes/sedes/canchas/usuarios_club/jugadores, auth multi-club y RLS. Sin reservas.

## Setup

1. `npm install`
2. Crear proyecto en Supabase. Copiar `.env.example` a `.env.local` y completar
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
3. Ejecutar el esquema: pegar en el SQL Editor de Supabase, en orden, los archivos de
   `supabase/migrations/` (`0001_init.sql` … `0008_pagos.sql`).
4. Cargar datos de prueba: `npm run seed`
5. Correr: `npm run dev` → http://localhost:3000

## Rutas

- `/` — login (jugador: magic link · admin: email+password)
- `/dashboard` — post-login: rol y club (requiere sesión)
- `/disponibilidad` — turnos por club/sede/cancha/fecha (con precio); un jugador logueado **reserva** un turno libre y **cancela** los suyos, respetando reglas del club (anticipación/cancelación) y bloqueos; puede **pagar la seña**
- `/pago/[id]` — checkout de seña de una reserva (pago en **modo simulado**; punto de integración de MercadoPago documentado en el código)
- `/admin` — panel del admin del club: gestiona sedes, canchas (incl. precio), **reglas de reserva**, **bloqueos** de cancha, y ve/cancela reservas con su estado de pago (requiere sesión de admin)

## Cuentas de prueba (creadas por el seed)

- Admin Club Norte: `admin.norte@padel.test` / `Admin1234!`
- Admin Club Sur: `admin.sur@padel.test` / `Admin1234!`
- Jugadores (magic link): `juan@jugador.test`, `maria@jugador.test`, `pedro@jugador.test`

## Verificar RLS

Logueado como `admin.norte@padel.test`, el dashboard muestra solo "Club Norte".
Una query a `clubes`/`sedes`/`canchas` del otro club devuelve 0 filas por RLS.
