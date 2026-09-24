"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Building2, Calculator, CalendarDays, CheckSquare, Sparkles, LogOut, Loader2 } from "lucide-react";
import { TipoCaso } from "@/lib/types";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";
import { clearPrivateCaches } from "@/lib/offlineCache";

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
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const links =
    tipoCaso === "compra"
      ? BASE_LINKS.flatMap((link) => (link.href === "/caso/agenda" ? [CALCULADORA_LINK, link] : [link]))
      : BASE_LINKS;

  async function handleLogout() {
    if (loggingOut) return; // evita doble toque mientras la request está en curso
    setLoggingOut(true);
    // El caso demo nunca tiene push habilitado (ver lib/push.ts), así que
    // no hay suscripción que dar de baja ahí.
    if (!isDemo) {
      // Dar de baja la suscripción push de este caso antes de cerrar sesión
      // — si no, queda un registro huérfano en el server que le seguiría
      // mandando avisos de este caso a un dispositivo que ya no tiene
      // acceso. Tiene que pasar ANTES del logout: el DELETE necesita la
      // cookie de sesión todavía vigente.
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            await fetch("/api/case/push/subscribe", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
          }
        }
      } catch {
        // No bloqueamos el logout si esto falla
      }
    }
    // Antes, el caso demo solo hacía router.push("/") sin llamar acá —
    // la cookie de sesión seguía viva, así que proxy.ts te mandaba de
    // vuelta a /caso apenas la landing intentaba cargar (no había forma
    // real de "salir" del demo). Mismo logout para los dos casos.
    await fetch("/api/caso/logout", { method: "POST" });
    // Lo que el service worker guardó para ver el caso sin señal no se
    // queda en el dispositivo (SEP23-16, ver lib/offlineCache.ts).
    await clearPrivateCaches();
    router.push("/");
    router.refresh();
  }

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
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="hover:underline text-[11px] disabled:opacity-60 disabled:pointer-events-none"
                style={{ color: "var(--ink-muted)" }}
              >
                {loggingOut ? "Saliendo…" : "← Volver al inicio"}
              </button>
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
              <img src={brokerImage} alt="" loading="lazy" className="h-7 w-7 shrink-0 rounded-full" referrerPolicy="no-referrer" />
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
            <InstallAppButton />
            <ThemeToggle />
            {!viewingAsBroker && (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60 disabled:pointer-events-none"
                title="Cerrar sesión"
                style={{ color: "var(--ink-muted)" }}
              >
                {loggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                <span className="sr-only">Cerrar sesión</span>
              </button>
            )}
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
