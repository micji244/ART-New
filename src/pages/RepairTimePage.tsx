import type { AppPageContext } from "./pageContext";

type RepairTimePageProps = Pick<AppPageContext, "calculateDuration" | "canRepair" | "departmentName" | "dueTime" | "isSavingRepairStep" | "personName" | "repairData" | "saveRepairStep" | "selectedDepartment" | "setDueTime" | "setPage" | "setStartTime" | "startTime" | "userId">;

// Page "repair-time" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairTimePage({ calculateDuration, canRepair, departmentName, dueTime, isSavingRepairStep, personName, repairData, saveRepairStep, selectedDepartment, setDueTime, setPage, setStartTime, startTime, userId }: RepairTimePageProps) {
  return (
<main className="repair-time-container">

    <div className="repair-time-header">
      <div className="cm-logo">ART</div>

      <h1>เสนอเวลาซ่อม</h1>

      <div className="repair-time-job-number">
{repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="repair-time-status">
        รอเสนอเวลาซ่อม
      </div>
    </div>

    {/* ข้อมูลงาน */}
    <section className="repair-time-card">
      <h2>📋 ข้อมูลงาน</h2>

      <div className="repair-time-row">
        <span>แผนก</span>
        <strong>{departmentName(selectedDepartment)}</strong>
      </div>

      <div className="repair-time-row">
        <span>เครื่องจักร</span>
   <strong>{repairData?.machineName || "ไม่มีข้อมูลเครื่องจักร"}</strong>
      </div>
      <div className="repair-time-row"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>
      <div className="repair-time-row">
  <span>อาการ / ปัญหา</span>
  <strong>{repairData?.problemDescription || "ไม่มีข้อมูลอาการเสีย"}</strong>
</div>

      <div className="repair-time-row">
        <span>ผู้รับผิดชอบ</span>
        <strong>{personName(repairData?.acceptedBy, "รอมอบหมาย")}</strong>
      </div>
    </section>

    {/* เสนอเวลา */}
    <section className="repair-time-card">
      <h2>🕒 กำหนดเวลาซ่อม</h2>

      <label className="repair-time-label">
        วันและเวลาเริ่มซ่อม
      </label>

<div className="datetime-picker-box">
  <input
    id="start-time-input"
    className="repair-time-input"
    type="datetime-local"
    value={startTime}
    onChange={(e) => setStartTime(e.target.value)}
  />

  <button
    type="button"
    className="datetime-picker-button"
    onClick={() => (document.getElementById("start-time-input") as HTMLInputElement | null)?.showPicker()}
  >
    📅
  </button>
</div>
      

      <label className="repair-time-label">
        วันและเวลาคาดว่าจะเสร็จ
      </label>

<div className="datetime-picker-box">
  <input
    id="due-time-input"
    className="repair-time-input"
    type="datetime-local"
    value={dueTime}
    onChange={(e) => setDueTime(e.target.value)}
  />

  <button
    type="button"
    className="datetime-picker-button"
    onClick={() => (document.getElementById("due-time-input") as HTMLInputElement | null)?.showPicker()}
  >
    📅
  </button>
</div>
      <div className="duration-box">
        ระยะเวลาซ่อม
       <strong>{calculateDuration()}</strong>
      </div>

      {canRepair && <button
        className="submit-repair-time-button"
disabled={isSavingRepairStep}
onClick={async () => {
  if (!startTime || !dueTime) {
    alert("กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด");
    return;
  }
  const proposedStart = new Date(startTime);
  const proposedDue = new Date(dueTime);
  if (Number.isNaN(proposedStart.getTime()) || Number.isNaN(proposedDue.getTime()) || proposedDue <= proposedStart) {
    alert("เวลาคาดว่าจะเสร็จต้องอยู่หลังเวลาเริ่มซ่อม");
    return;
  }

  const updatedRepair = {
    ...repairData,
    startTime,
    dueTime,
    proposedDuration: calculateDuration(),
    timeProposedBy: userId,
    timeProposedAt: new Date().toISOString(),
    status: "กำลังซ่อม",
  };
  const saved = await saveRepairStep(
    updatedRepair,
    "เสนอเวลาซ่อม",
    `เสนอเวลาซ่อม ${startTime} ถึง ${dueTime} รวม ${calculateDuration()}`
  );
  if (saved) setPage("repair-execution");
}}
      >
        {isSavingRepairStep ? "กำลังบันทึกเวลาซ่อม…" : "✓ เสนอเวลาซ่อม"}
      </button>}
    </section>

    {/* ประวัติ */}
    <section className="repair-time-card">
      <h2>📜 ประวัติการเสนอเวลา</h2>

      <div className="time-history">
        <strong>ยังไม่มีการเสนอเวลา</strong>
        <p>เมื่อมีการเสนอเวลา ระบบจะแสดงประวัติไว้ที่นี่</p>
      </div>
    </section>

    <button
      className="back-button"
      onClick={() => setPage("repair-assignment")}
    >
      ← กลับหน้ารับผิดชอบงาน
    </button>

    <footer>ART Maintenance System</footer>

  </main>
  );
}
