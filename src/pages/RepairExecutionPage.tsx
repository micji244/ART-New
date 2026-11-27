import type { AppPageContext } from "./pageContext";

type RepairExecutionPageProps = Pick<AppPageContext, "calculateDuration" | "canRepair" | "dueTime" | "isSavingRepairStep" | "personName" | "repairData" | "repairWorkDetails" | "repairWorkNotes" | "saveRepairStep" | "selectedDepartment" | "setPage" | "setRepairWorkDetails" | "setRepairWorkNotes" | "startTime" | "userId">;

// Page "repair-execution" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairExecutionPage({ calculateDuration, canRepair, dueTime, isSavingRepairStep, personName, repairData, repairWorkDetails, repairWorkNotes, saveRepairStep, selectedDepartment, setPage, setRepairWorkDetails, setRepairWorkNotes, startTime, userId }: RepairExecutionPageProps) {
  return (
<main className="repair-execution-container">

    <div className="repair-execution-header">
      <div className="cm-logo">ART</div>

      <h1>กำลังซ่อม</h1>

      <div className="repair-execution-job-number">
    {repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="repair-execution-status">
        🔧 กำลังซ่อม
      </div>
    </div>

    <section className="repair-execution-card">
      <h2>🔧 รายละเอียดงานซ่อม</h2>

      <div className="execution-info">
        <span>แผนก</span>
        <strong>{selectedDepartment || "Agg1"}</strong>
      </div>

      <div className="execution-info">
        <span>เครื่องจักร / อุปกรณ์</span>
      <strong>{repairData?.machineName || "ไม่พบข้อมูล"}</strong>
      </div>
      <div className="execution-info"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>

      <div className="execution-info">
        <span>อาการเสีย</span>
    <strong>{repairData?.problemDescription || "ไม่พบข้อมูล"}</strong>
      </div>
    </section>

    <section className="repair-execution-card">
      <h2>👨‍🔧 ผู้รับผิดชอบ</h2>

      <div className="execution-info">
        <span>ผู้รับผิดชอบงาน</span>
        <strong>{personName(repairData?.acceptedBy)}</strong>
      </div>

      <div className="execution-info">
        <span>ผู้อนุมัติงาน</span>
        <strong>{personName(repairData?.approvedBy)}</strong>
      </div>
    </section>

    <section className="repair-execution-card">
      <h2>🕐 กำหนดเวลาซ่อม</h2>

      {/* Use the saved times. The local inputs are only filled on the device that proposed them. */}
      <div className="execution-time-box">
        <span>เริ่มซ่อม</span>
        <strong>
          {(repairData?.startTime || startTime)
            ? new Date(repairData?.startTime || startTime).toLocaleString("th-TH")
            : "ยังไม่ได้ระบุ"}
        </strong>
      </div>

      <div className="execution-time-box">
        <span>คาดว่าจะเสร็จ</span>
        <strong>
          {(repairData?.dueTime || dueTime)
            ? new Date(repairData?.dueTime || dueTime).toLocaleString("th-TH")
            : "ยังไม่ได้ระบุ"}
        </strong>
      </div>

      <div className="execution-duration-box">
        <span>ระยะเวลาซ่อม</span>
        <strong>{repairData?.proposedDuration || calculateDuration()}</strong>
      </div>
    </section>

    <section className="repair-execution-card">
      <h2>📝 การดำเนินงาน</h2>

      <label className="execution-label">
        รายละเอียดการซ่อม
      </label>

      <textarea
        className="execution-textarea"
        value={repairWorkDetails}
        onChange={(event) => setRepairWorkDetails(event.target.value)}
        placeholder="บันทึกรายละเอียดการซ่อม..."
      />

      <label className="execution-label">
        หมายเหตุเพิ่มเติม *
      </label>

      <textarea
        className="execution-textarea"
        value={repairWorkNotes}
        onChange={(event) => setRepairWorkNotes(event.target.value)}
        placeholder="กรอกหมายเหตุเพิ่มเติมก่อนส่งตรวจงาน"
        required
        aria-required="true"
      />
    </section>

    {canRepair && <button
      className="complete-repair-button"
      disabled={isSavingRepairStep}
      onClick={async () => {
  if (!repairWorkDetails.trim()) {
    alert("กรุณาบันทึกรายละเอียดการซ่อมก่อนส่งตรวจงาน");
    return;
  }
  if (!repairWorkNotes.trim()) {
    alert("กรุณาระบุหมายเหตุเพิ่มเติมก่อนส่งตรวจงาน");
    return;
  }
  const updatedRepair = {
    ...repairData,
    repairWorkDetails: repairWorkDetails.trim(),
    repairWorkNotes: repairWorkNotes.trim(),
    status: "รอตรวจงาน",
    repairCompletedAt: new Date().toISOString(),
  };
  const saved = await saveRepairStep(
    updatedRepair,
    "ส่งตรวจงาน",
    `แจ้งซ่อมเสร็จโดย ${userId || "admin"} และส่งงานให้ตรวจ`
  );
  if (saved) setPage("inspection");
}}
    >
      {isSavingRepairStep ? "กำลังบันทึกและส่งตรวจ…" : "✓ แจ้งซ่อมเสร็จ / ส่งตรวจงาน"}
    </button>}

    <button
      className="back-button"
      onClick={() => setPage("repair-time-review")}
    >
      ← กลับหน้าตรวจสอบเวลาซ่อม
    </button>

    <footer>ART Maintenance System</footer>

  </main>
  );
}
