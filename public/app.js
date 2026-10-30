const $ = (s) => document.querySelector(s);
const naira = (n) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
let items = [];
let rate = 1365;

async function init() {
  const [config, list] = await Promise.all([
    fetch('/api/config').then((r) => r.json()),
    fetch('/api/items').then((r) => r.json()),
  ]);
  items = list;
  rate = config.exchangeRate;
  $('#brand').textContent = config.business;
  document.title = `Pay for services · ${config.business}`;
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
        <input type="checkbox" value="${i.id}" checked>
        <span class="logo" title="${i.logoTitle}">${i.logoSvg}</span>
        <span class="text">
          <strong>${i.name}</strong>${i.subtitle ? ` <span class="sub">${i.subtitle}</span>` : ''}
          <span class="period">${i.period}</span>
          <span class="purpose">${i.purpose}</span>
        </span>
        <span class="amount">${naira(i.amount)}</span>
      </label>
    </li>`).join('');
  $('#items').addEventListener('change', update);
  $('#all').addEventListener('change', (e) => {
    document.querySelectorAll('#items input').forEach((c) => { c.checked = e.target.checked; });
    update();
  });
  update();
}

const selected = () => [...document.querySelectorAll('#items input:checked')].map((c) => c.value);

function update() {
  const ids = selected();
  const total = items.filter((i) => ids.includes(i.id)).reduce((s, i) => s + i.amount, 0);
  $('#total').textContent = naira(total);
  $('#usd').textContent = total ? `≈ US$${(total / rate).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '';
  $('#count').textContent = `${ids.length} of ${items.length} selected`;
  $('#all').checked = ids.length === items.length;
  $('#all').indeterminate = ids.length > 0 && ids.length < items.length;
  $('#payBtn').disabled = !ids.length;
  document.querySelectorAll('#items li').forEach((li) => li.classList.toggle('on', li.querySelector('input').checked));
}

$('#checkout').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form);
  body.items = selected();
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
