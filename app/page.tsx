import Link from "next/link";
import { Check, Home, Link2, Lock, Palette, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ContactModal from "@/components/ContactModal";
import StickyMobileCta from "@/components/StickyMobileCta";
import LandingShowcase from "@/components/LandingShowcase";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";

const BEFORE_AFTER = {
  before: {
    title: "Así es hoy",
    items: [
      "“¿En qué chat le mandé esa propiedad a los Pérez?”",
      "Un Excel por cliente, si te acordás de actualizarlo",
      "El presupuesto y las condiciones del crédito, de memoria",
      "Visitas coordinadas por WhatsApp, imposibles de encontrar después",
    ],
  },
  after: {
    title: "Así es con Micaso",
    items: [
      "Un link por familia, con todo el historial ahí",
      "El estado de cada propiedad, sin tener que buscarlo",
      "Presupuesto y crédito a la vista, en todo momento",
      "Visitas y próximos pasos, siempre ordenados",
    ],
  },
};

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Link2,
    title: "Un link privado por familia",
    body: "Cada cliente entra con su propio usuario y contraseña, a su propio caso — nunca ve a los demás clientes ni vos tenés que armarle una carpeta compartida. Se ve prolijo desde el primer mensaje que mandás.",
  },
  {
    icon: Home,
    title: "Todo en un solo lugar",
    body: "Presupuesto y crédito, propiedades vistas, visitas coordinadas y checklist de la compra — lo que hoy se pierde entre WhatsApp, Excel y notas sueltas. Nunca más buscar un dato que ya te habían pasado.",
  },
  {
    icon: Palette,
    title: "Tu marca, no la nuestra",
    body: "Tu nombre y tu foto en cada caso que ve tu cliente. Micaso es la herramienta; la relación con la familia sigue siendo tuya, no de una plataforma.",
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

const FAQS = [
  {
    q: "¿Mis clientes necesitan instalar algo?",
    a: "No. Les compartís un link con usuario y contraseña generados al crear el caso, y entran directo desde el navegador del celular o la compu — sin descargar ninguna app ni crear una cuenta. Si ya tenés el presupuesto y la zona por haber hablado con ellos, los cargás vos; si no, los completan ellos mismos la primera vez que entran.",
  },
  {
    q: "¿Necesito tarjeta para la prueba gratis?",
    a: "No. Los 14 días arrancan apenas entrás con tu cuenta, sin pedir ningún método de pago. Si se terminan y todavía no cargaste una tarjeta, tu panel pasa a solo lectura hasta que lo hagas — no perdés el acceso ni lo que ya cargaste de un día para el otro.",
  },
  {
    q: "¿Qué pasa cuando termina la búsqueda de una familia?",
    a: "Vos cerrás el caso cuando la familia ya compró, alquiló, o dejó de buscar — no expira solo. Al cerrarlo pasa a modo solo lectura: dejás de pagar por ese lugar dentro de tu plan, y la familia conserva su historial por si lo necesita más adelante.",
  },
  {
    q: "¿Otro corredor puede ver mis casos?",
    a: "No. Cada caso está completamente aislado del resto — ni otro corredor ni otro cliente tuyo puede verlo, aunque prueben adivinar la dirección. Solo vos y esa familia tienen acceso.",
  },
];

const PLANS = [
  {
    name: "Para arrancar",
    blurb: "Para probarlo con tus primeros clientes.",
    price: "USD 13",
    limit: "Hasta 5 casos activos a la vez",
    highlight: false,
    custom: false,
  },
  {
    name: "Para tu cartera",
    blurb: "Cuando ya es tu herramienta de todos los días.",
    price: "USD 29",
    limit: "Hasta 20 casos activos a la vez",
    highlight: true,
    custom: false,
  },
  {
    name: "Volumen alto",
    blurb: "¿Manejás muchos clientes a la vez? Lo ajustamos con vos.",
    price: "Hablemos",
    limit: "Casos activos a medida",
    highlight: false,
    custom: true,
  },
];

const MOCK_HOUSES: { title: string; zone: string; price: string; status: string; statusVar: string }[] = [
  { title: "Depto 2 amb. — Belgrano", zone: "CABA", price: "USD 118.000", status: "Visita coordinada", statusVar: "coordinada" },
  { title: "PH 3 amb. c/ patio — Villa Urquiza", zone: "CABA", price: "USD 96.500", status: "Gustó", statusVar: "gusto" },
  { title: "Depto 1 amb. — Colegiales", zone: "CABA", price: "USD 78.000", status: "Pendiente", statusVar: "pendiente" },
];

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function LandingPage() {
  return (
    <div className="relative flex min-h-full flex-col" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50"
        style={{ backgroundImage: NOISE, opacity: 0.025, mixBlendMode: "overlay" }}
      />

      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 78%, transparent)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
            >
              <MicasoMark size={16} color="var(--accent-ink)" />
            </span>
            <span className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Micaso
            </span>
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-medium sm:px-4"
              style={{ color: "var(--ink-muted)" }}
            >
              Ingresar
            </Link>
            <Link
              href="/panel/login"
              className="btn btn-primary hidden rounded-full px-4 py-2 text-sm font-semibold sm:inline-flex"
              style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))", color: "var(--accent-ink)" }}
            >
              Empezar prueba gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="bg-dot-grid absolute inset-0" style={{ opacity: 0.6 }} />
            <div
              className="animate-blob absolute -top-40 -left-32 h-[30rem] w-[30rem] rounded-full blur-3xl"
              style={{ background: "var(--accent)", opacity: 0.4 }}
            />
            <div
              className="animate-blob absolute top-10 -right-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
              style={{ background: "var(--gold)", opacity: 0.32, animationDelay: "-7s" }}
            />
            <div
              className="animate-blob absolute top-72 left-1/3 h-72 w-72 rounded-full blur-3xl"
              style={{ background: "color-mix(in srgb, var(--accent) 50%, var(--gold))", opacity: 0.22, animationDelay: "-4s" }}
            />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
            <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="animate-fade-up">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{ borderColor: "var(--accent-soft-border)", background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <Home size={13} /> Para corredores inmobiliarios
                </span>
                <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
                  Cada familia,
                  <br />
                  su propio link.
                </h1>
                <p
                  className="mt-2 text-3xl sm:text-4xl lg:text-[2.75rem]"
                  style={{ fontFamily: "var(--font-display)", color: "var(--ink-muted)", letterSpacing: "-0.01em" }}
                >
                  Cada búsqueda, <span className="gradient-text">bajo control</span>.
                </p>
                <p className="mt-6 max-w-lg text-base sm:text-lg" style={{ color: "var(--ink-muted)" }}>
                  Micaso organiza la búsqueda de casa de cada uno de tus
                  clientes en un panel privado: presupuesto, propiedades,
                  visitas y checklist — sin más planillas sueltas ni cadenas
                  de WhatsApp perdidas.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    href="/panel/login"
                    className="btn btn-primary rounded-full px-6 py-3.5 text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))", color: "var(--accent-ink)" }}
                  >
                    Empezar prueba gratis
                  </Link>
                  <a
                    href="/api/demo-access"
                    className="btn card-hover rounded-full border px-6 py-3.5 text-sm font-medium inline-flex items-center gap-2"
                    style={{ borderColor: "var(--border-strong)", background: "var(--surface)", color: "var(--ink)" }}
                  >
                    <Sparkles size={14} style={{ color: "var(--gold)" }} />
                    Ver caso demo en vivo
                  </a>
                </div>
                <p className="mt-4 inline-flex items-center gap-3 text-xs" style={{ color: "var(--ink-muted)" }}>
                  <span className="inline-flex items-center gap-1">
                    <Check size={13} /> 14 días gratis
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Check size={13} /> Sin tarjeta
                  </span>
                </p>
              </div>

              {/* Mock preview del panel */}
              <div className="relative animate-fade-up" style={{ animationDelay: "0.12s" }}>
                <div
                  className="z-20 hidden rotate-[-3deg] items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium sm:absolute sm:-left-8 sm:-top-8 sm:flex"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
                >
                  <Lock size={13} /> Un link, una familia
                </div>
                <div
                  className="z-20 hidden rotate-2 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium sm:absolute sm:-bottom-8 sm:-right-6 sm:flex"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
                >
                  <Check size={13} /> Sin instalar nada
                </div>

                <div
                  className="relative z-10 rotate-[1.5deg] overflow-hidden rounded-2xl border p-4 sm:p-5"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "0 24px 48px -16px rgba(27, 36, 48, 0.22)" }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ background: "linear-gradient(90deg, var(--accent), var(--gold))" }}
                  />
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
            </div>
          </div>
        </section>

        {/* Antes / después */}
        <section className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow mb-2">La diferencia</p>
            <h2 className="text-2xl sm:text-3xl">Lo que hoy se pierde, acá queda a la vista</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <div
                className="rounded-2xl border p-6"
                style={{ background: "var(--paper)", borderColor: "var(--border)" }}
              >
                <h3 className="text-base font-medium" style={{ color: "var(--ink-muted)" }}>
                  {BEFORE_AFTER.before.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-3 text-sm">
                  {BEFORE_AFTER.before.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5" style={{ color: "var(--ink-muted)" }}>
                      <X size={16} className="mt-0.5 shrink-0" style={{ color: "var(--status-descartada)" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className="rounded-2xl border-2 p-6"
                style={{
                  background: "linear-gradient(160deg, var(--surface), var(--accent-soft))",
                  borderColor: "var(--accent)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <h3 className="text-base font-medium" style={{ color: "var(--accent)" }}>
                  {BEFORE_AFTER.after.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-3 text-sm">
                  {BEFORE_AFTER.after.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check size={16} className="mt-0.5 shrink-0" style={{ color: "var(--status-gusto)" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase visual interactivo */}
        <section className="border-t" style={{ borderColor: "var(--border)", background: "linear-gradient(180deg, var(--paper) 0%, var(--surface) 100%)" }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <p className="eyebrow mb-2">Recorrido visual</p>
              <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
                Mirá cómo se ve por dentro
              </h2>
              <p className="mt-3 text-sm sm:text-base" style={{ color: "var(--ink-muted)" }}>
                Desde la primera propiedad que compartís hasta la firma de la escritura.
              </p>
            </div>

            <LandingShowcase />
          </div>
        </section>

        {/* Features */}
        <section className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-5 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="card-hover rounded-2xl border p-6"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
                    style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--gold-soft))", color: "var(--accent)" }}
                  >
                    <f.icon size={20} />
                  </span>
                  <h3 className="mt-4 text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section
          id="como-funciona"
          className="border-t"
          style={{ borderColor: "var(--border)", background: "linear-gradient(180deg, var(--accent-soft) 0%, var(--paper) 65%)" }}
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow mb-2">Cómo funciona</p>
            <h2 className="text-2xl sm:text-3xl">Tres pasos, nada de onboarding largo</h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.n} className="relative">
                  <div className="flex items-center gap-3">
                    <span
                      className="mono flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold"
                      style={{ borderColor: "var(--accent-soft-border)", background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      {s.n}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        className="hidden h-px flex-1 sm:block"
                        style={{ background: "var(--border-strong)" }}
                      />
                    )}
                  </div>
                  <h3 className="mt-4 text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Planes */}
        <section className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow mb-2">Planes</p>
            <h2 className="text-2xl sm:text-3xl">Un plan para cada tamaño de cartera</h2>
            <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--ink-muted)" }}>
              Todos los planes incluyen la herramienta completa — criterios,
              propiedades, visitas, checklist y tu marca en cada caso. La
              diferencia es cuántos casos podés tener activos al mismo
              tiempo; si te quedás corto, pasás a uno mayor cuando lo
              necesites.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className="card-hover relative flex flex-col rounded-2xl border p-6"
                  style={{
                    background: p.highlight ? "linear-gradient(160deg, var(--surface), var(--accent-soft))" : "var(--surface)",
                    borderColor: p.highlight ? "var(--accent)" : "var(--border)",
                    borderWidth: p.highlight ? 2 : 1,
                    boxShadow: p.highlight ? "0 16px 32px -12px rgba(29, 78, 137, 0.35)" : "var(--shadow-card)",
                  }}
                >
                  {p.highlight && (
                    <span
                      className="absolute -top-3 right-6 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))", color: "var(--accent-ink)" }}
                    >
                      Más elegido
                    </span>
                  )}
                  <h3 className="text-lg">{p.name}</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {p.blurb}
                  </p>
                  <p className="mt-6 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                    {p.price}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--ink-faint)" }}>
                    {p.custom ? "a medida" : "por mes, cobrado en pesos"}
                  </p>
                  <p
                    className="mt-5 flex items-center gap-2 border-t pt-5 text-sm"
                    style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                  >
                    <Check size={15} style={{ color: "var(--status-gusto)" }} />
                    {p.limit}
                  </p>
                  {p.custom ? (
                    <ContactModal
                      label="Hablar con nosotros"
                      className="btn mt-6 w-full rounded-full px-5 py-2.5 text-center text-sm font-semibold"
                      style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                    />
                  ) : (
                    <Link
                      href="/panel/login"
                      className="btn mt-6 rounded-full px-5 py-2.5 text-center text-sm font-semibold"
                      style={
                        p.highlight
                          ? { background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))", color: "var(--accent-ink)" }
                          : { border: "1px solid var(--border-strong)", color: "var(--ink)" }
                      }
                    >
                      Empezar prueba gratis
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs" style={{ color: "var(--ink-muted)" }}>
              Precios de referencia en dólares — el cobro se hace en pesos,
              al tipo de cambio del día, a través de Mercado Pago. La prueba
              de 14 días no pide tarjeta. Cancelás cuando quieras sin penalidad. Consulta nuestros{" "}
              <Link href="/terminos" className="underline underline-offset-2">
                términos de contratación
              </Link>.
            </p>
          </div>
        </section>

        {/* Por qué existe Micaso */}
        <section className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <p className="eyebrow mb-4">Por qué existe Micaso</p>
            <p
              className="text-2xl leading-snug sm:text-3xl"
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
            >
              “Empezó como una herramienta para mi propia búsqueda de casa:
              con mi pareja y la corredora que nos ayudaba, tratando de no
              perder pistas entre WhatsApp y un Excel que nadie actualizaba a
              tiempo. Cuando vi que a ella le servía tanto como a nosotros,
              decidí armar una versión que cualquier corredor pudiera usar
              con cada uno de sus clientes.”
            </p>
            <p className="mt-5 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              — Lucas, creador de Micaso
            </p>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow mb-2">Preguntas frecuentes</p>
            <h2 className="text-2xl sm:text-3xl">Antes de que preguntes</h2>
            <div className="mt-8 flex flex-col">
              {FAQS.map((item) => (
                <details key={item.q} className="group border-b py-5" style={{ borderColor: "var(--border)" }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      className="shrink-0 text-xl leading-none transition-transform duration-200 group-open:rotate-45"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
            <p className="mt-6 text-sm" style={{ color: "var(--ink-muted)" }}>
              ¿Tenés otra pregunta? <ContactModal label="Escribinos" /> y te contestamos directo.
            </p>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div
              className="relative flex flex-col items-start gap-6 overflow-hidden rounded-3xl border p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12"
              style={{ background: "var(--cta-band-bg)", borderColor: "var(--cta-band-border)" }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full blur-3xl" style={{ background: "var(--gold)", opacity: 0.2 }} />
              </div>
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl" style={{ color: "var(--cta-band-fg)" }}>
                  Probalo gratis 14 días
                </h2>
                <p className="mt-2 max-w-md text-sm" style={{ color: "var(--cta-band-fg-muted)" }}>
                  Sin tarjeta, sin instalar nada. Entrás con tu cuenta de
                  Google y creás tu primer caso en el momento.
                </p>
              </div>
              <Link
                href="/panel/login"
                className="btn relative shrink-0 rounded-full px-6 py-3.5 text-sm font-semibold"
                style={{ background: "var(--gold)", color: "#12181f" }}
              >
                Empezar prueba gratis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-8 sm:px-6" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs sm:flex-row" style={{ color: "var(--ink-muted)" }}>
          <span>Micaso — organizá la búsqueda de casa de cada cliente.</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/terminos" className="hover:underline">
              Términos de servicio
            </Link>
            <Link href="/privacidad" className="hover:underline">
              Privacidad
            </Link>
            <ContactModal label="Contacto" />
            <Link href="/login" style={{ color: "var(--ink-muted)" }} className="hover:underline">
              ¿Ya sos cliente? Ingresá a tu caso →
            </Link>
          </div>
        </div>
      </footer>

      <StickyMobileCta />
    </div>
  );
}
