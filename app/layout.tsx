import type { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Connection Network',
  description: 'A transparent, zero-cost referral and review ledger connecting vendors and connectors.',
  icons: { icon: '/tcn-logo.jpg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <NavBar />
        <div className="flex-1">{children}</div>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  )
}
