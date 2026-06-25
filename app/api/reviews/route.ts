import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'

export async function POST(req: Request) {
  const body = await req.json()
  const { vendorSlug, reviewerName, rating, comment, referralId } = body

  if (!vendorSlug || !reviewerName || !rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'vendorSlug, reviewerName, and a rating between 1 and 5 are required' },
      { status: 400 }
    )
  }

  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('slug', vendorSlug)
    .single()

  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const ledgerEntry = await appendLedgerEntry('review_submitted', {
    vendorSlug,
    reviewerName,
    rating,
    referralId,
  })

  const { data: review, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      vendor_id: vendor.id,
      referral_id: referralId || null,
      reviewer_name: reviewerName,
      rating,
      comment,
      ledger_entry_seq: ledgerEntry.seq,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ reviewId: review.id })
}
