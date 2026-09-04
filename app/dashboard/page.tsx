import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: membership } = await supabase
    .from("usuarios_club")
    .select("rol, clubes(nombre)")
    .eq("email", user.email)
    .maybeSingle();

  const esAdmin = !!membership;
  const club = membership?.clubes as unknown as { nombre: string } | { nombre: string }[] | null;
  const clubNombre = Array.isArray(club) ? club[0]?.nombre : club?.nombre;

  const accesos = esAdmin
    ? [
        { href: "/admin", icon: "🏟️", titulo: "Panel de administración", desc: "Sedes, canchas, reglas, bloqueos y reservas" },
        { href: "/admin/reportes", icon: "📊", titulo: "Reportes", desc: "Ocupación e ingresos del club" },
        { href: "/disponibilidad", icon: "🗓️", titulo: "Disponibilidad", desc: "Ver turnos de las canchas" },
      ]
    : [
        { href: "/disponibilidad", icon: "🎾", titulo: "Reservar", desc: "Ver disponibilidad y reservar un turno" },
        { href: "/mis-reservas", icon: "🗓️", titulo: "Mis reservas", desc: "Tus próximos turnos e historial" },
        { href: "/perfil", icon: "👤", titulo: "Mi perfil", desc: "Editar nombre y teléfono" },
      ];

  return (
    <>
      <AppHeader />
      <main className="container-app py-8">
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-card">
            <p className="text-sm text-brand-100">
              {esAdmin ? `Administrás ${clubNombre ?? "tu club"}` : "Sesión de jugador"}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Hola{clubNombre ? `, ${clubNombre}` : ""} 👋
            </h1>
            <p className="mt-1 text-sm text-brand-100">
              {user.email} · rol {esAdmin ? membership?.rol ?? "admin" : "jugador"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {accesos.map((a) => (
              <a
                key={a.href}
                href={a.href}
                className="card flex items-start gap-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-hover"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
                  {a.icon}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{a.titulo}</p>
                  <p className="text-sm text-slate-500">{a.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
