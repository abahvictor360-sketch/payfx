const { logos } = require('./icons');
const { EXCHANGE_RATE } = require('./catalog');
const business = require('./business');
const { naira, date, esc, gatewayName } = require('./format');

module.exports = function renderInvoice(order) {
  const biz = business();
  const paid = order.status === 'paid';
  const rows = order.items.map((item, i) => `
      <tr>
        <td class="n">${i + 1}</td>
        <td><div class="item">
          <span class="logo" title="${esc(logos[item.logo].title)}">${logos[item.logo].svg}</span>
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
<title>Invoice ${esc(order.invoiceNumber)} · ${esc(biz.name)}</title>
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
${order.notice ? `<div class="notice ${order.noticeType || ''}">${esc(order.notice)}</div>` : ''}
<main class="invoice">
  <header>
    <div>
      <div class="brand">${esc(biz.name)}</div>
      <div class="muted">${[biz.address, biz.email, biz.phone].filter(Boolean).map(esc).join('<br>')}</div>
    </div>
    <div class="meta">
      <h1>${paid ? 'Receipt' : 'Invoice'}</h1>
      <div><span>Invoice no.</span> ${esc(order.invoiceNumber)}</div>
      <div><span>Issued</span> ${date(order.createdAt)}</div>
      ${paid ? `<div><span>Paid</span> ${date(order.paidAt)}</div>` : ''}
      <div class="stamp ${paid ? 'paid' : 'unpaid'}">${paid ? 'PAID' : 'UNPAID'}</div>
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
    Keep this page's link to view or download your invoice again.
  </footer>
</main>
</body>
</html>`;
};
