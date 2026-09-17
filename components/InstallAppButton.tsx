"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Download, Share, MoreVertical, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const emptySubscribe = () => () => {};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

/** Botón para instalar Micaso como app (PWA) tanto en celular como en computadora.
 * Visible en todo navegador no-standalone. Si el navegador expone `beforeinstallprompt`,
 * dispara el diálogo nativo directo. De lo contrario, muestra una guía paso a paso
 * adaptada al dispositivo (iOS Safari, Android Chrome, o escritorio). */
export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [acceptedInstall, setAcceptedInstall] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const standalone = useSyncExternalStore(emptySubscribe, isStandalone, () => false);
  const platform = useSyncExternalStore(emptySubscribe, detectPlatform, () => "desktop");

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Si aún no montó en cliente o si ya está corriendo instalada a pantalla completa, no mostrar
  if (!mounted || standalone || acceptedInstall) return null;

  async function handleClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setAcceptedInstall(true);
        }
        setDeferredPrompt(null);
        return;
      } catch {
        // En caso de error inesperado con el prompt del navegador, mostrar la guía
      }
    }

    // Si no hay prompt nativo disponible (iOS, Android sobre red local HTTP o navegadores sin la API)
    setShowHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Instalar Micaso como app"
        aria-label="Instalar Micaso como app"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors hover:opacity-90"
        style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-muted)" }}
      >
        <Download size={15} />
      </button>

      {showHelp &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(18, 24, 31, 0.55)" }}
            onClick={() => setShowHelp(false)}
          >
            <div
              className="animate-modal-pop w-full max-w-sm rounded-2xl border p-6"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    <Download size={15} />
                  </span>
                  <h3 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                    Instalar Micaso
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  aria-label="Cerrar"
                  className="text-2xl leading-none"
                  style={{ color: "var(--ink-faint)" }}
                >
                  ×
                </button>
              </div>

              {platform === "ios" && (
                <ol className="mt-4 flex flex-col gap-3 text-sm" style={{ color: "var(--ink-muted)" }}>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>1</span>
                    <span className="leading-snug">
                      Tocá el botón <strong style={{ color: "var(--ink)" }}>Compartir</strong> <Share size={14} className="inline align-text-bottom" style={{ color: "var(--accent)" }} /> en la barra inferior de Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>2</span>
                    <span className="leading-snug">
                      Buscá y elegí <strong style={{ color: "var(--ink)" }}>&ldquo;Agregar a inicio&rdquo;</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>3</span>
                    <span className="leading-snug">
                      ¡Listo! Micaso queda guardada como una app a pantalla completa en tu celular.
                    </span>
                  </li>
                </ol>
              )}

              {platform === "android" && (
                <ol className="mt-4 flex flex-col gap-3 text-sm" style={{ color: "var(--ink-muted)" }}>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>1</span>
                    <span className="leading-snug">
                      Tocá el menú de opciones <strong style={{ color: "var(--ink)" }}>(los tres puntos ⋮)</strong> <MoreVertical size={14} className="inline align-text-bottom" style={{ color: "var(--accent)" }} /> arriba a la derecha en Chrome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>2</span>
                    <span className="leading-snug">
                      Elegí <strong style={{ color: "var(--ink)" }}>&ldquo;Instalar aplicación&rdquo;</strong> o <strong style={{ color: "var(--ink)" }}>&ldquo;Agregar a pantalla principal&rdquo;</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>3</span>
                    <span className="leading-snug">
                      Confirmá la instalación para usar Micaso como una app nativa en tu celular.
                    </span>
                  </li>
                </ol>
              )}

              {platform === "desktop" && (
                <ol className="mt-4 flex flex-col gap-3 text-sm" style={{ color: "var(--ink-muted)" }}>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>1</span>
                    <span className="leading-snug">
                      Hacé clic en el ícono de instalación en la barra de direcciones de tu navegador (Chrome o Edge) <Monitor size={14} className="inline align-text-bottom" style={{ color: "var(--accent)" }} />.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>2</span>
                    <span className="leading-snug">
                      O desde el menú ⋮ elegí <strong style={{ color: "var(--ink)" }}>&ldquo;Instalar Micaso&rdquo;</strong>.
                    </span>
                  </li>
                </ol>
              )}

              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="btn btn-primary mt-5 w-full rounded-xl py-2 text-xs font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Entendido
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
