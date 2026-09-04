"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "short",
  timeStyle: "short",
});

export default function PagoPage({ params }: { params: { id: string } }) {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<"cargando" | "listo" | "pagado" | "error">("cargando");
  const [inicio, setInicio] = useState<string>("");
  const [pagoEstado, setPagoEstado] = useState("pendiente");
  const [sena, setSena] = useState(0);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    supabase
      .from("reservas")
      .select("id, inicio, pago_estado, canchas(precio_turno, sedes(club_id))")
      .eq("id", params.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return setEstado("error");
        const r = data as unknown as {
          inicio: string;
          pago_estado: string;
          canchas: { precio_turno: number; sedes: { club_id: string } } | null;
        };
        setInicio(r.inicio);
        setPagoEstado(r.pago_estado);
        const clubId = r.canchas?.sedes?.club_id;
        let pct = 30;
        if (clubId) {
          const { data: reg } = await supabase
            .from("reglas_club")
            .select("sena_porcentaje")
            .eq("club_id", clubId)
            .maybeSingle();
          if (reg) pct = (reg as { sena_porcentaje: number }).sena_porcentaje;
        }
        setSena(Math.round((Number(r.canchas?.precio_turno ?? 0) * pct) / 100));
        setEstado(r.pago_estado === "senada" ? "pagado" : "listo");
      });
  }, [supabase, params.id]);

  async function pagar() {
    setProcesando(true);
    const { error } = await supabase.from("pagos").insert({ reserva_id: params.id, monto: sena });
    setProcesando(false);
    if (error) return alert(error.message);
    setPagoEstado("senada");
    setEstado("pagado");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">Pago de seña</h1>

      {estado === "cargando" && <p className="text-sm text-gray-500">Cargando…</p>}
      {estado === "error" && <p className="text-sm text-red-600">Reserva no encontrada.</p>}

      {estado !== "cargando" && estado !== "error" && (
        <div className="rounded border bg-white p-4 text-sm">
          <p><span className="font-semibold">Turno:</span> {inicio ? fechaHora.format(new Date(inicio)) : "—"}</p>
          <p><span className="font-semibold">Seña a pagar:</span> {money.format(sena)}</p>
          <p><span className="font-semibold">Estado:</span> {pagoEstado === "senada" ? "Señada ✓" : "Pendiente"}</p>
        </div>
      )}

      {estado === "listo" && (
        <button
          onClick={pagar}
          disabled={procesando}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {procesando ? "Procesando…" : `Pagar seña (simulado) · ${money.format(sena)}`}
        </button>
      )}

      {estado === "pagado" && <p className="text-sm text-green-700">¡Seña registrada! Tu turno queda confirmado.</p>}

      <p className="text-xs text-gray-400">
        Pago en modo simulado (sin cobro real). Acá se integra la pasarela (ej. MercadoPago):
        el botón crearía la preferencia de pago y, al aprobarse el pago vía webhook, se registra en
        la tabla <code>pagos</code> y la reserva pasa a señada.
      </p>

      <a href="/disponibilidad" className="text-sm underline">← Volver a disponibilidad</a>
    </main>
  );
}
