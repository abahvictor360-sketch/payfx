# PayFX: service payments with Flutterwave and Paystack

A small website where clients pick the services they are paying for, choose
**Flutterwave** or **Paystack**, pay on the gateway's secure checkout, and get an
invoice that lists every item with its logo (Supabase, Anthropic/Claude, Google
Maps, Apple, plus icons for VPS, domain, deployment, backup and monitoring).

- Invoice page at `/invoice/<ref>` with Print and **Download PDF** (logos included)
- Invoice is marked **PAID** with the gateway transaction ID once payment is verified
- Unpaid invoices have a **Pay now** button to retry
- "Find my invoice" on the home page (invoice number + email)
- Owner list of all invoices at `/admin?token=<ADMIN_TOKEN>`

## Run it

```bash
npm install
cp .env.example .env   # fill in your keys and business details
npm start              # http://localhost:3000
```

Requires Node 18 or newer. Orders are stored in `data/orders.json`, so back that file up.

## Gateway setup

**Flutterwave**: Dashboard > Settings > API keys: copy the secret key into `FLW_SECRET_KEY`.
Under Settings > Webhooks set the URL to `https://<your-domain>/webhooks/flutterwave`
and a secret hash, and put the same hash in `FLW_SECRET_HASH`.

**Paystack**: Dashboard > Settings > API Keys & Webhooks: copy the secret key into
`PAYSTACK_SECRET_KEY` and set the webhook URL to `https://<your-domain>/webhooks/paystack`.

Set `BASE_URL` to the public address of the site so the gateways send clients back
to the right place. Use test keys (`FLWSECK_TEST-...`, `sk_test_...`) first, then
swap in live keys. A gateway without a key is shown as unavailable at checkout.

## How a payment is confirmed

1. `POST /api/checkout` creates the invoice. Prices come from `src/catalog.js` on the
   server, never from the browser.
2. The client is redirected to the Flutterwave or Paystack checkout.
3. On return (and on each webhook) the server calls the gateway's verify API and only
   marks the invoice paid if the status is successful, the currency is NGN and the
   amount covers the invoice total.

## Changing the items

Edit `src/catalog.js` (name, coverage period, purpose, amount, logo). Logos are
defined in `src/icons.js`; brand logos come from the `simple-icons` package.
