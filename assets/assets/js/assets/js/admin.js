
// ========================================
// YEUMKEUN - ADMIN SYSTEM
// ========================================

document.addEventListener("DOMContentLoaded", () => {

  const adminButton = document.getElementById("adminButton");
  const main = document.querySelector("main");

  let currentUser = null;

  const statusNames = {
    pending: "รออนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ",
    borrowed: "รับอุปกรณ์แล้ว",
    returned: "คืนอุปกรณ์แล้ว"
  };

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  adminButton?.addEventListener("click", async () => {

    const email = prompt("กรอกอีเมลบัญชีครู / Admin");
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

    currentUser = data.user;

    const { data: profile, error: profileError } =
      await window.db
        .from("profiles")
        .select("full_name, role")
        .eq("id", currentUser.id)
        .single();

    if (profileError || !profile ||
        !["teacher", "admin"].includes(profile.role)) {

      await window.db.auth.signOut();
      currentUser = null;

      alert("บัญชีนี้ยังไม่ได้รับอนุมัติให้เป็นครูหรือ Admin");
      return;
    }

    showDashboard(profile);
  });

  async function showDashboard(profile) {

    adminButton.textContent = "เปิดหน้า Dashboard";

    let dashboard = document.getElementById("adminDashboard");

    if (!dashboard) {
      dashboard = document.createElement("section");
      dashboard.id = "adminDashboard";
      dashboard.className = "card";
      main.appendChild(dashboard);
    }

    dashboard.innerHTML = `
      <h2>YEUMKEUN Dashboard</h2>
      <p>ผู้ใช้งาน: ${safe(profile.full_name)}</p>
      <p>สิทธิ์: ${safe(profile.role)}</p>

      <button id="refreshRequests">รีเฟรชรายการ</button>
      <button id="logoutAdmin">ออกจากระบบ</button>

      <div id="requestList">กำลังโหลดข้อมูล...</div>
    `;

    document.getElementById("refreshRequests")
      .addEventListener("click", loadRequests);

    document.getElementById("logoutAdmin")
      .addEventListener("click", async () => {
        await window.db.auth.signOut();
        currentUser = null;
        dashboard.remove();
        adminButton.textContent = "เข้าสู่ระบบครู";
        alert("ออกจากระบบแล้ว");
      });

    await loadRequests();

  }

  async function loadRequests() {

    const list = document.getElementById("requestList");
    if (!list) return;

    list.textContent = "กำลังโหลด...";

    const { data, error } = await window.db
      .from("borrow_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent = "โหลดข้อมูลไม่สำเร็จ: " + error.message;
      return;
    }

    if (!data || data.length === 0) {
      list.textContent = "ยังไม่มีคำขอยืม";
      return;
    }

    list.innerHTML = data.map(item => `
      <article class="card">
        <h3>${safe(item.equipment)}</h3>
        <p>ผู้ยืม: ${safe(item.student_name)}</p>
        <p>ชั้น: ${safe(item.student_class)}</p>
        <p>วัตถุประสงค์: ${safe(item.purpose)}</p>
        <p>วันยืม: ${new Date(item.borrow_date).toLocaleString("th-TH")}</p>
        <p>วันคืน: ${new Date(item.return_date).toLocaleString("th-TH")}</p>
        <p>สถานะ: <strong>${statusNames[item.status] || safe(item.status)}</strong></p>

        <label>เปลี่ยนสถานะ</label>
        <select class="statusSelect" data-id="${safe(item.id)}">
          ${Object.entries(statusNames).map(([value, label]) => `
            <option value="${value}" ${item.status === value ? "selected" : ""}>
              ${label}
            </option>
          `).join("")}
        </select>

        <button class="saveStatus" data-id="${safe(item.id)}">
          บันทึกสถานะ
        </button>
      </article>
    `).join("");

    list.querySelectorAll(".saveStatus").forEach(button => {

      button.addEventListener("click", async () => {

        const id = button.dataset.id;
        const select = list.querySelector(
          `.statusSelect[data-id="${id}"]`
        );

        const newStatus = select.value;

        const { error: updateError } = await window.db
          .from("borrow_requests")
          .update({
            status: newStatus,
            checked_by: currentUser.id,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (updateError) {
          alert("บันทึกไม่สำเร็จ: " + updateError.message);
          return;
        }

        alert("เปลี่ยนสถานะเรียบร้อย");
        await loadRequests();

      });

    });

  }

});

