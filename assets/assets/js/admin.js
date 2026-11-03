
/* =========================================
   YEUMKEUN ADMIN DASHBOARD
   Login / Requests / Approve / Reject
   Borrow / Return
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const loginForm = $("adminLoginForm");
  const loginPanel = $("adminLoginPanel");
  const dashboard = $("adminDashboard");
  const loginMessage = $("adminLoginMessage");
  const requestsBox = $("adminRequests");
  const statsBox = $("adminStats");

  let currentUser = null;
  let requests = [];

  const statusLabels = {
    pending: "รอตรวจสอบ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ",
    borrowed: "รับอุปกรณ์แล้ว",
    returned: "คืนอุปกรณ์แล้ว"
  };

  const statusColors = {
    pending: "#d97706",
    approved: "#15803d",
    rejected: "#dc2626",
    borrowed: "#2563eb",
    returned: "#64748b"
  };

  function showMessage(message, isError = true) {
    if (!loginMessage) return;
    loginMessage.textContent = message;
    loginMessage.style.color = isError ? "#dc2626" : "#15803d";
  }

  function setDashboardVisible(user, role) {
    currentUser = user;

    if (loginPanel) loginPanel.hidden = true;
    if (dashboard) {
      dashboard.hidden = false;
      dashboard.classList.remove("hidden");
    }

    if ($("adminWelcome")) {
      $("adminWelcome").textContent =
        `เข้าสู่ระบบสำเร็จ สิทธิ์: ${role}`;
    }

    loadRequests();
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

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function makeText(tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text ?? "-";
    if (className) element.className = className;
    return element;
  }

  function addActionButton(container, label, status, id) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-outline";
    button.textContent = label;
    button.dataset.action = status;
    button.dataset.id = id;
    container.appendChild(button);
  }

  function renderStats() {
    if (!statsBox) return;

    const counts = {
      all: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      borrowed: 0,
      returned: 0
    };

    requests.forEach((item) => {
      if (Object.hasOwn(counts, item.status)) {
        counts[item.status]++;
      }
    });

    const items = [
      ["คำขอทั้งหมด", counts.all],
      ["รอตรวจสอบ", counts.pending],
      ["อนุมัติแล้ว", counts.approved],
      ["ไม่อนุมัติ", counts.rejected],
      ["กำลังยืม", counts.borrowed],
      ["คืนแล้ว", counts.returned]
    ];

    statsBox.replaceChildren();

    items.forEach(([label, number]) => {
      const card = document.createElement("div");
      card.className = "stat-card";
      card.append(
        makeText("span", label),
        makeText("strong", number)
      );
      statsBox.appendChild(card);
    });
  }

  function renderRequests() {
    if (!requestsBox) return;

    const search = ($("adminSearch")?.value || "")
      .trim()
      .toLowerCase();

    const filter = $("adminStatusFilter")?.value || "all";

    const filtered = requests.filter((item) => {
      const text = [
        item.student_name,
        item.student_class,
        item.equipment,
        item.purpose
      ].join(" ").toLowerCase();

      const matchesSearch = !search || text.includes(search);
      const matchesStatus =
        filter === "all" || item.status === filter;

      return matchesSearch && matchesStatus;
    });

    requestsBox.replaceChildren();

    if (!filtered.length) {
      requestsBox.appendChild(
        makeText("p", "ไม่พบรายการคำขอ", "muted")
      );
      return;
    }

    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "request-card";

      const heading = document.createElement("div");
      heading.className = "request-heading";

      heading.appendChild(
        makeText("h3", item.student_name || "ไม่ระบุชื่อนักเรียน")
      );

      const badge = makeText(
        "span",
        statusLabels[item.status] || item.status,
        "status-badge"
      );
      badge.style.color = statusColors[item.status] || "#333";
      heading.appendChild(badge);

      card.appendChild(heading);

      const details = [
        `ชั้นเรียน: ${item.student_class || "-"}`,
        `อุปกรณ์: ${item.equipment || "-"}`,
        `วันยืม: ${formatDate(item.borrow_date)}`,
        `กำหนดคืน: ${formatDate(item.return_date)}`,
        `วัตถุประสงค์: ${item.purpose || "-"}`
      ];

      details.forEach((line) => {
        card.appendChild(makeText("p", line));
      });

      if (item.tracking_code) {
        card.appendChild(
          makeText("p", `รหัสติดตาม: ${item.tracking_code}`)
        );
      }

      const actions = document.createElement("div");
      actions.className = "request-actions";

      if (item.status === "pending") {
        addActionButton(actions, "อนุมัติ", "approved", item.id);
        addActionButton(actions, "ไม่อนุมัติ", "rejected", item.id);
      }

      if (item.status === "approved") {
        addActionButton(
          actions,
          "บันทึกรับอุปกรณ์แล้ว",
          "borrowed",
          item.id
        );
      }

      if (item.status === "borrowed") {
        addActionButton(
          actions,
          "ยืนยันคืนอุปกรณ์",
          "returned",
          item.id
        );
      }

      if (actions.children.length) {
        card.appendChild(actions);
      }

      requestsBox.appendChild(card);
    });
  }

  async function loadRequests() {
    if (!window.db || !requestsBox) return;

    requestsBox.textContent = "กำลังโหลดรายการคำขอ...";

    const { data, error } = await window.db
      .from("borrow_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load requests error:", error);
      requestsBox.textContent =
        "โหลดรายการไม่สำเร็จ: " + error.message;
      return;
    }

    requests = data || [];
    renderStats();
    renderRequests();
  }

  async function updateStatus(id, newStatus) {
    if (!currentUser) {
      alert("กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    const label = statusLabels[newStatus] || newStatus;

    if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น "${label}" หรือไม่?`)) {
      return;
    }

    const buttons = requestsBox.querySelectorAll(
      `button[data-id="${CSS.escape(String(id))}"]`
    );
    buttons.forEach((button) => button.disabled = true);

    const { error } = await window.db
      .from("borrow_requests")
      .update({
        status: newStatus,
        checked_by: currentUser.id
      })
      .eq("id", id);

    if (error) {
      console.error("Update status error:", error);
      alert("เปลี่ยนสถานะไม่สำเร็จ: " + error.message);
      buttons.forEach((button) => button.disabled = false);
      return;
    }

    alert("บันทึกสถานะเรียบร้อยแล้ว");
    await loadRequests();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = $("adminEmail")?.value.trim();
      const password = $("adminPassword")?.value;
      const button = $("adminLoginButton");

      if (!email || !password) {
        showMessage("กรุณากรอกอีเมลและรหัสผ่าน");
        return;
      }

      if (button) button.disabled = true;
      showMessage("กำลังตรวจสอบบัญชี...", false);

      try {
        const { data, error } = await window.db.auth
          .signInWithPassword({ email, password });

        if (error) throw error;

        const role = await checkStaff(data.user);
        showMessage("เข้าสู่ระบบสำเร็จ", false);
        setDashboardVisible(data.user, role);

      } catch (error) {
        console.error("Login error:", error);
        showMessage(error.message || "เข้าสู่ระบบไม่สำเร็จ");
        await window.db?.auth.signOut();
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  if ($("adminRefresh")) {
    $("adminRefresh").addEventListener("click", loadRequests);
  }

  if ($("adminSearch")) {
    $("adminSearch").addEventListener("input", renderRequests);
  }

  if ($("adminStatusFilter")) {
    $("adminStatusFilter").addEventListener("change", renderRequests);
  }

  if (requestsBox) {
    requestsBox.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      updateStatus(button.dataset.id, button.dataset.action);
    });
  }

  if ($("adminLogout")) {
    $("adminLogout").addEventListener("click", async () => {
      await window.db.auth.signOut();
      window.location.reload();
    });
  }

  async function restoreSession() {
    if (!window.db) return;

    const { data, error } = await window.db.auth.getSession();

    if (error || !data?.session?.user) return;

    try {
      const role = await checkStaff(data.session.user);
      setDashboardVisible(data.session.user, role);
    } catch (error) {
      console.error("Restore session error:", error);
      await window.db.auth.signOut();
    }
  }

  restoreSession();
});
