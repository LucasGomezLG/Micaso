"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PanelLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/panel/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="text-sm font-medium"
      style={{ color: "var(--ink-muted)" }}
    >
      {loading ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
