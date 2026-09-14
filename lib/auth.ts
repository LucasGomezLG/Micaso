// Login del panel de corredor (/panel) — placeholder simple hasta que se
// conecte Auth.js (Google OAuth), ver ARQUITECTURA.md sección 8.
// Hardcodeado a propósito por ahora: un solo corredor de prueba.
export const BROKER_USERNAME = "corredor";
export const BROKER_PASSWORD = "micaso";
export const DEV_BROKER_ID = "dev-broker";

// El login de un caso (familia) ya NO es una credencial global: cada
// caso tiene su propio usuario/contraseña generados al crearlo, ver
// lib/cases.ts. Se valida contra lo guardado en la base, no contra una
// constante acá.
