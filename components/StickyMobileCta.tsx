"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StickyMobileCta({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      // Ocultar si está en el hero (scrollY <= 400) o si ya llegó al CTA final del pie de página
      const nearBottom = scrollY + winHeight > docHeight - 500;
      setVisible(scrollY > 400 && !nearBottom);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t p-3 backdrop-blur-md transition-transform duration-300 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 94%, transparent)" }}
    >
      <Link
        href={isLoggedIn ? "/panel" : "/panel/login"}
        className="btn btn-primary block rounded-full px-5 py-3 text-center text-sm font-semibold"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        {isLoggedIn ? "Ir a mi panel →" : "Empezar prueba gratis"}
      </Link>
    </div>
  );
}
