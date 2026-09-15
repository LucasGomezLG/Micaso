"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, User, Building2, Star, CheckSquare, X } from "lucide-react";
import { MicasoMark } from "@/components/MicasoMark";

const ONBOARDED_KEY_PREFIX = "micaso-client-onboarded:";
const AUTHOR_KEY = "casa-comment-author";

interface ClientOnboardingModalProps {
  caseId: string;
  caseTitle: string;
  brokerName?: string | null;
  brokerImage?: string | null;
  existingPeople?: string[];
  viewingAsBroker?: boolean;
  isDemo?: boolean;
}

export default function ClientOnboardingModal({
  caseId,
  caseTitle,
  brokerName = "Tu corredor inmobiliario",
  brokerImage,
  existingPeople = [],
  viewingAsBroker = false,
  isDemo = false,
}: ClientOnboardingModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedName, setSelectedName] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const effectiveBrokerName = brokerName?.trim() || "Tu corredor inmobiliario";

  useEffect(() => {
    // Si quien mira es el corredor o ya completó el onboarding en este dispositivo, no mostrar
    if (viewingAsBroker) return;

    const alreadyOnboarded = localStorage.getItem(ONBOARDED_KEY_PREFIX + caseId);
    if (!alreadyOnboarded) {
      // Revisar si ya tenía autor recordado
      const savedAuthor = localStorage.getItem(AUTHOR_KEY);
      if (savedAuthor && existingPeople.includes(savedAuthor)) {
        setSelectedName(savedAuthor);
      }
      setOpen(true);
    }
  }, [caseId, viewingAsBroker, isDemo, existingPeople]);

  function closeAndMarkDone() {
    try {
      localStorage.setItem(ONBOARDED_KEY_PREFIX + caseId, "true");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  async function handleStep2Next() {
    const finalName = (customName.trim() || selectedName.trim());
    if (finalName) {
      try {
        localStorage.setItem(AUTHOR_KEY, finalName);
      } catch {
        // ignore
      }

      // Si el nombre no estaba en la lista de personas del caso, agregarlo
      if (!existingPeople.includes(finalName)) {
        setSavingName(true);
        try {
          await fetch("/api/case/people", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ people: [...existingPeople, finalName] }),
          });
          router.refresh();
        } catch {
          // Si falla el guardado server-side, no bloqueamos el onboarding
        } finally {
          setSavingName(false);
        }
      }
    }
    setStep(3);
  }

  if (!open) return null;

  return (
    <div
      className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(18, 24, 31, 0.68)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="animate-modal-pop relative w-full max-w-lg overflow-hidden rounded-3xl border text-center shadow-2xl"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "0 28px 60px -16px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Botón de cerrar discreto en la esquina */}
        <button
          type="button"
          onClick={closeAndMarkDone}
          aria-label="Cerrar introducción"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--border)]"
          style={{ color: "var(--ink-muted)" }}
        >
          <X size={16} />
        </button>

        {/* Indicador superior de progreso */}
        <div className="flex h-1.5 w-full">
          <div
            className="transition-all duration-300"
            style={{
              width: step === 1 ? "33.3%" : step === 2 ? "66.6%" : "100%",
              background: "linear-gradient(90deg, var(--accent), var(--gold))",
            }}
          />
        </div>

        <div className="p-6 sm:p-8">
          {/* PASO 1: Bienvenida con la marca del corredor y Opción A */}
          {step === 1 && (
            <div className="flex flex-col items-center">
              {/* Avatar o logo del corredor */}
              <div className="relative mb-4">
                {brokerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brokerImage}
                    alt={effectiveBrokerName}
                    className="h-16 w-16 rounded-full border-2 object-cover shadow-md"
                    style={{ borderColor: "var(--accent)" }}
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-md"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
                  >
                    <MicasoMark size={32} color="var(--accent-ink)" />
                  </div>
                )}
                <span
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs shadow"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  🏡
                </span>
              </div>

              <span className="eyebrow mb-1">Espacio de búsqueda</span>
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {caseTitle}
              </h2>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                <strong>{effectiveBrokerName}</strong> preparó este espacio para acompañarlos a encontrar su próximo hogar.
              </p>

              {/* Tarjeta destacada: OPCIÓN A */}
              <div
                className="mt-6 w-full rounded-2xl border p-4 text-left sm:p-5"
                style={{
                  background: "var(--accent-soft)",
                  borderColor: "var(--accent-soft-border)",
                }}
              >
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  <span className="text-base">🤝</span>
                  <span>Despreocupate del ida y vuelta</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
                  Vos solo guardá acá los avisos que te interesen y anotá lo que pienses. De llamar a las inmobiliarias, pedir la información y coordinar las visitas se encarga <strong>{effectiveBrokerName}</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold shadow-sm"
                style={{
                  background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))",
                  color: "var(--accent-ink)",
                }}
              >
                Continuar <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* PASO 2: ¿Quién sos vos? (Nombre / Autor de notas) */}
          {step === 2 && (
            <div className="flex flex-col items-center">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <User size={24} />
              </div>

              <span className="eyebrow mb-1">Personalización</span>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                ¿Cómo te llamás?
              </h2>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                Para que cuando dejes comentarios o calificaciones en una casa, sepamos quién de la familia escribió.
              </p>

              {/* Si ya hay personas cargadas en el caso, ofrecer chips */}
              {existingPeople.length > 0 && (
                <div className="mt-5 flex w-full flex-col gap-2">
                  <span className="text-left text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                    Elegí tu nombre si ya está en la lista:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {existingPeople.map((name) => {
                      const isSelected = selectedName === name && !customName;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedName(name);
                            setCustomName("");
                          }}
                          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
                          style={{
                            background: isSelected ? "var(--accent)" : "var(--paper)",
                            color: isSelected ? "var(--accent-ink)" : "var(--ink)",
                            border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                          }}
                        >
                          {isSelected && <Check size={12} />}
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Campo para ingresar nombre a mano o nuevo */}
              <div className="mt-4 w-full text-left">
                <label className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                  {existingPeople.length > 0 ? "O ingresá tu nombre si no está en la lista:" : "Tu nombre:"}
                </label>
                <input
                  type="text"
                  autoFocus={existingPeople.length === 0}
                  placeholder="Ej: Martín, Sofía..."
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    if (e.target.value) setSelectedName("");
                  }}
                  className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div className="mt-6 flex w-full items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn rounded-full px-4 py-2.5 text-xs font-medium"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-muted)" }}
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={savingName || (!customName.trim() && !selectedName)}
                  onClick={handleStep2Next}
                  className="btn btn-primary flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs sm:text-sm font-semibold"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))",
                    color: "var(--accent-ink)",
                  }}
                >
                  {savingName ? "Guardando..." : "Listo, continuar"} <ArrowRight size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="mt-3 text-xs underline underline-offset-2 hover:opacity-80"
                style={{ color: "var(--ink-faint)" }}
              >
                Prefiero elegir mi nombre más adelante
              </button>
            </div>
          )}

          {/* PASO 3: Mini-tour de 3 cosas clave */}
          {step === 3 && (
            <div className="flex flex-col items-center">
              <span className="eyebrow mb-1">Todo listo</span>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                3 cosas que podés hacer acá
              </h2>
              <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--ink-muted)" }}>
                Para aprovechar al máximo este espacio junto a {effectiveBrokerName}:
              </p>

              <div className="mt-5 grid w-full gap-3 text-left">
                <div
                  className="flex items-start gap-3 rounded-2xl border p-3.5"
                  style={{ background: "var(--paper)", borderColor: "var(--border)" }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    <Building2 size={16} />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      1. Pegá links de cualquier portal
                    </p>
                    <p className="text-[11px] sm:text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                      Copiá enlaces de ZonaProp, MercadoLibre o Argenprop y se cargan solos con fotos y precio.
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 rounded-2xl border p-3.5"
                  style={{ background: "var(--paper)", borderColor: "var(--border)" }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--status-coordinada-bg)", color: "var(--status-coordinada)" }}
                  >
                    <Star size={16} />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      2. Calificá y anotá impresiones
                    </p>
                    <p className="text-[11px] sm:text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                      Voten si les gustó o si está en duda. Si tocan <em>&quot;Visita a coordinar&quot;</em>, {effectiveBrokerName} recibe el aviso.
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 rounded-2xl border p-3.5"
                  style={{ background: "var(--paper)", borderColor: "var(--border)" }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }}
                  >
                    <CheckSquare size={16} />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      3. Checklist y números claros
                    </p>
                    <p className="text-[11px] sm:text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                      Sigan paso a paso los trámites pendientes (seña, escribanía) y simulen cuotas en la calculadora.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAndMarkDone}
                className="btn btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold shadow-md"
                style={{
                  background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))",
                  color: "var(--accent-ink)",
                }}
              >
                ¡Empezar a explorar! <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
