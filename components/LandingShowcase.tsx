"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calculator,
  LayoutDashboard,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Check,
  Share2,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface Slide {
  id: string;
  tabLabel: string;
  tabIcon: React.ElementType;
  badge: string;
  title: string;
  description: string;
  content: React.ReactNode;
}

export default function LandingShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides: Slide[] = [
    {
      id: "tablero",
      tabLabel: "Tablero de Casas",
      tabIcon: Building2,
      badge: "Scraping y Seguimiento",
      title: "Cada propiedad analizada con su estado real",
      description:
        "Pegás el link de ZonaProp, ArgenProp o MercadoLibre y Micaso extrae fotos, precio, ambientes y expensas al instante. Tu cliente vota, comenta y agenda visitas.",
      content: (
        <div className="flex flex-col gap-3">
          {/* Header simulado */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="rounded-full px-2.5 py-1" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
                Todas · 8
              </span>
              <span className="rounded-full px-2.5 py-1" style={{ background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }}>
                Me gusta · 3
              </span>
              <span className="rounded-full px-2.5 py-1" style={{ background: "var(--status-coordinada-bg)", color: "var(--status-coordinada)" }}>
                Visita · 1
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              Vicente López y Olivos
            </span>
          </div>

          {/* Cards simuladas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="relative h-28 w-full bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"
                  alt="Propiedad"
                  className="h-full w-full object-cover"
                />
                <span
                  className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow"
                  style={{ background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }}
                >
                  Nos encanta
                </span>
                <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  USD 128.000
                </span>
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-semibold">Av. Maipú 1800 · 3 amb con balcón</p>
                <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: "var(--ink-muted)" }}>
                  <MapPin size={11} /> Vicente López · 72 m² · Cochera
                </p>
                <div className="mt-2.5 flex items-center justify-between border-t pt-2 text-[10px]" style={{ borderColor: "var(--border)", color: "var(--ink-faint)" }}>
                  <span>ZonaProp · Apto crédito</span>
                  <span style={{ color: "var(--accent)" }}>2 comentarios</span>
                </div>
              </div>
            </div>

            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="relative h-28 w-full bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80"
                  alt="Propiedad"
                  className="h-full w-full object-cover"
                />
                <span
                  className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow"
                  style={{ background: "var(--status-coordinada-bg)", color: "var(--status-coordinada)" }}
                >
                  Visita mañana 16hs
                </span>
                <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  USD 115.000
                </span>
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-semibold">Corrientes al 800 · Luminoso con terraza</p>
                <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: "var(--ink-muted)" }}>
                  <MapPin size={11} /> Olivos · 65 m² · Expensas $45.000
                </p>
                <div className="mt-2.5 flex items-center justify-between border-t pt-2 text-[10px]" style={{ borderColor: "var(--border)", color: "var(--ink-faint)" }}>
                  <span>Argenprop · Contacto: D&apos;Aria</span>
                  <span style={{ color: "var(--accent)" }}>Checklist: 4/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "calculadora",
      tabLabel: "Calculadora de Gastos",
      tabIcon: Calculator,
      badge: "Finanzas Claras",
      title: "Sin sorpresas el día de la firma",
      description:
        "Calculá cuotas UVA y gastos notariales e inmobiliarios del 8,5% para saber exactamente cuánta plata de bolsillo necesita tu cliente, ya sea con crédito o al contado.",
      content: (
        <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
              Simulación de compra
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              Con crédito hipotecario
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span className="text-[10px]" style={{ color: "var(--ink-faint)" }}>VALOR PROPIEDAD</span>
              <p className="mono font-bold text-sm">USD 120.000</p>
            </div>
            <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span className="text-[10px]" style={{ color: "var(--ink-faint)" }}>AHORRO PROPIO</span>
              <p className="mono font-bold text-sm">USD 45.000</p>
            </div>
          </div>

          {/* Resultado destacado */}
          <div
            className="rounded-xl p-3.5"
            style={{ background: "linear-gradient(145deg, var(--accent-soft), var(--surface))", border: "1px solid var(--accent-soft-border)" }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                Cuota mensual inicial estimada
              </span>
              <span className="mono text-lg font-bold" style={{ color: "var(--accent)" }}>
                $ 795.000 /mes
              </span>
            </div>
            <p className="mt-0.5 text-[10px]" style={{ color: "var(--ink-muted)" }}>
              TNA 6,9% UVA · Plazo 240 meses · Banco ICBC
            </p>

            <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--ink-muted)" }}>Gastos de cierre (8,5%):</span>
              <span className="mono font-semibold">USD 10.200</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs font-bold">
              <span>Total a poner en mano:</span>
              <span className="mono" style={{ color: "var(--accent)" }}>USD 55.200</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "var(--ink-muted)" }}>
            <Share2 size={12} /> Enviá este resumen a la familia por WhatsApp con 1 click
          </div>
        </div>
      ),
    },
    {
      id: "panel",
      tabLabel: "Panel del Corredor",
      tabIcon: LayoutDashboard,
      badge: "Gestión B2B",
      title: "Control total de tu cartera de clientes",
      description:
        "Mirá cuántas propiedades tiene cada familia, qué visitas vencen hoy y compartí accesos por WhatsApp con tu marca y tu foto en la cabecera.",
      content: (
        <div className="flex flex-col gap-3">
          {/* KPIs del agente */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <p className="mono text-lg font-bold">4 / 5</p>
              <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Casos activos</p>
            </div>
            <div className="rounded-xl border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <p className="mono text-lg font-bold">26</p>
              <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Propiedades</p>
            </div>
            <div className="rounded-xl border p-2.5" style={{ borderColor: "var(--status-coordinada-bg)", color: "var(--status-coordinada)" }}>
              <p className="mono text-lg font-bold">2</p>
              <p className="text-[10px]">Visitas hoy</p>
            </div>
          </div>

          {/* Fila de caso simulada */}
          <div
            className="flex flex-col gap-2 rounded-xl border p-3.5"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold">Familia Pérez</span>
                <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }}>
                  Compra · Activo
                </span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
                Última actividad: hoy
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
              <span style={{ color: "var(--ink-muted)" }}>
                Usuario: <strong className="mono">perez</strong> · Clave: <strong className="mono">3481</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
                <Share2 size={11} /> Compartir WhatsApp
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "mobile",
      tabLabel: "En el Celular",
      tabIcon: Smartphone,
      badge: "100% Mobile",
      title: "Tus clientes entran sin bajar ninguna app",
      description:
        "Diseñado para abrirse directo desde WhatsApp en el navegador del teléfono. Barra inferior táctil, botones grandes y carga ultra rápida.",
      content: (
        <div className="mx-auto flex max-w-xs flex-col overflow-hidden rounded-2xl border shadow-lg" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
          {/* Header móvil */}
          <div className="flex items-center justify-between border-b px-3.5 py-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
                V
              </span>
              <div className="leading-tight">
                <p className="text-xs font-bold">Martín y Sofía</p>
                <p className="text-[9px]" style={{ color: "var(--accent)" }}>Valeria Propiedades</p>
              </div>
            </div>
            <span className="text-[10px] font-bold" style={{ color: "var(--status-gusto)" }}>
              Activo
            </span>
          </div>

          {/* Cuerpo móvil */}
          <div className="flex flex-col gap-2 p-3">
            <div className="rounded-xl border p-2.5 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex justify-between font-medium">
                <span>Presupuesto acordado</span>
                <span className="mono font-bold">USD 120.000</span>
              </div>
              <p className="mt-1 text-[10px]" style={{ color: "var(--ink-muted)" }}>
                Aporte: USD 40.000 · Crédito ICBC pre-aprobado
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span className="font-medium">8 casas en seguimiento</span>
              <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>Ver todas →</span>
            </div>
          </div>

          {/* Bottom Nav Bar móvil */}
          <div className="flex items-center justify-around border-t py-1.5 text-[9px] font-semibold" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <span className="flex flex-col items-center" style={{ color: "var(--accent)" }}>
              <Building2 size={14} /> Casas
            </span>
            <span className="flex flex-col items-center" style={{ color: "var(--ink-faint)" }}>
              <Calculator size={14} /> Números
            </span>
            <span className="flex flex-col items-center" style={{ color: "var(--ink-faint)" }}>
              <Check size={14} /> Checklist
            </span>
          </div>
        </div>
      ),
    },
  ];

  // Autoplay cada 7 segundos si el usuario no tiene el mouse encima
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const current = slides[activeTab];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative flex flex-col overflow-hidden rounded-3xl border shadow-xl"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "0 24px 64px -16px rgba(18, 24, 31, 0.25)",
      }}
    >
      {/* Selector de pestañas superior */}
      <div className="flex items-center justify-between border-b px-3 pt-3 sm:px-6" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
        <div className="-mb-px flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {slides.map((s, idx) => {
            const Icon = s.tabIcon;
            const active = idx === activeTab;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className="flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-xs font-semibold transition-all sm:text-sm"
                style={{
                  borderColor: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink-muted)",
                }}
              >
                <Icon size={16} />
                <span>{s.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Flechas de navegación */}
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="rounded-full border p-1.5 text-xs transition-colors hover:bg-black/5"
            style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            aria-label="Anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev + 1) % slides.length)}
            className="rounded-full border p-1.5 text-xs transition-colors hover:bg-black/5"
            style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            aria-label="Siguiente"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Cuerpo principal del Showcase */}
      <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* Descripción lateral */}
        <div className="flex flex-col gap-4">
          <div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Sparkles size={12} /> {current.badge}
            </span>
            <h3 className="mt-2.5 text-2xl sm:text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {current.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              {current.description}
            </p>
          </div>

          <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <a
              href="/api/demo-access"
              className="btn btn-primary inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-sm"
              style={{
                background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--gold)))",
                color: "var(--accent-ink)",
              }}
            >
              Probar caso demo en vivo
              <ExternalLink size={14} />
            </a>
            <Link
              href="/panel/login"
              className="btn inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-xs sm:text-sm font-medium"
              style={{ borderColor: "var(--border-strong)", color: "var(--ink)" }}
            >
              Empezar prueba gratis
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Maqueta interactiva visual */}
        <div
          className="relative overflow-hidden rounded-2xl border p-3.5 sm:p-5"
          style={{
            borderColor: "var(--border)",
            background: "var(--paper)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {current.content}
        </div>
      </div>

      {/* Indicadores de puntos inferiores */}
      <div className="flex items-center justify-center gap-1.5 border-t py-2.5" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveTab(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === activeTab ? 24 : 6,
              background: i === activeTab ? "var(--accent)" : "var(--border)",
            }}
            aria-label={`Ir a diapositiva ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
