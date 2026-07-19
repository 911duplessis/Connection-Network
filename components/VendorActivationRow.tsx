'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Vendor {
  id: string
  name: string
  slug: string
  category: string | null
  whatsapp_number: string | null
  active: boolean
}

export default function VendorActivationRow({ vendor }: { vendor: Vendor }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    await fetch(`/api/admin/vendors/${vendor.id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !vendor.active }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3">
        <div className="font-medium">{vendor.name}</div>
        <div className="text-xs text-white/50">/{vendor.slug}</div>
      </td>
      <td className="px-4 py-3 text-white/60">{vendor.category ?? '—'}</td>
      <td className="px-4 py-3 text-white/60">{vendor.whatsapp_number ?? '—'}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-1 text-xs uppercase ${
            vendor.active ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/60'
          }`}
        >
          {vendor.active ? 'Active' : 'Pending'}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={toggle}
          disabled={loading}
          className="rounded-md border border-white/20 px-3 py-1 text-xs disabled:opacity-50"
        >
          {vendor.active ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  )
}
