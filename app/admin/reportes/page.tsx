"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, Spinner, EmptyState } from "@/components/ui";
import { CalendarCheck, CalendarClock, TrendingUp, Wallet, ArrowLeft, ShieldAlert, type LucideIcon } from "lucide-react";

type Reserva = { id: string; inicio: string; pago_estado: string; canchas: { nombre: string; precio_turno: number } | null };

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function ReportesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<"cargando" | "no-admin" | "ok">("cargando");
  const [clubNombre, setClubNombre] = useState("");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [senas, setSenas] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (!email) return setEstado("no-admin");
      supabase.from("usuarios_club").select("clubes(nombre)").eq("email", email).maybeSingle().then(({ data: m }) => {
        if (!m) return setEstado("no-admin");
        const club = m.clubes as unknown as { nombre: string } | { nombre: string }[] | null;
        setClubNombre(Array.isArray(club) ? club[0]?.nombre : club?.nombre ?? "");
        setEstado("ok");
      });
    });
  }, [supabase]);

  useEffect(() => {
    if (estado !== "ok") return;
    supabase.from("reservas").select("id, inicio, pago_estado, canchas(nombre, precio_turno)").then(({ data }) => setReservas((data as unknown as Reserva[]) ?? []));
    supabase.from("pagos").select("monto").then(({ data }) => setSenas(((data as { monto: number }[]) ?? []).reduce((s, p) => s + Number(p.monto), 0)));
  }, [supabase, estado]);

  const ahora = Date.now();
  const t = useMemo(() => {
    const ingresos = reservas.reduce((s, r) => s + Number(r.canchas?.precio_turno ?? 0), 0);
    const proximas = reservas.filter((r) => new Date(r.inicio).getTime() >= ahora).length;
    const porCancha = new Map<string, { count: number; ingreso: number }>();
    for (const r of reservas) {
      const k = r.canchas?.nombre ?? "?";
      const cur = porCancha.get(k) ?? { count: 0, ingreso: 0 };
      cur.count += 1;
      cur.ingreso += Number(r.canchas?.precio_turno ?? 0);
      porCancha.set(k, cur);
    }
    const filas = [...porCancha.entries()].sort((a, b) => b[1].count - a[1].count);
    const maxCount = Math.max(1, ...filas.map((f) => f[1].count));
    return { ingresos, proximas, filas, maxCount };
  }, [reservas, ahora]);

  return (
    <>
      <AppHeader />
      <main className="container-app py-8">
        <div className="flex flex-col gap-6">
          <div>
            <a href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink-900">
              <ArrowLeft className="h-4 w-4" /> Panel
            </a>
            <p className="eyebrow mt-3">Métricas del club</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900">Reportes · {clubNombre}</h1>
          </div>

          {estado === "cargando" && <Spinner />}
          {estado === "no-admin" && <EmptyState icon={ShieldAlert} title="Acceso solo para administradores" />}

          {estado === "ok" && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Tile icon={CalendarCheck} label="Reservas totales" value={String(reservas.length)} />
                <Tile icon={CalendarClock} label="Próximas" value={String(t.proximas)} />
                <Tile icon={TrendingUp} label="Ingreso estimado" value={money.format(t.ingresos)} accent />
                <Tile icon={Wallet} label="Señas cobradas" value={money.format(senas)} />
              </div>

              <section className="flex flex-col gap-3">
                <h2 className="label-xs">Ocupación por cancha</h2>
                {t.filas.length === 0 ? (
                  <EmptyState icon={CalendarClock} title="Sin reservas todavía" />
                ) : (
                  <Card className="flex flex-col gap-5 p-6">
                    {t.filas.map(([nombre, d]) => (
                      <div key={nombre}>
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="font-semibold text-ink-900">{nombre}</span>
                          <span className="text-sm text-slate-500">
                            <span className="font-bold text-ink-900">{d.count}</span> turnos · {money.format(d.ingreso)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500" style={{ width: `${(d.count / t.maxCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
                <p className="text-xs text-slate-400">Ingreso estimado = suma del precio de todos los turnos reservados. Señas cobradas = pagos registrados.</p>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Tile({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`flex flex-col gap-3 p-5 ${accent ? "bg-ink-900 text-white" : ""}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent ? "bg-white/10 text-brand-300" : "bg-brand-50 text-brand-600"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className={`text-xs ${accent ? "text-white/60" : "text-slate-500"}`}>{label}</p>
        <p className={`mt-0.5 text-2xl font-extrabold tracking-tight ${accent ? "text-white" : "text-ink-900"}`}>{value}</p>
      </div>
    </Card>
  );
}
