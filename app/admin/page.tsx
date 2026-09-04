"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Sede = { id: string; nombre: string; direccion: string | null };
type Cancha = {
  id: string;
  sede_id: string;
  nombre: string;
  techada: boolean;
  duracion_turno_minutos: number;
  horario_apertura: string;
  horario_cierre: string;
  precio_turno: number;
};
type Reserva = {
  id: string;
  inicio: string;
  fin: string;
  canchas: { nombre: string } | null;
  jugadores: { nombre: string } | null;
};

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "short",
  timeStyle: "short",
});

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<"cargando" | "no-admin" | "ok">("cargando");
  const [clubId, setClubId] = useState("");
  const [clubNombre, setClubNombre] = useState("");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [v, setV] = useState(0);
  const recargar = useCallback(() => setV((n) => n + 1), []);

  // ¿Es admin? Traigo su club.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (!email) return setEstado("no-admin");
      supabase
        .from("usuarios_club")
        .select("club_id, clubes(nombre)")
        .eq("email", email)
        .maybeSingle()
        .then(({ data: m }) => {
          if (!m) return setEstado("no-admin");
          const club = m.clubes as unknown as { nombre: string } | { nombre: string }[] | null;
          setClubId(m.club_id as string);
          setClubNombre(Array.isArray(club) ? club[0]?.nombre : club?.nombre ?? "");
          setEstado("ok");
        });
    });
  }, [supabase]);

  // Datos del club (RLS limita a su propio club).
  useEffect(() => {
    if (estado !== "ok") return;
    supabase.from("sedes").select("id, nombre, direccion").order("nombre").then(({ data }) =>
      setSedes((data as Sede[]) ?? [])
    );
    supabase.from("canchas").select("*").order("nombre").then(({ data }) =>
      setCanchas((data as Cancha[]) ?? [])
    );
    supabase
      .from("reservas")
      .select("id, inicio, fin, canchas(nombre), jugadores(nombre)")
      .order("inicio", { ascending: false })
      .limit(50)
      .then(({ data }) => setReservas((data as unknown as Reserva[]) ?? []));
  }, [supabase, estado, v]);

  if (estado === "cargando") return <Wrap><p className="text-sm text-gray-500">Cargando…</p></Wrap>;
  if (estado === "no-admin")
    return (
      <Wrap>
        <p className="text-sm">No sos admin de ningún club.</p>
        <a href="/dashboard" className="text-sm underline">← Volver</a>
      </Wrap>
    );

  return (
    <Wrap>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin · {clubNombre}</h1>
        <a href="/dashboard" className="text-sm underline">← Volver</a>
      </div>

      <Section titulo="Sedes">
        {sedes.map((s) => (
          <SedeItem key={s.id} sede={s} supabase={supabase} onChange={recargar} />
        ))}
        <NuevaSede clubId={clubId} supabase={supabase} onChange={recargar} />
      </Section>

      <Section titulo="Canchas">
        {sedes.length === 0 && <p className="text-sm text-gray-500">Creá una sede primero.</p>}
        {sedes.map((s) => (
          <div key={s.id} className="rounded border bg-white p-3">
            <p className="mb-2 text-sm font-semibold">{s.nombre}</p>
            {canchas.filter((c) => c.sede_id === s.id).map((c) => (
              <CanchaItem key={c.id} cancha={c} supabase={supabase} onChange={recargar} />
            ))}
            <NuevaCancha sedeId={s.id} supabase={supabase} onChange={recargar} />
          </div>
        ))}
      </Section>

      <Section titulo="Reservas del club">
        {reservas.length === 0 ? (
          <p className="text-sm text-gray-500">Sin reservas.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {reservas.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                <span>
                  {fechaHora.format(new Date(r.inicio))} · {r.canchas?.nombre ?? "?"} ·{" "}
                  {r.jugadores?.nombre ?? "—"}
                </span>
                <button
                  className="text-xs text-red-600 underline"
                  onClick={async () => {
                    await supabase.from("reservas").delete().eq("id", r.id);
                    recargar();
                  }}
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">{children}</main>;
}
function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase text-gray-500">{titulo}</h2>
      {children}
    </section>
  );
}

type SB = ReturnType<typeof createClient>;

function SedeItem({ sede, supabase, onChange }: { sede: Sede; supabase: SB; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [nombre, setNombre] = useState(sede.nombre);
  const [dir, setDir] = useState(sede.direccion ?? "");
  if (edit)
    return (
      <div className="flex flex-wrap items-center gap-2 rounded border bg-white p-2 text-sm">
        <input className="rounded border px-2 py-1" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="rounded border px-2 py-1" value={dir} onChange={(e) => setDir(e.target.value)} placeholder="Dirección" />
        <button
          className="text-xs underline"
          onClick={async () => {
            await supabase.from("sedes").update({ nombre, direccion: dir }).eq("id", sede.id);
            setEdit(false);
            onChange();
          }}
        >
          Guardar
        </button>
        <button className="text-xs underline" onClick={() => setEdit(false)}>Cancelar</button>
      </div>
    );
  return (
    <div className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
      <span>{sede.nombre}{sede.direccion ? ` · ${sede.direccion}` : ""}</span>
      <span className="flex gap-3">
        <button className="text-xs underline" onClick={() => setEdit(true)}>Editar</button>
        <button
          className="text-xs text-red-600 underline"
          onClick={async () => {
            if (!confirm("¿Borrar sede y sus canchas/reservas?")) return;
            await supabase.from("sedes").delete().eq("id", sede.id);
            onChange();
          }}
        >
          Borrar
        </button>
      </span>
    </div>
  );
}

function NuevaSede({ clubId, supabase, onChange }: { clubId: string; supabase: SB; onChange: () => void }) {
  const [nombre, setNombre] = useState("");
  const [dir, setDir] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input className="rounded border px-2 py-1" placeholder="Nueva sede" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <input className="rounded border px-2 py-1" placeholder="Dirección" value={dir} onChange={(e) => setDir(e.target.value)} />
      <button
        className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-40"
        disabled={!nombre}
        onClick={async () => {
          await supabase.from("sedes").insert({ club_id: clubId, nombre, direccion: dir || null });
          setNombre("");
          setDir("");
          onChange();
        }}
      >
        Agregar
      </button>
    </div>
  );
}

const CANCHA_DEFAULT = {
  nombre: "",
  techada: false,
  duracion_turno_minutos: 60,
  horario_apertura: "08:00",
  horario_cierre: "23:00",
  precio_turno: 0,
};

function CanchaFields({
  val,
  set,
}: {
  val: typeof CANCHA_DEFAULT;
  set: (v: typeof CANCHA_DEFAULT) => void;
}) {
  return (
    <>
      <input className="w-28 rounded border px-2 py-1" placeholder="Nombre" value={val.nombre} onChange={(e) => set({ ...val, nombre: e.target.value })} />
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={val.techada} onChange={(e) => set({ ...val, techada: e.target.checked })} /> Techada
      </label>
      <input className="w-16 rounded border px-2 py-1" type="number" value={val.duracion_turno_minutos} onChange={(e) => set({ ...val, duracion_turno_minutos: +e.target.value })} title="Duración (min)" />
      <input className="w-24 rounded border px-2 py-1" type="time" value={val.horario_apertura} onChange={(e) => set({ ...val, horario_apertura: e.target.value })} />
      <input className="w-24 rounded border px-2 py-1" type="time" value={val.horario_cierre} onChange={(e) => set({ ...val, horario_cierre: e.target.value })} />
      <input className="w-24 rounded border px-2 py-1" type="number" value={val.precio_turno} onChange={(e) => set({ ...val, precio_turno: +e.target.value })} title="Precio (ARS)" />
    </>
  );
}

function CanchaItem({ cancha, supabase, onChange }: { cancha: Cancha; supabase: SB; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState({
    nombre: cancha.nombre,
    techada: cancha.techada,
    duracion_turno_minutos: cancha.duracion_turno_minutos,
    horario_apertura: cancha.horario_apertura.slice(0, 5),
    horario_cierre: cancha.horario_cierre.slice(0, 5),
    precio_turno: Number(cancha.precio_turno),
  });
  if (edit)
    return (
      <div className="mb-1 flex flex-wrap items-center gap-2 rounded border bg-gray-50 p-2 text-xs">
        <CanchaFields val={val} set={setVal} />
        <button
          className="underline"
          onClick={async () => {
            await supabase.from("canchas").update(val).eq("id", cancha.id);
            setEdit(false);
            onChange();
          }}
        >
          Guardar
        </button>
        <button className="underline" onClick={() => setEdit(false)}>Cancelar</button>
      </div>
    );
  return (
    <div className="mb-1 flex items-center justify-between rounded border px-2 py-1 text-xs">
      <span>
        {cancha.nombre} · {cancha.duracion_turno_minutos}m · {cancha.horario_apertura.slice(0, 5)}–{cancha.horario_cierre.slice(0, 5)} · {cancha.techada ? "techada" : "descubierta"} · {money.format(Number(cancha.precio_turno))}
      </span>
      <span className="flex gap-3">
        <button className="underline" onClick={() => setEdit(true)}>Editar</button>
        <button
          className="text-red-600 underline"
          onClick={async () => {
            if (!confirm("¿Borrar cancha?")) return;
            await supabase.from("canchas").delete().eq("id", cancha.id);
            onChange();
          }}
        >
          Borrar
        </button>
      </span>
    </div>
  );
}

function NuevaCancha({ sedeId, supabase, onChange }: { sedeId: string; supabase: SB; onChange: () => void }) {
  const [val, setVal] = useState(CANCHA_DEFAULT);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
      <CanchaFields val={val} set={setVal} />
      <button
        className="rounded bg-black px-3 py-1 text-white disabled:opacity-40"
        disabled={!val.nombre}
        onClick={async () => {
          await supabase.from("canchas").insert({ sede_id: sedeId, ...val });
          setVal(CANCHA_DEFAULT);
          onChange();
        }}
      >
        Agregar cancha
      </button>
    </div>
  );
}
