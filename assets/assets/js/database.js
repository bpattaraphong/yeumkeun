// YEUMKEUN - Supabase Database Connection

const SUPABASE_URL = "https://olitpzwlvmgdcfmzxgxy.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_tmoGyOznb50gyipIFcis7w_0hiCpRUd";

if (!window.supabase) {
  console.error("ไม่พบ Supabase Library กรุณาตรวจสอบการโหลด CDN");
} else {
  window.db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  console.log("YEUMKEUN: เชื่อมต่อ Supabase Client สำเร็จ");
}
