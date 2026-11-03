
// ========================================
// YEUMKEUN - SUPABASE DATABASE CONNECTION
// ========================================

const SUPABASE_URL = "https://olitpzwlvmgdcfmzxgxy.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_tmoGyOznb50gyipIFcis7w_0hiCpRUd";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.db = supabaseClient;

console.log("YEUMKEUN: Supabase connected");

