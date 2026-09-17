import Link from "next/link";
import { Download, Users, Building2, Clock } from "lucide-react";
import { listAllBrokers } from "@/lib/brokers";
import { listCasesForBroker } from "@/lib/cases";
import { isUsingRemoteDb } from "@/lib/db";
import BrokerList from "@/components/BrokerList";
import CreateBrokerModal from "@/components/CreateBrokerModal";
import PanelLogoutButton from "@/components/PanelLogoutButton";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  const brokers = await listAllBrokers();
  const casesByBroker = await Promise.all(brokers.map((b) => listCasesForBroker(b.id)));
  const remoteDb = isUsingRemoteDb();

  const casesCountByBroker = Object.fromEntries(
    brokers.map((b, i) => [
      b.id,
      { active: casesByBroker[i].filter((c) => c.estado === "activo").length, total: casesByBroker[i].length },
    ])
  );
  const totalCasosActivos = casesByBroker.reduce((sum, cases) => sum + cases.filter((c) => c.estado === "activo").length, 0);
  const totalCasos = casesByBroker.reduce((sum, cases) => sum + cases.length, 0);
  const enPrueba = brokers.filter((b) => b.subscriptionStatus === "prueba").length;
  const activos = brokers.filter((b) => b.subscriptionStatus === "activa").length;

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
            <span className="eyebrow ml-1">Super-admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <span
              title={remoteDb ? "Leyendo y escribiendo en Redis (Upstash)" : "Sin credenciales de Redis — usando el archivo local .data/store.json"}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                background: remoteDb ? "var(--status-gusto-bg)" : "var(--status-pendiente-bg)",
                color: remoteDb ? "var(--status-gusto)" : "var(--status-pendiente)",
              }}
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
              <span className="hidden sm:inline">{remoteDb ? "Redis" : "Almacenamiento local"}</span>
              <span className="sm:hidden">{remoteDb ? "Redis" : "Local"}</span>
            </span>
            <Link href="/panel" className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              <span className="hidden sm:inline">Ir a mi panel</span>
              <span className="sm:hidden">Panel</span>
            </Link>
            <ThemeToggle />
            <PanelLogoutButton />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl">Corredores</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              {brokers.length} en total — plan y estado se editan a mano
              hasta que Mercado Pago esté conectado.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/superadmin/backup"
              title="Descarga un JSON con todos los corredores, casos, casas, checklist y criterios"
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: "var(--border-strong)", color: "var(--ink-muted)" }}
            >
              <Download size={13} /> Descargar backup
            </a>
            <CreateBrokerModal />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: "var(--ink-faint)" }} />
              <span className="eyebrow">Corredores</span>
            </div>
            <p className="mono mt-1 text-xl font-semibold">{brokers.length}</p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              {activos} activos · {enPrueba} en prueba
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center gap-1.5">
              <Building2 size={13} style={{ color: "var(--ink-faint)" }} />
              <span className="eyebrow">Casos activos</span>
            </div>
            <p className="mono mt-1 text-xl font-semibold">{totalCasosActivos}</p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              de {totalCasos} en total
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center gap-1.5">
              <Clock size={13} style={{ color: "var(--ink-faint)" }} />
              <span className="eyebrow">En prueba</span>
            </div>
            <p className="mono mt-1 text-xl font-semibold">{enPrueba}</p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              14 días sin tarjeta
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: "var(--ink-faint)" }} />
              <span className="eyebrow">Suscripción activa</span>
            </div>
            <p className="mono mt-1 text-xl font-semibold">{activos}</p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              pagando
            </p>
          </div>
        </div>

        <div className="mt-8">
          <BrokerList brokers={brokers} casesCountByBroker={casesCountByBroker} />
        </div>
      </main>
    </div>
  );
}
