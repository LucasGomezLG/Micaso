import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Acceso a tu caso — Micaso",
  description:
    "Seguí el presupuesto, las propiedades que van viendo, las visitas coordinadas y el checklist de tu búsqueda de casa en un solo lugar.",
  openGraph: {
    title: "Acceso a tu caso — Micaso",
    description:
      "Seguí el presupuesto, las propiedades que van viendo, las visitas coordinadas y el checklist de tu búsqueda de casa en un solo lugar.",
    url: `${SITE_URL}/login`,
    siteName: "Micaso",
    locale: "es_AR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Micaso — Acceso a tu caso",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acceso a tu caso — Micaso",
    description:
      "Seguí el presupuesto, las propiedades que van viendo, las visitas coordinadas y el checklist de tu búsqueda de casa en un solo lugar.",
    images: ["/opengraph-image"],
  },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
