import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Si el usuario está en usuarios_club es admin; su RLS solo deja ver su club.
  const { data: membership } = await supabase
    .from("usuarios_club")
    .select("rol, clubes(nombre)")
    .eq("email", user.email)
    .maybeSingle();

  const esAdmin = !!membership;
  const club = membership?.clubes as unknown as { nombre: string } | { nombre: string }[] | null;
  const clubNombre = Array.isArray(club) ? club[0]?.nombre : club?.nombre;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">Sesión iniciada</h1>
      <div className="rounded border bg-white p-4 text-sm">
        <p>
          <span className="font-semibold">Email:</span> {user.email}
        </p>
        <p>
          <span className="font-semibold">Rol:</span>{" "}
          {esAdmin ? membership?.rol ?? "admin" : "jugador"}
        </p>
        {esAdmin && (
          <p>
            <span className="font-semibold">Club:</span>{" "}
            {clubNombre ?? "(sin acceso)"}
          </p>
        )}
      </div>
      <a href="/disponibilidad" className="text-sm underline">
        Ver disponibilidad de canchas →
      </a>
      <form action="/auth/signout" method="post">
        <button className="rounded border px-3 py-2 text-sm" type="submit">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
