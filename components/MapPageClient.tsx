"use client";

import dynamic from "next/dynamic";
import { House } from "@/lib/types";

const HousesMap = dynamic(() => import("@/components/HousesMap"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[70vh] w-full items-center justify-center rounded-2xl border text-sm"
      style={{ borderColor: "var(--border)", color: "var(--ink-faint)" }}
    >
      Cargando mapa…
    </div>
  ),
});

export default function MapPageClient({ houses }: { houses: House[] }) {
  return <HousesMap houses={houses} />;
}
