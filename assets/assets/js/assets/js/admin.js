
/* =========================================
   YEUMKEUN - ADMIN SYSTEM
   Version 2.0
========================================= */

(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    let currentUser = null;
    let currentProfile = null;
    let requests = [];

    function showMessage(message, type = "info") {
        const box = $("loginMessage");
        if (!box) return;

        box.textContent = message;
        box.style.display = "block";

        const colors = {
            info: "#eff6ff",
            success: "#dcfce7",
            error: "#fee2e2"
        };

        box.style.background = colors[type] || colors.info;
        box.style.padding = "12px";
        box.style.borderRadius = "10px";
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function showDashboard(profile) {
        $("staffDashboard")?.classList.remove("hidden");

        const loginForm = $("staffLoginForm");
        if (loginForm) loginForm.style.display = "none";

        const welcome = $("staffWelcome");
        if (welcome) {
            welcome.textContent =
                `ยินดีต้อนรับ ${profile.full_name || currentUser.email}`;
        }

        showMessage("เข้าสู่ระบบสำเร็จ", "success");
    }

    function hideDashboard() {
        $("staffDashboard")?.classList.add("hidden");

        const loginForm = $("staffLoginForm");
        if (loginForm) loginForm.style.display = "";

        const welcome = $("staffWelcome");
        if (welcome) welcome.textContent = "ยินดีต้อนรับเข้าสู่ระบบ";
    }

    async function login(event) {
        event.preventDefault();

        const email = $("staffEmail")?.value.trim();
        const password = $("staffPassword")?.value;

        if (!email || !password) {
            showMessage("กรุณากรอกอีเมลและรหัสผ่าน", "error");
            return;
        }

        const button = $("staffLoginButton");
        if (button) {
            button.disabled = true;
            button.textContent = "กำลังเข้าสู่ระบบ...";
        }

        try {
            if (!window.db) {
                throw new Error("ไม่พบการเชื่อมต่อฐานข้อมูล กรุณาตรวจสอบ database.js");
            }

            const { data, error } =
                await window.db.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            currentUser = data.user;

            const { data: profile, error: profileError } =
                await window.db
                    .from("profiles")
                    .select("id, full_name, role")
                    .eq("id", currentUser.id)
                    .single();

            if (profileError) throw profileError;

            if (!["teacher", "admin"].includes(profile.role)) {
                await window.db.auth.signOut();
                currentUser = null;
                throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์ครูหรือผู้ดูแลระบบ");
            }

            currentProfile = profile;
            showDashboard(profile);

            await loadRequests();

            $("staffPassword").value = "";

        } catch (error) {
            console.error("Login error:", error);

            showMessage(
                error.message || "เข้าสู่ระบบไม่สำเร็จ",
                "error"
            );

            if (window.db && !currentProfile) {
                await window.db.auth.signOut();
            }

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "เข้าสู่ระบบครู";
            }
        }
    }

    async function loadRequests() {
        const list = $("requestsList");
        if (!list) return;

        list.innerHTML = "<p>กำลังโหลดข้อมูล...</p>";

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
            console.error("Load requests error:", error);
            list.innerHTML =
                `<p class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHTML(error.message)}</p>`;
        }
    }

    function renderStats() {
        const box = $("requestStats");
        if (!box) return;

        const count = (status) =>
            requests.filter(item => item.status === status).length;

        box.innerHTML = `
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

    function statusName(status) {
        const names = {
            pending: "รอตรวจสอบ",
            approved: "อนุมัติแล้ว",
            rejected: "ไม่อนุมัติ",
            borrowed: "รับอุปกรณ์แล้ว",
            returned: "คืนอุปกรณ์แล้ว"
        };

        return names[status] || status;
    }

    function renderRequests() {
        const list = $("requestsList");
        if (!list) return;

        const search =
            ($("requestSearch")?.value || "").toLowerCase();

        const filter =
            $("statusFilter")?.value || "all";

        const filtered = requests.filter(item => {
            const text = [
                item.student_name,
                item.student_class,
                item.equipment,
                item.tracking_code
            ].join(" ").toLowerCase();

            return text.includes(search) &&
                (filter === "all" || item.status === filter);
        });

        if (!filtered.length) {
            list.innerHTML = "<p class='muted'>ไม่พบรายการคำขอ</p>";
            return;
        }

        list.innerHTML = filtered.map(item => {
            let actions = "";

            if (item.status === "pending") {
                actions = `
                    <button class="btn btn-primary"
                        data-status="approved"
                        data-id="${escapeHTML(item.id)}">
                        อนุมัติ
                    </button>
                    <button class="btn btn-danger-outline"
                        data-status="rejected"
                        data-id="${escapeHTML(item.id)}">
                        ไม่อนุมัติ
                    </button>
                `;
            }

            if (item.status === "approved") {
                actions = `
                    <button class="btn btn-primary"
                        data-status="borrowed"
                        data-id="${escapeHTML(item.id)}">
                        ยืนยันรับอุปกรณ์
                    </button>
                `;
            }

            if (item.status === "borrowed") {
                actions = `
                    <button class="btn btn-primary"
                        data-status="returned"
                        data-id="${escapeHTML(item.id)}">
                        ยืนยันคืนอุปกรณ์
                    </button>
                `;
            }

            return `
                <article class="request-card">
                    <h3>${escapeHTML(item.equipment)}</h3>
                    <p><strong>นักเรียน:</strong>
                        ${escapeHTML(item.student_name)}</p>
                    <p><strong>ชั้น:</strong>
                        ${escapeHTML(item.student_class || "-")}</p>
                    <p><strong>รหัสติดตาม:</strong>
                        ${escapeHTML(item.tracking_code)}</p>
                    <p><strong>วันยืม:</strong>
                        ${escapeHTML(item.borrow_date)}</p>
                    <p><strong>วันคืน:</strong>
                        ${escapeHTML(item.return_date)}</p>
                    <p><strong>วัตถุประสงค์:</strong>
                        ${escapeHTML(item.purpose || "-")}</p>
                    <p><strong>สถานะ:</strong>
                        ${escapeHTML(statusName(item.status))}</p>
                    <div class="dashboard-actions">
                        ${actions}
                    </div>
                </article>
            `;
        }).join("");
    }

    async function updateStatus(id, status) {
        const labels = {
            approved: "อนุมัติคำขอนี้",
            rejected: "ไม่อนุมัติคำขอนี้",
            borrowed: "ยืนยันการรับอุปกรณ์",
            returned: "ยืนยันการคืนอุปกรณ์"
        };

        if (!confirm(`ต้องการ${labels[status]}ใช่หรือไม่?`)) {
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

            alert("อัปเดตสถานะเรียบร้อยแล้ว");
            await loadRequests();

        } catch (error) {
            console.error("Update status error:", error);
            alert("ไม่สามารถเปลี่ยนสถานะได้: " + error.message);
        }
    }

    async function logout() {
        if (!confirm("ต้องการออกจากระบบใช่หรือไม่?")) return;

        try {
            const { error } = await window.db.auth.signOut();
            if (error) throw error;

            currentUser = null;
            currentProfile = null;
            requests = [];

            hideDashboard();
            showMessage("ออกจากระบบแล้ว", "success");

        } catch (error) {
            alert("ออกจากระบบไม่สำเร็จ: " + error.message);
        }
    }

    async function restoreSession() {
        try {
            if (!window.db) return;

            const { data } = await window.db.auth.getSession();
            const user = data?.session?.user;

            if (!user) return;

            currentUser = user;

            const { data: profile, error } = await window.db
                .from("profiles")
                .select("id, full_name, role")
                .eq("id", user.id)
                .single();

            if (error || !profile ||
                !["teacher", "admin"].includes(profile.role)) {
                await window.db.auth.signOut();
                currentUser = null;
                return;
            }

            currentProfile = profile;
            showDashboard(profile);
            await loadRequests();

        } catch (error) {
            console.error("Restore session error:", error);
        }
    }

    function init() {
        $("staffLoginForm")?.addEventListener("submit", login);

        $("staffLogout")?.addEventListener("click", logout);

        $("refreshRequests")?.addEventListener("click", loadRequests);

        $("requestSearch")?.addEventListener("input", renderRequests);

        $("statusFilter")?.addEventListener("change", renderRequests);

        $("requestsList")?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-status][data-id]");
            if (!button) return;

            if (!currentUser) {
                alert("กรุณาเข้าสู่ระบบก่อน");
                return;
            }

            updateStatus(
                button.dataset.id,
                button.dataset.status
            );
        });

        restoreSession();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
