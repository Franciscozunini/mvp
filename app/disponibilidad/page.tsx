"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generarSlots, arLocalToUtc, type Slot } from "@/lib/slots";

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

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const hoyAR = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
}).format(new Date());

const hhmm = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
});

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
  const [version, setVersion] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  // Quién soy: si el usuario logueado tiene fila en jugadores, puede reservar.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (!email) return setMiJugadorId(null);
      supabase
        .from("jugadores")
        .select("id")
        .eq("email", email)
        .maybeSingle()
        .then(({ data: j }) => setMiJugadorId((j as { id: string } | null)?.id ?? null));
    });
  }, [supabase]);

  // Clubes (una vez).
  useEffect(() => {
    supabase
      .from("clubes")
      .select("id, nombre")
      .order("nombre")
      .then(({ data }) => {
        const rows = (data as Club[]) ?? [];
        setClubes(rows);
        setClubId((prev) => prev || rows[0]?.id || "");
      });
  }, [supabase]);

  // Sedes del club.
  useEffect(() => {
    if (!clubId) return;
    supabase
      .from("sedes")
      .select("id, nombre")
      .eq("club_id", clubId)
      .order("nombre")
      .then(({ data }) => {
        const rows = (data as Sede[]) ?? [];
        setSedes(rows);
        setSedeId(rows[0]?.id || "");
      });
  }, [supabase, clubId]);

  // Canchas de la sede.
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

  // Slots según cancha + fecha (+ version para refrescar tras reservar/cancelar).
  useEffect(() => {
    const cancha = canchas.find((c) => c.id === canchaId);
    if (!cancha || !fecha) {
      setSlots([]);
      return;
    }
    setCargando(true);
    const openIso = arLocalToUtc(fecha, cancha.horario_apertura).toISOString();
    const closeIso = arLocalToUtc(fecha, cancha.horario_cierre).toISOString();
    supabase
      .from("reservas")
      .select("id, jugador_id, inicio, fin")
      .eq("cancha_id", cancha.id)
      .neq("estado", "cancelada")
      .lt("inicio", closeIso)
      .gt("fin", openIso)
      .then(({ data }) => {
        setSlots(
          generarSlots({
            fecha,
            apertura: cancha.horario_apertura,
            cierre: cancha.horario_cierre,
            duracionMin: cancha.duracion_turno_minutos,
            reservas:
              (data as { id: string; jugador_id: string | null; inicio: string; fin: string }[]) ??
              [],
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
    if (error) setMsg("No se pudo reservar (¿turno ya tomado?).");
    recargar();
  }

  async function cancelar(reservaId: string) {
    setMsg(null);
    const { error } = await supabase.from("reservas").delete().eq("id", reservaId);
    if (error) setMsg("No se pudo cancelar.");
    recargar();
  }

  const canchaSel = canchas.find((c) => c.id === canchaId);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Disponibilidad</h1>
        <a href="/dashboard" className="text-sm underline">
          ← Volver
        </a>
      </div>

      <p className="text-xs text-gray-600">
        {miJugadorId
          ? "Sesión de jugador: podés reservar turnos libres y cancelar los tuyos."
          : "Modo lectura. Iniciá sesión como jugador para reservar."}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Club
          <select value={clubId} onChange={(e) => setClubId(e.target.value)} className="rounded border px-2 py-1">
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Sede
          <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="rounded border px-2 py-1">
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cancha
          <select value={canchaId} onChange={(e) => setCanchaId(e.target.value)} className="rounded border px-2 py-1">
            {canchas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded border px-2 py-1" />
        </label>
      </div>

      {canchaSel && (
        <p className="text-xs text-gray-600">
          Turnos de {canchaSel.duracion_turno_minutos} min ·{" "}
          {canchaSel.horario_apertura.slice(0, 5)}–{canchaSel.horario_cierre.slice(0, 5)} (hora AR) ·{" "}
          {money.format(Number(canchaSel.precio_turno))} por turno
        </p>
      )}

      {msg && <p className="text-sm text-red-600">{msg}</p>}

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-gray-500">Sin turnos para mostrar.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((s, i) => {
            const esMia = !!s.reserva && s.reserva.jugador_id === miJugadorId;
            const ocupado = !!s.reserva;
            return (
              <li
                key={i}
                className={`rounded border px-2 py-2 text-center text-sm ${
                  esMia
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : ocupado
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-green-300 bg-green-50 text-green-700"
                }`}
              >
                <div className="font-medium">
                  {hhmm.format(s.inicio)}–{hhmm.format(s.fin)}
                </div>
                {esMia ? (
                  <button onClick={() => cancelar(s.reserva!.id)} className="mt-1 text-xs underline">
                    Cancelar
                  </button>
                ) : ocupado ? (
                  <div className="text-xs">Ocupado</div>
                ) : miJugadorId ? (
                  <button onClick={() => reservar(s)} className="mt-1 text-xs underline">
                    Reservar
                  </button>
                ) : (
                  <div className="text-xs">Libre</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
