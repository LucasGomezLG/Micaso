import Link from "next/link";

const FEATURES = [
  {
    icon: "🔗",
    title: "Un link privado por familia",
    body: "Cada cliente entra con su propio usuario y contraseña, a su propio caso — nunca ve a los demás clientes ni vos tenés que armarle una carpeta compartida.",
  },
  {
    icon: "🏡",
    title: "Todo en un solo lugar",
    body: "Presupuesto y crédito, propiedades vistas, visitas coordinadas y checklist de la compra — lo que hoy se pierde entre WhatsApp, Excel y notas sueltas.",
  },
  {
    icon: "🎨",
    title: "Tu marca, no la nuestra",
    body: "Tu nombre y tu foto en cada caso que ve tu cliente. Micaso es la herramienta; la relación con la familia sigue siendo tuya.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Creás el caso",
    body: "Nombre de la familia y tipo de búsqueda — compra o alquiler. Nada más para arrancar.",
  },
  {
    n: "02",
    title: "Compartís el link",
    body: "Usuario y contraseña generados al toque, listos para mandar por WhatsApp.",
  },
  {
    n: "03",
    title: "Seguís todo junto con la familia",
    body: "Vos cargás lo que sabés, ellos suman lo que ven — un solo tablero, sin duplicar trabajo.",
  },
];

const MOCK_HOUSES: { title: string; zone: string; price: string; status: string; statusVar: string }[] = [
  { title: "Depto 2 amb. — Belgrano", zone: "CABA", price: "USD 118.000", status: "Visita coordinada", statusVar: "coordinada" },
  { title: "PH 3 amb. c/ patio — Villa Urquiza", zone: "CABA", price: "USD 96.500", status: "Gustó", statusVar: "gusto" },
  { title: "Depto 1 amb. — Colegiales", zone: "CABA", price: "USD 78.000", status: "Pendiente", statusVar: "pendiente" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <header
        className="border-b"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span
            className="text-xl font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Micaso
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-medium sm:px-4"
              style={{ color: "var(--ink-muted)" }}
            >
              Ingresar
            </Link>
            <Link
              href="/panel/login"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              Empezar prueba gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="eyebrow mb-4">Para corredores inmobiliarios</p>
              <h1 className="text-4xl leading-[1.08] sm:text-5xl">
                Cada familia, su propio link.
                <br />
                Cada búsqueda, bajo control.
              </h1>
              <p className="mt-5 max-w-lg text-base sm:text-lg" style={{ color: "var(--ink-muted)" }}>
                Micaso organiza la búsqueda de casa de cada uno de tus
                clientes en un panel privado: presupuesto, propiedades,
                visitas y checklist — sin más planillas sueltas ni cadenas
                de WhatsApp perdidas.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/panel/login"
                  className="rounded-full px-6 py-3 text-sm font-semibold"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  Empezar prueba gratis
                </Link>
                <a
                  href="#como-funciona"
                  className="rounded-full border px-6 py-3 text-sm font-medium"
                  style={{ borderColor: "var(--border-strong)", color: "var(--ink)" }}
                >
                  Ver cómo funciona
                </a>
              </div>
              <p className="mt-4 text-xs" style={{ color: "var(--ink-faint)" }}>
                14 días gratis, sin tarjeta.
              </p>
            </div>

            {/* Mock preview del panel */}
            <div
              className="rounded-2xl border p-4 sm:p-5"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow mb-1">Caso</p>
                  <p className="text-base font-medium" style={{ fontFamily: "var(--font-display)" }}>
                    Familia Pérez
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                >
                  Compra
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {MOCK_HOUSES.map((h) => (
                  <div
                    key={h.title}
                    className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{h.title}</p>
                      <p className="text-xs" style={{ color: "var(--ink-faint)" }}>{h.zone}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="mono text-xs">{h.price}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: `var(--status-${h.statusVar}-bg)`,
                          color: `var(--status-${h.statusVar})`,
                        }}
                      >
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-8 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="mt-3 text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="eyebrow mb-2">Cómo funciona</p>
            <h2 className="text-2xl sm:text-3xl">Tres pasos, nada de onboarding largo</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <span className="mono text-2xl" style={{ color: "var(--accent)" }}>{s.n}</span>
                  <h3 className="mt-2 text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div
              className="flex flex-col items-start gap-6 rounded-3xl border p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12"
              style={{ background: "#12181f", borderColor: "rgba(255, 255, 255, 0.08)" }}
            >
              <div>
                <h2 className="text-2xl sm:text-3xl" style={{ color: "#f4f5f3" }}>
                  Probalo gratis 14 días
                </h2>
                <p className="mt-2 max-w-md text-sm" style={{ color: "rgba(244, 245, 243, 0.7)" }}>
                  Sin tarjeta, sin instalar nada. Entrás con tu cuenta de
                  Google y creás tu primer caso en el momento.
                </p>
              </div>
              <Link
                href="/panel/login"
                className="shrink-0 rounded-full px-6 py-3 text-sm font-semibold"
                style={{ background: "#d9ab5c", color: "#12181f" }}
              >
                Empezar prueba gratis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-8 sm:px-6" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs sm:flex-row" style={{ color: "var(--ink-faint)" }}>
          <span>Micaso — organizá la búsqueda de casa de cada cliente.</span>
          <Link href="/login" style={{ color: "var(--ink-faint)" }}>
            ¿Ya sos cliente de un corredor? Ingresá a tu caso →
          </Link>
        </div>
      </footer>
    </div>
  );
}
