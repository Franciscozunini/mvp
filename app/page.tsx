"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, Segmented, Notice } from "@/components/ui";
import { User, Building2, Mail, Lock, Zap, Clock, CalendarCheck, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tipo, setTipo] = useState<"jugador" | "admin">("jugador");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (tipo === "jugador") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg({ text: "Te enviamos un enlace mágico. Revisá tu email para entrar.", ok: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err) {
      setMsg({ text: (err as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Panel de marca */}
      <section className="relative hidden overflow-hidden bg-ink-900 text-white lg:flex lg:w-[54%] lg:flex-col lg:justify-between lg:p-12">
        <div className="court-lines pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-1/2 h-64 w-[70%] -translate-x-1/2 rounded-[100%] border border-white/10" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-ink-900">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <circle cx="12" cy="9.5" r="6" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 15.5V21M9.5 21h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-lg font-extrabold tracking-tight">Padelia</span>
        </div>

        <div className="relative max-w-md">
          <p className="eyebrow text-brand-300">Reservá en segundos</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight">
            Tu próxima<br />cancha te está<br />
            <span className="text-brand-400">esperando.</span>
          </h1>
          <p className="mt-5 text-lg text-white/70">
            Encontrá turnos libres en tus clubes favoritos, reservá al instante y pagá la seña sin llamadas ni WhatsApp.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-sm text-white/80">
            {[
              { icon: Zap, t: "Disponibilidad en tiempo real" },
              { icon: Clock, t: "Turnos de 60 y 90 minutos" },
              { icon: CalendarCheck, t: "Gestioná y cancelá tus reservas" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
                  <f.icon className="h-4 w-4 text-brand-300" />
                </span>
                {f.t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/40">Clubes de pádel · Buenos Aires</p>
      </section>

      {/* Formulario */}
      <section className="flex w-full min-w-0 flex-1 items-center justify-center bg-paper px-5 py-10 sm:px-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900 text-brand-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <circle cx="12" cy="9.5" r="6" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 15.5V21M9.5 21h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-extrabold tracking-tight text-ink-900">Padelia</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-ink-900">Ingresá a tu cuenta</h2>
          <p className="mt-1.5 text-slate-500">Elegí cómo querés entrar.</p>

          <div className="mt-6">
            <Segmented
              value={tipo}
              onChange={(v) => { setTipo(v); setMsg(null); }}
              options={[
                { value: "jugador", label: "Soy jugador", icon: User },
                { value: "admin", label: "Soy club", icon: Building2 },
              ]}
            />
          </div>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="pl-11" />
              </div>
            </Field>

            {tipo === "admin" && (
              <Field label="Contraseña">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-11" />
                </div>
              </Field>
            )}

            <Button type="submit" size="lg" full loading={loading} iconRight={loading ? undefined : ArrowRight}>
              {tipo === "jugador" ? "Enviar enlace mágico" : "Ingresar al panel"}
            </Button>

            {msg && <Notice tone={msg.ok ? "green" : "rose"}>{msg.text}</Notice>}
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            {tipo === "jugador"
              ? "Sin contraseñas: te mandamos un enlace seguro por email."
              : "Acceso para administradores de club con email y contraseña."}
          </p>
        </div>
      </section>
    </main>
  );
}
