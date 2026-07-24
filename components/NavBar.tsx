import Image from 'next/image'
import Link from 'next/link'

// Grouped by the same four pillars as the homepage (vendor / connector /
// trust record / ecosystem) instead of a flat alphabetical-ish link list --
// so the nav itself reinforces "who am I, what do I do here" rather than
// just being a menu you have to already know how to read. Built on native
// <details>/<summary> (tap to open) rather than a CSS hover dropdown --
// most traffic here is mobile, and hover states don't exist on touch.
const GROUPS = [
  {
    icon: '🏢',
    label: 'Vendors',
    links: [
      { href: '/vendors', label: 'Browse vendors' },
      { href: '/vendors/signup', label: 'List your business' },
      { href: '/vendor-login', label: 'Vendor login' },
    ],
  },
  {
    icon: '🤝',
    label: 'Connectors',
    links: [
      { href: '/join', label: 'Become a connector' },
      { href: '/connector/dashboard', label: 'Connector dashboard' },
    ],
  },
  {
    icon: '🔗',
    label: 'Trust Record',
    links: [{ href: '/ledger', label: 'View the Trust Record' }],
  },
]

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080c14]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Image src="/tcn-logo.jpg" alt="The Connection Network" width={32} height={32} className="rounded" />
          <span className="hidden sm:inline">The Connection Network</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-white/70">
          {GROUPS.map((group) => (
            <details key={group.label} className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true">{group.icon}</span>
                {group.label}
                <span className="text-[10px] text-white/30 transition group-open:rotate-180">▾</span>
              </summary>
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[190px] rounded-lg border border-white/10 bg-[#0d1119] p-1.5 shadow-xl">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          ))}
          <Link href="/help" className="rounded-md px-2 py-1 hover:bg-white/5 hover:text-white">
            Help
          </Link>
        </div>
      </nav>
    </header>
  )
}
