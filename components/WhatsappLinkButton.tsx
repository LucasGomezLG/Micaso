"use client";

import { CSSProperties, ReactNode } from "react";
import { openWhatsapp } from "@/lib/whatsapp";

/** Botón que abre WhatsApp con `message` — usa openWhatsapp() en vez de
 * un <a href="https://wa.me/..."> plano para evitar el bug de wa.me que
 * corrompe emojis de 4 bytes en la redirección (ver lib/whatsapp.ts). */
export default function WhatsappLinkButton({
  message,
  className,
  style,
  children,
}: {
  message: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={() => openWhatsapp(message)} className={className} style={style}>
      {children}
    </button>
  );
}
