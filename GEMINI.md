# GEMINI.md

Guía de desarrollo y contexto de proyecto para Antigravity / Gemini en **Micaso**.

---

## 🧠 Protocolo de inicio — Antes de hacer cualquier cosa

**Antes de escribir una sola línea de código o tomar cualquier decisión**, seguir este protocolo:

### 1. Actuar como experto en la materia
Identificar qué dominio o disciplina requiere la tarea solicitada y adoptar ese rol de experto:
- **Autenticación:** Experto en seguridad web y Auth.js.
- **Base de datos / Redis:** Experto en arquitectura de datos y Upstash Redis.
- **UI/UX:** Experto en diseño de interfaces con Next.js App Router, React 19 y Tailwind v4.
- **Pagos:** Experto en integración de Mercado Pago (checkout pro / suscripciones).
- **Arquitectura y diseño:** Arquitecto de software senior con experiencia en SaaS multi-tenant.

### 2. Analizar el entorno antes de actuar
Siempre leer y comprender el contexto antes de proponer cambios:
- Leer [ARQUITECTURA.md](file:///d:/Micaso/ARQUITECTURA.md) (**fuente de verdad absoluta del sistema**).
- Leer [README.md](file:///d:/Micaso/README.md) para entender la estructura del repositorio.
- Revisar los archivos relevantes a la tarea (`lib/`, `app/`, `components/`, etc.).
- Entender qué ya existe y qué falta, para no duplicar ni contradecir decisiones tomadas.

### 3. Principios de actuación
- **No inventar soluciones que ya están documentadas:** Si [ARQUITECTURA.md](file:///d:/Micaso/ARQUITECTURA.md) describe cómo hacer algo, seguir eso estrictamente.
- **No romper decisiones cerradas** (ver sección de decisiones cerradas).
- **Preguntar si hay ambigüedad** antes de asumir una dirección de implementación riesgosa o divergente.
- **Priorizar la coherencia del sistema** por encima de la solución más elegante en aislamiento.
- **Documentar decisiones nuevas** si la tarea genera una elección que afecta al sistema.

---

## Estado del proyecto

Micaso es la propuesta de convertir Casa (una herramienta privada de búsqueda de casa, en producción para 3 personas en `D:\Casa`) en un SaaS que un corredor inmobiliario contrata para gestionar la búsqueda de cada uno de sus clientes.
Ver [README.md](file:///d:/Micaso/README.md) para la estructura del repo y [ARQUITECTURA.md](file:///d:/Micaso/ARQUITECTURA.md) para el diseño completo.

- **Base de partida:** El código en `app/`, `components/`, `lib/`, `proxy.ts` partió de una copia inicial de `D:\Casa` (Next.js 16, React 19, TypeScript, Tailwind v4, Redis vía Upstash).
- **Decisión de desarrollo:** Se construye sin esperar validación previa de pago como proyecto personal para aprender (la validación no bloquea el desarrollo).
- **Fases de construcción:**
  1. **Núcleo multi-caso** (sin credenciales externas): `lib/types.ts`, `lib/store.ts`, `lib/cases.ts`, plantillas en `lib/seed.ts`.
  2. **Auth.js** (Google OAuth para corredor y super-admin) y **Mercado Pago** (pagos y webhooks): se integran a medida que se dispongan de las credenciales correspondientes.

---

## Decisiones ya cerradas (no reabrir sin motivo expreso)

- **Tres niveles de acceso:**
  1. `super-admin`: Lucas (Google OAuth + lista blanca de emails).
  2. `corredor`: Google OAuth.
  3. `caso`: Usuario y contraseña simple generados por caso para el cliente final/familia.
- **Un solo repositorio (Monorepo unificado):**
  Next.js App Router contiene tanto el frontend como las rutas de backend (`app/api/*`). No separar en repositorios ni microservicios independientes.
- **Base de datos única (Redis Upstash):**
  Namespacing estricto mediante claves Redis: `case:{caseId}:...`, `broker:{brokerId}:...`, etc. No se usa una base de datos por corredor. Las credenciales de Upstash se gestionan vía variables de entorno.
- **Pasarela de pagos:**
  Mercado Pago (no Stripe, dado que Argentina no soporta cobro directo con Stripe).
- **Nombre público:**
  **Micaso**. ("Casa" permanece como nombre interno/histórico del proyecto original).

---

## Particularidades del Stack (Next.js 16 / React 19 / Tailwind v4)

- Esta versión cuenta con cambios de APIs y convenciones respecto a versiones anteriores de Next.js. Revisar la documentación interna en `node_modules/next/dist/docs/` si surgen dudas.
- Respetar el paradigma de Server Components y Client Components (`'use client'`).
- Mantener la tipificación estricta en TypeScript.
