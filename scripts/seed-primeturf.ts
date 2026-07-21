import { supabaseAdmin } from '@/lib/supabase'

async function seed() {
  const { data, error } = await supabaseAdmin
    .from('vendors')
    .upsert(
      {
        slug: 'primeturf',
        name: 'PrimeTurf',
        whatsapp_number: '27768048868',
        website: 'https://www.primeturf.co.za',
        category: 'Landscaping & Turf',
        tier1_pct: 5,
        tier1_flat_cents: 50000,
        tier2_override_pct: 10,
        currency: 'ZAR',
        eco_pledge_pct: 2,
        eco_practices:
          'Water-wise synthetic turf reduces irrigation demand; PrimeTurf pledges 2% of every closed job back into the connector and eco-verification pool.',
        active: true,
      },
      { onConflict: 'slug' }
    )
    .select()
    .single()

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('Seeded vendor:', data)
}

seed()
