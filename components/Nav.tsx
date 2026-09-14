"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TipoCaso } from "@/lib/types";
import { MicasoMark } from "@/components/MicasoMark";

const BASE_LINKS = [
  { href: "/caso", label: "Inicio" },
  { href: "/caso/casas", label: "Casas" },
  { href: "/caso/checklist", label: "Checklist" },
];
const CALCULADORA_LINK = { href: "/caso/calculadora", label: "Calculadora" };

const TIPO_LABEL: Record<TipoCaso, string> = {
  compra: "Compra",
  alquiler: "Alquiler",
  otro: "Búsqueda",
};

export default function Nav({
  caseTitle,
  tipoCaso,
  brokerName,
  brokerImage,
}: {
  caseTitle: string;
  tipoCaso: TipoCaso;
  brokerName: string | null;
  brokerImage: string | null;
}) {
  const pathname = usePathname();
  const links = tipoCaso === "compra" ? [...BASE_LINKS.slice(0, 2), CALCULADORA_LINK, BASE_LINKS[2]] : BASE_LINKS;

  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/caso" className="flex min-w-0 items-center gap-2">
          {brokerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brokerImage} alt="" className="h-7 w-7 shrink-0 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
            >
              <MicasoMark size={16} color="var(--accent-ink)" />
            </span>
          )}
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {caseTitle}
            </span>
            <span className="eyebrow hidden truncate sm:inline">
              {brokerName ? `${brokerName} · ${TIPO_LABEL[tipoCaso]}` : TIPO_LABEL[tipoCaso]}
            </span>
          </span>
        </Link>
        <nav className="flex gap-1 text-sm">
          {links.map((link) => {
            const active =
              link.href === "/caso" ? pathname === "/caso" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 font-medium transition-colors"
                style={{
                  color: active ? "var(--accent-ink)" : "var(--ink-muted)",
                  background: active ? "var(--accent)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
