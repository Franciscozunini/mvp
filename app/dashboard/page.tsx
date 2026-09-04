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
        { href: "/admin", titulo: "Panel de administración", desc: "Sedes, canchas, reglas, bloqueos y reservas" },
        { href: "/admin/reportes", titulo: "Reportes", desc: "Ocupación e ingresos del club" },
        { href: "/disponibilidad", titulo: "Disponibilidad", desc: "Ver turnos de las canchas" },
      ]
    : [
        { href: "/disponibilidad", titulo: "Reservar", desc: "Ver disponibilidad y reservar un turno" },
        { href: "/mis-reservas", titulo: "Mis reservas", desc: "Tus próximos turnos e historial" },
        { href: "/perfil", titulo: "Mi perfil", desc: "Editar nombre y teléfono" },
      ];

  return (
    <>
      <AppHeader />
      <main className="container-app py-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="h1">Hola{clubNombre ? `, ${clubNombre}` : ""} 👋</h1>
            <p className="text-sm text-slate-500">
              {user.email} · rol {esAdmin ? membership?.rol ?? "admin" : "jugador"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {accesos.map((a) => (
              <a key={a.href} href={a.href} className="card transition hover:border-brand hover:shadow-md">
                <p className="font-medium text-slate-900">{a.titulo}</p>
                <p className="text-sm text-slate-500">{a.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
