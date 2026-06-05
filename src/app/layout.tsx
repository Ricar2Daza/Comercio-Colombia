import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Comercio Colombia',
  description: 'Ecommerce full stack con productos, servicios, GraphQL y pagos colombianos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">
            Comercio Colombia
          </Link>
          <nav>
            <Link href="/">Tienda</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/api/graphql">GraphQL</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
