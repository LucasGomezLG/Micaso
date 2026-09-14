"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/casas", label: "Casas" },
  { href: "/calculadora", label: "Calculadora" },
  { href: "/checklist", label: "Checklist" },
];

export default function Nav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Casa
          </span>
          <span className="eyebrow hidden sm:inline">crédito BBVA</span>
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
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
