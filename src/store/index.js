const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!useSupabase && process.env.VERCEL) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on Vercel; invoices will not be saved.');
}
module.exports = require(useSupabase ? './supabase' : './file');
