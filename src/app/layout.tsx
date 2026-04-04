import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SurtiMapa',
  description: 'Estado colaborativo de surtidores en La Paz',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
