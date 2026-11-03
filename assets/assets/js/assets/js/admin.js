
document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("staffLoginForm");
  const message = document.getElementById("loginMessage");
  const button = document.getElementById("staffLoginButton");

  if (!form) {
    console.error("ไม่พบ staffLoginForm");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("staffEmail").value.trim();
    const password = document.getElementById("staffPassword").value;

    button.disabled = true;
    button.textContent = "กำลังเข้าสู่ระบบ...";
    message.textContent = "";

    try {
      if (!window.db) {
        throw new Error("ไม่พบการเชื่อมต่อ Supabase");
      }

      const { data, error } = await window.db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const { data: profile, error: profileError } =
        await window.db
          .from("profiles")
          .select("full_name, role")
          .eq("id", data.user.id)
          .single();

      if (profileError || !profile ||
          !["admin", "teacher"].includes(profile.role)) {

        await window.db.auth.signOut();
        throw new Error("บัญชีนี้ยังไม่ได้รับอนุมัติเป็นครูหรือ Admin");
      }

      message.style.color = "green";
      message.textContent =
        "เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ " + profile.full_name;

      form.style.display = "none";

      const dashboard = document.createElement("section");
      dashboard.className = "card";
      dashboard.innerHTML = `
        <h2>YEUMKEUN Dashboard</h2>
        <p>ผู้ใช้งาน: ${escapeHTML(profile.full_name)}</p>
        <p>สิทธิ์: ${escapeHTML(profile.role)}</p>
        <button id="openDashboard">จัดการคำขอยืม</button>
        <button id="staffLogout">ออกจากระบบ</button>
        <div id="staffDashboardContent"></div>
      `;

      document.getElementById("staffLogin").appendChild(dashboard);

      document.getElementById("openDashboard")
        .addEventListener("click", async () => {
          const { data: requests, error } = await window.db
            .from("borrow_requests")
            .select("*")
            .order("created_at", { ascending: false });

          const output = document.getElementById("staffDashboardContent");

          if (error) {
            output.textContent = "โหลดข้อมูลไม่สำเร็จ: " + error.message;
            return;
          }

          output.innerHTML = (requests || []).map(r => `
            <article class="card">
              <h3>${escapeHTML(r.equipment)}</h3>
              <p>ผู้ยืม: ${escapeHTML(r.student_name)}</p>
              <p>ชั้น: ${escapeHTML(r.student_class)}</p>
              <p>สถานะ: ${escapeHTML(r.status)}</p>
            </article>
          `).join("") || "ยังไม่มีคำขอยืม";
        });

      document.getElementById("staffLogout")
        .addEventListener("click", async () => {
          await window.db.auth.signOut();
          location.reload();
        });

    } catch (error) {
      message.style.color = "red";
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "เข้าสู่ระบบ";
    }

  });

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

});
