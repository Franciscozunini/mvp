export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="container-app flex items-center justify-between py-3">
        <a href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-base shadow-sm">🎾</span>
          <span className="font-bold tracking-tight text-slate-900">Pádel Reservas</span>
        </a>
        <nav className="flex items-center gap-1">
          <a href="/disponibilidad" className="nav-link">Disponibilidad</a>
          <a href="/mis-reservas" className="nav-link">Mis reservas</a>
          <form action="/auth/signout" method="post">
            <button className="nav-link" type="submit">Salir</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
