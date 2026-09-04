// Seed repetible. Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
// Uso: npm run seed
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_PASSWORD = "Admin1234!";

const clubes = [
  {
    nombre: "Club Norte",
    email: "contacto@clubnorte.test",
    telefono: "+54 11 4000-0001",
    apertura: "08:00",
    cierre: "23:00",
    adminEmail: "admin.norte@padel.test",
    reglas: { anticipacion_min_horas: 1, cancelacion_min_horas: 2, max_reservas_activas: 3, sena_porcentaje: 30 },
    sedes: [
      { nombre: "Sede Centro", direccion: "Av. Norte 100", canchas: 3 },
      { nombre: "Sede Palermo", direccion: "Av. Norte 250", canchas: 2 },
    ],
  },
  {
    nombre: "Club Sur",
    email: "contacto@clubsur.test",
    telefono: "+54 11 4000-0002",
    apertura: "07:00",
    cierre: "22:00",
    adminEmail: "admin.sur@padel.test",
    reglas: { anticipacion_min_horas: 2, cancelacion_min_horas: 4, max_reservas_activas: 2, sena_porcentaje: 50 },
    sedes: [{ nombre: "Sede Única", direccion: "Av. Sur 500", canchas: 3 }],
  },
];

const jugadores = [
  { nombre: "Juan Pérez", email: "juan@jugador.test", telefono: "+54 9 11 1111-1111" },
  { nombre: "María Gómez", email: "maria@jugador.test", telefono: "+54 9 11 2222-2222" },
  { nombre: "Pedro Díaz", email: "pedro@jugador.test", telefono: "+54 9 11 3333-3333" },
];

async function del(tabla) {
  const { error } = await db
    .from(tabla)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(`limpiando ${tabla}: ${error.message}`);
}

async function borrarAuthUsers(emails) {
  const set = new Set(emails);
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  for (const u of data.users) {
    if (u.email && set.has(u.email)) await db.auth.admin.deleteUser(u.id);
  }
}

async function main() {
  // 1. Limpiar (orden FK-safe).
  for (const t of ["pagos", "reservas", "bloqueos", "jugadores", "usuarios_club", "canchas", "reglas_club", "sedes", "clubes"]) {
    await del(t);
  }

  // 2. Borrar usuarios auth de prueba para que el seed sea repetible.
  const emailsAuth = [...clubes.map((c) => c.adminEmail), ...jugadores.map((j) => j.email)];
  await borrarAuthUsers(emailsAuth);

  // Primera cancha de cada club, para sembrar reservas de ejemplo.
  const canchasDemo = [];

  // 3. Clubes -> sedes -> canchas -> admin.
  for (const club of clubes) {
    let canchaDemoClub = null;
    const { data: clubRow, error: e1 } = await db
      .from("clubes")
      .insert({ nombre: club.nombre, email: club.email, telefono: club.telefono })
      .select("id")
      .single();
    if (e1) throw new Error(`club ${club.nombre}: ${e1.message}`);

    for (const sede of club.sedes) {
      const { data: sedeRow, error: e2 } = await db
        .from("sedes")
        .insert({ club_id: clubRow.id, nombre: sede.nombre, direccion: sede.direccion })
        .select("id")
        .single();
      if (e2) throw new Error(`sede ${sede.nombre}: ${e2.message}`);

      const canchas = [];
      for (let i = 1; i <= sede.canchas; i++) {
        canchas.push({
          sede_id: sedeRow.id,
          nombre: `Cancha ${i}`,
          techada: i % 2 === 0,
          duracion_turno_minutos: i % 2 === 0 ? 90 : 60, // mezcla 60/90
          horario_apertura: club.apertura,
          horario_cierre: club.cierre,
          precio_turno: i % 2 === 0 ? 9000 : 6000, // ARS por turno (90/60 min)
        });
      }
      const { data: canchasRows, error: e3 } = await db
        .from("canchas")
        .insert(canchas)
        .select("id, duracion_turno_minutos");
      if (e3) throw new Error(`canchas ${sede.nombre}: ${e3.message}`);

      if (!canchaDemoClub && canchasRows?.[0]) {
        canchaDemoClub = {
          id: canchasRows[0].id,
          duracionMin: canchasRows[0].duracion_turno_minutos,
          apertura: club.apertura,
        };
      }
    }
    if (canchaDemoClub) canchasDemo.push(canchaDemoClub);

    // Admin: auth user (email+password) + fila en usuarios_club.
    const { error: e4 } = await db.auth.admin.createUser({
      email: club.adminEmail,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (e4) throw new Error(`auth admin ${club.adminEmail}: ${e4.message}`);

    const { error: e5 } = await db
      .from("usuarios_club")
      .insert({ club_id: clubRow.id, email: club.adminEmail, rol: "admin" });
    if (e5) throw new Error(`usuarios_club ${club.adminEmail}: ${e5.message}`);

    const { error: e5b } = await db
      .from("reglas_club")
      .insert({ club_id: clubRow.id, ...club.reglas });
    if (e5b) throw new Error(`reglas_club ${club.nombre}: ${e5b.message}`);
  }

  // 4. Jugadores: fila + auth user (confirmado; login por magic link).
  const jugadorIds = [];
  for (const j of jugadores) {
    const { data: jRow, error: e6 } = await db
      .from("jugadores")
      .insert(j)
      .select("id")
      .single();
    if (e6) throw new Error(`jugador ${j.email}: ${e6.message}`);
    jugadorIds.push(jRow.id);
    const { error: e7 } = await db.auth.admin.createUser({
      email: j.email,
      email_confirm: true,
    });
    if (e7) throw new Error(`auth jugador ${j.email}: ${e7.message}`);
  }

  // 5. Reservas de ejemplo (hoy AR, 10:00 y 14:00) en la 1ra cancha de cada club.
  const hoyAR = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
  const utc = (h) => new Date(`${hoyAR}T${h}:00-03:00`).toISOString();

  const reservas = [];
  canchasDemo.forEach((c, idx) => {
    for (const hora of ["10:00", "14:00"]) {
      const inicio = utc(hora);
      const fin = new Date(
        new Date(inicio).getTime() + c.duracionMin * 60_000
      ).toISOString();
      reservas.push({
        cancha_id: c.id,
        jugador_id: jugadorIds[idx % jugadorIds.length] ?? null,
        inicio,
        fin,
      });
    }
  });
  if (reservas.length) {
    const { error: e8 } = await db.from("reservas").insert(reservas);
    if (e8) throw new Error(`reservas: ${e8.message}`);
  }

  // 6. Bloqueo de ejemplo (hoy AR, 16:00–17:00) en la 1ra cancha del primer club.
  if (canchasDemo[0]) {
    const { error: e9 } = await db.from("bloqueos").insert({
      cancha_id: canchasDemo[0].id,
      inicio: utc("16:00"),
      fin: utc("17:00"),
      motivo: "Mantenimiento",
    });
    if (e9) throw new Error(`bloqueos: ${e9.message}`);
  }

  console.log("Seed OK");
  console.log(`  Clubes: ${clubes.length}`);
  console.log(`  Admins (password: ${ADMIN_PASSWORD}): ${clubes.map((c) => c.adminEmail).join(", ")}`);
  console.log(`  Jugadores: ${jugadores.map((j) => j.email).join(", ")}`);
  console.log(`  Reservas de ejemplo: ${reservas.length} (fecha ${hoyAR}, 10:00 y 14:00 AR)`);
  console.log(`  Reglas por club + 1 bloqueo de ejemplo (16:00–17:00) cargados`);
}

main().catch((err) => {
  console.error("Seed FALLÓ:", err.message);
  process.exit(1);
});
