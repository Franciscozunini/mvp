"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";

type Reserva = {
  id: string;
  inicio: string;
  fin: string;
  pago_estado: string;
  canchas: { nombre: string; precio_turno: number; sedes: { nombre: string } | null } | null;
};

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const fechaHora = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "medium", timeStyle: "short" });

export default function MisReservasPage() {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<"cargando" | "no-jugador" | "ok">("cargando");
  const [jugadorId, setJugadorId] = useState("");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [v, setV] = useState(0);
  const recargar = useCallback(() => setV((n) => n + 1), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (!email) return setEstado("no-jugador");
      supabase.from("jugadores").select("id").eq("email", email).maybeSingle().then(({ data: j }) => {
        const id = (j as { id: string } | null)?.id;
        if (!id) return setEstado("no-jugador");
        setJugadorId(id);
        setEstado("ok");
      });
    });
  }, [supabase]);

  useEffect(() => {
    if (estado !== "ok") return;
    supabase
      .from("reservas")
      .select("id, inicio, fin, pago_estado, canchas(nombre, precio_turno, sedes(nombre))")
      .eq("jugador_id", jugadorId)
      .neq("estado", "cancelada")
      .order("inicio", { ascending: true })
      .then(({ data }) => setReservas((data as unknown as Reserva[]) ?? []));
  }, [supabase, estado, jugadorId, v]);

  async function cancelar(id: string) {
    setMsg(null);
    const { error } = await supabase.from("reservas").delete().eq("id", id);
    if (error) setMsg(error.message);
    recargar();
  }

  const ahora = Date.now();
  const proximas = reservas.filter((r) => new Date(r.inicio).getTime() >= ahora);
  const pasadas = reservas.filter((r) => new Date(r.inicio).getTime() < ahora).reverse();

  const Item = ({ r, futura }: { r: Reserva; futura: boolean }) => (
    <div className="card flex items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-medium text-slate-900">{fechaHora.format(new Date(r.inicio))}</p>
        <p className="text-slate-500">
          {r.canchas?.sedes?.nombre ?? ""} · {r.canchas?.nombre ?? "?"} · {money.format(Number(r.canchas?.precio_turno ?? 0))}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className={`badge ${r.pago_estado === "senada" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {r.pago_estado === "senada" ? "Señada" : "Sin señar"}
        </span>
        {futura && r.pago_estado !== "senada" && <a href={`/pago/${r.id}`} className="link">Pagar seña</a>}
        {futura && <button onClick={() => cancelar(r.id)} className="btn-danger">Cancelar</button>}
      </div>
    </div>
  );

  return (
    <>
      <AppHeader />
      <main className="container-app py-6">
        <div className="flex flex-col gap-4">
          <h1 className="h1">Mis reservas</h1>

          {estado === "cargando" && <p className="text-sm text-slate-500">Cargando…</p>}
          {estado === "no-jugador" && (
            <p className="text-sm text-slate-500">Esta cuenta no es de jugador. <a href="/dashboard" className="link">Volver</a></p>
          )}

          {estado === "ok" && (
            <>
              {msg && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p>}

              <h2 className="h2">Próximas</h2>
              {proximas.length === 0 ? (
                <p className="text-sm text-slate-500">No tenés turnos próximos. <a href="/disponibilidad" className="link">Reservá uno</a>.</p>
              ) : (
                <div className="flex flex-col gap-2">{proximas.map((r) => <Item key={r.id} r={r} futura />)}</div>
              )}

              <h2 className="h2">Historial</h2>
              {pasadas.length === 0 ? (
                <p className="text-sm text-slate-500">Sin turnos pasados.</p>
              ) : (
                <div className="flex flex-col gap-2">{pasadas.map((r) => <Item key={r.id} r={r} futura={false} />)}</div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
