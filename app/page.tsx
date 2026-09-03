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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">Pádel Reservas</h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTipo("jugador")}
          className={`flex-1 rounded border px-3 py-2 text-sm ${
            tipo === "jugador" ? "bg-black text-white" : "bg-white"
          }`}
        >
          Jugador
        </button>
        <button
          type="button"
          onClick={() => setTipo("admin")}
          className={`flex-1 rounded border px-3 py-2 text-sm ${
            tipo === "admin" ? "bg-black text-white" : "bg-white"
          }`}
        >
          Admin de club
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
        {tipo === "admin" && (
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border px-3 py-2"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {tipo === "jugador" ? "Enviar magic link" : "Ingresar"}
        </button>
      </form>

      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </main>
  );
}
