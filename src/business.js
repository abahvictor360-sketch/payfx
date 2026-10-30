// Seller details printed on every invoice. Set these in .env.
module.exports = () => ({
  name: process.env.BUSINESS_NAME || 'PayFX',
  address: process.env.BUSINESS_ADDRESS || '',
  email: process.env.BUSINESS_EMAIL || '',
  phone: process.env.BUSINESS_PHONE || '',
});
