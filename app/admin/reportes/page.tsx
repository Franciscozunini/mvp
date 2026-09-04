"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";

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
    supabase
      .from("reservas")
      .select("id, inicio, pago_estado, canchas(nombre, precio_turno)")
      .then(({ data }) => setReservas((data as unknown as Reserva[]) ?? []));
    supabase.from("pagos").select("monto").then(({ data }) =>
      setSenas(((data as { monto: number }[]) ?? []).reduce((s, p) => s + Number(p.monto), 0))
    );
  }, [supabase, estado]);

  const ahora = Date.now();
  const totales = useMemo(() => {
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
      <main className="container-app py-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="h1">Reportes · {clubNombre}</h1>
            <a href="/admin" className="link text-sm">← Panel</a>
          </div>

          {estado === "cargando" && <p className="text-sm text-slate-500">Cargando…</p>}
          {estado === "no-admin" && <p className="text-sm text-slate-500">No sos admin de ningún club.</p>}

          {estado === "ok" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile label="Reservas" value={String(reservas.length)} />
                <Tile label="Próximas" value={String(totales.proximas)} />
                <Tile label="Ingreso estimado" value={money.format(totales.ingresos)} />
                <Tile label="Señas cobradas" value={money.format(senas)} />
              </div>

              <h2 className="h2">Ocupación por cancha</h2>
              {totales.filas.length === 0 ? (
                <p className="text-sm text-slate-500">Sin reservas todavía.</p>
              ) : (
                <div className="card flex flex-col gap-3">
                  {totales.filas.map(([nombre, d]) => (
                    <div key={nombre}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-700">{nombre}</span>
                        <span className="text-slate-500">{d.count} · {money.format(d.ingreso)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-brand" style={{ width: `${(d.count / totales.maxCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400">
                Ingreso estimado = suma del precio de todos los turnos reservados. Señas cobradas = pagos registrados.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
