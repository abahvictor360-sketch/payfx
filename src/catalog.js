// Items and funding required (section 07). Amounts are in Naira.
// Exchange rate used for these figures: US$1 = ₦1,365.
// To add, remove or reprice an item, edit this list and restart the server.

const EXCHANGE_RATE = 1365;

const items = [
  {
    id: 'supabase-pro',
    name: 'Supabase Pro',
    period: '12 months',
    purpose: 'Central database and secure sign-in used by the website, Xpel POS and Xtend.',
    amount: 409500,
    logo: 'supabase',
  },
  {
    id: 'vps-hosting',
    name: 'VPS hosting',
    subtitle: 'Hostinger',
    period: '24 months',
    purpose: 'Private server that runs the website, Xpel POS, Xtend and any new apps added later.',
    amount: 327600,
    logo: 'hostinger',
  },
  {
    id: 'domain-name',
    name: 'Domain name',
    subtitle: 'Hostinger',
    period: '12 months',
    purpose: 'Annual registration of the web address where staff open and download Xtend.',
    amount: 27300,
    logo: 'hostinger',
  },
  {
    id: 'anthropic-api-claude',
    name: 'Anthropic API',
    subtitle: 'Claude',
    period: '12 months',
    purpose: 'AI that verifies clock-in selfies and shelf photos, and answers staff questions through Ask Xtend.',
    amount: 477750,
    logo: 'claude',
  },
  {
    id: 'google-maps-api',
    name: 'Google Maps API',
    period: '12 months',
    purpose: 'Location service that confirms which shop staff clock in from and looks up stores during bulk uploads.',
    amount: 641550,
    logo: 'googlemaps',
  },
  {
    id: 'apple-developer',
    name: 'Apple Developer account',
    period: '12 months',
    purpose: 'Yearly membership that lets Xtend be listed on the App Store for iPhone users.',
    amount: 155000,
    logo: 'apple',
  },
  {
    id: 'website-deployment',
    name: 'Website deployment',
    period: 'One time',
    purpose: 'One-off launch of the website on the server, optimised to be found on search engines and AI answers.',
    amount: 350000,
    logo: 'deploy',
  },
  {
    id: 'anthropic-api-x-metrics',
    name: 'Anthropic API',
    subtitle: 'X Metrics',
    period: '12 months',
    purpose: 'AI that reads stock and expiry photos and writes the monthly X Metrics performance report.',
    amount: 204750,
    logo: 'anthropic',
  },
  {
    id: 'supabase-addon',
    name: 'Supabase add-on',
    period: '12 months',
    purpose: 'Extra database capacity for X Metrics records: supply, stock, sales, expiry dates and photos.',
    amount: 163800,
    logo: 'supabase',
  },
  {
    id: 'vps-upgrade',
    name: 'VPS upgrade',
    subtitle: 'Hostinger',
    period: '24 months',
    purpose: 'More memory and disk space on the server to handle X Metrics reports and data exports.',
    amount: 163800,
    logo: 'hostinger',
  },
  {
    id: 'daily-backup',
    name: 'Daily online backup',
    period: '12 months',
    purpose: 'Encrypted daily copy of all company data, kept off the main server for quick recovery.',
    amount: 123800,
    logo: 'backup',
  },
  {
    id: 'monitoring',
    name: 'Error and uptime monitoring',
    period: '6 months',
    purpose: '24/7 checks on every app, with instant alerts to the admin when something fails or goes down.',
    amount: 110150,
    logo: 'monitor',
  },
  {
    // Small item for trying out a real payment. Not ticked by default and
    // left out of "Select all", so clients don't pay for it by accident.
    id: 'test',
    name: 'Test',
    period: 'One time',
    purpose: 'Small payment used to check that checkout and receipts work.',
    amount: 1000,
    logo: 'test',
    test: true,
  },
];

const byId = new Map(items.map((i) => [i.id, i]));

module.exports = { items, byId, EXCHANGE_RATE };
