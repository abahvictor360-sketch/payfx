// Paystack: https://paystack.com/docs/api/transaction
const crypto = require('crypto');

const BASE = 'https://api.paystack.co';
const secret = () => (process.env.PAYSTACK_SECRET_KEY || '').trim();

async function call(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) throw new Error(`Paystack: ${json.message || res.status}`);
  return json.data;
}

// Returns the hosted checkout URL to send the customer to. The billing address
// goes in `metadata`; custom_fields also show it on the Paystack dashboard.
async function initialize(order, callbackUrl) {
  const a = order.customer.address || {};
  const address = [a.line1, a.city, a.state, a.postcode, a.country].filter(Boolean).join(', ');
  const data = await call('POST', '/transaction/initialize', {
    email: order.customer.email,
    amount: Math.round(order.total * 100), // kobo or cents
    currency: order.currency || 'NGN',
    reference: order.payRef,
    callback_url: callbackUrl,
    metadata: {
      invoice: order.invoiceNumber,
      billing_address: order.customer.address,
      custom_fields: [
        { display_name: 'Invoice', variable_name: 'invoice', value: order.invoiceNumber },
        { display_name: 'Customer', variable_name: 'customer', value: order.customer.name },
        { display_name: 'Phone', variable_name: 'phone', value: order.customer.phone || '-' },
        { display_name: 'Billing address', variable_name: 'billing_address', value: address || '-' },
      ],
    },
  });
  return data.authorization_url;
}

// Confirms with Paystack that the payment reference was paid in full.
async function verify(order, payRef) {
  const data = await call('GET', `/transaction/verify/${encodeURIComponent(payRef)}`);
  const ok = data.status === 'success' && data.currency === (order.currency || 'NGN')
    && data.amount >= Math.round(order.total * 100);
  return {
    paid: ok,
    status: data.status,
    transactionId: String(data.id),
    channel: data.channel,
    paidAt: data.paid_at || data.paidAt,
  };
}

function validWebhook(rawBody, signature) {
  if (!signature || !secret()) return false;
  const hash = crypto.createHmac('sha512', secret()).update(rawBody).digest('hex');
  return hash.length === signature.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// Currencies this account can be charged in (PAYSTACK_CURRENCIES, comma-separated).
// Paystack only takes USD once it is enabled on the merchant account.
const currencies = () => (process.env.PAYSTACK_CURRENCIES || 'NGN').split(',').map((c) => c.trim().toUpperCase());

module.exports = { initialize, verify, validWebhook, currencies, configured: () => Boolean(secret()) };
