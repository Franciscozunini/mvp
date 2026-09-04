// Genera los turnos de una cancha para una fecha y adjunta la reserva/bloqueo que lo ocupa.
// Argentina no usa horario de verano: offset fijo -03:00. La hora se guarda en UTC.
const AR_OFFSET = "-03:00";

export type ReservaSlot = { id: string; jugador_id: string | null; pago_estado: string };
export type Slot = { inicio: Date; fin: Date; reserva: ReservaSlot | null; bloqueado: boolean };

// Convierte una hora local AR (fecha 'YYYY-MM-DD' + 'HH:MM') al instante UTC.
export function arLocalToUtc(fecha: string, hhmm: string): Date {
  return new Date(`${fecha}T${hhmm.slice(0, 5)}:00${AR_OFFSET}`);
}

const solapa = (t: number, fin: number, a: number, b: number) => t < b && a < fin;

export function generarSlots(params: {
  fecha: string; // 'YYYY-MM-DD' (fecha local AR)
  apertura: string; // 'HH:MM' o 'HH:MM:SS'
  cierre: string;
  duracionMin: number;
  reservas: { id: string; jugador_id: string | null; pago_estado?: string; inicio: string; fin: string }[];
  bloqueos?: { inicio: string; fin: string }[];
}): Slot[] {
  const { fecha, apertura, cierre, duracionMin, reservas, bloqueos = [] } = params;
  const open = arLocalToUtc(fecha, apertura).getTime();
  const close = arLocalToUtc(fecha, cierre).getTime();
  const res = reservas.map((r) => ({
    a: new Date(r.inicio).getTime(),
    b: new Date(r.fin).getTime(),
    ref: { id: r.id, jugador_id: r.jugador_id, pago_estado: r.pago_estado ?? "pendiente" } as ReservaSlot,
  }));
  const blo = bloqueos.map((r) => ({ a: new Date(r.inicio).getTime(), b: new Date(r.fin).getTime() }));
  const step = duracionMin * 60_000;
  const slots: Slot[] = [];
  for (let t = open; t + step <= close; t += step) {
    const fin = t + step;
    const match = res.find((r) => solapa(t, fin, r.a, r.b));
    const bloqueado = blo.some((r) => solapa(t, fin, r.a, r.b));
    slots.push({ inicio: new Date(t), fin: new Date(fin), reserva: match?.ref ?? null, bloqueado });
  }
  return slots;
}
