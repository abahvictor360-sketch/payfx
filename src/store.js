// Tiny JSON-file store for orders. Good for a single server with modest
// traffic; swap for Supabase/Postgres if volume grows.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'orders.json');

let state = { seq: 0, orders: {} };
if (fs.existsSync(FILE)) state = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let writing = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(state, null, 2);
  writing = writing.then(async () => {
    const tmp = `${FILE}.tmp`;
    await fs.promises.writeFile(tmp, snapshot);
    await fs.promises.rename(tmp, FILE);
  });
  return writing;
}

function nextInvoiceNumber() {
  state.seq += 1;
  return `INV-${new Date().getFullYear()}-${String(state.seq).padStart(4, '0')}`;
}

async function create(order) {
  order.invoiceNumber = nextInvoiceNumber();
  state.orders[order.ref] = order;
  await persist();
  return order;
}

function get(ref) {
  return state.orders[ref] || null;
}

async function update(ref, patch) {
  const order = state.orders[ref];
  if (!order) return null;
  Object.assign(order, patch, { updatedAt: new Date().toISOString() });
  await persist();
  return order;
}

function findByInvoice(invoiceNumber, email) {
  return Object.values(state.orders).find(
    (o) => o.invoiceNumber.toLowerCase() === String(invoiceNumber).trim().toLowerCase()
      && o.customer.email.toLowerCase() === String(email).trim().toLowerCase(),
  ) || null;
}

function all() {
  return Object.values(state.orders).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

module.exports = { create, get, update, findByInvoice, all };
