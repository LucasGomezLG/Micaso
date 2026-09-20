/** Versión vigente de Términos de servicio / Política de privacidad.
 * Compartida por components/LoginForm.tsx (para no repetir el checkbox
 * de aceptación si el dispositivo ya aceptó esta misma versión, ver
 * localStorage ahí) y lib/cases.ts (recordTermsAcceptance, que guarda
 * en el caso la primera vez que se aceptó). Subir este string obliga a
 * volver a mostrar el checkbox — solo cambiarlo cuando el texto real de
 * /terminos o /privacidad cambie. */
export const TERMS_VERSION = "2026-09-v1";
