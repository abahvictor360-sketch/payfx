// Items and funding required (section 07). Amounts are in Naira.
// Exchange rate used for these figures: US$1 = ₦1,365.
// To add, remove or reprice an item, edit this list and restart the server.

const EXCHANGE_RATE = 1365;

const items = [
  {
    id: 'supabase-pro',
    name: 'Supabase Pro',
    period: '12 months',
    purpose: 'Provides the shared database, staff logins and data storage for the website, Xpel POS and Xtend.',
    amount: 409500,
    logo: 'supabase',
  },
  {
    id: 'vps-hosting',
    name: 'VPS hosting',
    period: '24 months',
    purpose: 'Hosts the company website, Xpel POS, Xtend and other company apps developed in the future.',
    amount: 327600,
    logo: 'server',
  },
  {
    id: 'domain-name',
    name: 'Domain name',
    period: '12 months',
    purpose: 'Provides the web address staff use to access and install Xtend.',
    amount: 27300,
    logo: 'globe',
  },
  {
    id: 'anthropic-api-claude',
    name: 'Anthropic API',
    subtitle: 'Claude',
    period: '12 months',
    purpose: 'Checks Xtend clock-in selfies and shelf photos, and powers Ask Xtend, the attendance assistant.',
    amount: 477750,
    logo: 'claude',
  },
  {
    id: 'google-maps-api',
    name: 'Google Maps API',
    period: '12 months',
    purpose: 'Identifies shops at clock-in and helps find stores when adding them in bulk.',
    amount: 641550,
    logo: 'googlemaps',
  },
  {
    id: 'apple-developer',
    name: 'Apple Developer account',
    period: '12 months',
    purpose: 'Publishes Xtend on the Apple App Store, so staff using iPhones can install it directly from the store.',
    amount: 155000,
    logo: 'apple',
  },
  {
    id: 'website-deployment',
    name: 'Website deployment',
    period: 'One time',
    purpose: 'Deploys the company website on the shared VPS, with AEO and SEO setup for search visibility.',
    amount: 350000,
    logo: 'deploy',
  },
  {
    id: 'anthropic-api-x-metrics',
    name: 'Anthropic API',
    subtitle: 'X Metrics',
    period: '12 months',
    purpose: 'Reads stock count and expiry photos, and prepares monthly performance summaries for X Metrics.',
    amount: 204750,
    logo: 'anthropic',
  },
  {
    id: 'supabase-addon',
    name: 'Supabase add-on',
    period: '12 months',
    purpose: 'Adds database compute and storage for X Metrics supply, stock, sales and expiry records and photos.',
    amount: 163800,
    logo: 'supabase',
  },
  {
    id: 'vps-upgrade',
    name: 'VPS upgrade',
    period: '24 months',
    purpose: 'Adds memory and storage to the shared VPS for X Metrics processing, reports and exports.',
    amount: 163800,
    logo: 'serverPlus',
  },
  {
    id: 'daily-backup',
    name: 'Daily online backup',
    period: '12 months',
    purpose: 'Saves an encrypted online copy of company data every day, separate from the main server, so records can be restored if anything fails.',
    amount: 123800,
    logo: 'backup',
  },
  {
    id: 'monitoring',
    name: 'Error and uptime monitoring',
    period: '6 months',
    purpose: 'Watches the apps around the clock and alerts the admin if anything breaks or goes offline.',
    amount: 110150,
    logo: 'monitor',
  },
];

const byId = new Map(items.map((i) => [i.id, i]));

module.exports = { items, byId, EXCHANGE_RATE };
