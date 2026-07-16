# TCN WhatsApp Automation — Provider Choice & Scaling to 500/50/5

Target: **500 connectors, 50 vendors, ~5 concurrent (realtime) transactions.**

## TL;DR

- **Stay on the Meta WhatsApp Cloud API.** It is already integrated, it is the
  cheapest option, and this scale is trivial for it. A BSP/reseller (Twilio,
  360dialog, MessageBird) would add cost and a middleman with **no benefit** at
  this volume.
- The real blocker to "fully automated" is **not** throughput — it's Meta's
  **24-hour window + message templates**. That is now handled in code
  (`notifyEvent`), but you must **create and get the templates approved** in
  Meta Business Manager for proactive messages to deliver.
- **Inbound webhook is now idempotent** (dedup by Meta message id) so retries
  can't double-book referrals/ledger entries — apply migration `0005`.

## Is this scale a problem for Cloud API? No.

| Concern | Cloud API reality at 500/50/5 |
| --- | --- |
| Send throughput | Cloud API sustains ~80 msg/s per number (250 with a request). 5 concurrent tx is nothing. |
| Unique recipients / 24h | New numbers start at **1,000/24h**, auto-tier up to 10k → 100k → unlimited with quality. 500 connectors fits the entry tier. |
| Inbound | No practical cap; webhook is event-driven. |
| Cost | Service (user-initiated) conversations are free; business-initiated are per-conversation and cheap in ZA. No per-message reseller markup. |

**Conclusion:** the number of connectors/vendors/transactions is not the
constraint. Correctness of the *automation* is.

## The actual constraint: the 24-hour window

WhatsApp only delivers **free-form text** within 24h of the user's last inbound
message. Every business-initiated notification in this app (referral won,
override payout, grade promotion, vendor activation, invite confirmation, OTPs)
is usually sent **outside** that window → as plain text they **silently fail**
(Meta error 131047), and `notify()` swallows the error. That is the gap between
"looks automated" and "actually delivers."

### What the code now does

`lib/whatsapp/client.ts`:
- `sendWhatsAppTemplate()` — sends an approved template (works any time).
- `notifyEvent(to, { template, bodyParams, fallbackText })` — sends via template
  when a template name is configured (env), else falls back to free-form text.
  Never throws.

The two money-path notifications (referral won, tier-2 override) are wired to
`notifyEvent`. They are **non-breaking**: with no template env set they behave
exactly as before; the moment you set an approved template name they deliver
outside the window too.

## Templates to create in Meta Business Manager

Create these as **Utility** category templates, English, then put the approved
name in the matching env var. Body copy (variables in `{{ }}`):

| Env var | Suggested name | Body (params in order) |
| --- | --- | --- |
| `WHATSAPP_TEMPLATE_REFERRAL_WON` | `referral_won` | `Referral won! {{1}} closed your lead for {{2}}. Your commission: {{3}} — recorded on our public ledger.` (vendor, job value, commission) |
| `WHATSAPP_TEMPLATE_OVERRIDE_EARNED` | `override_earned` | `Override earned! A connector in your downline closed a referral via {{1}}. Your Tier-2 override: {{2}}.` (vendor, override amount) |

**Next to templatize (same `notifyEvent` pattern), as they get approved:**
vendor activation (`toggle`), invite confirmation (`vendors`), connector welcome
(`connectors`), grade promotion (`lib/connectors/grade`), and — as **Authentication**
templates — the password-reset and code-recovery OTPs. Onboarding replies inside
the webhook are answers to a user's own inbound message, so they stay within the
24h window and can remain free-form text.

## Reliability at "realtime"

- **Idempotency (done):** the webhook claims each Meta `message.id` once via
  `processed_whatsapp_messages`; duplicate deliveries are skipped, so concurrent
  retries never double-write the ledger. Apply
  `supabase/migration_0005_webhook_idempotency.sql`.
- **Acknowledge fast:** the webhook already returns `200` after processing; if
  per-message work grows, move it to a queue and 200 immediately so Meta doesn't
  retry.

## Rollout

1. Apply `migration_0005_webhook_idempotency.sql` in Supabase.
2. Create + get approved the two templates above; set their env vars in Vercel.
3. Send a live test (mark a referral won) and confirm the connector receives it
   even after 24h of silence.
4. Templatize the remaining notifications in the table above as needed.

## When to reconsider a BSP

Only if you later need: multiple numbers/high-volume broadcast marketing, a
shared team inbox/CRM UI, or you can't pass Meta's business verification. At
500/50/5, none apply — direct Cloud API is the right call.
