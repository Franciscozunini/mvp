"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, Field, Input, Button, EmptyState, Spinner, Notice } from "@/components/ui";
import { User, Phone, AtSign, Save } from "lucide-react";

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<"cargando" | "no-jugador" | "ok">("cargando");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

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
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("jugadores").update({ nombre, telefono }).eq("id", id);
    setSaving(false);
    setMsg(error ? { text: error.message, ok: false } : { text: "Cambios guardados correctamente.", ok: true });
  }

  return (
    <>
      <AppHeader />
      <main className="container-app py-8">
        <div className="mx-auto flex max-w-lg flex-col gap-6">
          <header>
            <p className="eyebrow">Tu cuenta</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900">Mi perfil</h1>
          </header>

          {estado === "cargando" && <Spinner />}
          {estado === "no-jugador" && (
            <EmptyState icon={User} title="Esta cuenta no es de jugador" action={<Button href="/dashboard" variant="outline">Volver</Button>} />
          )}

          {estado === "ok" && (
            <Card className="flex flex-col gap-5 p-6">
              <div className="flex items-center gap-4">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500 text-2xl font-bold text-white">
                  {(nombre[0] || "?").toUpperCase()}
                </span>
                <div>
                  <p className="text-lg font-bold text-ink-900">{nombre || "Jugador"}</p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-500"><AtSign className="h-3.5 w-3.5" /> {email}</p>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              <Field label="Nombre">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="pl-11" />
                </div>
              </Field>
              <Field label="Teléfono">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="pl-11" placeholder="+54 9 11 ..." />
                </div>
              </Field>

              <Button onClick={guardar} loading={saving} icon={Save}>Guardar cambios</Button>
              {msg && <Notice tone={msg.ok ? "green" : "rose"}>{msg.text}</Notice>}
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
