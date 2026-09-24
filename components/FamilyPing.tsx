"use client";

import { useEffect, useRef } from "react";

// Register activity at most once per hour per session to avoid spamming the DB
const PING_THROTTLE_MS = 1000 * 60 * 60;

export default function FamilyPing({ caseId }: { caseId: string }) {
  // Para qué caso ya se hizo el ping en este montaje: si el layout de
  // /caso sigue montado y la sesión pasa a otro caso, el segundo también
  // tiene que registrarse (SEP23-21).
  const pingedFor = useRef<string | null>(null);

  useEffect(() => {
    // Only run on the client, and only once per case per mount
    if (pingedFor.current === caseId) return;

    // Una clave por caso: con una sola clave global, entrar a dos casos
    // desde el mismo dispositivo dentro de la misma hora no registraba la
    // visita del segundo, y el panel del corredor mostraba mal su "última
    // visita" (SEP23-21, AUDITORIA-2026-09-23.md).
    const storageKey = `micaso_last_ping:${caseId}`;
    let lastPing: string | null = null;
    try {
      lastPing = localStorage.getItem(storageKey);
    } catch {
      // localStorage bloqueado (modo privado) — se pingea igual, sin throttle.
    }
    const now = Date.now();

    if (!lastPing || now - parseInt(lastPing, 10) > PING_THROTTLE_MS) {
      pingedFor.current = caseId;
      try {
        localStorage.setItem(storageKey, now.toString());
      } catch {
        // idem
      }

      // Perform ping in the background
      fetch("/api/caso/ping", { method: "POST" }).catch(() => {
        // Silently ignore errors to avoid disrupting the user experience
        console.error("Failed to ping family activity");
      });
    }
  }, [caseId]);

  // Invisible component
  return null;
}
