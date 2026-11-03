
// ========================================
// YEUMKEUN - MAIN APPLICATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("borrowForm");
  const result = document.getElementById("result");
  const trackButton = document.getElementById("trackButton");
  const trackingInput = document.getElementById("trackingCode");
  const trackingResult = document.getElementById("trackingResult");

  // ส่งคำขอยืม
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    result.textContent = "กำลังส่งคำขอ...";

    const name = document.getElementById("studentName").value.trim();
    const studentClass = document.getElementById("studentClass").value.trim();
    const equipment = document.getElementById("equipment").value.trim();
    const borrowDate = document.getElementById("borrowDate").value;
    const returnDate = document.getElementById("returnDate").value;
    const purpose = document.getElementById("purpose").value.trim();

    if (new Date(returnDate) <= new Date(borrowDate)) {
      result.textContent = "วันคืนต้องอยู่หลังวันยืม";
      return;
    }

    const { data, error } = await window.db.rpc(
      "create_borrow_request",
      {
        p_student_name: name,
        p_student_class: studentClass,
        p_equipment: equipment,
        p_borrow_date: new Date(borrowDate).toISOString(),
        p_return_date: new Date(returnDate).toISOString(),
        p_purpose: purpose
      }
    );

    if (error) {
      console.error(error);
      result.textContent = "ส่งคำขอไม่สำเร็จ: " + error.message;
      return;
    }

    result.innerHTML = `
      <div class="card">
        <h3>ส่งคำขอสำเร็จ!</h3>
        <p>รหัสติดตามของคุณคือ</p>
        <h2>${data}</h2>
        <p>โปรดบันทึกรหัสนี้ไว้ใช้ตรวจสอบสถานะ</p>
      </div>
    `;

    form.reset();
  });

  // ติดตามสถานะ
  trackButton?.addEventListener("click", async () => {

    const code = trackingInput.value.trim();

    if (!code) {
      trackingResult.textContent = "กรุณากรอกรหัสติดตาม";
      return;
    }

    trackingResult.textContent = "กำลังค้นหา...";

    const { data, error } = await window.db.rpc(
      "track_borrow_request",
      { p_tracking_code: code }
    );

    if (error) {
      trackingResult.textContent = "เกิดข้อผิดพลาด: " + error.message;
      return;
    }

    if (!data || data.length === 0) {
      trackingResult.textContent = "ไม่พบรหัสติดตามนี้";
      return;
    }

    const item = data[0];

    const statuses = {
      pending: "รออนุมัติ",
      approved: "อนุมัติแล้ว",
      rejected: "ไม่อนุมัติ",
      borrowed: "รับอุปกรณ์แล้ว",
      returned: "คืนอุปกรณ์แล้ว"
    };

    trackingResult.innerHTML = `
      <div class="card">
        <h3>ผลการติดตาม</h3>
        <p>ชื่อ: ${escapeHTML(item.student_name)}</p>
        <p>อุปกรณ์: ${escapeHTML(item.equipment)}</p>
        <p>วันยืม: ${new Date(item.borrow_date).toLocaleString("th-TH")}</p>
        <p>วันคืน: ${new Date(item.return_date).toLocaleString("th-TH")}</p>
        <h3>สถานะ: ${statuses[item.status] || item.status}</h3>
      </div>
    `;
  });

  // ป้องกัน HTML injection ในข้อมูลที่แสดง
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

});

