import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import { CalendarDays, CalendarCheck, User, LayoutGrid, BarChart3, ArrowRight, MapPin } from "lucide-react";

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
  const nombreCorto = (user.email ?? "").split("@")[0];

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <>
      <AppHeader />
      <main className="container-app py-8 sm:py-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-8 text-white shadow-lift sm:p-10">
          <div className="court-lines pointer-events-none absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="eyebrow text-brand-300">{esAdmin ? "Panel de club" : "Hola de nuevo"}</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {saludo}, <span className="text-brand-400">{esAdmin ? clubNombre ?? "club" : nombreCorto}</span>.
            </h1>
            <p className="mt-3 max-w-lg text-lg text-white/70">
              {esAdmin
                ? "Gestioná tus canchas, reglas y reservas, y seguí la ocupación del club."
                : "Encontrá una cancha libre y reservá tu próximo partido en segundos."}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={esAdmin ? "/admin" : "/disponibilidad"}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-bold text-ink-900 shadow-glow transition hover:bg-brand-400"
              >
                {esAdmin ? "Ir al panel" : "Reservar una cancha"}
                <ArrowRight className="h-[18px] w-[18px]" />
              </a>
              <a
                href={esAdmin ? "/admin/reportes" : "/mis-reservas"}
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                {esAdmin ? "Ver reportes" : "Mis reservas"}
              </a>
            </div>
          </div>
        </section>

        {/* Acciones */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {esAdmin ? (
            <>
              <ActionCard featured href="/admin" icon={LayoutGrid} title="Administrar club" desc="Sedes, canchas, precios, reglas de reserva y bloqueos." cta="Abrir panel" />
              <ActionCard href="/admin/reportes" icon={BarChart3} title="Reportes" desc="Ocupación e ingresos." cta="Ver métricas" />
              <ActionCard wide href="/disponibilidad" icon={CalendarDays} title="Disponibilidad" desc="Mirá la grilla de turnos de tus canchas como la ve un jugador." cta="Ver grilla" />
            </>
          ) : (
            <>
              <ActionCard featured href="/disponibilidad" icon={CalendarDays} title="Reservar una cancha" desc="Elegí club, fecha y horario. Los turnos libres se reservan al toque." cta="Buscar turnos" />
              <ActionCard href="/mis-reservas" icon={CalendarCheck} title="Mis reservas" desc="Próximos turnos e historial." cta="Ver reservas" />
              <ActionCard wide href="/perfil" icon={User} title="Mi perfil" desc="Actualizá tu nombre y teléfono de contacto." cta="Editar perfil" />
            </>
          )}
        </div>

        <p className="mt-6 flex items-center gap-1.5 text-sm text-slate-400">
          <MapPin className="h-4 w-4" /> {user.email} · sesión {esAdmin ? "de administrador" : "de jugador"}
        </p>
      </main>
    </>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  desc,
  cta,
  featured,
  wide,
}: {
  href: string;
  icon: typeof LayoutGrid;
  title: string;
  desc: string;
  cta: string;
  featured?: boolean;
  wide?: boolean;
}) {
  return (
    <a
      href={href}
      className={`group surface flex flex-col justify-between gap-6 p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lift ${
        featured ? "md:col-span-2 md:row-span-1 bg-gradient-to-br from-brand-50 to-white" : ""
      } ${wide ? "md:col-span-3 flex-row items-center" : ""}`}
    >
      <div className={wide ? "flex items-center gap-4" : ""}>
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${featured ? "bg-brand-500 text-white" : "bg-ink-900 text-brand-400"} shadow-soft`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className={wide ? "" : "mt-4"}>
          <h3 className={`font-bold text-ink-900 ${featured ? "text-xl" : "text-lg"}`}>{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{desc}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
        {cta}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </a>
  );
}
