
/* ======================================
   YEUMKEUN ADMIN SYSTEM
   Separate Admin Dashboard
====================================== */

(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const STATUS = {
    pending: "รอตรวจสอบ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ",
    borrowed: "รับอุปกรณ์แล้ว",
    returned: "คืนอุปกรณ์แล้ว"
  };

  let currentUser = null;
  let currentProfile = null;
  let requests = [];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function showMessage(text, success = false) {
    const box = $("adminLoginMessage");
    if (!box) return;

    box.textContent = text;
    box.className = success ? "admin-success" : "admin-error";
    box.style.display = "block";
  }

  function showDashboard() {
    $("adminLoginPanel").classList.add("hidden");
    $("adminDashboard").classList.remove("hidden");

    $("adminWelcome").textContent =
      `ยินดีต้อนรับ ${currentProfile.full_name || currentUser.email}`;
  }

  function showLogin() {
    $("adminDashboard").classList.add("hidden");
    $("adminLoginPanel").classList.remove("hidden");
  }

  async function checkPermission(user) {
    const { data, error } = await window.db
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    if (!data || !["teacher", "admin"].includes(data.role)) {
      throw new Error(
        "บัญชีนี้ยังไม่ได้รับสิทธิ์ครูหรือผู้ดูแลระบบ"
      );
    }

    currentUser = user;
    currentProfile = data;
  }

  async function login(event) {
    event.preventDefault();

    const button = $("adminLoginButton");
    button.disabled = true;
    button.textContent = "กำลังเข้าสู่ระบบ...";

    try {
      if (!window.db) {
        throw new Error("ไม่พบการเชื่อมต่อฐานข้อมูล กรุณาตรวจสอบ database.js");
      }

      const email = $("adminEmail").value.trim();
      const password = $("adminPassword").value;

      const { data, error } = await window.db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      try {
        await checkPermission(data.user);
      } catch (permissionError) {
        await window.db.auth.signOut();
        currentUser = null;
        currentProfile = null;
        throw permissionError;
      }

      $("adminPassword").value = "";

      // แสดง Dashboard ในหน้า admin.html
      showDashboard();

      showMessage("เข้าสู่ระบบสำเร็จ", true);

      await loadRequests();

    } catch (error) {
      console.error("Login error:", error);
      showMessage(error.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      button.disabled = false;
      button.textContent = "เข้าสู่ระบบ";
    }
  }

  async function loadRequests() {
    const list = $("adminRequests");
    list.innerHTML = "<p>กำลังโหลดรายการคำขอ...</p>";

    try {
      const { data, error } = await window.db
        .from("borrow_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      requests = data || [];

      renderStats();
      renderRequests();

    } catch (error) {
      console.error("Load error:", error);
      list.innerHTML =
        `<p>โหลดข้อมูลไม่สำเร็จ: ${escapeHTML(error.message)}</p>`;
    }
  }

  function renderStats() {
    const count = status =>
      requests.filter(item => item.status === status).length;

    $("adminStats").innerHTML = `
      <div>
        <strong>${requests.length}</strong>
        <span>คำขอทั้งหมด</span>
      </div>
      <div>
        <strong>${count("pending")}</strong>
        <span>รอตรวจสอบ</span>
      </div>
      <div>
        <strong>${count("approved")}</strong>
        <span>อนุมัติแล้ว</span>
      </div>
      <div>
        <strong>${count("returned")}</strong>
        <span>คืนอุปกรณ์แล้ว</span>
      </div>
    `;
  }

  function renderRequests() {
    const list = $("adminRequests");

    const keyword = $("adminSearch").value.toLowerCase().trim();
    const filter = $("adminStatusFilter").value;

    const filtered = requests.filter(item => {
      const text = [
        item.student_name,
        item.student_class,
        item.equipment,
        item.tracking_code
      ].join(" ").toLowerCase();

      return text.includes(keyword) &&
        (filter === "all" || item.status === filter);
    });

    if (!filtered.length) {
      list.innerHTML = "<p class='muted'>ไม่พบรายการคำขอ</p>";
      return;
    }

    list.innerHTML = filtered.map(item => {
      let buttons = "";

      if (item.status === "pending") {
        buttons = `
          <button class="btn btn-primary"
            data-id="${escapeHTML(item.id)}"
            data-status="approved">อนุมัติ</button>

          <button class="btn btn-danger-outline"
            data-id="${escapeHTML(item.id)}"
            data-status="rejected">ไม่อนุมัติ</button>
        `;
      }

      if (item.status === "approved") {
        buttons = `
          <button class="btn btn-primary"
            data-id="${escapeHTML(item.id)}"
            data-status="borrowed">ยืนยันรับอุปกรณ์</button>
        `;
      }

      if (item.status === "borrowed") {
        buttons = `
          <button class="btn btn-primary"
            data-id="${escapeHTML(item.id)}"
            data-status="returned">ยืนยันคืนอุปกรณ์</button>
        `;
      }

      return `
        <article class="request-card">
          <h3>${escapeHTML(item.equipment)}</h3>

          <p><strong>สถานะ:</strong>
            ${escapeHTML(STATUS[item.status] || item.status)}
          </p>

          <p><strong>นักเรียน:</strong>
            ${escapeHTML(item.student_name)}</p>

          <p><strong>ชั้น:</strong>
            ${escapeHTML(item.student_class)}</p>

          <p><strong>รหัสติดตาม:</strong>
            ${escapeHTML(item.tracking_code)}</p>

          <p><strong>วันยืม:</strong>
            ${escapeHTML(item.borrow_date)}</p>

          <p><strong>วันคืน:</strong>
            ${escapeHTML(item.return_date)}</p>

          <p><strong>วัตถุประสงค์:</strong>
            ${escapeHTML(item.purpose || "-")}</p>

          <div class="dashboard-actions">
            ${buttons}
          </div>
        </article>
      `;
    }).join("");
  }

  async function changeStatus(id, status) {
    const names = {
      approved: "อนุมัติ",
      rejected: "ไม่อนุมัติ",
      borrowed: "ยืนยันรับอุปกรณ์",
      returned: "ยืนยันคืนอุปกรณ์"
    };

    if (!confirm(`ต้องการ${names[status]}ใช่หรือไม่?`)) {
      return;
    }

    try {
      const { error } = await window.db
        .from("borrow_requests")
        .update({
          status: status,
          checked_by: currentUser.id
        })
        .eq("id", id);

      if (error) throw error;

      alert("เปลี่ยนสถานะเรียบร้อยแล้ว");
      await loadRequests();

    } catch (error) {
      console.error("Status error:", error);
      alert("เปลี่ยนสถานะไม่สำเร็จ: " + error.message);
    }
  }

  async function logout() {
    if (!confirm("ต้องการออกจากระบบหรือไม่?")) return;

    const { error } = await window.db.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    currentUser = null;
    currentProfile = null;
    requests = [];

    showLogin();
    $("adminLoginMessage").textContent = "";
  }

  async function restoreSession() {
    try {
      if (!window.db) {
        showMessage("ไม่พบ Supabase กรุณาตรวจสอบ database.js");
        return;
      }

      const { data, error } = await window.db.auth.getSession();
      if (error) throw error;

      const user = data.session?.user;
      if (!user) return;

      await checkPermission(user);
      showDashboard();
      await loadRequests();

    } catch (error) {
      console.error("Session error:", error);

      if (window.db) {
        await window.db.auth.signOut();
      }

      currentUser = null;
      currentProfile = null;
      showLogin();
      showMessage(error.message || "กรุณาเข้าสู่ระบบใหม่");
    }
  }

  function init() {
    $("adminLoginForm").addEventListener("submit", login);

    $("adminLogout").addEventListener("click", logout);

    $("adminRefresh").addEventListener("click", loadRequests);

    $("adminSearch").addEventListener("input", renderRequests);

    $("adminStatusFilter").addEventListener("change", renderRequests);

    $("adminRequests").addEventListener("click", event => {
      const button = event.target.closest("[data-id][data-status]");
      if (!button || !currentUser) return;

      changeStatus(button.dataset.id, button.dataset.status);
    });

    restoreSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
