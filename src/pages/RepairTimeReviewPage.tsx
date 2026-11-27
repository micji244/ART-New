import { formatThaiDateTime } from "../lib/format";
import type { AppPageContext } from "./pageContext";

type RepairTimeReviewPageProps = Pick<AppPageContext, "addAuditLog" | "canRepair" | "personName" | "repairData" | "selectedDepartment" | "setPage" | "setRepairData" | "setRepairs" | "userId">;

// Page "repair-time-review" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairTimeReviewPage({ addAuditLog, canRepair, personName, repairData, selectedDepartment, setPage, setRepairData, setRepairs, userId }: RepairTimeReviewPageProps) {
  return (
<main className="repair-time-review-container">

    <div className="repair-time-review-header">
      <div className="cm-logo">ART</div>
      <h1>ตรวจสอบเวลาซ่อม</h1>

      <div className="repair-time-review-job-number">
  {repairData?.id || "ไม่พบเลขงาน"}
      </div>

 <div className="repair-time-review-status">
  รอซ่อม
</div>
    </div>

    <section className="repair-time-review-card">
      <h2>🔧 รายละเอียดงานซ่อม</h2>

      <div className="review-info">
        <span>แผนก</span>
        <strong>{selectedDepartment || "Agg1"}</strong>
      </div>

      <div className="review-info">
        <span>เครื่องจักร / อุปกรณ์</span>
   <strong>{repairData?.machineName || "ไม่มีข้อมูลเครื่องจักร"}</strong>
      </div>
      <div className="review-info"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>

      <div className="review-info">
        <span>อาการเสีย</span>
<strong>{repairData?.problemDescription || "ไม่มีข้อมูลอาการเสีย"}</strong>
      </div>
    </section>

    <section className="repair-time-review-card">
      <h2>👨‍🔧 ผู้รับผิดชอบ</h2>

      <div className="review-info">
        <span>ผู้เสนอเวลาซ่อม</span>
        <strong>{personName(repairData?.timeProposedBy || repairData?.acceptedBy, "ยังไม่ได้ระบุ")}</strong>
      </div>
    </section>

    <section className="repair-time-review-card">
      <h2>🕐 เวลาซ่อมที่เสนอ</h2>

      <div className="review-time-box">
        <span>วันและเวลาเริ่มซ่อม</span>
        <strong>
{formatThaiDateTime(repairData?.startTime, "ยังไม่ได้ระบุ")}
        </strong>
      </div>

      <div className="review-time-box">
        <span>วันและเวลาคาดว่าจะเสร็จ</span>
        <strong>
   {formatThaiDateTime(repairData?.dueTime, "ยังไม่ได้ระบุ")}
        </strong>
      </div>

      <div className="review-duration-box">
        <span>ระยะเวลาซ่อม</span>
   <strong>{repairData?.proposedDuration || "ยังไม่ได้ระบุ"}</strong>
      </div>
    </section>
{canRepair && <button
  className="start-repair-button"
  onClick={() => {
    const updatedRepair = {
      ...repairData,
      status: "กำลังซ่อม",
      repairStartedAt: new Date().toISOString(),
    };

    setRepairs((prev) =>
      prev.map((item) =>
        item.id === repairData?.id ? updatedRepair : item
      )
    );
    addAuditLog(
  repairData.id,
  "เริ่มซ่อม",
  `เริ่มซ่อมโดย ${userId || "admin"}`
);

    setRepairData(updatedRepair);
    setPage("repair-execution");
  }}
>
  🔧 เริ่มซ่อม
</button>}
    <button
      className="back-button"
      onClick={() => setPage("repair-time")}
    >
      ← กลับไปหน้าเสนอเวลาซ่อม
    </button>

    <footer>ART Maintenance System</footer>

  </main>
  );
}
