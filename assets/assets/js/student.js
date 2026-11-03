
document.addEventListener("DOMContentLoaded", () => {
  const borrowForm = document.getElementById("borrowForm");
  const trackingForm = document.getElementById("trackingForm");

  if (borrowForm) {
    borrowForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const result = document.getElementById("borrowResult");

      if (!window.db) {
        if (result) result.textContent = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้";
        return;
      }

      const values = {
        student_name: document.getElementById("studentName")?.value.trim(),
        student_class: document.getElementById("studentClass")?.value.trim(),
        equipment: document.getElementById("equipment")?.value.trim(),
        borrow_date: document.getElementById("borrowDate")?.value,
        return_date: document.getElementById("returnDate")?.value,
        purpose: document.getElementById("purpose")?.value.trim()
      };

      if (result) result.textContent = "กำลังส่งคำขอ...";

      try {
        const { data, error } = await window.db.rpc(
          "create_borrow_request",
          {
            p_student_name: values.student_name,
            p_student_class: values.student_class,
            p_equipment: values.equipment,
            p_borrow_date: values.borrow_date,
            p_return_date: values.return_date,
            p_purpose: values.purpose
          }
        );

        if (error) throw error;

        if (result) {
          result.textContent = "ส่งคำขอสำเร็จ รหัสติดตาม: " +
            (data?.tracking_code || data || "กรุณาตรวจสอบกับครู");
        }

        borrowForm.reset();
      } catch (error) {
        console.error(error);
        if (result) result.textContent = "ส่งคำขอไม่สำเร็จ: " + error.message;
      }
    });
  }

  if (trackingForm) {
    trackingForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const code = document.getElementById("trackingCode")?.value.trim();
      const result = document.getElementById("trackingResult");

      if (!window.db || !code) return;

      if (result) result.textContent = "กำลังตรวจสอบ...";

      try {
        const { data, error } = await window.db.rpc(
          "track_borrow_request",
          { p_tracking_code: code }
        );

        if (error) throw error;

        if (result) {
          result.textContent = data
            ? JSON.stringify(data, null, 2)
            : "ไม่พบข้อมูลคำขอ";
        }
      } catch (error) {
        console.error(error);
        if (result) result.textContent = "ตรวจสอบไม่สำเร็จ: " + error.message;
      }
    });
  }
});
