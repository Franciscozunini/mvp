"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, Badge, Button, EmptyState, Spinner, Notice } from "@/components/ui";
import { CalendarPlus, MapPin, Wallet, Check, Clock } from "lucide-react";

type Reserva = {
  id: string;
  inicio: string;
  fin: string;
  pago_estado: string;
  canchas: { nombre: string; precio_turno: number; sedes: { nombre: string } | null } | null;
};

const TZ = "America/Argentina/Buenos_Aires";
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const dia = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const hora = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

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

  const Item = ({ r, futura }: { r: Reserva; futura: boolean }) => {
    const senada = r.pago_estado === "senada";
    return (
      <Card className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${futura ? "" : "opacity-80"}`}>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink-900 text-white">
            <span className="text-lg font-bold leading-none">{hora.format(new Date(r.inicio))}</span>
          </div>
          <div>
            <p className="font-semibold capitalize text-ink-900">{dia.format(new Date(r.inicio))}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> {r.canchas?.sedes?.nombre ?? ""} · {r.canchas?.nombre ?? "?"} · {money.format(Number(r.canchas?.precio_turno ?? 0))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {senada ? <Badge tone="green" icon={Check}>Señada</Badge> : <Badge tone="amber">Sin señar</Badge>}
          {futura && !senada && <Button href={`/pago/${r.id}`} size="sm" variant="outline" icon={Wallet}>Señar</Button>}
          {futura && <Button size="sm" variant="danger" onClick={() => cancelar(r.id)}>Cancelar</Button>}
        </div>
      </Card>
    );
  };

  return (
    <>
      <AppHeader />
      <main className="container-app py-8">
        <div className="flex flex-col gap-6">
          <header>
            <p className="eyebrow">Tus turnos</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900">Mis reservas</h1>
          </header>

          {estado === "cargando" && <Spinner />}
          {estado === "no-jugador" && (
            <EmptyState icon={CalendarPlus} title="Esta cuenta no es de jugador" description="Ingresá con una cuenta de jugador para ver tus reservas." action={<Button href="/dashboard" variant="outline">Volver al inicio</Button>} />
          )}

          {estado === "ok" && (
            <>
              {msg && <Notice>{msg}</Notice>}

              <section className="flex flex-col gap-3">
                <h2 className="label-xs flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Próximos turnos</h2>
                {proximas.length === 0 ? (
                  <EmptyState icon={CalendarPlus} title="No tenés turnos próximos" description="Buscá una cancha libre y reservá tu próximo partido." action={<Button href="/disponibilidad">Buscar turnos</Button>} />
                ) : (
                  <div className="flex flex-col gap-3">{proximas.map((r) => <Item key={r.id} r={r} futura />)}</div>
                )}
              </section>

              {pasadas.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="label-xs">Historial</h2>
                  <div className="flex flex-col gap-3">{pasadas.map((r) => <Item key={r.id} r={r} futura={false} />)}</div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
