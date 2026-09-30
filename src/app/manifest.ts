import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pametni dom",
    short_name: "Dom",
    description: "Hitri vklopi in izklopi za pametne inštalacije.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f4f6",
    theme_color: "#03a9f4",
    lang: "sl",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
