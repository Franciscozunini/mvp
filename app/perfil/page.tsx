"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<"cargando" | "no-jugador" | "ok">("cargando");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const em = data.user?.email;
      if (!em) return setEstado("no-jugador");
      setEmail(em);
      supabase.from("jugadores").select("id, nombre, telefono").eq("email", em).maybeSingle().then(({ data: j }) => {
        const row = j as { id: string; nombre: string; telefono: string | null } | null;
        if (!row) return setEstado("no-jugador");
        setId(row.id);
        setNombre(row.nombre);
        setTelefono(row.telefono ?? "");
        setEstado("ok");
      });
    });
  }, [supabase]);

  async function guardar() {
    setMsg(null);
    const { error } = await supabase.from("jugadores").update({ nombre, telefono }).eq("id", id);
    setMsg(error ? error.message : "Guardado ✓");
  }

  return (
    <>
      <AppHeader />
      <main className="container-app py-6">
        <div className="mx-auto flex max-w-sm flex-col gap-4">
          <h1 className="h1">Mi perfil</h1>

          {estado === "cargando" && <p className="text-sm text-slate-500">Cargando…</p>}
          {estado === "no-jugador" && (
            <p className="text-sm text-slate-500">Esta cuenta no es de jugador. <a href="/dashboard" className="link">Volver</a></p>
          )}

          {estado === "ok" && (
            <div className="card flex flex-col gap-3">
              <label className="label">Email
                <input className="input bg-slate-50 text-slate-500" value={email} disabled />
              </label>
              <label className="label">Nombre
                <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </label>
              <label className="label">Teléfono
                <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </label>
              <button onClick={guardar} className="btn-primary mt-1">Guardar</button>
              {msg && <p className="text-sm text-slate-600">{msg}</p>}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
