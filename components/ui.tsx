"use client";

import { useEffect, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Loader2, X, type LucideIcon } from "lucide-react";

/* ---------------- Button ---------------- */
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white shadow-soft hover:bg-brand-600 hover:shadow-glow active:translate-y-px",
  secondary: "bg-ink-900 text-white hover:bg-ink-800 active:translate-y-px",
  outline: "border border-slate-300 bg-white text-ink-800 hover:border-slate-400 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-ink-900",
  danger: "text-rose-600 hover:bg-rose-50",
};
const sizes: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-3 text-[13px]",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-13 gap-2 px-6 text-[15px]",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  href?: string;
  full?: boolean;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon: Icon,
  iconRight: IconRight,
  href,
  full,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const cls = `inline-flex select-none items-center justify-center rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""} ${className}`;
  const inner = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-[18px] w-[18px]" /> : null}
    </>
  );
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <button className={cls} disabled={disabled || loading} {...rest}>{inner}</button>;
}

/* ---------------- Card ---------------- */
export function Card({
  className = "",
  hover,
  children,
}: {
  className?: string;
  hover?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`surface ${hover ? "transition duration-200 hover:-translate-y-1 hover:shadow-lift" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ---------------- Badge ---------------- */
const tones: Record<string, string> = {
  green: "bg-brand-100 text-brand-700",
  ink: "bg-ink-900 text-white",
  gray: "bg-slate-100 text-slate-600",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  outline: "border border-slate-200 text-slate-600",
};
export function Badge({ tone = "gray", icon: Icon, children, className = "" }: { tone?: keyof typeof tones | string; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] ?? tones.gray} ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/* ---------------- Field / Input / Select ---------------- */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="label-xs">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ""}`} />;
}

export function Select({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`field appearance-none pr-9 ${className}`}
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none">
        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={`inline-flex rounded-xl bg-slate-100 p-1 ${size === "sm" ? "text-[13px]" : "text-sm"}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
              active ? "bg-white text-ink-900 shadow-soft" : "text-slate-500 hover:text-ink-800"
            }`}
          >
            {o.icon && <o.icon className="h-4 w-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Spinner ---------------- */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" /> {label ?? "Cargando…"}
    </div>
  );
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="font-semibold text-ink-900">{title}</p>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md animate-fade-up rounded-t-3xl bg-white p-6 shadow-lift sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          {title && <h3 className="text-lg font-bold text-ink-900">{title}</h3>}
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Notice ---------------- */
export function Notice({ children, tone = "rose" }: { children: ReactNode; tone?: "rose" | "green" }) {
  const c = tone === "green" ? "bg-brand-50 text-brand-800 border-brand-200" : "bg-rose-50 text-rose-700 border-rose-200";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${c}`}>{children}</div>;
}
