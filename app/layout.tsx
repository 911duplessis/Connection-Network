import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Connection Network',
  description: 'A transparent, zero-cost referral and review ledger connecting vendors and connectors.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
