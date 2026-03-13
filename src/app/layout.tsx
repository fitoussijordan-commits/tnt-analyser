import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TNT × Odoo — Analyse Transport',
  description: 'Croisez vos factures TNT et commandes Odoo pour mesurer l\'impact du coût de livraison',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
