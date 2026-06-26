'use client'

import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function handleClick() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button onClick={handleClick} className="text-sm text-white/50 hover:text-white">
      Sign out
    </button>
  )
}
