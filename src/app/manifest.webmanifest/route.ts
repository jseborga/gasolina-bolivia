import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "SurtiMapa Bolivia",
    short_name: "SurtiMapa",
    description: "Mapa de gasolina, surtidores, talleres, gruas, auxilio mecanico y aditivos en Bolivia",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  });
}
