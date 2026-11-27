import { formatThaiDateTime } from "../lib/format";
import type { AppPageContext } from "./pageContext";

type DepartmentControlHistoryPageProps = Pick<AppPageContext, "departmentControlHistory" | "departmentName" | "selectedDepartment" | "setPage" | "users">;

// Page "department-control-history" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function DepartmentControlHistoryPage({ departmentControlHistory, departmentName, selectedDepartment, setPage, users }: DepartmentControlHistoryPageProps) {
  return (
<main className="department-control-history-page">
    <div className="department-control-history-page-header">
      <div className="cm-logo">ART</div>
      <h1>ประวัติ START / STOP</h1>
      <p>แผนก <strong>{departmentName(selectedDepartment)}</strong></p>
    </div>

    {(() => {
      const history = departmentControlHistory
        .filter((item) => item.department === selectedDepartment)
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const startCount = history.filter((item) => item.status === "start").length;
      const stopCount = history.filter((item) => item.status === "stop").length;
      return (
        <>
          <div className="department-control-history-summary">
            <div><span>รายการทั้งหมด</span><strong>{history.length}</strong></div>
            <div className="start"><span>START</span><strong>{startCount}</strong></div>
            <div className="stop"><span>STOP</span><strong>{stopCount}</strong></div>
          </div>
          {history.length ? (
            <ol className="department-control-history-list">
              {history.map((item) => (
                <li key={item.id}>
                  <span className={`department-control-history-status ${item.status}`}>
                    {item.status === "start" ? "▶ START" : "■ STOP"}
                  </span>
                  <div className="department-control-history-entry">
                    <strong>{users.find((user) => user.userId === item.updatedBy)?.name || item.updatedBy || "ไม่ระบุผู้ดำเนินการ"}</strong>
                    <time dateTime={item.updatedAt}>{formatThaiDateTime(item.updatedAt, "ไม่ระบุเวลา")}</time>
                    {item.reason && <p>เหตุผล: {item.reason}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="department-control-history-empty-card">
              <h2>ยังไม่มีประวัติ</h2>
              <p>เมื่อมีการเปลี่ยนสถานะ START หรือ STOP รายการจะแสดงที่หน้านี้</p>
            </div>
          )}
        </>
      );
    })()}

    <button type="button" className="back-button" onClick={() => setPage("department-home")}>
      ← กลับหน้าหลักแผนก
    </button>
    <footer>ART Maintenance System</footer>
  </main>
  );
}
