import { formatThaiDateTime } from "../lib/format";
import type { AppPageContext } from "./pageContext";

type RepairPdfPageProps = Pick<AppPageContext, "getInspectorName" | "getRequesterName" | "repairData" | "repairImagesError" | "setPage" | "visibleReportImages">;

// Page "repair-pdf" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairPdfPage({ getInspectorName, getRequesterName, repairData, repairImagesError, setPage, visibleReportImages }: RepairPdfPageProps) {
  return (
<main className="maintenance-report-print">
    <div className="maintenance-report-top-actions no-print">
      <button className="back-button maintenance-report-back-button" type="button" onClick={() => setPage("completed-list")}>
        ← กลับรายการงานเสร็จ
      </button>
    </div>
    <header className="maintenance-report-header">
      <div className="maintenance-report-topline">
        <div className="maintenance-report-brand">
          <div className="cm-logo">ART</div>
          <div>
            <strong>ART Maintenance System</strong>
            <span>Corrective Maintenance</span>
          </div>
        </div>
        <div className="maintenance-report-state"><span>✓</span> ปิดงานแล้ว</div>
      </div>
      <div className="maintenance-report-title-row">
        <div>
          <span className="maintenance-report-eyebrow">MAINTENANCE SERVICE REPORT</span>
          <h1>รายงานผลการซ่อมบำรุง</h1>
          <p>สรุปผลการดำเนินงานและการตรวจรับ</p>
        </div>
        <div className="maintenance-report-ticket">
          <span>เลขที่ใบงาน</span>
          <strong>{repairData.id}</strong>
        </div>
      </div>
      <div className="maintenance-report-meta-strip">
        <div><span>แผนก</span><strong>{repairData.department || "ไม่ระบุ"}</strong></div>
        <div><span>รหัสเครื่องจักร</span><strong>{repairData.machineCode || "ไม่ระบุ"}</strong></div>
        <div><span>เครื่องจักร</span><strong>{repairData.machineName || "ไม่ระบุ"}</strong></div>
        <div><span>ประเภทงาน</span><strong>{repairData.approvalWorkType || "ไม่ระบุ"}</strong></div>
      </div>
    </header>

    <section className="maintenance-report-section maintenance-report-section-01">
      <h2><span className="maintenance-report-section-no">01</span> ข้อมูลใบแจ้งซ่อม</h2>
      <div className="maintenance-report-grid">
        <div><span>วันที่แจ้ง</span><strong>{formatThaiDateTime(repairData.createdAt, "ไม่ระบุ")}</strong></div>
        <div><span>ผู้แจ้งซ่อม</span><strong>{getRequesterName(repairData)}</strong></div>
        <div><span>รหัสเครื่องจักร</span><strong>{repairData.machineCode || "ไม่ระบุ"}</strong></div>
        <div><span>ชื่อเครื่องจักร</span><strong>{repairData.machineName || "ไม่ระบุ"}</strong></div>
      </div>
      <div className="maintenance-report-description"><span>อาการเสียของเครื่องจักร</span><p>{repairData.problemDescription || "ไม่ระบุ"}</p></div>
    </section>

    <section className="maintenance-report-section maintenance-report-section-02">
      <h2><span className="maintenance-report-section-no">02</span> การดำเนินงานซ่อม</h2>
      <div className="maintenance-report-grid">
        <div><span>ผู้อนุมัติ</span><strong>{repairData.approvedBy || "ไม่ระบุ"}</strong></div>
        <div><span>วันที่ / เวลาอนุมัติ</span><strong>{formatThaiDateTime(repairData.approvedAt, "ไม่ระบุ")}</strong></div>
        <div><span>ผู้รับงานซ่อม</span><strong>{repairData.acceptedBy || "ไม่ระบุ"}</strong></div>
        <div><span>วันที่ / เวลารับงาน</span><strong>{formatThaiDateTime(repairData.acceptedAt, "ไม่ระบุ")}</strong></div>
        <div><span>ผู้ตรวจเช็กงาน</span><strong>{getInspectorName(repairData)}</strong></div>
        <div><span>วันที่ / เวลาตรวจเช็ก</span><strong>{formatThaiDateTime(repairData.inspectedAt, "ไม่ระบุ")}</strong></div>
        <div><span>เวลาเริ่มงาน</span><strong>{repairData.repairStartedAt ? new Date(repairData.repairStartedAt).toLocaleString("th-TH") : formatThaiDateTime(repairData.startTime, "ไม่ระบุ")}</strong></div>
        <div><span>เวลาจบงาน</span><strong>{formatThaiDateTime(repairData.repairCompletedAt, "ไม่ระบุ")}</strong></div>
        <div><span>ระยะเวลาตั้งแต่แจ้งซ่อมจนจบงาน</span><strong>{(() => {
          const startedAt = repairData.createdAt ? new Date(repairData.createdAt).getTime() : NaN;
          const completedAt = repairData.repairCompletedAt || repairData.inspectedAt;
          const endedAt = completedAt ? new Date(completedAt).getTime() : NaN;
          if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) return "ไม่ระบุ";
          const totalMinutes = Math.floor((endedAt - startedAt) / 60000);
          const days = Math.floor(totalMinutes / 1440);
          const hours = Math.floor((totalMinutes % 1440) / 60);
          const minutes = totalMinutes % 60;
          return [days ? `${days} วัน` : "", hours ? `${hours} ชั่วโมง` : "", `${minutes} นาที`].filter(Boolean).join(" ");
        })()}</strong></div>
      </div>
    </section>

    <section className="maintenance-report-section maintenance-report-section-03">
      <h2><span className="maintenance-report-section-no">03</span> ประวัติการซ่อม</h2>
      <div className="maintenance-report-description"><span>รายละเอียดการซ่อม</span><p>{repairData.repairWorkDetails || "ไม่มีรายละเอียดบันทึกไว้"}</p></div>
      <div className="maintenance-report-description"><span>หมายเหตุเพิ่มเติม</span><p>{repairData.repairWorkNotes || "ไม่มีหมายเหตุเพิ่มเติม"}</p></div>
    </section>

    <section className="maintenance-report-section maintenance-report-images">
      <h2><span className="maintenance-report-section-no">04</span> ภาพประกอบการซ่อม</h2>
      {repairImagesError ? <p className="maintenance-report-empty">โหลดภาพประกอบไม่สำเร็จ: {repairImagesError}</p> : visibleReportImages.length > 0 ? (
        <div>{visibleReportImages.map((image, index) => <figure key={index}><img src={image} alt={`ภาพประกอบงาน ${index + 1}`} /><figcaption>ภาพที่ {index + 1}</figcaption></figure>)}</div>
      ) : <p className="maintenance-report-empty">ไม่มีภาพแนบสำหรับงานนี้</p>}
      {(repairData.images || []).length > visibleReportImages.length && <small className="maintenance-report-note">แสดง 8 ภาพแรก · ดูภาพเพิ่มเติมได้ในระบบ</small>}
    </section>

    <section className="maintenance-report-section maintenance-report-section-05 maintenance-report-signature">
      <h2><span className="maintenance-report-section-no">05</span> ลายเซ็นวิศวกร</h2>
      <div className="maintenance-report-signature-line">
        <span>ลงชื่อ</span><i></i><span>วิศวกร (ระดับวิศวกรขึ้นไป)</span>
      </div>
    </section>

    <div className="maintenance-report-actions no-print">
      <p>ในหน้าต่างพิมพ์ เลือกปลายทางเป็น “บันทึกเป็น PDF” เพื่อดาวน์โหลดเอกสาร</p>
      <button className="main-menu-button" type="button" onClick={() => window.print()}>เปิดหน้าต่างบันทึก PDF อีกครั้ง</button>
    </div>
  </main>
  );
}
