import type { AppPageContext } from "./pageContext";

type RepairAssignmentPageProps = Pick<AppPageContext, "addAuditLog" | "auditLogs" | "canRepair" | "departmentName" | "getRequesterName" | "personName" | "repairData" | "repairImagesError" | "selectedDepartment" | "setPage" | "setPreviewImage" | "setRepairData" | "setRepairs" | "userId" | "users">;

// Page "repair-assignment" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairAssignmentPage({ addAuditLog, auditLogs, canRepair, departmentName, getRequesterName, personName, repairData, repairImagesError, selectedDepartment, setPage, setPreviewImage, setRepairData, setRepairs, userId, users }: RepairAssignmentPageProps) {
  return (
<main className="assignment-container">

    <div className="assignment-header">
      <div className="cm-logo">ART</div>

      <h1>รับผิดชอบงานซ่อม</h1>

      <div className="assignment-job-number">
{repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="assignment-status">
        รอรับงาน
      </div>
    </div>

    {/* ข้อมูลงาน */}
    <section className="assignment-card">
      <h2>📋 ข้อมูลงาน</h2>

      <div className="assignment-row">
        <span>แผนก</span>
        <strong>{departmentName(repairData?.department || selectedDepartment)}</strong>
      </div>

      <div className="assignment-row">
        <span>เครื่องจักร</span>
<strong>{repairData?.machineName || "ไม่มีข้อมูลเครื่องจักร"}</strong>
      </div>
      <div className="assignment-row"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>

      <div className="assignment-row">
        <span>อาการ / ปัญหา</span>
  <strong>{repairData?.problemDescription || "ไม่มีข้อมูลอาการเสีย"}</strong>
      </div>
    </section>

    {/* ผู้เกี่ยวข้อง */}
    {/* รูปภาพปัญหา */}
<section className="assignment-card">
  <h2>📷 รูปภาพปัญหา</h2>

  {repairImagesError ? (
    <div className="assignment-no-photo">โหลดรูปภาพไม่สำเร็จ: {repairImagesError}</div>
  ) : repairData?.images?.length > 0 ? (
    <div className="assignment-photo-grid">
      {repairData.images.map((image, index) => (
        <div className="assignment-photo-item" key={index}>
          <button type="button" className="repair-photo-button" onClick={() => setPreviewImage({ src: image, index })} aria-label={`เปิดดูรูปปัญหา ${index + 1}`}>
            <img src={image} alt={`รูปปัญหา ${index + 1}`} />
          </button>
          <p>รูปที่ {index + 1}</p>
        </div>
      ))}
    </div>
  ) : (
    <div className="assignment-no-photo">
      ไม่มีรูปภาพแนบมา
    </div>
  )}
</section>
    <section className="assignment-card">
      <h2>👥 ผู้เกี่ยวข้อง</h2>

      <div className="assignment-row">
        <span>ผู้แจ้งซ่อม</span>
        <strong>{getRequesterName(repairData)}</strong>
      </div>

      <div className="assignment-row">
        <span>ผู้อนุมัติของงาน</span>
        <strong>{personName(repairData?.approvedBy, "รออนุมัติ")}</strong>
      </div>

      <div className="assignment-row">
        <span>ผู้รับผิดชอบปัจจุบัน</span>
        <strong>{personName(repairData?.acceptedBy, "รอรับงาน")}</strong>
      </div>
    </section>
    <section className="assignment-card">
  <h2>ประวัติการดำเนินงาน</h2>

  {auditLogs.filter((log) => log.repairId === repairData?.id).length === 0 ? (
    <p>ยังไม่มีประวัติการดำเนินงาน</p>
  ) : (
    auditLogs
      .filter((log) => log.repairId === repairData?.id)
      .map((log) => (
        <div className="assignment-row" key={log.id}>
          <div>
            <strong>{log.action}</strong>
            <p>{log.details}</p>
            <small>
  ผู้ดำเนินการ: {users.find((item) => item.userId?.toLocaleLowerCase() === log.user?.toLocaleLowerCase())?.name || log.user || "ไม่ระบุ"} |{" "}
  {new Date(log.timestamp).toLocaleString("th-TH")}
</small>
          </div>
        </div>
      ))
  )}
</section>

    {/* การรับงาน */}
    <section className="assignment-card">
      <h2>🔧 การรับงาน</h2>

      <p className="assignment-note">
        กรุณารับงาน หากคุณเป็นผู้รับผิดชอบงานซ่อมนี้
      </p>


      <div className="assignment-buttons">

    {canRepair && <button
  className="accept-job-button"
  onClick={() => {
 const updatedRepair = {
  ...repairData,
  status: "รอเสนอเวลาซ่อม",
  acceptedBy: userId,
  acceptedAt: new Date().toISOString(),

};

    setRepairs((prev) =>
      prev.map((item) =>
        item.id === repairData?.id ? updatedRepair : item
      )
    );
    addAuditLog(
  repairData.id,
  "รับงานซ่อม",
  `ผู้รับงาน ${userId || "admin"} รับงานซ่อม`
);

    setRepairData(updatedRepair);
    setPage("repair-time");
  }}
>
  ✓ รับงาน
</button>}

  

      </div>
    </section>

    <button
      className="back-button"
      onClick={() => setPage("repair-assignment-list")}
    >
      ← กลับคิวรอรับงาน
    </button>

    <footer>ART Maintenance System</footer>

  </main>
  );
}
