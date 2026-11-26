import { formatThaiDateTime } from "../lib/format";
import type { RepairRecord } from "../types";

// Overdue repairs for the selected department.
// Pattern for moving the other pages out of App.tsx: the page receives the data
// it shows and callbacks for navigation; it owns no shared state.
interface NotificationsPageProps {
  departmentLabel: string;
  overdueRepairs: RepairRecord[];
  onOpenRepair: (repair: RepairRecord) => void;
  onBack: () => void;
}

export default function NotificationsPage({ departmentLabel, overdueRepairs, onOpenRepair, onBack }: NotificationsPageProps) {
  return (
    <section className="notifications-container">
      <div className="notifications-header">
        <div className="cm-logo">ART</div>
        <h1>🔔 การแจ้งเตือน</h1>
        <p>แผนก {departmentLabel} · งานที่เกินกำหนดยังคงอยู่ในสถานะกำลังซ่อม และจะหายจากรายการนี้เมื่อปิดงานแล้ว</p>
      </div>

      <div className="notifications-list">
        {overdueRepairs.length === 0 ? (
          <div className="notification-empty">
            <h2>ไม่มีการแจ้งเตือน</h2>
            <p>ขณะนี้ไม่มีงานที่เกินกำหนด</p>
          </div>
        ) : (
          overdueRepairs.map((repair) => (
            <div className="notification-item" key={repair.id} onClick={() => onOpenRepair(repair)}>
              <h2>🔴 งานเกินกำหนด</h2>
              <p><strong>เลขที่:</strong> {repair.id}</p>
              <p><strong>เครื่องจักร:</strong> {repair.machineName || "ไม่พบข้อมูล"}</p>
              <p><strong>รหัสเครื่องจักร:</strong> {repair.machineCode || "ไม่ระบุ"}</p>
              <p><strong>แผนก:</strong> {repair.department || "ไม่พบข้อมูล"}</p>
              {/* Was the raw input value ("2026-11-25T15:40"); now a Thai date like the rest of the app. */}
              <p><strong>กำหนดเสร็จ:</strong> {formatThaiDateTime(repair.dueTime, "ไม่ระบุ")}</p>
              <div className="notification-status">งานเกินกำหนด</div>
            </div>
          ))
        )}
      </div>

      <button className="back-button" onClick={onBack}>
        ← กลับหน้าหลัก
      </button>
    </section>
  );
}
