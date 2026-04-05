import type { Metadata } from "next";
import "./globals.css";
import { getAppBaseUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: {
    default: "SurtiMapa Bolivia | Gasolina, surtidores, talleres, gruas y aditivos",
    template: "%s | SurtiMapa Bolivia",
  },
  description:
    "Mapa en tiempo real para encontrar estaciones de servicio, gasolina, talleres mecanicos, gruas, auxilio mecanico y aditivos en La Paz y Bolivia.",
  keywords: [
    "gasolina bolivia",
    "surtidores la paz",
    "estaciones de servicio bolivia",
    "taller mecanico la paz",
    "grua la paz",
    "auxilio mecanico bolivia",
    "aditivos gasolina bolivia",
  ],
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SurtiMapa Bolivia",
    description:
      "Encuentra surtidores, talleres, gruas, auxilio mecanico y aditivos cerca de tu ubicacion.",
    siteName: "SurtiMapa Bolivia",
    locale: "es_BO",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "SurtiMapa Bolivia",
    description:
      "Busca gasolina, estaciones de servicio, talleres, gruas y aditivos cerca de ti.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
