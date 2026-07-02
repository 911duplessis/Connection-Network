import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8 text-sm text-white/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <p>&copy; {new Date().getFullYear()} The Connection Network. Zero cost to join.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/vendors" className="hover:text-white">Vendors</Link>
          <Link href="/ledger" className="hover:text-white">Public Ledger</Link>
          <Link href="/help" className="hover:text-white">Help</Link>
          <Link href="/guide/whatsapp-setup" className="hover:text-white">WhatsApp Setup Guide</Link>
        </div>
      </div>
    </footer>
  )
}
