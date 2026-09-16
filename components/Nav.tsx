"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Calculator, CalendarDays, CheckSquare, Sparkles } from "lucide-react";
import { TipoCaso } from "@/lib/types";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";

const BASE_LINKS = [
  { href: "/caso", label: "Inicio", icon: Home },
  { href: "/caso/casas", label: "Casas", icon: Building2 },
  { href: "/caso/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/caso/checklist", label: "Checklist", icon: CheckSquare },
];
const CALCULADORA_LINK = { href: "/caso/calculadora", label: "Calculadora", icon: Calculator };

const TIPO_LABEL: Record<TipoCaso, string> = {
  compra: "Compra",
  alquiler: "Alquiler",
  otro: "Búsqueda",
};

export default function Nav({
  caseTitle,
  tipoCaso,
  brokerName,
  brokerImage,
  viewingAsBroker = false,
  isDemo = false,
}: {
  caseTitle: string;
  tipoCaso: TipoCaso;
  brokerName: string | null;
  brokerImage: string | null;
  /** El corredor entró a este caso desde su panel ("Entrar como este
   * caso", ver components/CaseRow.tsx) — le mostramos cómo volver, o
   * quedaría atrapado en la vista de la familia. */
  viewingAsBroker?: boolean;
  isDemo?: boolean;
}) {
  const pathname = usePathname();
  const links =
    tipoCaso === "compra"
      ? BASE_LINKS.flatMap((link) => (link.href === "/caso/agenda" ? [CALCULADORA_LINK, link] : [link]))
      : BASE_LINKS;

  return (
    <>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        {isDemo && !viewingAsBroker && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs"
            style={{ borderColor: "var(--accent-soft-border)", background: "color-mix(in srgb, var(--accent-soft) 85%, var(--surface))" }}
          >
            <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--accent)" }}>
              <Sparkles size={13} />
              <span>Estás explorando el caso de demostración interactivo</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="hover:underline text-[11px]" style={{ color: "var(--ink-muted)" }}>
                ← Volver al inicio
              </Link>
              <Link
                href="/panel/login"
                className="btn rounded-full px-3 py-1 font-semibold text-[11px]"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        )}
        {viewingAsBroker && (
          <div
            className="flex items-center justify-center gap-1.5 border-b px-4 py-1.5 text-xs font-medium"
            style={{ borderColor: "var(--accent-soft-border)", background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            Estás viendo este caso como corredor ·{" "}
            <Link href="/panel" className="underline underline-offset-2">
              ← Volver a tu panel
            </Link>
          </div>
        )}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/caso" className="flex min-w-0 items-center gap-2">
            {brokerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brokerImage} alt="" className="h-7 w-7 shrink-0 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
              >
                <MicasoMark size={16} color="var(--accent-ink)" />
              </span>
            )}
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {caseTitle}
              </span>
              <span className="eyebrow hidden truncate sm:inline">
                {brokerName ? `${brokerName} · ${TIPO_LABEL[tipoCaso]}` : TIPO_LABEL[tipoCaso]}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Desktop Navigation */}
            <nav className="hidden sm:flex gap-1 text-sm">
              {links.map((link) => {
                const active =
                  link.href === "/caso" ? pathname === "/caso" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full px-3 py-1.5 font-medium transition-colors"
                    style={{
                      color: active ? "var(--accent-ink)" : "var(--ink-muted)",
                      background: active ? "var(--accent)" : "transparent",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t backdrop-blur-lg px-2 py-1.5 sm:hidden"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--surface) 94%, transparent)",
          boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.06)",
        }}
      >
        {links.map((link) => {
          const active = link.href === "/caso" ? pathname === "/caso" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium tracking-tight transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--ink-muted)",
              }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                style={{
                  background: active ? "var(--accent-soft)" : "transparent",
                }}
              >
                <Icon size={17} strokeWidth={active ? 2.3 : 1.8} />
              </span>
              <span className="truncate max-w-full px-0.5 text-center">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
