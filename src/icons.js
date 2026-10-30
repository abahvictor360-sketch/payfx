// Logos for each catalog item. Brand marks come from the simple-icons package
// (24x24 single-path SVGs); generic services use small outline icons.
// Each logo has a colour `svg` for the website and a black `mono` for invoices.
const si = require('simple-icons');

const brand = (icon) => ({
  title: icon.title,
  color: `#${icon.hex}`,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#${icon.hex}" d="${icon.path}"/></svg>`,
  mono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#000" d="${icon.path}"/></svg>`,
});

const outlineSvg = (color, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const outline = (title, color, body) => ({
  title,
  color,
  svg: outlineSvg(color, body),
  mono: outlineSvg('#000', body),
});

const logos = {
  supabase: brand(si.siSupabase),
  claude: brand(si.siClaude),
  anthropic: brand(si.siAnthropic),
  googlemaps: brand(si.siGooglemaps),
  apple: brand(si.siApple),
  hostinger: brand(si.siHostinger),
  deploy: outline('Website deployment', '#EA580C',
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18M6 6h.01M8.5 6h.01M12 17v-6M9.5 13.5 12 11l2.5 2.5"/>'),
  backup: outline('Online backup', '#059669',
    '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4 4 0 0 1-.5 9"/><path d="M12 20v-7M9.5 15.5 12 13l2.5 2.5"/>'),
  monitor: outline('Uptime monitoring', '#DC2626',
    '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>'),
};

module.exports = { logos };
