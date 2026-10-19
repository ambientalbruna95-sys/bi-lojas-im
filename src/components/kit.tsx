import type * as React from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 h-1 w-12 rounded-full bg-primary red-glow" />
        <h1 className="font-display text-2xl font-black tracking-[-.025em] md:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`glass-panel premium-border rounded-2xl border p-4 md:p-5 ${className}`}>
      {title && <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-xs font-extrabold uppercase tracking-[.14em] text-muted-foreground">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Avatar({ src, name, size = "md", className = "" }: { src?: string; name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl",
  };
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
  if (src) {
    return <img src={src} alt={`Foto de ${name}`} className={`${sizes[size]} shrink-0 rounded-full object-cover ring-1 ring-border ${className}`} />;
  }
  return <div aria-label={name} className={`${sizes[size]} grid shrink-0 place-items-center rounded-full bg-primary/12 font-black text-primary ring-1 ring-primary/20 ${className}`}>{initials}</div>;
}

export function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 ${accent ? "border-primary/30 bg-gradient-to-br from-primary via-primary to-[#9e1020] text-primary-foreground red-glow" : "glass-panel premium-border"}`}>
      <div className={`absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full ${accent ? "bg-white/10" : "bg-primary/5"}`} />
      <div className={`relative text-[10px] font-bold uppercase tracking-[.13em] ${accent ? "text-white/70" : "text-muted-foreground"}`}>{label}</div>
      <div className="relative mt-1.5 font-display text-2xl font-black tracking-tight">{value}</div>
      {hint && <div className={`relative mt-1 text-xs ${accent ? "text-white/65" : "text-muted-foreground"}`}>{hint}</div>}
    </div>
  );
}

export function Btn({ children, variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" }) {
  const v = {
    primary: "bg-primary text-white hover:bg-primary/90 shadow-brand border border-primary/30",
    outline: "border border-border bg-secondary/55 text-foreground hover:bg-secondary hover:border-primary/40",
    ghost: "text-foreground hover:bg-secondary/70",
    danger: "border border-primary/20 bg-primary/[.055] text-primary hover:bg-primary/12",
  }[variant];
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${v} ${className}`}>{children}</button>;
}

export const inputCls = "w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[10px] font-extrabold uppercase tracking-[.13em] text-muted-foreground">{label}</span>{children}</label>;
}

export function Modal({ open, onClose, title, children, wide, extraWide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; extraWide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass-panel premium-border relative max-h-[92vh] w-full min-w-0 overflow-x-hidden overflow-y-auto rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl ${extraWide ? "sm:max-w-6xl" : wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="mb-5 flex items-center justify-between gap-2">
          <div><div className="mb-2 h-1 w-9 rounded-full bg-primary"/><h3 className="font-display text-lg font-black">{title}</h3></div>
          <button aria-label="Fechar" onClick={onClose} className="rounded-xl border border-border bg-secondary/55 p-2 text-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "success" | "warn" }) {
  return <span className={`gi-badge gi-badge--${tone}`}>{children}</span>;
}

export function Bar({ value }: { value: number }) {
  return <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-[#ff5668] shadow-[0_0_14px_rgba(229,22,40,.28)] transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} · BI Marketing Lojas IM` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · BI Marketing Lojas IM` },
    { property: "og:description", content: description },
  ],
});