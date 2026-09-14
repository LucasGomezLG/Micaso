// Login del panel de corredor: Auth.js (Google OAuth), ver auth.ts.
// FOUNDER_EMAIL mapea la cuenta de Google de Lucas al mismo
// dev-broker de siempre, para no migrar el caso demo de Lucas y Abril
// a mano — ver lib/brokers.ts.
export const FOUNDER_EMAIL = "luccaass96@gmail.com";
export const DEV_BROKER_ID = "dev-broker";

// Panel de super-admin (ARQUITECTURA.md sección 7): mismo login de
// Google que un corredor, pero el email tiene que estar acá — proxy.ts
// redirige a /superadmin solo si coincide. Sumar otro admin es agregar
// su email a esta lista.
export const ADMIN_EMAILS = new Set([FOUNDER_EMAIL]);

// El login de un caso (familia) sigue sin ser una credencial global:
// cada caso tiene su propio usuario/contraseña generados al crearlo,
// ver lib/cases.ts. Se valida contra lo guardado en la base, no contra
// una constante acá.
