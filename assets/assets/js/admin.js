
// YEUMKEUN - Admin Login and Dashboard

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("adminLoginForm");
  const loginPanel = document.getElementById("adminLoginPanel");
  const dashboard = document.getElementById("adminDashboard");
  const message = document.getElementById("adminLoginMessage");

  if (!loginForm) {
    console.error("ไม่พบ adminLoginForm ใน admin.html");
    return;
  }

  function showMessage(text, isError = true) {
    if (message) {
      message.textContent = text;
      message.style.color = isError ? "#dc2626" : "#15803d";
    }
  }

  async function checkStaff(user) {
    const { data, error } = await window.db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    if (!data || !["admin", "teacher"].includes(data.role)) {
      throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์ครูหรือผู้ดูแลระบบ");
    }

    return data.role;
  }

  function showDashboard(user, role) {
    if (loginPanel) loginPanel.hidden = true;
    if (dashboard) dashboard.hidden = false;

    const welcome = document.getElementById("adminWelcome");
    if (welcome) {
      welcome.textContent = `เข้าสู่ระบบสำเร็จ (${role})`;
    }
  }

  async function login(email, password) {
    if (!window.db) {
      throw new Error("เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบ database.js");
    }

    const { data, error } = await window.db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const role = await checkStaff(data.user);
    showDashboard(data.user, role);
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("adminEmail")?.value.trim();
    const password = document.getElementById("adminPassword")?.value;

    if (!email || !password) {
      showMessage("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    const button = document.getElementById("adminLoginButton");
    if (button) button.disabled = true;

    showMessage("กำลังตรวจสอบบัญชี...", false);

    try {
      await login(email, password);
    } catch (error) {
      console.error("Admin login error:", error);
      showMessage(error.message || "เข้าสู่ระบบไม่สำเร็จ");
      await window.db?.auth.signOut();
    } finally {
      if (button) button.disabled = false;
    }
  });

  async function restoreSession() {
    if (!window.db) return;

    const { data } = await window.db.auth.getSession();
    const user = data?.session?.user;

    if (!user) return;

    try {
      const role = await checkStaff(user);
      showDashboard(user, role);
    } catch (error) {
      console.error(error);
      await window.db.auth.signOut();
    }
  }

  const logoutButton = document.getElementById("adminLogout");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await window.db.auth.signOut();
      window.location.reload();
    });
  }

  restoreSession();
});

