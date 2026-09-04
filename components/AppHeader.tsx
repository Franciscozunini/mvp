export default function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container-app flex items-center justify-between py-3">
        <a href="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
          <span aria-hidden>🎾</span> Pádel Reservas
        </a>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <a href="/disponibilidad" className="hover:text-slate-900">Disponibilidad</a>
          <a href="/mis-reservas" className="hover:text-slate-900">Mis reservas</a>
          <form action="/auth/signout" method="post">
            <button className="hover:text-slate-900" type="submit">Salir</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
