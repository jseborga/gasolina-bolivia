import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SurtiMapa',
  description: 'MVP para reportes de surtidores y filas',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
