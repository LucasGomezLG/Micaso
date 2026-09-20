"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Bell, BellRing } from "lucide-react";

const DISMISS_KEY = "micaso_push_dismissed_until";

const emptySubscribe = () => () => {};

function checkCanShow(): boolean {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return false;
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return false;
  }
  try {
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return false;
    }
  } catch {}
  return true;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationPrompt() {
  const canShow = useSyncExternalStore(emptySubscribe, checkCanShow, () => false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!canShow || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      // Posponer por 7 días
      const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(sevenDays));
    } catch {}
  }

  async function handleSubscribe() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.info("Avisos no activados. Podés habilitarlos cuando quieras desde la configuración de tu navegador.");
        setDismissed(true);
        return;
      }

      // Registrar Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Obtener clave pública VAPID del servidor
      const keyRes = await fetch("/api/case/push/subscribe");
      if (!keyRes.ok) throw new Error("No se pudo obtener la clave VAPID");
      const { publicKey } = await keyRes.json();

      // Limpiar suscripciones viejas (si cambiaron las llaves VAPID en el servidor, 
      // intentar suscribir con una llave nueva tira "Registration failed - push service error")
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // Suscribir dispositivo a través del PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const saveRes = await fetch("/api/case/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json().catch(() => ({}));
        throw new Error(errorData.error || "No se pudo registrar la suscripción");
      }

      toast.success("¡Avisos activados! Te notificaremos las novedades de tu búsqueda en este celular.");
      setDismissed(true);
    } catch {
      toast.error("No pudimos conectar con el servicio de notificaciones de tu celular.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 text-xs sm:text-sm"
      style={{
        borderColor: "var(--accent-soft-border)",
        background: "color-mix(in srgb, var(--accent-soft) 40%, var(--surface))",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <BellRing size={16} />
        </span>
        <div className="leading-snug">
          <p className="font-semibold" style={{ color: "var(--ink)" }}>
            Avisos de visitas y nuevas casas en este celular
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--ink-muted)" }}>
            Enterate al instante cuando tu asesor agende una visita o te recomiende una propiedad. Sin emails ni registros.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: "var(--ink-muted)" }}
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading}
          className="btn btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          <Bell size={12} /> {loading ? "Activando…" : "Activar avisos"}
        </button>
      </div>
    </div>
  );
}
