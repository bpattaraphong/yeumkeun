
document.addEventListener("DOMContentLoaded", function () {
  console.log("YEUMKEUN ADMIN JS LOADED");

  const adminButton = document.getElementById("adminButton");

  if (!adminButton) {
    console.error("ไม่พบปุ่ม adminButton");
    return;
  }

  adminButton.addEventListener("click", function () {
    alert("ปุ่มเข้าสู่ระบบครูทำงานแล้ว!");

    if (!window.db) {
      alert("ยังเชื่อมต่อ Supabase ไม่สำเร็จ");
      return;
    }

    loginTeacher();
  });

  async function loginTeacher() {
    const email = prompt("กรอกอีเมล Admin / ครู");
    if (!email) return;

    const password = prompt("กรอกรหัสผ่าน");
    if (!password) return;

    const { data, error } = await window.db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
      return;
    }

    const { data: profile, error: profileError } = await window.db
      .from("profiles")
      .select("full_name, role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile ||
        !["admin", "teacher"].includes(profile.role)) {
      await window.db.auth.signOut();
      alert("บัญชีนี้ยังไม่ได้รับสิทธิ์ครูหรือ Admin");
      return;
    }

    alert("เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ " + profile.full_name);
  }
});
