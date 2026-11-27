import { formatThaiDateTime } from "../lib/format";
import type { AppPageContext } from "./pageContext";

type UserHistoryPageProps = Pick<AppPageContext, "deletedUsers" | "handleRestoreDeleted" | "setPage" | "userLifecycleLogs">;

// Page "user-history" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function UserHistoryPage({ deletedUsers, handleRestoreDeleted, setPage, userLifecycleLogs }: UserHistoryPageProps) {
  return (
<section className="user-management-container">
    <div className="user-management-header">
      <div className="cm-logo">ART</div>
      <h1>📋 ประวัติเพิ่ม-ลบผู้ใช้</h1>
      <p>แสดงเฉพาะการเพิ่ม ลบ และกู้คืนบัญชีผู้ใช้ แยกจากหน้าจัดการผู้ใช้</p>
    </div>

    <section className="user-management-card admin-user-history-card">
      <h2>รายการล่าสุด</h2>
      {userLifecycleLogs.length === 0 ? (
        <div className="approval-empty">
          <h2>ยังไม่มีประวัติผู้ใช้</h2>
          <p>เมื่อมีการเพิ่ม ลบ หรือกู้คืนผู้ใช้ ระบบจะแสดงรายการไว้ที่นี่</p>
        </div>
      ) : (
        <div className="admin-user-history-list">
          {userLifecycleLogs.slice(0, 100).map((log) => (
            <article className={`admin-user-history-entry ${log.action === "ลบผู้ใช้" ? "deleted" : ""}`} key={log.id}>
              <div className="admin-user-history-entry-heading">
                <strong>{log.action}</strong>
                <span>{log.targetId}</span>
              </div>
              <p>{log.details || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
              <small>ดำเนินการโดย {log.actor || "ไม่ระบุ"} · {formatThaiDateTime(log.occurredAt, "ไม่ระบุเวลา")}</small>
            </article>
          ))}
        </div>
      )}
    </section>

    <section className="user-management-card admin-user-history-card">
      <h2>ผู้ใช้ที่ลบแล้ว · กู้คืนได้</h2>
      {deletedUsers.length === 0 ? <p>ไม่มีบัญชีผู้ใช้ที่รอการกู้คืน</p> : (
        <div className="admin-user-history-list">
          {deletedUsers.map((deletedUser) => (
            <article className="admin-user-history-entry deleted" key={`deleted-user-${deletedUser.userId}`}>
              <div className="admin-user-history-entry-heading">
                <strong>{deletedUser.name}</strong>
                <span>{deletedUser.userId}</span>
              </div>
              <p>บัญชีถูกปิดใช้งาน · กู้คืนแล้วผู้ใช้จะเข้าสู่ระบบได้อีกครั้ง</p>
              <button className="user-permission-edit-button" type="button" onClick={() => handleRestoreDeleted("user", deletedUser.userId)}>
                กู้คืนผู้ใช้
              </button>
            </article>
          ))}
        </div>
      )}
    </section>

    <button className="back-button" type="button" onClick={() => setPage("user-management")}>
      ← กลับไปจัดการผู้ใช้
    </button>
  </section>
  );
}
