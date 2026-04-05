import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SurtiMapa",
  description: "Estado colaborativo de surtidores y filas en La Paz",
  manifest: "/manifest.webmanifest",
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
