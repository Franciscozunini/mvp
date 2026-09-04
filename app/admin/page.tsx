"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { arLocalToUtc } from "@/lib/slots";
import AppHeader from "@/components/AppHeader";
import { Card, Button, Badge, Spinner, EmptyState } from "@/components/ui";
import {
  Building2, MapPin, LayoutGrid, Ban, CalendarClock, SlidersHorizontal, Umbrella, Sun,
  Plus, Pencil, Trash2, Save, Check, ShieldAlert, BarChart3, Clock,
} from "lucide-react";

type Sede = { id: string; nombre: string; direccion: string | null };
type Cancha = { id: string; sede_id: string; nombre: string; techada: boolean; duracion_turno_minutos: number; horario_apertura: string; horario_cierre: string; precio_turno: number };
type Reserva = { id: string; inicio: string; pago_estado: string; canchas: { nombre: string } | null; jugadores: { nombre: string } | null };
type Bloqueo = { id: string; cancha_id: string; inicio: string; fin: string; motivo: string | null };
type Reglas = { anticipacion_min_horas: number; cancelacion_min_horas: number; max_reservas_activas: number; sena_porcentaje: number };

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const fechaHora = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });
const REGLAS_DEFAULT: Reglas = { anticipacion_min_horas: 1, cancelacion_min_horas: 2, max_reservas_activas: 3, sena_porcentaje: 30 };
type SB = ReturnType<typeof createClient>;

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<"cargando" | "no-admin" | "ok">("cargando");
  const [clubId, setClubId] = useState("");
  const [clubNombre, setClubNombre] = useState("");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [reglas, setReglas] = useState<Reglas>(REGLAS_DEFAULT);
  const [v, setV] = useState(0);
  const recargar = useCallback(() => setV((n) => n + 1), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (!email) return setEstado("no-admin");
      supabase.from("usuarios_club").select("club_id, clubes(nombre)").eq("email", email).maybeSingle().then(({ data: m }) => {
        if (!m) return setEstado("no-admin");
        const club = m.clubes as unknown as { nombre: string } | { nombre: string }[] | null;
        setClubId(m.club_id as string);
        setClubNombre(Array.isArray(club) ? club[0]?.nombre : club?.nombre ?? "");
        setEstado("ok");
      });
    });
  }, [supabase]);

  useEffect(() => {
    if (estado !== "ok") return;
    supabase.from("sedes").select("id, nombre, direccion").order("nombre").then(({ data }) => setSedes((data as Sede[]) ?? []));
    supabase.from("canchas").select("*").order("nombre").then(({ data }) => setCanchas((data as Cancha[]) ?? []));
    supabase.from("bloqueos").select("*").order("inicio").then(({ data }) => setBloqueos((data as Bloqueo[]) ?? []));
    supabase.from("reservas").select("id, inicio, pago_estado, canchas(nombre), jugadores(nombre)").order("inicio", { ascending: false }).limit(50)
      .then(({ data }) => setReservas((data as unknown as Reserva[]) ?? []));
    supabase.from("reglas_club").select("anticipacion_min_horas, cancelacion_min_horas, max_reservas_activas, sena_porcentaje").eq("club_id", clubId).maybeSingle()
      .then(({ data }) => setReglas((data as Reglas) ?? REGLAS_DEFAULT));
  }, [supabase, estado, clubId, v]);

  if (estado === "cargando") return <Wrap><Spinner /></Wrap>;
  if (estado === "no-admin") return <Wrap><EmptyState icon={ShieldAlert} title="Acceso solo para administradores" description="Ingresá con una cuenta de club." action={<Button href="/dashboard" variant="outline">Volver</Button>} /></Wrap>;

  return (
    <Wrap>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Panel de club</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900">{clubNombre}</h1>
        </div>
        <Button href="/admin/reportes" variant="outline" size="sm" icon={BarChart3}>Reportes</Button>
      </header>

      <Section icon={SlidersHorizontal} titulo="Reglas de reserva" desc="Se aplican a los jugadores; el club queda exento.">
        <ReglasForm clubId={clubId} reglas={reglas} supabase={supabase} onChange={recargar} />
      </Section>

      <Section icon={MapPin} titulo="Sedes">
        <div className="flex flex-col gap-2">
          {sedes.map((s) => <SedeItem key={s.id} sede={s} supabase={supabase} onChange={recargar} />)}
        </div>
        <NuevaSede clubId={clubId} supabase={supabase} onChange={recargar} />
      </Section>

      <Section icon={LayoutGrid} titulo="Canchas">
        {sedes.length === 0 ? (
          <p className="text-sm text-slate-500">Creá una sede primero.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {sedes.map((s) => (
              <Card key={s.id} className="p-5">
                <p className="mb-3 flex items-center gap-1.5 font-semibold text-ink-900"><MapPin className="h-4 w-4 text-slate-400" /> {s.nombre}</p>
                <div className="flex flex-col gap-2">
                  {canchas.filter((c) => c.sede_id === s.id).map((c) => <CanchaItem key={c.id} cancha={c} supabase={supabase} onChange={recargar} />)}
                </div>
                <NuevaCancha sedeId={s.id} supabase={supabase} onChange={recargar} />
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Ban} titulo="Bloqueos de cancha" desc="Franjas no reservables (mantenimiento, torneos).">
        {canchas.length === 0 ? (
          <p className="text-sm text-slate-500">Creá una cancha primero.</p>
        ) : (
          <Card className="flex flex-col gap-2 p-5">
            {bloqueos.length === 0 && <p className="text-sm text-slate-400">Sin bloqueos.</p>}
            {bloqueos.map((b) => {
              const c = canchas.find((k) => k.id === b.cancha_id);
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
                  <span className="text-ink-900"><b className="font-semibold">{c?.nombre ?? "?"}</b> · {fechaHora.format(new Date(b.inicio))} → {fechaHora.format(new Date(b.fin))}{b.motivo ? ` · ${b.motivo}` : ""}</span>
                  <button className="text-slate-400 hover:text-rose-600" onClick={async () => { await supabase.from("bloqueos").delete().eq("id", b.id); recargar(); }}><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
            <NuevoBloqueo canchas={canchas} supabase={supabase} onChange={recargar} />
          </Card>
        )}
      </Section>

      <Section icon={CalendarClock} titulo="Reservas del club">
        {reservas.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Sin reservas" />
        ) : (
          <div className="flex flex-col gap-2">
            {reservas.map((r) => (
              <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Clock className="h-4 w-4" /></span>
                  <span className="text-ink-900">
                    <span className="font-semibold">{fechaHora.format(new Date(r.inicio))}</span> · {r.canchas?.nombre ?? "?"} · {r.jugadores?.nombre ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {r.pago_estado === "senada" ? <Badge tone="green" icon={Check}>Señada</Badge> : <Badge tone="gray">Sin señar</Badge>}
                  <button className="text-slate-400 hover:text-rose-600" onClick={async () => { await supabase.from("reservas").delete().eq("id", r.id); recargar(); }}><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="container-app py-8">
        <div className="flex flex-col gap-8">{children}</div>
      </main>
    </>
  );
}
function Section({ icon: Icon, titulo, desc, children }: { icon: LucideIconT; titulo: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900 text-brand-400"><Icon className="h-[18px] w-[18px]" /></span>
        <div>
          <h2 className="font-bold text-ink-900">{titulo}</h2>
          {desc && <p className="text-xs text-slate-400">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
type LucideIconT = typeof MapPin;

function ReglasForm({ clubId, reglas, supabase, onChange }: { clubId: string; reglas: Reglas; supabase: SB; onChange: () => void }) {
  const [val, setVal] = useState(reglas);
  const [saved, setSaved] = useState(false);
  useEffect(() => setVal(reglas), [reglas]);
  const num = (k: keyof Reglas, label: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="label-xs">{label}</span>
      <input type="number" className="field" value={val[k]} onChange={(e) => { setVal({ ...val, [k]: +e.target.value }); setSaved(false); }} />
    </label>
  );
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {num("anticipacion_min_horas", "Anticip. mín (h)")}
        {num("cancelacion_min_horas", "Cancel. mín (h)")}
        {num("max_reservas_activas", "Máx activas")}
        {num("sena_porcentaje", "Seña %")}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" icon={Save} onClick={async () => { await supabase.from("reglas_club").upsert({ club_id: clubId, ...val }); setSaved(true); onChange(); }}>Guardar reglas</Button>
        {saved && <span className="flex items-center gap-1 text-sm text-brand-600"><Check className="h-4 w-4" /> Guardado</span>}
      </div>
    </Card>
  );
}

function SedeItem({ sede, supabase, onChange }: { sede: Sede; supabase: SB; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [nombre, setNombre] = useState(sede.nombre);
  const [dir, setDir] = useState(sede.direccion ?? "");
  if (edit)
    return (
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <input className="field max-w-[180px]" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="field max-w-[220px]" value={dir} onChange={(e) => setDir(e.target.value)} placeholder="Dirección" />
        <Button size="sm" icon={Save} onClick={async () => { await supabase.from("sedes").update({ nombre, direccion: dir }).eq("id", sede.id); setEdit(false); onChange(); }}>Guardar</Button>
        <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Cancelar</Button>
      </Card>
    );
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <span className="text-sm text-ink-900"><b className="font-semibold">{sede.nombre}</b>{sede.direccion ? <span className="text-slate-400"> · {sede.direccion}</span> : ""}</span>
      <div className="flex items-center gap-1">
        <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink-900" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></button>
        <button className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={async () => { if (!confirm("¿Borrar sede y sus canchas/reservas?")) return; await supabase.from("sedes").delete().eq("id", sede.id); onChange(); }}><Trash2 className="h-4 w-4" /></button>
      </div>
    </Card>
  );
}

function NuevaSede({ clubId, supabase, onChange }: { clubId: string; supabase: SB; onChange: () => void }) {
  const [nombre, setNombre] = useState("");
  const [dir, setDir] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className="field max-w-[180px]" placeholder="Nueva sede" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <input className="field max-w-[220px]" placeholder="Dirección" value={dir} onChange={(e) => setDir(e.target.value)} />
      <Button size="sm" variant="outline" icon={Plus} disabled={!nombre}
        onClick={async () => { await supabase.from("sedes").insert({ club_id: clubId, nombre, direccion: dir || null }); setNombre(""); setDir(""); onChange(); }}>Agregar</Button>
    </div>
  );
}

const CANCHA_DEFAULT = { nombre: "", techada: false, duracion_turno_minutos: 60, horario_apertura: "08:00", horario_cierre: "23:00", precio_turno: 0 };

function CanchaFields({ val, set }: { val: typeof CANCHA_DEFAULT; set: (v: typeof CANCHA_DEFAULT) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <label className="flex flex-col gap-1"><span className="label-xs">Nombre</span><input className="field" placeholder="Cancha" value={val.nombre} onChange={(e) => set({ ...val, nombre: e.target.value })} /></label>
      <label className="flex flex-col gap-1"><span className="label-xs">Techada</span>
        <button type="button" onClick={() => set({ ...val, techada: !val.techada })} className={`field flex items-center justify-center gap-1.5 font-semibold ${val.techada ? "!border-brand-300 bg-brand-50 text-brand-700" : "text-slate-500"}`}>
          {val.techada ? <><Umbrella className="h-4 w-4" /> Sí</> : <><Sun className="h-4 w-4" /> No</>}
        </button>
      </label>
      <label className="flex flex-col gap-1"><span className="label-xs">Duración</span><input className="field" type="number" value={val.duracion_turno_minutos} onChange={(e) => set({ ...val, duracion_turno_minutos: +e.target.value })} /></label>
      <label className="flex flex-col gap-1"><span className="label-xs">Abre</span><input className="field" type="time" value={val.horario_apertura} onChange={(e) => set({ ...val, horario_apertura: e.target.value })} /></label>
      <label className="flex flex-col gap-1"><span className="label-xs">Cierra</span><input className="field" type="time" value={val.horario_cierre} onChange={(e) => set({ ...val, horario_cierre: e.target.value })} /></label>
      <label className="flex flex-col gap-1"><span className="label-xs">Precio</span><input className="field" type="number" value={val.precio_turno} onChange={(e) => set({ ...val, precio_turno: +e.target.value })} /></label>
    </div>
  );
}

function CanchaItem({ cancha, supabase, onChange }: { cancha: Cancha; supabase: SB; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState({ nombre: cancha.nombre, techada: cancha.techada, duracion_turno_minutos: cancha.duracion_turno_minutos, horario_apertura: cancha.horario_apertura.slice(0, 5), horario_cierre: cancha.horario_cierre.slice(0, 5), precio_turno: Number(cancha.precio_turno) });
  if (edit)
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <CanchaFields val={val} set={setVal} />
        <div className="mt-3 flex gap-2">
          <Button size="sm" icon={Save} onClick={async () => { await supabase.from("canchas").update(val).eq("id", cancha.id); setEdit(false); onChange(); }}>Guardar</Button>
          <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Cancelar</Button>
        </div>
      </div>
    );
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-ink-900">{cancha.nombre}</span>
        <Badge tone={cancha.techada ? "green" : "gray"}>{cancha.techada ? "Cubierta" : "Descubierta"}</Badge>
        <span className="text-slate-400">{cancha.duracion_turno_minutos}m · {cancha.horario_apertura.slice(0, 5)}–{cancha.horario_cierre.slice(0, 5)} · {money.format(Number(cancha.precio_turno))}</span>
      </div>
      <div className="flex items-center gap-1">
        <button className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-ink-900" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></button>
        <button className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={async () => { if (!confirm("¿Borrar cancha?")) return; await supabase.from("canchas").delete().eq("id", cancha.id); onChange(); }}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function NuevaCancha({ sedeId, supabase, onChange }: { sedeId: string; supabase: SB; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(CANCHA_DEFAULT);
  if (!open) return <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"><Plus className="h-4 w-4" /> Agregar cancha</button>;
  return (
    <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
      <CanchaFields val={val} set={setVal} />
      <div className="mt-3 flex gap-2">
        <Button size="sm" icon={Plus} disabled={!val.nombre} onClick={async () => { await supabase.from("canchas").insert({ sede_id: sedeId, ...val }); setVal(CANCHA_DEFAULT); setOpen(false); onChange(); }}>Crear cancha</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

function NuevoBloqueo({ canchas, supabase, onChange }: { canchas: Cancha[]; supabase: SB; onChange: () => void }) {
  const hoyAR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const [canchaId, setCanchaId] = useState(canchas[0]?.id ?? "");
  const [fecha, setFecha] = useState(hoyAR);
  const [desde, setDesde] = useState("12:00");
  const [hasta, setHasta] = useState("13:00");
  const [motivo, setMotivo] = useState("");
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-slate-300 p-3 sm:grid-cols-6">
      <select className="field" value={canchaId} onChange={(e) => setCanchaId(e.target.value)}>{canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
      <input type="date" className="field" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      <input type="time" className="field" value={desde} onChange={(e) => setDesde(e.target.value)} />
      <input type="time" className="field" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      <input className="field" placeholder="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <Button size="sm" variant="outline" icon={Ban} disabled={!canchaId || hasta <= desde}
        onClick={async () => { await supabase.from("bloqueos").insert({ cancha_id: canchaId, inicio: arLocalToUtc(fecha, desde).toISOString(), fin: arLocalToUtc(fecha, hasta).toISOString(), motivo: motivo || null }); setMotivo(""); onChange(); }}>Bloquear</Button>
    </div>
  );
}
