// Flutterwave v3: https://developer.flutterwave.com/docs/flutterwave-standard-1
const crypto = require('crypto');

const BASE = 'https://api.flutterwave.com/v3';
const secret = () => (process.env.FLW_SECRET_KEY || '').trim();

async function call(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status !== 'success') throw new Error(`Flutterwave: ${json.message || res.status}`);
  return json.data;
}

// Returns the hosted checkout URL to send the customer to.
async function initialize(order, redirectUrl) {
  const data = await call('POST', '/payments', {
    tx_ref: order.payRef,
    amount: order.total,
    currency: 'NGN',
    redirect_url: redirectUrl,
    customer: {
      email: order.customer.email,
      name: order.customer.name,
      phonenumber: order.customer.phone || undefined,
    },
    customizations: {
      title: process.env.BUSINESS_NAME || 'PayFX',
      description: `Invoice ${order.invoiceNumber}`,
      logo: process.env.BUSINESS_LOGO_URL || undefined,
    },
    meta: { invoice: order.invoiceNumber },
  });
  return data.link;
}

// Confirms with Flutterwave that the tx_ref was paid in full. The transaction
// id from the redirect is optional; verifying by reference works either way.
async function verify(order, payRef, transactionId) {
  const data = transactionId
    ? await call('GET', `/transactions/${encodeURIComponent(transactionId)}/verify`)
    : await call('GET', `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(payRef)}`);
  const ok = data.tx_ref === payRef && data.status === 'successful'
    && data.currency === 'NGN' && Number(data.amount) >= order.total;
  return {
    paid: ok,
    status: data.status,
    transactionId: String(data.id),
    channel: data.payment_type,
    paidAt: data.created_at,
  };
}

// Flutterwave sends the secret hash you set in the dashboard in `verif-hash`.
function validWebhook(signature) {
  const expected = (process.env.FLW_SECRET_HASH || '').trim();
  if (!signature || !expected || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

module.exports = { initialize, verify, validWebhook, configured: () => Boolean(secret()) };
