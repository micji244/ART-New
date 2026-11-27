import { formatThaiDateTime } from "../lib/format";
import type { AppPageContext } from "./pageContext";

type RepairDetailPageProps = Pick<AppPageContext, "departmentName" | "getInspectorName" | "getRequesterName" | "handleDeleteRepair" | "isAdmin" | "personName" | "repairData" | "repairImagesError" | "selectedDepartment" | "setPage" | "setPreviewImage">;

// Page "repair-detail" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairDetailPage({ departmentName, getInspectorName, getRequesterName, handleDeleteRepair, isAdmin, personName, repairData, repairImagesError, selectedDepartment, setPage, setPreviewImage }: RepairDetailPageProps) {
  return (
<main className="repair-detail-container">

    <div className="repair-detail-header">
      <div className="cm-logo">ART</div>

      <h1>รายละเอียดงานแจ้งซ่อม</h1>

      <div className="job-number">
    {repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="detail-status">
  {repairData?.status || "ไม่ทราบสถานะ"}
</div>
      {repairData?.status === "ไม่อนุมัติ" && repairData?.approvalRejectReason && (
        <p className="detail-rejection-reason"><strong>เหตุผลที่ไม่อนุมัติ:</strong> {repairData.approvalRejectReason}</p>
      )}
    </div>

    {/* ข้อมูลงาน */}
    <section className="detail-card">
      <h2>📋 ข้อมูลงาน</h2>

      <div className="detail-row">
        <span>แผนก</span>
        <strong>{departmentName(selectedDepartment)}</strong>
      </div>

      <div className="detail-row">
        <span>รหัสเครื่องจักร</span>
        <strong>{repairData?.machineCode || "ยังไม่มีข้อมูลรหัสเครื่องจักร"}</strong>
      </div>

      <div className="detail-row">
        <span>เครื่องจักร</span>
        <strong>{repairData?.machineName || "ยังไม่มีข้อมูลเครื่องจักร"}</strong>
      </div>

      <div className="detail-row">
        <span>อาการ / ปัญหา</span>
        <strong>{repairData?.problemDescription || "ยังไม่มีข้อมูลอาการเสีย"}</strong>
      </div>

      {repairData?.approvalWorkType && <div className="detail-row">
        <span>ประเภทงานที่อนุมัติ</span>
        <strong>{repairData.approvalWorkType}</strong>
      </div>}
    </section>
  <div className="detail-row inspection-info">
  <span>ผู้ตรวจงาน</span>
  <strong>
    {repairData?.inspectedBy ? getInspectorName(repairData) : "ยังไม่มีข้อมูล"}
  </strong>
</div>

<div className="detail-row inspection-info">
  <span>วันที่/เวลาจบงาน</span>
  <strong>
    {formatThaiDateTime(repairData?.inspectedAt, "ยังไม่มีข้อมูล")}
  </strong>
</div>

    {/* รูปภาพ */}
    <section className="detail-card">
      <h2>📷 รูปภาพปัญหา</h2>

<div className="photo-placeholder">
  {repairImagesError ? (
    `โหลดรูปภาพไม่สำเร็จ: ${repairImagesError}`
  ) : repairData?.images?.length > 0 ? (
    <div className="repair-photo-grid">
      {repairData.images.map((image, index) => (
        <button type="button" key={index} className="repair-photo-button repair-detail-photo-button" onClick={() => setPreviewImage({ src: image, index })} aria-label={`เปิดดูรูปอาการเสีย ${index + 1}`}>
          <img src={image} alt={`รูปอาการเสีย ${index + 1}`} className="repair-detail-image" />
        </button>
      ))}
    </div>
  ) : (
    "ยังไม่มีรูปภาพ"
  )}
</div>
</section>

    {/* ผู้เกี่ยวข้อง */}
    <section className="detail-card">
      <h2>👥 ผู้เกี่ยวข้อง</h2>

      <div className="detail-row">
        <span>ผู้แจ้งซ่อม</span>
        <strong>{getRequesterName(repairData)}</strong>
      </div>

      <div className="detail-row">
        <span>ผู้อนุมัติ</span>
        <strong>{personName(repairData?.approvedBy, "รออนุมัติ")}</strong>
      </div>

      <div className="detail-row">
        <span>ผู้รับผิดชอบซ่อม</span>
      <strong>{personName(repairData?.acceptedBy, "รอมอบหมาย")}</strong>
      </div>
<div className="detail-row">
  <span>เวลาเริ่มซ่อม</span>
  <strong>
    {formatThaiDateTime(repairData?.startTime, "ยังไม่มีข้อมูล")}
  </strong>
</div>

<div className="detail-row">
  <span>เวลาซ่อมเสร็จ</span>
  <strong>
    {formatThaiDateTime(repairData?.dueTime, "ยังไม่มีข้อมูล")}
  </strong>
</div>

<div className="detail-row">
  <span>ระยะเวลาที่เสนอ</span>
  <strong>
    {repairData?.proposedDuration || "ยังไม่มีข้อมูล"}
  </strong>
</div>
     <div className="detail-row inspection-info">
        <span>ผู้ตรวจงาน</span>
     <strong>{repairData?.inspectedBy ? getInspectorName(repairData) : "ยังไม่มีข้อมูล"}</strong>
      </div>
    </section>

    {/* ประวัติ */}
    <section className="detail-card">
      <h2>🕒 ประวัติการดำเนินงาน</h2>

      {/* Built from the saved record instead of fixed text, so it shows what really happened. */}
      {[
        { label: "แจ้งซ่อม", by: repairData?.requester, at: repairData?.createdAt },
        { label: "อนุมัติงาน", by: repairData?.approvedBy, at: repairData?.approvedAt },
        { label: "รับงานซ่อม", by: repairData?.acceptedBy, at: repairData?.acceptedAt },
        { label: "เสนอเวลาซ่อม", by: repairData?.timeProposedBy, at: repairData?.timeProposedAt },
        { label: "ซ่อมเสร็จ / ส่งตรวจงาน", by: repairData?.acceptedBy, at: repairData?.repairCompletedAt },
        { label: "ตรวจงานผ่าน / จบงาน", by: repairData?.inspectedBy, at: repairData?.inspectedAt },
      ].filter((step) => step.at).map((step) => (
        <div className="timeline-item" key={step.label}>
          <strong>{step.label}</strong>
          <p>โดย: {personName(step.by)}</p>
          <p>{new Date(step.at).toLocaleString("th-TH")}</p>
        </div>
      ))}
      <div className="timeline-item">
        <strong>สถานะปัจจุบัน</strong>
        <p>{repairData?.status || "ไม่ทราบสถานะ"}</p>
      </div>
    </section>

    {isAdmin && (
      <button className="danger-button" type="button" onClick={handleDeleteRepair}>
        ย้ายงานนี้ไปยังรายการที่ลบ
      </button>
    )}

    {repairData?.status === "จบงาน" && (
      <button className="repair-pdf-button" type="button" onClick={() => setPage("repair-pdf")}>
        บันทึก / ดาวน์โหลด PDF
      </button>
    )}

    <button
      className="back-button"
      onClick={() => setPage(repairData?.status === "กำลังซ่อม" ? "notifications" : "repairs")}
    >
      ← กลับหน้าก่อนหน้า
    </button>

    <footer>ART Maintenance System</footer>

  </main>
  );
}
