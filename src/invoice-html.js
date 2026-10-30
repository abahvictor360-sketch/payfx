const { logos } = require('./icons');
const { EXCHANGE_RATE } = require('./catalog');
const business = require('./business');
const { naira, date, esc, gatewayName } = require('./format');

// The logos of the items on an order, once each, in order of appearance.
const orderLogos = (order) => [...new Set(order.items.map((i) => i.logo))].map((k) => logos[k]);

module.exports = function renderInvoice(order) {
  const biz = business();
  const paid = order.status === 'paid';
  const contact = [biz.address, biz.email, biz.phone].filter(Boolean).map(esc).join(' · ');
  const brandRow = orderLogos(order).map((l) => `
      <span class="brand-logo">${l.mono}<span>${esc(l.title)}</span></span>`).join('');
  const rows = order.items.map((item, i) => `
      <tr>
        <td class="n">${i + 1}</td>
        <td><div class="item">
          <span class="logo" title="${esc(logos[item.logo].title)}">${logos[item.logo].mono}</span>
          <span>
            <strong>${esc(item.name)}</strong>${item.subtitle ? ` <span class="sub">· ${esc(item.subtitle)}</span>` : ''}
            <small>${esc(item.purpose)}</small>
          </span>
        </div></td>
        <td class="nowrap">${esc(item.period)}</td>
        <td class="amt">${naira(item.amount)}</td>
      </tr>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${paid ? 'Receipt' : 'Invoice'} ${esc(order.invoiceNumber)}</title>
<link rel="stylesheet" href="/invoice.css">
</head>
<body>
<div class="toolbar">
  <a href="/">&larr; Back to services</a>
  <span>
    ${paid ? '' : `<a class="btn primary" href="/pay/${esc(order.ref)}">Pay now</a>`}
    <a class="btn" href="/invoice/${esc(order.ref)}.pdf">Download PDF</a>
    <button class="btn" onclick="window.print()">Print</button>
  </span>
</div>
${order.notice ? `<div class="notice">${esc(order.notice)}</div>` : ''}
<main class="invoice">
  <header>
    <div class="brands">${brandRow}
    </div>
    <div class="meta">
      <h1>${paid ? 'Receipt' : 'Invoice'}</h1>
      <div><span>No.</span> ${esc(order.invoiceNumber)}</div>
      <div><span>Issued</span> ${date(order.createdAt)}</div>
      ${paid ? `<div><span>Paid</span> ${date(order.paidAt)}</div>` : ''}
      <div class="stamp">${paid ? 'PAID' : 'UNPAID'}</div>
    </div>
  </header>

  <section class="parties">
    <div>
      <h3>Billed to</h3>
      <strong>${esc(order.customer.name)}</strong>
      ${order.customer.company ? `<div>${esc(order.customer.company)}</div>` : ''}
      <div>${esc(order.customer.email)}</div>
      ${order.customer.phone ? `<div>${esc(order.customer.phone)}</div>` : ''}
    </div>
    <div>
      <h3>Payment</h3>
      <div><span class="muted">Method</span> ${esc(gatewayName(order.gateway))}${order.channel ? ` (${esc(order.channel)})` : ''}</div>
      <div><span class="muted">Reference</span> ${esc(order.ref)}</div>
      ${order.transactionId ? `<div><span class="muted">Transaction ID</span> ${esc(order.transactionId)}</div>` : ''}
    </div>
  </section>

  <table>
    <thead><tr><th>#</th><th>Item or product</th><th>Coverage</th><th class="amt">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${naira(order.total)}</span></div>
    <div class="grand"><span>Total ${paid ? 'paid' : 'due'}</span><span>${naira(order.total)}</span></div>
    <div class="muted small"><span>Approx. USD at US$1 = ₦${EXCHANGE_RATE.toLocaleString()}</span><span>US$${(order.total / EXCHANGE_RATE).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></div>
  </div>

  <footer class="muted small">
    ${paid ? 'Thank you, your payment has been received.' : 'This invoice is payable online by Flutterwave or Paystack.'}
    ${contact ? `<div>${contact}</div>` : ''}
  </footer>
</main>
</body>
</html>`;
};

module.exports.orderLogos = orderLogos;
