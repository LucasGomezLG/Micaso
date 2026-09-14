"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      const saved = localStorage.getItem("micaso-theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }
      setMounted(true);
    }, 0);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("micaso-theme", next);
    } catch {}
  }

  if (!mounted) {
    return (
      <span
        aria-hidden
        className="inline-block h-8 w-8 rounded-full border border-transparent p-1.5 opacity-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:opacity-90"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        color: "var(--ink-muted)",
      }}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
