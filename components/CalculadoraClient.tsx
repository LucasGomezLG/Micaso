"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Share2 } from "lucide-react";
import { LoanInfo } from "@/lib/types";
import { formatArs, formatPercent, formatUsd } from "@/lib/format";
import { frenchInstallment } from "@/lib/mortgage";

const STORAGE_KEY_PREFIX = "micaso-calculadora:";

export default function CalculadoraClient({ loan, caseId }: { loan: LoanInfo; caseId: string }) {
  // Antes era una sola clave global ("casa-norte-calculadora", de cuando
  // esto era una app de un solo caso) — un corredor que entra a dos
  // casos distintos desde el mismo navegador (botón "Entrar al caso" en
  // el panel) terminaba viendo los numeros guardados del caso anterior.
  const STORAGE_KEY = STORAGE_KEY_PREFIX + caseId;
  const impliedFx = loan.bankMaxUsd > 0 ? Math.round(loan.approvedAmountArs / loan.bankMaxUsd) : 1000;
  // rateLabel uses Argentine comma-decimal ("7,5% + UVA") — parseFloat alone
  // stops at the comma and silently returns 7 instead of 7.5.
  const tnaDefault = parseFloat(loan.rateLabel.replace(",", ".")) || 7.5;

  const [mode, setMode] = useState<"credito" | "contado">(loan.hasCredit ? "credito" : "contado");
  const [propertyValue, setPropertyValue] = useState(107000);
  const [ownFunds, setOwnFunds] = useState(
    Math.round((loan.ownFundsMinUsd + loan.ownFundsMaxUsd) / 2) || 100000
  );
  const [fx, setFx] = useState(impliedFx);
  const [tna, setTna] = useState(tnaDefault);
  const [months, setMonths] = useState(loan.termMonths || 240);
  const [income, setIncome] = useState<string>("");
  const [closingCostPct, setClosingCostPct] = useState(8.5);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setTimeout(() => {
          if (saved.propertyValue) setPropertyValue(saved.propertyValue);
          if (saved.ownFunds) setOwnFunds(saved.ownFunds);
          if (saved.fx) setFx(saved.fx);
          if (saved.tna) setTna(saved.tna);
          if (saved.months) setMonths(saved.months);
          if (saved.income) setIncome(saved.income);
          if (saved.closingCostPct) setClosingCostPct(saved.closingCostPct);
        }, 0);
      }
    } catch {}
  }, [STORAGE_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ propertyValue, ownFunds, fx, tna, months, income, closingCostPct })
      );
    } catch {}
  }, [STORAGE_KEY, propertyValue, ownFunds, fx, tna, months, income, closingCostPct]);

  const closingCosts = propertyValue * (closingCostPct / 100);
  const totalCashNeededContado = propertyValue + closingCosts;
  const cashDifferenceContado = ownFunds - totalCashNeededContado;

  const loanNeededUsd = Math.max(propertyValue - ownFunds, 0);
  const loanUsd = Math.min(loanNeededUsd, loan.bankMaxUsd);
  const overBankMax = loanNeededUsd > loan.bankMaxUsd;
  const loanArs = loanUsd * fx;
  const installment = frenchInstallment(loanArs, tna, months);
  const cashNeeded = ownFunds + closingCosts;
  const incomeValue = income ? Number(income) : null;
  const ratio = incomeValue ? installment / incomeValue : null;

  const ratioColor = useMemo(() => {
    if (ratio === null) return "var(--ink-muted)";
    if (ratio <= 0.25) return "var(--status-gusto)";
    if (ratio <= 0.32) return "var(--status-pendiente)";
    return "var(--status-descartada)";
  }, [ratio]);

  const [copied, setCopied] = useState(false);

  function buildResumenTexto(): string {
    if (mode === "credito") {
      return [
        `📊 Cálculo Micaso (Con crédito hipotecario)`,
        `🏡 Propiedad: ${formatUsd(propertyValue)}`,
        `💵 Aporte propio: ${formatUsd(ownFunds)}`,
        `🏦 Crédito necesario: ${formatUsd(loanNeededUsd)} (aprox. ${formatArs(loanArs)})`,
        `📅 Cuota mensual estimada: ${formatArs(installment)} (TNA ${tna}% · ${months} meses)`,
        `📝 Gastos de escrituración e inmobiliaria (${closingCostPct}%): ${formatUsd(closingCosts)}`,
        `💼 Total en mano necesario: ${formatUsd(cashNeeded)} (Aporte + Gastos)`,
      ].join("\n");
    } else {
      return [
        `📊 Cálculo Micaso (Al contado)`,
        `🏡 Propiedad: ${formatUsd(propertyValue)}`,
        `💵 Fondos disponibles: ${formatUsd(ownFunds)}`,
        `📝 Gastos de escrituración (${closingCostPct}%): ${formatUsd(closingCosts)}`,
        `💼 Costo total estimado: ${formatUsd(totalCashNeededContado)}`,
        cashDifferenceContado >= 0
          ? `✨ Saldo a favor: ${formatUsd(cashDifferenceContado)}`
          : `⚠️ Fondos faltantes: ${formatUsd(Math.abs(cashDifferenceContado))}`,
      ].join("\n");
    }
  }

  function compartirWhatsApp() {
    const texto = buildResumenTexto();
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  async function copiarResumen() {
    const texto = buildResumenTexto();
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    toast.success("Resumen copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Calculadora</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--ink-muted)" }}>
            {mode === "credito"
              ? "Estimá la cuota inicial y la plata de bolsillo que necesitás según el valor de la propiedad con crédito hipotecario UVA."
              : "Calculá la plata total de bolsillo necesaria para comprar al contado, incluyendo escrituración e inmobiliaria."}
          </p>
        </div>

        <div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <button
            type="button"
            onClick={() => setMode("credito")}
            className="rounded-full px-3.5 py-1 text-xs font-semibold transition-colors"
            style={{
              background: mode === "credito" ? "var(--accent)" : "transparent",
              color: mode === "credito" ? "var(--accent-ink)" : "var(--ink-muted)",
            }}
          >
            Con crédito
          </button>
          <button
            type="button"
            onClick={() => setMode("contado")}
            className="rounded-full px-3.5 py-1 text-xs font-semibold transition-colors"
            style={{
              background: mode === "contado" ? "var(--accent)" : "transparent",
              color: mode === "contado" ? "var(--accent-ink)" : "var(--ink-muted)",
            }}
          >
            Al contado
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="flex flex-col gap-4 rounded-2xl border p-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-base font-semibold">Datos de la operación</h2>

          <NumberField
            label="Valor de la propiedad (USD)"
            value={propertyValue}
            onChange={setPropertyValue}
          />
          <NumberField
            label="Ahorro propio a poner (USD)"
            value={ownFunds}
            onChange={setOwnFunds}
            hint={
              loan.ownFundsMinUsd || loan.ownFundsMaxUsd
                ? `Rango previsto: ${formatUsd(loan.ownFundsMinUsd)} – ${formatUsd(loan.ownFundsMaxUsd)}`
                : undefined
            }
          />

          {mode === "credito" && (
            <>
              <NumberField
                label="Tipo de cambio USD/ARS estimado"
                value={fx}
                onChange={setFx}
                hint={loan.bankMaxUsd > 0 ? `Implícito en el pre-aprobado: ${impliedFx.toLocaleString("es-AR")}` : undefined}
              />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="TNA (%)" value={tna} onChange={setTna} step={0.1} />
                <NumberField label="Plazo (meses)" value={months} onChange={setMonths} />
              </div>
            </>
          )}

          <NumberField
            label="% gastos de escritura e inmobiliaria estimados"
            value={closingCostPct}
            onChange={setClosingCostPct}
            step={0.5}
            hint="Escribano, sellos, comisión inmobiliaria y administrativos — suele ir del 7% al 10%."
          />

          {mode === "credito" && (
            <NumberField
              label="Ingreso familiar bruto mensual (ARS) — opcional"
              value={income ? Number(income) : ""}
              onChange={(v) => setIncome(v ? String(v) : "")}
              placeholder="Para ver la relación cuota/ingreso"
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
          >
            <h2 className="text-base font-semibold">Resultado</h2>

            {mode === "credito" ? (
              <>
                {overBankMax && (
                  <p
                    className="mt-2 rounded-lg px-3 py-2 text-xs font-medium"
                    style={{ background: "var(--status-descartada-bg)", color: "var(--status-descartada)" }}
                  >
                    Necesitás financiar {formatUsd(loanNeededUsd)}, pero el banco
                    aprobó hasta {formatUsd(loan.bankMaxUsd)}. Vas a necesitar más
                    ahorro propio o bajar el valor de la propiedad.
                  </p>
                )}
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  <Row label="Monto a financiar" value={`${formatUsd(loanUsd)} (${formatArs(loanArs)})`} />
                  <Row label="Cuota inicial estimada" value={formatArs(installment)} big />
                  <Row label="Gastos de escritura (est.)" value={formatUsd(closingCosts)} />
                  <Row label="Plata de bolsillo necesaria" value={formatUsd(cashNeeded)} sub={formatArs(cashNeeded * fx)} />
                </dl>
              </>
            ) : (
              <>
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  <Row label="Valor de la propiedad" value={formatUsd(propertyValue)} />
                  <Row label="Gastos de cierre (est.)" value={formatUsd(closingCosts)} />
                  <Row label="Total de bolsillo necesario" value={formatUsd(totalCashNeededContado)} big />
                  <Row label="Ahorros disponibles" value={formatUsd(ownFunds)} />
                </dl>

                <div
                  className="mt-4 rounded-xl p-3 text-xs font-medium"
                  style={{
                    background:
                      cashDifferenceContado >= 0 ? "var(--status-gusto-bg)" : "var(--status-descartada-bg)",
                    color:
                      cashDifferenceContado >= 0 ? "var(--status-gusto)" : "var(--status-descartada)",
                  }}
                >
                  {cashDifferenceContado >= 0
                    ? `Fondos suficientes: te sobran ${formatUsd(cashDifferenceContado)} tras cubrir propiedad y gastos.`
                    : `Atención: te faltan ${formatUsd(Math.abs(cashDifferenceContado))} para cubrir el valor de la propiedad y los gastos de cierre.`}
                </div>
              </>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={compartirWhatsApp}
                className="btn card-hover flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: "var(--border-strong)", background: "var(--surface)", color: "var(--ink)" }}
              >
                <Share2 size={14} /> Compartir por WhatsApp
              </button>
              <button
                type="button"
                onClick={copiarResumen}
                className="btn card-hover flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
              >
                {copied ? <Check size={14} style={{ color: "var(--status-gusto)" }} /> : <Copy size={14} />}
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          </div>

          {mode === "credito" && incomeValue !== null && ratio !== null && (
            <div
              className="rounded-2xl border p-5"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
            >
              <h2 className="text-base font-semibold">Relación cuota / ingreso</h2>
              <p className="mono mt-2 text-2xl" style={{ color: ratioColor }}>
                {formatPercent(ratio)}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                Los bancos suelen exigir que la cuota no supere el 25-30% del
                ingreso familiar. Esto es una referencia general, no el
                límite exacto de tu banco.
              </p>
            </div>
          )}

          {mode === "credito" && loan.bankMaxUsd > 0 && (
            <div
              className="rounded-2xl border p-5 text-sm"
              style={{ background: "var(--accent-soft)", borderColor: "var(--accent-soft-border)", color: "var(--accent)" }}
            >
              Pre-aprobado real: {formatArs(loan.approvedAmountArs)} a {loan.rateLabel},
              {" "}{loan.termMonths} meses, cuota de referencia {formatArs(loan.approvedInstallmentArs)}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, sub, big }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div
      className={big ? "flex items-baseline justify-between gap-3 rounded-xl px-3 py-2.5 -mx-3" : "flex items-baseline justify-between gap-3"}
      style={big ? { background: "var(--accent-soft)" } : undefined}
    >
      <dt style={{ color: big ? "var(--accent)" : "var(--ink-muted)" }}>{label}</dt>
      <dd
        className={`mono text-right ${big ? "text-2xl font-semibold" : ""}`}
        style={{ color: big ? "var(--accent)" : undefined }}
      >
        {value}
        {sub && (
          <span className="ml-1.5 text-xs" style={{ color: "var(--ink-faint)" }}>
            ({sub})
          </span>
        )}
      </dd>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  step,
  placeholder,
}: {
  label: string;
  value: number | string;
  onChange: (v: number) => void;
  hint?: string;
  step?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="eyebrow">{label}</span>
      <input
        type="number"
        step={step ?? 1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="rounded-lg border px-3 py-2"
        style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
      />
      {hint && (
        <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}
