import { formatThaiDateTime } from "../lib/format";
import type { AppPageContext } from "./pageContext";

type SystemRecoveryPageProps = Pick<AppPageContext, "backupBusy" | "backupMessage" | "deletedRepairs" | "handleCreateBackup" | "handleRestoreDeleted" | "setPage">;

// Page "system-recovery" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function SystemRecoveryPage({ backupBusy, backupMessage, deletedRepairs, handleCreateBackup, handleRestoreDeleted, setPage }: SystemRecoveryPageProps) {
  return (
<section className="user-management-container">
        <div className="user-management-header">
      <div className="cm-logo">ART</div>
      <h1>💾 สำรองข้อมูลและกู้คืนงาน</h1>
      <p>จัดการสำเนาฐานข้อมูลและกู้คืนเฉพาะงานแจ้งซ่อมที่ลบไป</p>
    </div>
<section className="admin-backup-card">
      <div>
        <h2>สำรองข้อมูลระบบ</h2>
        <p>กด "สำรองข้อมูลตอนนี้" เพื่อสร้างสำเนาฐานข้อมูลไว้บนเซิร์ฟเวอร์ (เก็บสำเนา 30 วัน) การสำรองอัตโนมัติเปิดหรือปิดได้ที่ค่า AUTO_BACKUP ของเซิร์ฟเวอร์</p>
      </div>
      <button className="main-menu-button" type="button" onClick={handleCreateBackup} disabled={backupBusy}>
        {backupBusy ? "กำลังสำรองข้อมูล…" : "สำรองข้อมูลตอนนี้"}
      </button>
      {backupMessage && <p className="admin-backup-message" role="status">{backupMessage}</p>}
    </section>

    <section className="user-management-card admin-recovery-card">
      <h2>งานแจ้งซ่อมที่ลบแล้ว · กู้คืนได้</h2>
      <p className="admin-section-hint">การกู้คืนงานจะนำประวัติการดำเนินงานเดิมกลับมาด้วย</p>
      {deletedRepairs.length === 0 ? <p>ไม่มีงานแจ้งซ่อมที่รอการกู้คืน</p> : deletedRepairs.map((deletedRepair) => (
        <div className="user-management-item" key={`deleted-repair-${deletedRepair.id}`}>
          <div>
            <strong>{deletedRepair.id}</strong>
            <p>{deletedRepair.department} · รหัสเครื่องจักร {deletedRepair.machineCode || "ไม่ระบุ"} · {deletedRepair.machineName || "ไม่ระบุเครื่องจักร"} · {deletedRepair.status || "ไม่ทราบสถานะ"}</p>
            <small>ลบโดย: {deletedRepair.deletedBy || "ไม่ระบุ"} · {formatThaiDateTime(deletedRepair.deletedAt, "ไม่ระบุเวลา")}</small>
          </div>
          <button className="user-permission-edit-button" type="button" onClick={() => handleRestoreDeleted("repair", deletedRepair.id)}>กู้คืนงาน</button>
        </div>
      ))}
    </section>

    <button className="back-button" type="button" onClick={() => setPage("user-management")}>
      ← กลับไปจัดการผู้ใช้
    </button>
  </section>
  );
}
