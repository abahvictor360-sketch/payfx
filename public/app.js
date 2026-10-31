const $ = (s) => document.querySelector(s);
let items = [];
let rate = 1365;
let currencies = {};
let currency = 'NGN';

const round2 = (n) => Math.round(n * 100) / 100;
// Same conversion as the server (src/catalog.js), so the total shown is the total charged.
const convert = (ngn, cur = currency) => round2(ngn * currencies[cur].perNgn);
const money = (n, cur = currency) => `${currencies[cur].symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function init() {
  const [config, list] = await Promise.all([
    fetch('/api/config').then((r) => r.json()),
    fetch('/api/items').then((r) => r.json()),
  ]);
  items = list;
  rate = config.exchangeRate;
  currencies = config.currencies;
  try { if (currencies[localStorage.getItem('payfx-currency')]) currency = localStorage.getItem('payfx-currency'); } catch {}
  $('#currencies').innerHTML = Object.values(currencies).map((c) => `
    <label class="cur">
      <input type="radio" name="currency" value="${c.code}"${c.code === currency ? ' checked' : ''}>
      <span>${c.symbol} ${c.code}</span>
    </label>`).join('');
  $('#currencies').addEventListener('change', (e) => {
    currency = e.target.value;
    try { localStorage.setItem('payfx-currency', currency); } catch {}
    update();
  });
  $('#brand').textContent = config.business;
  document.title = `${config.business} · Pay for services`;
  $('#rate').textContent = `Exchange rate: US$1 = ₦${rate.toLocaleString()}. Select the services you are paying for, then choose Flutterwave or Paystack.`;

  for (const [name, on] of Object.entries(config.gateways)) {
    const input = document.querySelector(`input[name=gateway][value=${name}]`);
    if (!on) {
      input.disabled = true;
      input.closest('.gw').classList.add('off');
      input.closest('.gw').title = 'Not configured yet';
    }
  }
  const firstOn = document.querySelector('input[name=gateway]:not(:disabled)');
  if (firstOn) firstOn.checked = true;

  $('#items').innerHTML = items.map((i) => `
    <li>
      <label class="item">
        <input type="checkbox" value="${i.id}"${i.test ? '' : ' checked'}>
        <span class="logo" title="${i.logoTitle}">${i.logoSvg}</span>
        <span class="text">
          <strong>${i.name}</strong>${i.subtitle ? ` <span class="sub">${i.subtitle}</span>` : ''}
          <span class="period">${i.period}</span>
          <span class="purpose">${i.purpose}</span>
        </span>
        <span class="amount" data-ngn="${i.amount}"></span>
      </label>
    </li>`).join('');
  $('#items').addEventListener('change', update);
  $('#all').addEventListener('change', (e) => {
    // "Select all" covers the real services, not the test item.
    const testIds = items.filter((i) => i.test).map((i) => i.id);
    document.querySelectorAll('#items input').forEach((c) => {
      if (!testIds.includes(c.value)) c.checked = e.target.checked;
    });
    update();
  });
  update();
}

const selected = () => [...document.querySelectorAll('#items input:checked')].map((c) => c.value);

function update() {
  const ids = selected();
  document.querySelectorAll('#items .amount').forEach((el) => { el.textContent = money(convert(Number(el.dataset.ngn))); });
  const chosen = items.filter((i) => ids.includes(i.id));
  const total = round2(chosen.reduce((s, i) => s + convert(i.amount), 0));
  const ngnTotal = chosen.reduce((s, i) => s + i.amount, 0);
  $('#total').textContent = money(total);
  $('#equiv').textContent = !total ? ''
    : currency === 'NGN' ? `≈ ${money(convert(ngnTotal, 'USD'), 'USD')}` : `≈ ${money(ngnTotal, 'NGN')}`;
  const services = items.filter((i) => !i.test);
  const picked = services.filter((i) => ids.includes(i.id)).length;
  $('#count').textContent = `${ids.length} of ${items.length} selected`;
  $('#all').checked = picked === services.length;
  $('#all').indeterminate = picked > 0 && picked < services.length;
  $('#payBtn').disabled = !ids.length;
  document.querySelectorAll('#items li').forEach((li) => li.classList.toggle('on', li.querySelector('input').checked));
}

$('#checkout').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form);
  body.items = selected();
  body.currency = currency;
  $('#error').textContent = '';
  if (!body.name.trim() || !/^\S+@\S+\.\S+$/.test(body.email)) {
    $('#error').textContent = 'Enter your name and a valid email.';
    return;
  }
  if (!body.gateway) {
    $('#error').textContent = 'No payment method is available right now.';
    return;
  }
  const btn = $('#payBtn');
  btn.disabled = true;
  btn.textContent = 'Redirecting to payment…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
    $('#error').innerHTML = `${data.error || 'Something went wrong.'}${data.invoiceUrl ? ` <a href="${data.invoiceUrl}">View invoice</a>` : ''}`;
  } catch {
    $('#error').textContent = 'Network error. Please try again.';
  }
  btn.disabled = false;
  btn.textContent = 'Pay now';
});

const dialog = $('#findDialog');
$('#findBtn').addEventListener('click', () => dialog.showModal());
$('#findCancel').addEventListener('click', () => dialog.close());
$('#findForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch('/api/invoices/lookup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
  });
  const data = await res.json();
  if (data.invoiceUrl) window.location.href = data.invoiceUrl;
  else $('#findError').textContent = data.error;
});

init();
