const { CURRENCIES } = require('./catalog');

const amount = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// For web pages, with the currency symbol (₦1,000.00, US$12.50).
const money = (n, currency = 'NGN') => `${CURRENCIES[currency].symbol}${amount(n)}`;
// For PDFs: the built-in PDF fonts have no ₦ glyph, so use the code (NGN 1,000.00).
const moneyPdf = (n, currency = 'NGN') => `${currency} ${amount(n)}`;
const date = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const gatewayName = (g) => ({ flutterwave: 'Flutterwave', paystack: 'Paystack' }[g] || g);

// Line under the totals: the other currency's equivalent at the order's rate.
// Orders made before currencies were added have no currency/rate and are NGN.
function equivalent(order, fmt) {
  const currency = order.currency || 'NGN';
  const rate = order.rate || 1365;
  if (currency === 'NGN') return `Approx. ${fmt(order.total / rate, 'USD')} at US$1 = ${fmt(rate, 'NGN')}`;
  return `Charged in ${currency} at US$1 = ${fmt(rate, 'NGN')} (${fmt(order.ngnTotal, 'NGN')})`;
}

module.exports = { money, moneyPdf, date, esc, gatewayName, equivalent };
