"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, Button, Badge, Spinner, EmptyState } from "@/components/ui";
import { Wallet, Check, ShieldCheck, ArrowLeft, CalendarX2 } from "lucide-react";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const fechaHora = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "long", timeStyle: "short" });

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
          const { data: reg } = await supabase.from("reglas_club").select("sena_porcentaje").eq("club_id", clubId).maybeSingle();
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
      <main className="container-app py-8">
        <div className="mx-auto flex max-w-md flex-col gap-5">
          <a href="/mis-reservas" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink-900">
            <ArrowLeft className="h-4 w-4" /> Mis reservas
          </a>

          {estado === "cargando" && <Spinner />}
          {estado === "error" && <EmptyState icon={CalendarX2} title="Reserva no encontrada" description="Es posible que ya no exista." action={<Button href="/disponibilidad" variant="outline">Ver disponibilidad</Button>} />}

          {estado !== "cargando" && estado !== "error" && (
            <Card className="overflow-hidden p-0">
              <div className="relative overflow-hidden bg-ink-900 p-6 text-white">
                <div className="court-lines pointer-events-none absolute inset-0 opacity-50" />
                <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-500/25 blur-2xl" />
                <p className="relative eyebrow text-brand-300">Pago de seña</p>
                <p className="relative mt-2 text-sm text-white/60">A pagar ahora</p>
                <p className="relative text-4xl font-extrabold tracking-tight">{money.format(sena)}</p>
              </div>
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Turno</span>
                  <span className="font-semibold text-ink-900">{inicio ? fechaHora.format(new Date(inicio)) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Estado</span>
                  {pagoEstado === "senada" ? <Badge tone="green" icon={Check}>Señada</Badge> : <Badge tone="amber">Pendiente</Badge>}
                </div>

                {estado === "listo" && (
                  <Button onClick={pagar} loading={procesando} size="lg" full icon={Wallet}>
                    {procesando ? "Procesando…" : "Pagar seña"}
                  </Button>
                )}
                {estado === "pagado" && (
                  <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
                    <ShieldCheck className="h-5 w-5" /> ¡Seña registrada! Tu turno queda confirmado.
                  </div>
                )}

                <p className="flex items-start gap-1.5 text-xs text-slate-400">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Pago en modo simulado (sin cobro real). Es el punto donde se integra la pasarela (ej. MercadoPago):
                  al aprobarse el pago vía webhook se registra en la tabla <code>pagos</code> y la reserva pasa a señada.
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
