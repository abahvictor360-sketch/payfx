-- Table PayFX uses to store invoices. Already applied to the leadloop project.
create sequence if not exists public.payfx_invoice_seq;

create table if not exists public.payfx_orders (
  ref text primary key,
  invoice_number text not null unique
    default 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.payfx_invoice_seq')::text, 4, '0'),
  email text not null,
  status text not null default 'pending',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payfx_orders_created_at_idx on public.payfx_orders (created_at desc);

-- Only the PayFX server (service role) may read or write orders.
alter table public.payfx_orders enable row level security;
revoke all on public.payfx_orders from anon, authenticated;
revoke all on sequence public.payfx_invoice_seq from anon, authenticated;
