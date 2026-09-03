# Pádel Reservas — Etapa 1 (fundación técnica)

Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + RLS).
Solo fundación: clubes/sedes/canchas/usuarios_club/jugadores, auth multi-club y RLS. Sin reservas.

## Setup

1. `npm install`
2. Crear proyecto en Supabase. Copiar `.env.example` a `.env.local` y completar
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
3. Ejecutar el esquema: pegar `supabase/migrations/0001_init.sql` en el SQL Editor de Supabase.
4. Cargar datos de prueba: `npm run seed`
5. Correr: `npm run dev` → http://localhost:3000

## Cuentas de prueba (creadas por el seed)

- Admin Club Norte: `admin.norte@padel.test` / `Admin1234!`
- Admin Club Sur: `admin.sur@padel.test` / `Admin1234!`
- Jugadores (magic link): `juan@jugador.test`, `maria@jugador.test`, `pedro@jugador.test`

## Verificar RLS

Logueado como `admin.norte@padel.test`, el dashboard muestra solo "Club Norte".
Una query a `clubes`/`sedes`/`canchas` del otro club devuelve 0 filas por RLS.
