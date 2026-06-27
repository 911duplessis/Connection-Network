import Image from 'next/image'
import Link from 'next/link'

const LINKS = [
  { href: '/vendors', label: 'Vendors' },
  { href: '/join', label: 'Become a Connector' },
  { href: '/vendors/signup', label: 'Vendor Sign Up' },
  { href: '/ledger', label: 'Public Ledger' },
  { href: '/connector/dashboard', label: 'Connector Login' },
  { href: '/vendor-login', label: 'Vendor Login' },
]

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080c14]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Image src="/tcn-logo.jpg" alt="The Connection Network" width={32} height={32} className="rounded" />
          <span className="hidden sm:inline">The Connection Network</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
