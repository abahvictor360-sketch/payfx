require('dotenv').config();
const crypto = require('crypto');
const path = require('path');
const express = require('express');

const catalog = require('./src/catalog');
const { logos } = require('./src/icons');
const store = require('./src/store');
const business = require('./src/business');
const renderInvoice = require('./src/invoice-html');
const renderInvoicePdf = require('./src/invoice-pdf');
const { esc, money, date, gatewayName } = require('./src/format');
const gateways = {
  flutterwave: require('./src/gateways/flutterwave'),
  paystack: require('./src/gateways/paystack'),
};

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', true);

// Public address used in gateway redirect URLs: BASE_URL if set, else the request's host.
const baseUrl = (req) => (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// Paystack signs the raw body, so its webhook must be parsed before express.json().
app.post('/webhooks/paystack', express.raw({ type: '*/*' }), async (req, res) => {
  if (!gateways.paystack.validWebhook(req.body, req.get('x-paystack-signature'))) return res.sendStatus(401);
  // Confirm before replying: on Vercel the function stops once the response is sent.
  const event = JSON.parse(req.body.toString('utf8'));
  if (event.event === 'charge.success') await confirm(event.data?.reference).catch(console.error);
  res.sendStatus(200);
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/webhooks/flutterwave', async (req, res) => {
  if (!gateways.flutterwave.validWebhook(req.get('verif-hash'))) return res.sendStatus(401);
  const data = req.body?.data || {};
  if (data.tx_ref) await confirm(data.tx_ref, data.id).catch(console.error);
  res.sendStatus(200);
});

// Each checkout attempt gets its own payment reference (gateways reject reused
// ones): the order ref itself, then `${ref}-R1`, `${ref}-R2`... for retries.
const baseRef = (payRef) => String(payRef || '').replace(/-R\d+$/, '');

// Asks the gateway whether a payment reference is paid and records it on the
// order. Safe to call repeatedly: from the redirect, webhooks or invoice views.
async function confirm(payRef, transactionId) {
  const order = await store.get(baseRef(payRef));
  if (!order || order.status === 'paid') return order;
  const result = await gateways[order.gateway].verify(order, payRef, transactionId);
  if (!result.paid) {
    console.warn(`Not paid: ${payRef} via ${order.gateway}, gateway status "${result.status}"`);
    return order;
  }
  return store.update(order.ref, {
    status: 'paid',
    paidAt: result.paidAt || new Date().toISOString(),
    paidRef: payRef,
    transactionId: result.transactionId,
    channel: result.channel,
  });
}

app.get('/api/config', (req, res) => {
  res.json({
    business: business().name,
    exchangeRate: catalog.EXCHANGE_RATE,
    currencies: catalog.CURRENCIES,
    gateways: Object.fromEntries(Object.entries(gateways).map(([k, g]) => [k, { on: g.configured(), currencies: g.currencies() }])),
  });
});

app.get('/api/items', (req, res) => {
  res.json(catalog.items.map((i) => ({ ...i, logoSvg: logos[i.logo].svg, logoTitle: logos[i.logo].title })));
});

// Creates the order and invoice, then hands back the gateway checkout URL.
app.post('/api/checkout', async (req, res) => {
  const { name, email, phone, company, gateway, items } = req.body || {};
  const field = (k, max = 120) => String(req.body?.[k] || '').trim().slice(0, max);
  const address = { line1: field('line1', 200), city: field('city'), state: field('state'), country: field('country', 80), postcode: field('postcode', 20) };
  const currency = catalog.CURRENCIES[req.body?.currency] ? req.body.currency : 'NGN';
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Enter your name and a valid email.' });
  if (!address.line1 || !address.city || !address.state || !address.country) {
    return res.status(400).json({ error: 'Enter your billing address: street, city, state and country.' });
  }
  if (!gateways[gateway]) return res.status(400).json({ error: 'Choose Flutterwave or Paystack.' });
  if (!gateways[gateway].configured()) return res.status(400).json({ error: `${gatewayName(gateway)} is not available right now.` });
  if (!gateways[gateway].currencies().includes(currency)) {
    return res.status(400).json({ error: `${gatewayName(gateway)} does not accept ${currency}. Choose another payment method or currency.` });
  }

  // Prices always come from the server catalog, never from the browser, and
  // are converted here into the currency the client picked.
  const ids = [...new Set(Array.isArray(items) ? items : [])].filter((id) => catalog.byId.has(id));
  if (!ids.length) return res.status(400).json({ error: 'Select at least one item.' });
  const lines = ids.map((id) => {
    const { name: n, subtitle, period, purpose, amount, logo } = catalog.byId.get(id);
    return { id, name: n, subtitle, period, purpose, amount: catalog.convert(amount, currency), ngnAmount: amount, logo };
  });

  const ref = `PFX-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const order = await store.create({
    ref,
    status: 'pending',
    gateway,
    payRef: ref,
    customer: {
      name: String(name).trim().slice(0, 120),
      email: String(email).trim().toLowerCase().slice(0, 160),
      phone: String(phone || '').trim().slice(0, 40),
      company: String(company || '').trim().slice(0, 120),
      address,
    },
    currency,
    rate: catalog.EXCHANGE_RATE,
    items: lines,
    total: catalog.round2(lines.reduce((s, l) => s + l.amount, 0)),
    ngnTotal: lines.reduce((s, l) => s + l.ngnAmount, 0),
    createdAt: new Date().toISOString(),
  });

  try {
    const url = await gateways[gateway].initialize(order, `${baseUrl(req)}/payment/callback/${order.payRef}`);
    res.json({ checkoutUrl: url, invoiceUrl: `/invoice/${order.ref}` });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach the payment gateway. Please try again.', invoiceUrl: `/invoice/${order.ref}` });
  }
});

// Re-opens checkout for an unpaid invoice with the same gateway.
app.get('/pay/:ref', async (req, res) => {
  let order = await store.get(req.params.ref);
  if (!order) return res.status(404).send('Invoice not found');
  if (order.status === 'paid') return res.redirect(`/invoice/${order.ref}`);
  try {
    // The previous attempt may have gone through after all.
    order = (await confirm(order.payRef).catch(() => null)) || order;
    if (order.status === 'paid') return res.redirect(`/invoice/${order.ref}`);
    const attempts = (order.attempts || 0) + 1;
    order = await store.update(order.ref, { attempts, payRef: `${order.ref}-R${attempts}` });
    res.redirect(await gateways[order.gateway].initialize(order, `${baseUrl(req)}/payment/callback/${order.payRef}`));
  } catch (err) {
    console.error(err);
    res.status(502).send('Could not reach the payment gateway. Please try again later.');
  }
});

// Where Flutterwave (redirect_url) and Paystack (callback_url) send the customer back.
app.get('/payment/callback/:payRef', async (req, res) => {
  const order = await store.get(baseRef(req.params.payRef));
  if (!order) return res.status(404).send('Invoice not found');
  if (req.query.status !== 'cancelled') {
    await confirm(req.params.payRef, req.query.transaction_id).catch(console.error);
  }
  res.redirect(`/invoice/${order.ref}`);
});

app.get('/invoice/:ref.pdf', async (req, res) => {
  const order = await store.get(req.params.ref);
  if (!order) return res.status(404).send('Invoice not found');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${order.invoiceNumber}.pdf"`);
  renderInvoicePdf(order, res);
});

app.get('/invoice/:ref', async (req, res) => {
  let order = await store.get(req.params.ref);
  if (!order) return res.status(404).send('Invoice not found');
  if (order.status !== 'paid' && order.payRef) order = (await confirm(order.payRef).catch((err) => console.warn(`Verify ${order.payRef}: ${err.message}`))) || order;
  const view = { ...order };
  if (order.status !== 'paid') {
    view.notice = 'Payment has not been confirmed for this invoice yet. If you have just paid, refresh in a moment.';
    view.noticeType = 'warn';
  }
  res.send(renderInvoice(view));
});

// Lets a client find an earlier invoice with its number and their email.
app.post('/api/invoices/lookup', async (req, res) => {
  const order = await store.findByInvoice(req.body?.invoiceNumber || '', req.body?.email || '');
  if (!order) return res.status(404).json({ error: 'No invoice matches that number and email.' });
  res.json({ invoiceUrl: `/invoice/${order.ref}` });
});

// Simple owner view of all invoices: /admin?token=ADMIN_TOKEN
app.get('/admin', async (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  const given = String(req.query.token || '');
  if (!token || given.length !== token.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return res.status(401).send('Unauthorized');
  }
  const orders = await store.all();
  const received = {};
  for (const o of orders.filter((x) => x.status === 'paid')) {
    const c = o.currency || 'NGN';
    received[c] = (received[c] || 0) + o.total;
  }
  const receivedText = Object.entries(received).map(([c, t]) => money(t, c)).join(' + ') || money(0);
  const rows = orders.map((o) => `<tr>
    <td><a href="/invoice/${esc(o.ref)}">${esc(o.invoiceNumber)}</a></td><td>${date(o.createdAt)}</td>
    <td>${esc(o.customer.name)}<br><small>${esc(o.customer.email)}</small></td>
    <td>${esc(gatewayName(o.gateway))}</td><td class="amt">${money(o.total, o.currency || 'NGN')}</td>
    <td><span class="pill ${o.status}">${esc(o.status)}</span></td></tr>`).join('');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoices · ${esc(business().name)}</title><link rel="stylesheet" href="/invoice.css"></head><body>
<main class="invoice"><h1>Invoices</h1><p class="muted">${orders.length} invoices · ${receivedText} received</p>
<table><thead><tr><th>Invoice</th><th>Date</th><th>Client</th><th>Gateway</th><th class="amt">Total</th><th>Status</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6">No invoices yet.</td></tr>'}</tbody></table></main></body></html>`);
});

// Vercel imports the app; locally `npm start` runs the server.
if (require.main === module) app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));

module.exports = app;
