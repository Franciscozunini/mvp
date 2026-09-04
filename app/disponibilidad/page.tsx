"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generarSlots, arLocalToUtc, type Slot } from "@/lib/slots";
import AppHeader from "@/components/AppHeader";

type Club = { id: string; nombre: string };
type Sede = { id: string; nombre: string };
type Cancha = {
  id: string;
  nombre: string;
  duracion_turno_minutos: number;
  horario_apertura: string;
  horario_cierre: string;
  precio_turno: number;
};
type Reglas = { anticipacion_min_horas: number; cancelacion_min_horas: number };

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const hoyAR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const hhmm = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });
const H = 3_600_000;

export default function DisponibilidadPage() {
  const supabase = useMemo(() => createClient(), []);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [clubId, setClubId] = useState("");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [canchaId, setCanchaId] = useState("");
  const [fecha, setFecha] = useState(hoyAR);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cargando, setCargando] = useState(false);
  const [miJugadorId, setMiJugadorId] = useState<string | null>(null);
  const [reglas, setReglas] = useState<Reglas>({ anticipacion_min_horas: 0, cancelacion_min_horas: 0 });
  const [version, setVersion] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

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
    supabase.from("sedes").select("id, nombre").eq("club_id", clubId).order("nombre").then(({ data }) => {
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
      .select("id, nombre, duracion_turno_minutos, horario_apertura, horario_cierre, precio_turno")
      .eq("sede_id", sedeId)
      .order("nombre")
      .then(({ data }) => {
        const rows = (data as Cancha[]) ?? [];
        setCanchas(rows);
        setCanchaId(rows[0]?.id || "");
      });
  }, [supabase, sedeId]);

  useEffect(() => {
    const cancha = canchas.find((c) => c.id === canchaId);
    if (!cancha || !fecha) return setSlots([]);
    setCargando(true);
    const openIso = arLocalToUtc(fecha, cancha.horario_apertura).toISOString();
    const closeIso = arLocalToUtc(fecha, cancha.horario_cierre).toISOString();
    Promise.all([
      supabase.from("reservas").select("id, jugador_id, pago_estado, inicio, fin").eq("cancha_id", cancha.id).neq("estado", "cancelada").lt("inicio", closeIso).gt("fin", openIso),
      supabase.from("bloqueos").select("inicio, fin").eq("cancha_id", cancha.id).lt("inicio", closeIso).gt("fin", openIso),
    ]).then(([r, b]) => {
      setSlots(
        generarSlots({
          fecha,
          apertura: cancha.horario_apertura,
          cierre: cancha.horario_cierre,
          duracionMin: cancha.duracion_turno_minutos,
          reservas: (r.data as never[]) ?? [],
          bloqueos: (b.data as { inicio: string; fin: string }[]) ?? [],
        })
      );
      setCargando(false);
    });
  }, [supabase, canchaId, canchas, fecha, version]);

  async function reservar(slot: Slot) {
    if (!miJugadorId) return;
    setMsg(null);
    const { error } = await supabase.from("reservas").insert({
      cancha_id: canchaId,
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
    recargar();
  }

  const canchaSel = canchas.find((c) => c.id === canchaId);
  const sel = "select";

  return (
    <>
      <AppHeader />
      <main className="container-app py-6">
        <div className="flex flex-col gap-4">
          <h1 className="h1">Disponibilidad</h1>
          <p className="text-sm text-slate-500">
            {miJugadorId
              ? "Reservá un turno libre y cancelá los tuyos."
              : "Modo lectura. Iniciá sesión como jugador para reservar."}
          </p>

          <div className="card grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="label">Club
              <select value={clubId} onChange={(e) => setClubId(e.target.value)} className={sel}>
                {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="label">Sede
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className={sel}>
                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </label>
            <label className="label">Cancha
              <select value={canchaId} onChange={(e) => setCanchaId(e.target.value)} className={sel}>
                {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="label">Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
            </label>
          </div>

          {canchaSel && (
            <p className="text-xs text-slate-500">
              Turnos de {canchaSel.duracion_turno_minutos} min · {canchaSel.horario_apertura.slice(0, 5)}–
              {canchaSel.horario_cierre.slice(0, 5)} (hora AR) · {money.format(Number(canchaSel.precio_turno))} por turno
              {reglas.anticipacion_min_horas > 0 && ` · reservar con ${reglas.anticipacion_min_horas}h de anticipación`}
            </p>
          )}

          {msg && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p>}

          {cargando ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500">Sin turnos para mostrar.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((s, i) => {
                const ahora = Date.now();
                const esMia = !!s.reserva && s.reserva.jugador_id === miJugadorId;
                const ocupado = !!s.reserva;
                const reservable = miJugadorId && !ocupado && !s.bloqueado && s.inicio.getTime() >= ahora + reglas.anticipacion_min_horas * H;
                const cancelable = esMia && ahora < s.inicio.getTime() - reglas.cancelacion_min_horas * H;
                const cls = s.bloqueado ? "chip-bloq" : esMia ? "chip-mia" : ocupado ? "chip-ocupado" : "chip-libre";
                return (
                  <li key={i} className={`chip ${cls}`}>
                    <div className="font-medium">{hhmm.format(s.inicio)}–{hhmm.format(s.fin)}</div>
                    {s.bloqueado ? (
                      <div className="text-xs">No disponible</div>
                    ) : esMia ? (
                      <div className="text-xs">
                        <div>{s.reserva!.pago_estado === "senada" ? "Señada ✓" : "Sin señar"}</div>
                        <div className="mt-0.5 flex justify-center gap-2">
                          {s.reserva!.pago_estado !== "senada" && <a href={`/pago/${s.reserva!.id}`} className="link">Pagar seña</a>}
                          {cancelable && <button onClick={() => cancelar(s.reserva!.id)} className="underline underline-offset-2">Cancelar</button>}
                        </div>
                      </div>
                    ) : ocupado ? (
                      <div className="text-xs">Ocupado</div>
                    ) : reservable ? (
                      <button onClick={() => reservar(s)} className="mt-1 text-xs font-medium text-emerald-700 underline underline-offset-2">Reservar</button>
                    ) : (
                      <div className="text-xs">Libre</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
