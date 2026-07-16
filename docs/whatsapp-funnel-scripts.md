# WhatsApp Funnel Scripts

Status: implemented in `app/api/whatsapp/webhook/route.ts` and `app/api/admin/invitations/`. This is the copy that actually ships in code — if the tone or wording needs to change, edit both this doc and the code together so they don't drift.

## Track A — Connector funnel (inbound WhatsApp keywords)

All of these are handled by the single webhook at `/api/whatsapp/webhook`, matched on the first word of an inbound message (case-insensitive).

| Trigger | Reply | Side effect |
|---|---|---|
| `CONNECT` | "Hey! You're in. The Connection Network is a referral network — vendors list rewards, connectors make introductions and get paid when they convert. Reply JOIN and we'll get you a referral code, or visit the website to sign up directly." | none |
| `JOIN <referral code>` (e.g. a connector's wa.me link prefilled with "JOIN AB12CD34") | "Hi! {referrer name} thinks you'd be a great fit for The Connection Network — refer people you know, get paid when they close. Head to the website and tap 'Become a connector', then enter {code} as your upline referral code to link up with them." | none (linking happens on the `/join` form, not via WhatsApp) |
| `JOIN` (no code, or code doesn't match anyone) | "Head to the website and tap 'Become a connector' to get your referral code instantly — takes under a minute, no password needed." | none |
| `READY` | "Great — once you've got your referral code, submit any lead straight from a vendor's page on the website and we'll track it for you. One quick thing: reply A if you mostly refer people you know, B if you run a business that could supply leads, or C if you're just exploring for now." | none |
| `A` (existing connector only) | "Got it — you're a Referrer. Submit any lead straight from a vendor's page on the website and we'll track it under your code." | sets `connectors.connector_type = 'referrer'` |
| `B` (existing connector only) | "Got it — you're a Supplier. We'll flag you when a vendor's looking for exactly what you offer." | sets `connectors.connector_type = 'supplier'` |
| `C` (existing connector only) | "No pressure — you're exploring for now. We'll keep you posted, and you can start referring any time by submitting a lead from a vendor's page." | sets `connectors.connector_type = 'explorer'` |
| `A`/`B`/`C` from a number that isn't a connector yet | "Reply JOIN first to get your referral code, then we'll ask this again." | none |
| `ACTIVE` | "You are marked as active. Keep an eye out for opportunities and submit referrals as soon as you spot one." | none |
| `STAY` | "Good to have you. We will keep you posted on opportunities." | none |
| `OUT` | "No hard feelings — you have been noted as opted out. Send CONNECT again anytime if you change your mind." | none |

**System-triggered messages** (not replies to inbound keywords — sent automatically by `app/api/referrals/[id]/status/route.ts` and `lib/connectors/grade.ts` when a referral is marked won):

| Event | Message |
|---|---|
| Referral won | "Referral won! {vendor} closed your lead for {amount}. Your commission: {amount}." |
| Upline override earned | "Override commission earned: a connector in your downline closed a referral via {vendor}. Your Tier 2 override: {amount}." |
| Promoted to Active Partner (5th lifetime close) | "You've just hit Active Partner status — 5 closed referrals in, nice work. Your starter pack (flyers, branded WhatsApp link, before/after image kit) is on its way, and your upline override on anyone you recruit just went up." |
| Promoted to Ambassador (10th lifetime close) | "You're now an Ambassador — the top tier of The Connection Network. You'll get first look at new leads in your area before anyone else, plus leaderboard status. Thank you for carrying this network." |

Note: the "starter pack" and "leaderboard" perks referenced in the promotion messages are physical/product deliverables, not automated by this code — an admin still needs to actually send the flyer pack and check the leaderboard is populated. Automating those is a follow-up, not blocked on anything here.

## Track B — Vendor outreach (admin-initiated, not inbound keywords)

Managed from `/admin/invitations`. Sending is a manual admin click — one business at a time, as intended — but the message and status tracking are automated once triggered.

| Stage | Trigger | Message |
|---|---|---|
| Initial invite | Admin clicks "Send invite" on a `pending` invitation | "Hi {business_name}, we're building The Connection Network — a referral network where connectors send you warm leads and you only pay when you close. No cost to join. Want in? Set your own terms here: {invite_link}" |
| Signed confirmation | Vendor completes `/vendors/signup?invite={token}` | "You're live on The Connection Network, {vendor_name}! Connectors can now find you and start referring. Every commission is tracked on our public ledger, so it's fully transparent." |

**Not yet implemented** (left for the developer, per `docs/developer-handoff-guide.md`): an automated reminder message for invitations still `pending`/`sent` after N days, and the `opened` status transition (would need link-click tracking, e.g. a redirect route that marks the invitation opened before forwarding to the signup page).

## What's deliberately not scripted here

No evergreen marketing/nurture sequences, no category-specific pitches, no PrimeTurf-specific phase-targeted copy (Phase 1/2/3 language) — those are campaign decisions, not funnel plumbing, and belong in whatever content you send over next rather than hardcoded into the webhook.
