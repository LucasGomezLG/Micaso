import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Micaso",
    short_name: "Micaso",
    description:
      "La búsqueda de casa de cada cliente, en un solo lugar - para corredores inmobiliarios y sus familias.",
    start_url: "/",
    display: "standalone",
    background_color: "#14181d",
    theme_color: "#1d4e89",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
