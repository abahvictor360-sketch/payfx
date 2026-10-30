// Orders in the Supabase table public.payfx_orders (see supabase/payfx_orders.sql).
// Uses the service role key, so this must only ever run on the server.
const url = () => `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/payfx_orders`;

async function rest(query, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const res = await fetch(url() + query, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

const toOrder = (row) => row && { ...row.data, ref: row.ref, invoiceNumber: row.invoice_number, status: row.status };
const eq = (v) => `eq.${encodeURIComponent(v)}`;

async function create(order) {
  const [row] = await rest('', {
    method: 'POST',
    body: JSON.stringify({ ref: order.ref, email: order.customer.email, status: order.status, data: order }),
  });
  return toOrder(row);
}

async function get(ref) {
  const [row] = await rest(`?ref=${eq(ref)}&limit=1`);
  return toOrder(row) || null;
}

async function update(ref, patch) {
  const order = await get(ref);
  if (!order) return null;
  const next = { ...order, ...patch, updatedAt: new Date().toISOString() };
  const [row] = await rest(`?ref=${eq(ref)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: next.status, data: next, updated_at: next.updatedAt }),
  });
  return toOrder(row);
}

async function findByInvoice(invoiceNumber, email) {
  const [row] = await rest(
    `?invoice_number=ilike.${encodeURIComponent(String(invoiceNumber).trim())}&email=${eq(String(email).trim().toLowerCase())}&limit=1`,
  );
  return toOrder(row) || null;
}

async function all() {
  return (await rest('?order=created_at.desc&limit=500')).map(toOrder);
}

module.exports = { create, get, update, findByInvoice, all };
