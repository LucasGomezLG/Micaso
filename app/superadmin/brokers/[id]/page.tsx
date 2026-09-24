import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Home as HomeIcon } from "lucide-react";
import { getBroker, getCurrentAdminEmail } from "@/lib/brokers";
import { listCasesForBroker } from "@/lib/cases";
import { getCaseSummary } from "@/lib/store";
import { PLAN_CASE_LIMIT, PLAN_LABEL } from "@/lib/types";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";
import PanelLogoutButton from "@/components/PanelLogoutButton";
import AdminBrokerEditor from "@/components/AdminBrokerEditor";
import AdminCaseCard from "@/components/AdminCaseCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Corredor — Super-admin — Micaso",
};

export default async function AdminBrokerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdminEmail();
  if (!admin) {
    redirect("/panel/login");
  }

  const { id: rawId } = await params;
  // El id de un corredor puede ser un email (contiene "@") — al navegar
  // acá con <Link>, Next.js entrega el segmento todavía URL-encoded
  // ("%40" en vez de "@"), a diferencia de una carga inicial de página.
  // decodeURIComponent lo normaliza en los dos casos; si ya viene
  // decodificado (o es "dev-broker"/un id sin caracteres especiales) lo
  // deja igual.
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    // rawId ya venía sin codificar (o es inválido) — se usa tal cual.
  }
  const broker = await getBroker(id);
  if (!broker) {
    notFound();
  }

  // Sin la contraseña: AdminCaseCard es un Client Component, así que
  // cualquier campo que reciba viaja en el payload RSC aunque la UI no lo
  // muestre. La clave se pide aparte, a demanda, con reveal-password
  // (SEP23-09, AUDITORIA-2026-09-23.md).
  const cases = (await listCasesForBroker(id)).map((c) => ({ ...c, password: "" }));
  const summaryEntries = await Promise.all(cases.map(async (c) => [c.id, await getCaseSummary(c.id)] as const));
  const summaries = Object.fromEntries(summaryEntries);

  const activeCases = cases.filter((c) => c.estado === "activo").length;
  const totalPropiedades = Object.values(summaries).reduce((sum, s) => sum + s.totalHouses, 0);
  const limit = PLAN_CASE_LIMIT[broker.plan];

  return (
    <div className="min-h-full" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 85%, transparent)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
            >
              <MicasoMark size={16} color="var(--accent-ink)" />
            </span>
            <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Micaso
            </span>
            <span className="eyebrow ml-1 hidden sm:inline">Super-admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <PanelLogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
          style={{ color: "var(--accent)" }}
        >
          <ArrowLeft size={14} /> Corredores
        </Link>

        <div className="mt-4">
          <AdminBrokerEditor broker={broker} caseCount={cases.length} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <span className="eyebrow">Casos activos</span>
            <p className="mono mt-1 text-xl font-semibold">
              {activeCases}
              {limit !== null && <span style={{ color: "var(--ink-faint)", fontSize: "0.7em" }}> / {limit}</span>}
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <span className="eyebrow">Casos totales</span>
            <p className="mono mt-1 text-xl font-semibold">{cases.length}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <span className="eyebrow">Propiedades en seguimiento</span>
            <p className="mono mt-1 text-xl font-semibold">{totalPropiedades}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <span className="eyebrow">Plan</span>
            <p className="mt-1 text-sm font-semibold">{PLAN_LABEL[broker.plan]}</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Building2 size={16} style={{ color: "var(--ink-muted)" }} />
            <h2 className="text-base font-semibold">Casos de este corredor</h2>
          </div>
          <p className="mb-4 text-xs" style={{ color: "var(--ink-faint)" }}>
            Podés cerrar, reabrir o regenerar la clave de un caso si hace falta moderarlo — sin ver el contenido cargado por la familia (casas, comentarios, checklist). Eso queda entre el corredor y sus clientes.
          </p>

          {cases.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 rounded-2xl border p-8 text-center"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <HomeIcon size={20} style={{ color: "var(--ink-faint)" }} />
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                Este corredor todavía no creó ningún caso.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cases.map((kase) => (
                <AdminCaseCard key={kase.id} initialCase={kase} summary={summaries[kase.id]} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
