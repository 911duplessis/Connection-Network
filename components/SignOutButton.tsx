'use client'

import { useRouter } from 'next/navigation'

export default function SignOutButton({
  logoutUrl,
  redirectTo,
}: {
  logoutUrl: string
  redirectTo: string
}) {
  const router = useRouter()

  async function handleClick() {
    await fetch(logoutUrl, { method: 'POST' })
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <button onClick={handleClick} className="text-sm text-white/50 hover:text-white">
      Sign out
    </button>
  )
}
