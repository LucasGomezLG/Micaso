"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Link2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";
import { Broker, TipoCaso } from "@/lib/types";
import { apiErrorMessage } from "@/lib/http";
import { MicasoMark } from "@/components/MicasoMark";

const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.82;

async function compressToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export default function BrokerOnboarding({ broker }: { broker: Broker }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nombreMarca, setNombreMarca] = useState(broker.nombreMarca || "");
  const [imagenUrl, setImagenUrl] = useState<string | null>(broker.imagenUrl || null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Datos para el Paso 3 (Creación de caso)
  const [tituloCaso, setTituloCaso] = useState("");
  const [tipoCaso, setTipoCaso] = useState<TipoCaso>("compra");
  const [creatingCase, setCreatingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor seleccioná un archivo de imagen.");
      return;
    }
    try {
      const dataUrl = await compressToDataUrl(file);
      setImagenUrl(dataUrl);
      toast.success("Foto cargada.");
    } catch {
      toast.error("No se pudo procesar la imagen.");
    }
  }

  async function saveProfileAndNext() {
    const trimmedName = nombreMarca.trim();
    if (!trimmedName) {
      toast.error("Ingresá un nombre o razón social.");
      return;
    }

    setSavingProfile(true);
    const res = await fetch("/api/panel/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombreMarca: trimmedName,
        imagenUrl: imagenUrl,
      }),
    });
    setSavingProfile(false);

    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo guardar el perfil."));
      return;
    }

    setStep(2);
  }

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    if (!tituloCaso.trim()) return;

    setCreatingCase(true);
    setCaseError(null);

    const res = await fetch("/api/panel/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: tituloCaso.trim(),
        tipoCaso,
      }),
    });

    setCreatingCase(false);

    if (res.ok) {
      toast.success("¡Bienvenido! Tu primer caso ya está creado.");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setCaseError(data.error || "No se pudo crear el caso.");
    }
  }

  return (
    <div
      className="relative mt-4 overflow-hidden rounded-3xl border p-6 sm:p-10"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Barra superior de progreso de pasos */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(90deg, var(--accent) ${
            step === 1 ? "33%" : step === 2 ? "66%" : "100%"
          }, var(--border) 0%)`,
          transition: "background 0.3s ease",
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--border)" }}>
        <div>
          <span className="eyebrow" style={{ color: "var(--accent)" }}>
            Configuración inicial · Paso {step} de 3
          </span>
          <h2 className="mt-1 text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            {step === 1 && "Personalizá tu marca blanca"}
            {step === 2 && "¿Cómo funciona el seguimiento?"}
            {step === 3 && "Creá el caso de tu primer cliente"}
          </h2>
        </div>

        {/* Indicadores de pasos */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (s < step || (s === 2 && nombreMarca.trim())) setStep(s as 1 | 2 | 3);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
              style={{
                background: step === s ? "var(--accent)" : s < step ? "var(--accent-soft)" : "var(--paper)",
                color: step === s ? "var(--accent-ink)" : s < step ? "var(--accent)" : "var(--ink-faint)",
                border: `1px solid ${step === s ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {s < step ? <Check size={13} strokeWidth={2.5} /> : s}
            </button>
          ))}
        </div>
      </div>

      {/* PASO 1: IDENTIDAD Y MARCA */}
      {step === 1 && (
        <div className="mt-8 flex flex-col gap-8">
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Micaso está pensado para que vos seas el protagonista. Tus clientes verán tu foto o logo y el nombre de tu inmobiliaria en la parte superior de su pantalla. <strong>Nunca verán la marca de Micaso.</strong>
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Formulario de marca */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="eyebrow">Tu foto o logo comercial</span>
                <div className="flex items-center gap-4">
                  <div
                    className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2"
                    style={{
                      borderColor: "var(--accent-soft-border)",
                      background: "var(--accent-soft)",
                    }}
                  >
                    {imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagenUrl} alt="Logo o foto" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                        {nombreMarca ? nombreMarca.slice(0, 1).toUpperCase() : "M"}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Cambiar imagen"
                    >
                      <Camera size={20} />
                      <span className="text-[10px] font-medium">Cambiar</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                      style={{ borderColor: "var(--border-strong)", background: "var(--surface)", color: "var(--ink)" }}
                    >
                      <Camera size={13} /> Subir foto o logo
                    </button>
                    {imagenUrl && (
                      <button
                        type="button"
                        onClick={() => setImagenUrl(null)}
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: "var(--status-descartada)" }}
                      >
                        <X size={12} /> Quitar imagen
                      </button>
                    )}
                    <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
                      JPG, PNG o WebP. Se ajusta automáticamente.
                    </span>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
              </div>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="eyebrow">Nombre comercial o personal</span>
                <input
                  type="text"
                  value={nombreMarca}
                  onChange={(e) => setNombreMarca(e.target.value)}
                  placeholder="ej. Carolina Gómez Propiedades"
                  className="rounded-xl border px-3.5 py-2.5 text-base font-medium outline-none transition-colors"
                  style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                />
                <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                  Podés cambiarlo en cualquier momento desde tu panel.
                </span>
              </label>
            </div>

            {/* Preview interactivo en tiempo real */}
            <div className="flex flex-col gap-2">
              <span className="eyebrow" style={{ color: "var(--ink-muted)" }}>
                Vista previa: Así te verá cada familia en su celular
              </span>
              <div
                className="overflow-hidden rounded-2xl border p-4 shadow-sm"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--paper)",
                }}
              >
                {/* Mockup de cabecera de cliente */}
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border p-3 backdrop-blur"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagenUrl} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
                      >
                        <MicasoMark size={16} color="var(--accent-ink)" />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                        Familia García
                      </span>
                      <span className="eyebrow truncate text-[10px]" style={{ color: "var(--accent)" }}>
                        {nombreMarca || "Tu Inmobiliaria"} · Compra
                      </span>
                    </div>
                  </div>

                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }}
                  >
                    Activo
                  </span>
                </div>

                <p className="mt-3 text-center text-xs" style={{ color: "var(--ink-faint)" }}>
                  Tus clientes se conectan con tu identidad profesional desde el primer contacto.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t pt-6" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              disabled={savingProfile || !nombreMarca.trim()}
              onClick={saveProfileAndNext}
              className="btn btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--gold)))",
                color: "var(--accent-ink)",
              }}
            >
              {savingProfile ? "Guardando…" : "Continuar a Paso 2"}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: CÓMO FUNCIONA EL SEGUIMIENTO */}
      {step === 2 && (
        <div className="mt-8 flex flex-col gap-8">
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Micaso unifica todo el proceso de búsqueda en una herramienta limpia y ordenada. Así es cómo lo vas a usar con tus clientes:
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            <div
              className="flex flex-col gap-3 rounded-2xl border p-5"
              style={{ borderColor: "var(--border)", background: "var(--paper)" }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <Link2 size={20} />
              </span>
              <h3 className="text-base font-semibold">1. Un link privado por familia</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                Al crear un caso, se genera un link con usuario y clave que le enviás por WhatsApp con un solo click. Tu cliente no tiene que descargar nada ni registrarse.
              </p>
            </div>

            <div
              className="flex flex-col gap-3 rounded-2xl border p-5"
              style={{ borderColor: "var(--border)", background: "var(--paper)" }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--status-coordinada-bg)", color: "var(--status-coordinada)" }}
              >
                <Sparkles size={20} />
              </span>
              <h3 className="text-base font-semibold">2. Pegás el link y listo</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                Copiás la URL de cualquier propiedad de ZonaProp, ArgenProp o MercadoLibre y Micaso extrae las fotos, precio, ambientes y expensas al instante.
              </p>
            </div>

            <div
              className="flex flex-col gap-3 rounded-2xl border p-5"
              style={{ borderColor: "var(--border)", background: "var(--paper)" }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }}
              >
                <CheckCircle2 size={20} />
              </span>
              <h3 className="text-base font-semibold">3. Todo centralizado</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                Llevan el registro de visitas, notas compartidas, calculadora de cuotas y escrituración (8,5%), y el checklist de papeles para llegar a la firma sin sorpresas.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-6" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            >
              <ArrowLeft size={14} /> Volver a mi marca
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--gold)))",
                color: "var(--accent-ink)",
              }}
            >
              Crear mi primer caso
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: CREAR TU PRIMER CASO */}
      {step === 3 && (
        <form onSubmit={handleCreateCase} className="mt-8 flex flex-col gap-6">
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Ingresá el nombre de tu cliente o familia para arrancar. Los criterios de búsqueda, presupuesto y propiedades los van a cargar directamente dentro del caso.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="eyebrow">Nombre del cliente o familia</span>
              <input
                type="text"
                required
                autoFocus
                value={tituloCaso}
                onChange={(e) => setTituloCaso(e.target.value)}
                placeholder="ej. Familia Martínez o Lucas y Abril"
                className="rounded-xl border px-3.5 py-2.5 text-base font-medium outline-none transition-colors"
                style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
              />
              <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                Este nombre lo verá tu cliente en la pantalla de bienvenida.
              </span>
            </label>

            <div className="flex flex-col gap-1.5 text-sm">
              <span className="eyebrow">Tipo de búsqueda</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "compra", label: "Compra", desc: "Con calculadora y crédito" },
                    { id: "alquiler", label: "Alquiler", desc: "Con checklist de contratos" },
                    { id: "otro", label: "Otro", desc: "Búsqueda general" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipoCaso(t.id)}
                    className="flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all"
                    style={{
                      borderColor: tipoCaso === t.id ? "var(--accent)" : "var(--border)",
                      background: tipoCaso === t.id ? "var(--accent-soft)" : "var(--paper)",
                      color: tipoCaso === t.id ? "var(--accent)" : "var(--ink)",
                    }}
                  >
                    <span className="text-xs font-semibold">{t.label}</span>
                    <span className="mt-0.5 text-[10px]" style={{ color: "var(--ink-faint)" }}>
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {caseError && (
            <p className="rounded-lg p-3 text-xs" style={{ background: "var(--status-descartada-bg)", color: "var(--status-descartada)" }}>
              {caseError}
            </p>
          )}

          <div className="flex items-center justify-between border-t pt-6" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            >
              <ArrowLeft size={14} /> Volver
            </button>

            <button
              type="submit"
              disabled={creatingCase || !tituloCaso.trim()}
              className="btn btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md"
              style={{
                background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))",
                color: "var(--accent-ink)",
              }}
            >
              {creatingCase ? "Creando caso…" : "¡Crear caso y empezar!"}
              <ChevronRight size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
