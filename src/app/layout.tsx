import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'INVOZY - Estimates & Invoices',
  description: 'Professional estimates and invoices with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
