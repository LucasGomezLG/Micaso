"use client";

import { CSSProperties, ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { House, LoanInfo } from "@/lib/types";
import { apiErrorMessage } from "@/lib/http";
import { useModalScrollLock } from "@/lib/hooks";
import HouseCard from "@/components/HouseCard";

/** Abre la ficha completa de una propiedad (la misma `HouseCard` que se
 * ve en Casas, con comentarios, checklist y edición) en un popup, para no
 * tener que salir de la Agenda ni del Inicio para editar algo. Es el
 * mismo componente reusado, no una copia — `onChange`/`onDelete` pegan
 * contra el mismo `PATCH/DELETE /api/houses/[id]` que usa Casas, así que
 * queda sincronizado porque escribe sobre el mismo registro en Redis,
 * no porque haya alguna sincronización especial entre pantallas. */
export default function HouseQuickView({
  house,
  loan,
  people,
  children,
  className,
  style,
}: {
  house: House;
  loan: LoanInfo;
  people: string[];
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(house);

  useModalScrollLock(open, () => setOpen(false));

  async function handleChange(id: string, patch: Partial<House>): Promise<boolean> {
    setCurrent((c) => ({ ...c, ...patch }));
    const res = await fetch(`/api/houses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo guardar el cambio."));
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleDelete(id: string): Promise<boolean> {
    const res = await fetch(`/api/houses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo eliminar la propiedad."));
      return false;
    }
    toast.success("Casa eliminada para siempre.");
    setOpen(false);
    router.refresh();
    return true;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} style={style}>
        {children}
      </button>

      {open &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              className="animate-modal-pop relative w-full max-w-lg sm:max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fuera del recorte de la card (que ya tiene su propio botón
                  de "favorita" en esa misma esquina, ver HouseCard.tsx) —
                  si el cerrar quedara superpuesto ahí adentro, uno de los
                  dos botones le tapa el click al otro. */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
              >
                <X size={16} />
              </button>
              <div className="max-h-[90vh] overflow-y-auto rounded-2xl">
                <HouseCard
                  house={current}
                  loan={loan}
                  people={people}
                  onChange={handleChange}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
