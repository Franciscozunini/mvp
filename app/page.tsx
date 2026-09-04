"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tipo, setTipo] = useState<"jugador" | "admin">("jugador");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
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
        setMsg("Te enviamos un magic link. Revisá tu email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">🎾</div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Pádel Reservas</h1>
          <p className="text-sm text-slate-500">Ingresá para reservar tu cancha</p>
        </div>

        <div className="card flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            {(["jugador", "admin"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  tipo === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {t === "jugador" ? "Jugador" : "Admin de club"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="label">
              Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="tu@email.com" />
            </label>
            {tipo === "admin" && (
              <label className="label">
                Contraseña
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
              </label>
            )}
            <button type="submit" disabled={loading} className="btn-primary mt-1">
              {loading ? "..." : tipo === "jugador" ? "Enviar magic link" : "Ingresar"}
            </button>
          </form>

          {msg && <p className="text-sm text-slate-600">{msg}</p>}
        </div>
      </div>
    </main>
  );
}
