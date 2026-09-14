"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/** Red de contención para fallas de red reales (offline, DNS, timeout) —
 * distinto de un 4xx/5xx, que cada componente ya maneja con su propio
 * `if (!res.ok)` porque ahí sí hay un mensaje específico de la API. Acá
 * un `fetch()` directamente rechaza la promesa (TypeError) sin llegar a
 * un `res`, y sin este listener quedaba como error de consola sin que
 * nadie del otro lado del celular se enterara de que no se guardó nada. */
export default function GlobalErrorToasts() {
  useEffect(() => {
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const isNetworkFailure =
        reason instanceof TypeError && /fetch|network|load failed/i.test(reason.message);
      if (!isNetworkFailure) return;
      toast.error("Se perdió la conexión. Probá de nuevo.");
    }
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  return null;
}
