"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";

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
    <>
      <AppHeader />
      <main className="container-app py-6">
        <div className="mx-auto flex max-w-sm flex-col gap-4">
          <h1 className="h1">Pago de seña</h1>

          {estado === "cargando" && <p className="text-sm text-slate-500">Cargando…</p>}
          {estado === "error" && <p className="text-sm text-rose-600">Reserva no encontrada.</p>}

          {estado !== "cargando" && estado !== "error" && (
            <div className="card flex flex-col gap-1 text-sm">
              <p><span className="font-medium text-slate-900">Turno:</span> {inicio ? fechaHora.format(new Date(inicio)) : "—"}</p>
              <p><span className="font-medium text-slate-900">Seña a pagar:</span> {money.format(sena)}</p>
              <p>
                <span className="font-medium text-slate-900">Estado:</span>{" "}
                <span className={`badge ${pagoEstado === "senada" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {pagoEstado === "senada" ? "Señada ✓" : "Pendiente"}
                </span>
              </p>
            </div>
          )}

          {estado === "listo" && (
            <button onClick={pagar} disabled={procesando} className="btn-primary">
              {procesando ? "Procesando…" : `Pagar seña (simulado) · ${money.format(sena)}`}
            </button>
          )}

          {estado === "pagado" && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              ¡Seña registrada! Tu turno queda confirmado.
            </p>
          )}

          <p className="text-xs text-slate-400">
            Pago en modo simulado (sin cobro real). Acá se integra la pasarela (ej. MercadoPago):
            el botón crearía la preferencia de pago y, al aprobarse vía webhook, se registra en la
            tabla <code>pagos</code> y la reserva pasa a señada.
          </p>

          <a href="/disponibilidad" className="link text-sm">← Volver a disponibilidad</a>
        </div>
      </main>
    </>
  );
}
