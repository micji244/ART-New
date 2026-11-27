import type { AppPageContext } from "./pageContext";

type InspectionPageProps = Pick<AppPageContext, "canInspect" | "currentUser" | "departmentName" | "repairData" | "saveRepairStep" | "selectedDepartment" | "setPage" | "userId">;

// Page "inspection" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function InspectionPage({ canInspect, currentUser, departmentName, repairData, saveRepairStep, selectedDepartment, setPage, userId }: InspectionPageProps) {
  return (
<main className="inspection-container">

    <div className="inspection-header">
      <div className="cm-logo">ART</div>
      <h1>ตรวจงานซ่อม</h1>

      <div className="inspection-job-number">
        {repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="inspection-status">
        รอตรวจงาน
      </div>
    </div>

    <section className="inspection-card">
      <h2>📋 ข้อมูลงาน</h2>

      <div className="inspection-info">
        <span>แผนก</span>
        <strong>
          {departmentName(repairData?.department || selectedDepartment)}
        </strong>
      </div>

      <div className="inspection-info">
        <span>เครื่องจักร</span>
        <strong>
          {repairData?.machineName || "ไม่พบข้อมูล"}
        </strong>
      </div>
      <div className="inspection-info"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>

      <div className="inspection-info">
        <span>อาการเสีย</span>
        <strong>
          {repairData?.problemDescription || "ไม่พบข้อมูล"}
        </strong>
      </div>
    </section>

    <section className="inspection-card">
      <h2>🔧 ผลการตรวจงาน</h2>

      {canInspect && <>
      <button
        className="inspection-pass-button"
        onClick={async () => {
          const updatedRepair = {
            ...repairData,
            status: "จบงาน",
            inspectedBy: currentUser?.userId || userId || "ผู้ตรวจงาน",
            inspectedAt: new Date().toISOString(),
          };

          const saved = await saveRepairStep(updatedRepair, "ตรวจงานผ่าน", "ตรวจงานผ่านและปิดงานโดย " + (userId || "admin"));
          if (!saved) return;
          alert("ตรวจงานผ่าน และปิดงานเรียบร้อยแล้ว");
          setPage("repair-pdf");
        }}
      >
        ✓ ผ่านการตรวจงาน / จบงาน
      </button>

      <button
        className="inspection-fail-button"
        onClick={async () => {
          const reason = prompt(
            "กรุณาระบุเหตุผลที่ไม่ผ่านการตรวจงาน"
          );

          if (!reason || !reason.trim()) {
            return;
          }

          const updatedRepair = {
            ...repairData,
            status: "กำลังซ่อม",
            inspectionRejectReason: reason.trim(),
            inspectionRejectedAt: new Date().toISOString(),
            inspectionRejectedBy: userId || "ผู้ตรวจงาน",
          };

          const saved = await saveRepairStep(updatedRepair, "ตรวจงานไม่ผ่าน", "ตรวจงานไม่ผ่านโดย " + (userId || "ผู้ตรวจงาน") + "; ส่งกลับให้ช่างซ่อม; เหตุผล: " + reason.trim());
          if (!saved) return;
          alert("บันทึกผลตรวจไม่ผ่าน และส่งกลับงานซ่อมแล้ว");
          setPage("repair-execution");
        }}
      >
        ✕ ไม่ผ่านการตรวจงาน / ส่งกลับซ่อม
      </button>
      </>}
    </section>

    <button
      className="back-button"
      onClick={() => setPage("department-home")}
    >
      ← กลับหน้าหลัก
    </button>

    <footer>ART Maintenance System</footer>

  </main>
  );
}
