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
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-slate-200 bg-white px-6 py-5">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-slate-900">Contacto</div>
                <div>WhatsApp: +59178879596</div>
              </div>
              <a
                href="https://wa.me/59178879596?text=Quiero%20informacion%20sobre%20la%20app%20de%20gasolineras"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-sky-700 underline underline-offset-2"
              >
                Quiero informacion sobre la app de gasolineras
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
