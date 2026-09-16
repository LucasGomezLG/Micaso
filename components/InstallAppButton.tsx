"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Botón para forzar la instalación como PWA — sin esto, depende de que
 * el usuario encuentre "Agregar a pantalla de inicio" solo en el menú
 * del navegador. Android/Chrome expone `beforeinstallprompt` y se puede
 * disparar por código; iOS Safari no tiene esa API en absoluto, así que
 * ahí el botón solo puede mostrar instrucciones manuales. */
export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosMode, setIosMode] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    let handler: ((e: Event) => void) | null = null;
    const timer = setTimeout(() => {
      if (isStandalone()) return;

      if (isIOS()) {
        setIosMode(true);
        setVisible(true);
        return;
      }

      handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
    }, 0);

    return () => {
      clearTimeout(timer);
      if (handler) window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (!visible) return null;

  async function handleClick() {
    if (iosMode) {
      setShowIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Instalar Micaso como app"
        aria-label="Instalar Micaso como app"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:opacity-90"
        style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-muted)" }}
      >
        <Download size={15} />
      </button>

      {showIosHelp && (
        <div
          className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(18, 24, 31, 0.55)" }}
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="animate-modal-pop w-full max-w-sm rounded-2xl border p-6"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg">Instalar Micaso</h3>
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                aria-label="Cerrar"
                className="text-2xl leading-none"
                style={{ color: "var(--ink-faint)" }}
              >
                ×
              </button>
            </div>
            <ol className="mt-3 flex flex-col gap-2.5 text-sm" style={{ color: "var(--ink-muted)" }}>
              <li className="flex items-center gap-2">
                <Share size={16} className="shrink-0" style={{ color: "var(--accent)" }} />
                Tocá el ícono de Compartir en Safari
              </li>
              <li>Elegí &ldquo;Agregar a inicio&rdquo;</li>
              <li>Listo — Micaso queda como una app más, a pantalla completa</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
