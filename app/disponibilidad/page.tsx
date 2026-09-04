"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generarSlots, arLocalToUtc, type Slot } from "@/lib/slots";
import AppHeader from "@/components/AppHeader";
import { Card, Badge, Field, Select, Segmented, Button, Modal, Notice, EmptyState } from "@/components/ui";
import { CalendarX2, Umbrella, Sun, Clock, Wallet, Check, ChevronLeft, ChevronRight } from "lucide-react";

type Club = { id: string; nombre: string };
type Sede = { id: string; nombre: string; direccion?: string | null };
type Cancha = {
  id: string;
  nombre: string;
  techada: boolean;
  duracion_turno_minutos: number;
  horario_apertura: string;
  horario_cierre: string;
  precio_turno: number;
};
type Reglas = { anticipacion_min_horas: number; cancelacion_min_horas: number };
type Sel = { reserva: NonNullable<Slot["reserva"]>; slot: Slot; cancha: Cancha } | null;

const TZ = "America/Argentina/Buenos_Aires";
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const hhmm = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fechaLarga = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const hoyAR = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const H = 3_600_000;

function buildDias(n: number) {
  const base = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
    const dow = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "short" }).format(d).replace(".", "");
    const num = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "numeric" }).format(d);
    return { iso, dow, num, hoy: i === 0 };
  });
}

export default function DisponibilidadPage() {
  const supabase = useMemo(() => createClient(), []);
  const dias = useMemo(() => buildDias(14), []);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [clubId, setClubId] = useState("");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [fecha, setFecha] = useState(hoyAR);
  const [slotsBy, setSlotsBy] = useState<Record<string, Slot[]>>({});
  const [cargando, setCargando] = useState(true);
  const [miJugadorId, setMiJugadorId] = useState<string | null>(null);
  const [reglas, setReglas] = useState<Reglas>({ anticipacion_min_horas: 0, cancelacion_min_horas: 0 });
  const [filtro, setFiltro] = useState<"todas" | "cubierta" | "descubierta">("todas");
  const [version, setVersion] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel>(null);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (!email) return setMiJugadorId(null);
      supabase.from("jugadores").select("id").eq("email", email).maybeSingle().then(({ data: j }) =>
        setMiJugadorId((j as { id: string } | null)?.id ?? null)
      );
    });
  }, [supabase]);

  useEffect(() => {
    supabase.from("clubes").select("id, nombre").order("nombre").then(({ data }) => {
      const rows = (data as Club[]) ?? [];
      setClubes(rows);
      setClubId((prev) => prev || rows[0]?.id || "");
    });
  }, [supabase]);

  useEffect(() => {
    if (!clubId) return;
    supabase.from("sedes").select("id, nombre, direccion").eq("club_id", clubId).order("nombre").then(({ data }) => {
      const rows = (data as Sede[]) ?? [];
      setSedes(rows);
      setSedeId(rows[0]?.id || "");
    });
    supabase
      .from("reglas_club")
      .select("anticipacion_min_horas, cancelacion_min_horas")
      .eq("club_id", clubId)
      .maybeSingle()
      .then(({ data }) => setReglas((data as Reglas) ?? { anticipacion_min_horas: 0, cancelacion_min_horas: 0 }));
  }, [supabase, clubId]);

  useEffect(() => {
    if (!sedeId) return;
    supabase
      .from("canchas")
      .select("id, nombre, techada, duracion_turno_minutos, horario_apertura, horario_cierre, precio_turno")
      .eq("sede_id", sedeId)
      .order("nombre")
      .then(({ data }) => setCanchas((data as Cancha[]) ?? []));
  }, [supabase, sedeId]);

  useEffect(() => {
    if (canchas.length === 0) {
      setSlotsBy({});
      setCargando(false);
      return;
    }
    setCargando(true);
    Promise.all(
      canchas.map(async (c) => {
        const openIso = arLocalToUtc(fecha, c.horario_apertura).toISOString();
        const closeIso = arLocalToUtc(fecha, c.horario_cierre).toISOString();
        const [r, b] = await Promise.all([
          supabase.from("reservas").select("id, jugador_id, pago_estado, inicio, fin").eq("cancha_id", c.id).neq("estado", "cancelada").lt("inicio", closeIso).gt("fin", openIso),
          supabase.from("bloqueos").select("inicio, fin").eq("cancha_id", c.id).lt("inicio", closeIso).gt("fin", openIso),
        ]);
        return [
          c.id,
          generarSlots({
            fecha,
            apertura: c.horario_apertura,
            cierre: c.horario_cierre,
            duracionMin: c.duracion_turno_minutos,
            reservas: (r.data as never[]) ?? [],
            bloqueos: (b.data as { inicio: string; fin: string }[]) ?? [],
          }),
        ] as const;
      })
    ).then((entries) => {
      setSlotsBy(Object.fromEntries(entries));
      setCargando(false);
    });
  }, [supabase, canchas, fecha, version]);

  async function reservar(cancha: Cancha, slot: Slot) {
    if (!miJugadorId) return;
    setMsg(null);
    const { error } = await supabase.from("reservas").insert({
      cancha_id: cancha.id,
      jugador_id: miJugadorId,
      inicio: slot.inicio.toISOString(),
      fin: slot.fin.toISOString(),
    });
    if (error) setMsg(error.message);
    recargar();
  }

  async function cancelar(reservaId: string) {
    setMsg(null);
    const { error } = await supabase.from("reservas").delete().eq("id", reservaId);
    if (error) setMsg(error.message);
    setSel(null);
    recargar();
  }

  const canchasFiltradas = canchas.filter((c) =>
    filtro === "todas" ? true : filtro === "cubierta" ? c.techada : !c.techada
  );
  const selCancelable = sel ? Date.now() < sel.slot.inicio.getTime() - reglas.cancelacion_min_horas * H : false;

  return (
    <>
      <AppHeader />
      <main className="container-app py-8">
        <div className="flex flex-col gap-6">
          <header>
            <p className="eyebrow">Reservá tu cancha</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900">Disponibilidad</h1>
            <p className="mt-1 capitalize text-slate-500">{fechaLarga.format(arLocalToUtc(fecha, "12:00"))}</p>
          </header>

          {/* Club / sede */}
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Club">
              <Select value={clubId} onChange={(e) => setClubId(e.target.value)}>
                {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Sede">
              <Select value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
            </Field>
          </Card>

          {/* Tira de días */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const i = dias.findIndex((d) => d.iso === fecha); if (i > 0) setFecha(dias[i - 1].iso); }}
              className="grid h-11 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-soft hover:text-ink-900 disabled:opacity-40"
              disabled={dias.findIndex((d) => d.iso === fecha) <= 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dias.map((d) => {
                const on = d.iso === fecha;
                return (
                  <button
                    key={d.iso}
                    onClick={() => setFecha(d.iso)}
                    className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border text-center transition ${
                      on ? "border-ink-900 bg-ink-900 text-white shadow-card" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-[11px] font-semibold uppercase ${on ? "text-brand-300" : "text-slate-400"}`}>{d.hoy ? "Hoy" : d.dow}</span>
                    <span className="text-lg font-bold">{d.num}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { const i = dias.findIndex((d) => d.iso === fecha); if (i < dias.length - 1) setFecha(dias[i + 1].iso); }}
              className="grid h-11 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-soft hover:text-ink-900 disabled:opacity-40"
              disabled={dias.findIndex((d) => d.iso === fecha) >= dias.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Filtros + leyenda */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              size="sm"
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: "todas", label: "Todas" },
                { value: "cubierta", label: "Cubiertas", icon: Umbrella },
                { value: "descubierta", label: "Descubiertas", icon: Sun },
              ]}
            />
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand-400" /> Libre</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-ink-900" /> Tuyo</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-200" /> Ocupado</span>
            </div>
          </div>

          {!miJugadorId && (
            <Notice tone="green">Estás viendo la grilla en modo lectura. Iniciá sesión como jugador para reservar.</Notice>
          )}
          {msg && <Notice>{msg}</Notice>}

          {/* Canchas */}
          {cargando ? (
            <div className="flex flex-col gap-4">{[0, 1].map((i) => <CourtSkeleton key={i} />)}</div>
          ) : canchasFiltradas.length === 0 ? (
            <EmptyState icon={CalendarX2} title="No hay canchas para mostrar" description="Probá con otra sede o cambiá el filtro." />
          ) : (
            <div className="flex flex-col gap-4">
              {canchasFiltradas.map((c) => {
                const slots = slotsBy[c.id] ?? [];
                const libres = slots.filter((s) => !s.reserva && !s.bloqueado).length;
                return (
                  <Card key={c.id} className="animate-fade-up p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-ink-900">{c.nombre}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone={c.techada ? "green" : "gray"} icon={c.techada ? Umbrella : Sun}>{c.techada ? "Cubierta" : "Descubierta"}</Badge>
                          <Badge tone="outline" icon={Clock}>{c.duracion_turno_minutos} min</Badge>
                          <Badge tone="ink" icon={Wallet}>{money.format(Number(c.precio_turno))}</Badge>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-400">
                        {libres > 0 ? <span className="text-brand-600">{libres} libres</span> : "Completo"}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {slots.map((s, i) => (
                        <SlotPill
                          key={i}
                          slot={s}
                          cancha={c}
                          miJugadorId={miJugadorId}
                          antic={reglas.anticipacion_min_horas}
                          onReservar={() => reservar(c, s)}
                          onMia={() => setSel({ reserva: s.reserva!, slot: s, cancha: c })}
                        />
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de gestión de turno propio */}
      <Modal open={!!sel} onClose={() => setSel(null)} title="Tu turno">
        {sel && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-extrabold tracking-tight text-ink-900">
                {hhmm.format(sel.slot.inicio)}–{hhmm.format(sel.slot.fin)}
              </p>
              <p className="mt-1 text-sm text-slate-500">{sel.cancha.nombre} · {money.format(Number(sel.cancha.precio_turno))}</p>
              <div className="mt-3">
                {sel.reserva.pago_estado === "senada"
                  ? <Badge tone="green" icon={Check}>Seña pagada</Badge>
                  : <Badge tone="amber">Seña pendiente</Badge>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {sel.reserva.pago_estado !== "senada" && (
                <Button href={`/pago/${sel.reserva.id}`} full icon={Wallet}>Pagar seña</Button>
              )}
              {selCancelable ? (
                <Button variant="outline" full onClick={() => cancelar(sel.reserva.id)}>Cancelar turno</Button>
              ) : (
                <p className="text-center text-xs text-slate-400">
                  No se puede cancelar con menos de {reglas.cancelacion_min_horas}h de anticipación.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function SlotPill({
  slot,
  cancha,
  miJugadorId,
  antic,
  onReservar,
  onMia,
}: {
  slot: Slot;
  cancha: Cancha;
  miJugadorId: string | null;
  antic: number;
  onReservar: () => void;
  onMia: () => void;
}) {
  const label = hhmm.format(slot.inicio);
  const mia = !!slot.reserva && slot.reserva.jugador_id === miJugadorId;
  const ocupado = !!slot.reserva;
  const reservable = miJugadorId && !ocupado && !slot.bloqueado && slot.inicio.getTime() >= Date.now() + antic * H;

  if (slot.bloqueado) return <span className="slot slot-blocked">{label}</span>;
  if (mia)
    return (
      <button onClick={onMia} className="slot slot-mine">
        {label}
        <span className={`h-1.5 w-1.5 rounded-full ${slot.reserva!.pago_estado === "senada" ? "bg-brand-400" : "bg-amber-400"}`} />
      </button>
    );
  if (ocupado) return <span className="slot slot-busy">{label}</span>;
  if (reservable) return <button onClick={onReservar} className="slot slot-free">{label}</button>;
  return <span className="slot border-slate-200 bg-white text-slate-300">{label}</span>;
}

function CourtSkeleton() {
  return (
    <div className="surface p-6">
      <div className="skeleton h-6 w-32" />
      <div className="mt-3 flex gap-2">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-6 w-16" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-11 w-[92px]" />)}
      </div>
    </div>
  );
}
