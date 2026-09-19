# weblinx.io Stripe integration

Payments, Tax, and Invoicing for weblinx.io's digital products and services.

## How this was built

This was scaffolded from Stripe's documented best practices (training
knowledge, current as of this SDK's pinned API version), **not** from the
live `stripe_implementation_planner` MCP tool — this sandboxed environment's
network policy blocks `mcp.stripe.com` and `docs.stripe.com`. Before you rely
on this in production, run it back through the real planner once you have
MCP/docs access (locally, or after widening this environment's egress
policy) and compare:

1. Install the plugin: `claude plugin install stripe@claude-plugins-official`
2. Add the MCP server: `claude mcp add --transport http stripe https://mcp.stripe.com`, then `claude mcp login stripe` (needs an interactive terminal)
3. Run `stripe_implementation_planner` with this same business context (weblinx.io, digital products + services, Payments/Tax/Invoicing) and diff its recommendations against what's here.

## What's here

- **Payments** — `POST /api/checkout/session` creates a Stripe Checkout
  Session for one-time digital product purchases (`src/routes/checkout.ts`).
- **Tax** — Stripe Tax is enabled (`automatic_tax: { enabled: true }`) on
  both the Checkout Session and on invoices, so tax is calculated per
  customer location automatically.
- **Invoicing** — `POST /api/invoices/create` finds/creates a Customer, adds
  line items, then creates, finalizes, and emails an invoice for services
  (`src/routes/invoices.ts`).
- **Webhooks** — `POST /webhooks/stripe` verifies the Stripe signature and
  handles `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`, and `payment_intent.payment_failed`
  (`src/routes/webhooks.ts`). Fulfillment logic is marked `TODO` — wire it to
  your order/access-granting system.

## Setup

```bash
npm install
cp .env.example .env
# fill in STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env
npm run dev
```

Get your keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
— use **test mode** keys until you're ready to go live. Never commit `.env`
or paste live secret keys into chat, issues, or PRs.

### Test webhooks locally

```bash
stripe listen --forward-to localhost:4242/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

### Try it

```bash
# create a test Price for a digital product first (Dashboard > Product catalog,
# or `stripe products create` / `stripe prices create`), then:
curl -X POST localhost:4242/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_...", "customerEmail": "test@example.com"}'

curl -X POST localhost:4242/api/invoices/create \
  -H "Content-Type: application/json" \
  -d '{"customerEmail": "client@example.com", "items": [{"description": "Consulting - Sept", "amount": 150000}]}'
```

## Before going live — Dashboard checklist

- **Tax**: Settings > Tax > add your origin address and the tax
  registrations for every region you're liable to collect in. Automatic tax
  calculation silently returns $0 tax for unregistered jurisdictions.
- **Tax codes**: assign an accurate tax code to each Product (digital
  downloads/SaaS vs. professional services are taxed differently in many
  jurisdictions).
- **Webhook endpoint**: Developers > Webhooks > add your production URL,
  subscribe to at least `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`; copy its signing secret into production env vars.
- **Branding/emails**: Settings > Branding and Settings > Customer emails,
  so Checkout and invoice emails look like weblinx.io.
- **Switch to live keys** (`sk_live_...` / `whsec_...` from the live
  webhook endpoint) via your deploy environment's secret manager, not `.env`.

## Extending

- Recurring digital products (subscriptions): change `mode: "payment"` to
  `mode: "subscription"` in `checkout.ts` and use a recurring Price.
  - Customer self-service (update card, cancel, view invoices): add a
  Billing Portal session (`stripe.billingPortal.sessions.create`).
