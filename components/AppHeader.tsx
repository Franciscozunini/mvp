"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, CalendarCheck, LayoutGrid, BarChart3, User, LogOut, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

export default function AppHeader() {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname() || "";
  const [email, setEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const em = data.user?.email ?? "";
      setEmail(em);
      if (em)
        supabase.from("usuarios_club").select("club_id").eq("email", em).maybeSingle().then(({ data: m }) => setIsAdmin(!!m));
    });
  }, [supabase]);

  const nav: NavItem[] = isAdmin
    ? [
        { href: "/admin", label: "Panel", icon: LayoutGrid },
        { href: "/disponibilidad", label: "Disponibilidad", icon: CalendarDays },
        { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
      ]
    : [
        { href: "/disponibilidad", label: "Reservar", icon: CalendarDays },
        { href: "/mis-reservas", label: "Mis reservas", icon: CalendarCheck },
      ];

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const initial = (email[0] || "?").toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-paper/80 backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <a href="/dashboard" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900 text-brand-400 shadow-soft">
            <PadelMark />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight text-ink-900">Padelia</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                active(n.href) ? "bg-ink-900 text-white shadow-soft" : "text-slate-600 hover:bg-slate-100 hover:text-ink-900"
              }`}
            >
              <n.icon className="h-[18px] w-[18px]" />
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <button
              onClick={() => setAvatarOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-soft transition hover:border-slate-300"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-xs font-bold text-white">{initial}</span>
              <span className="max-w-[140px] truncate text-sm font-medium text-slate-600">{email || "Cuenta"}</span>
            </button>
            {avatarOpen && (
              <div className="absolute right-0 mt-2 w-52 animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift">
                <a href="/perfil" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink-900">
                  <User className="h-4 w-4" /> Mi perfil
                </a>
                <form action="/auth/signout" method="post">
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50" type="submit">
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </form>
              </div>
            )}
          </div>

          <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-ink-900 md:hidden" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="animate-fade-up border-t border-slate-200/70 bg-paper px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  active(n.href) ? "bg-ink-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <n.icon className="h-5 w-5" /> {n.label}
              </a>
            ))}
            <a href="/perfil" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <User className="h-5 w-5" /> Mi perfil
            </a>
            <form action="/auth/signout" method="post">
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50" type="submit">
                <LogOut className="h-5 w-5" /> Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}

function PadelMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <circle cx="12" cy="9.5" r="6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="10" cy="8" r="1.1" fill="currentColor" />
      <circle cx="14" cy="8" r="1.1" fill="currentColor" />
      <circle cx="12" cy="11" r="1.1" fill="currentColor" />
      <path d="M12 15.5V21M9.5 21h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
