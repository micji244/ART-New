import StatusCard from "../components/StatusCard";
import type { AppPageContext } from "./pageContext";

type DepartmentHomePageProps = Pick<AppPageContext, "canRequestRepair" | "canSetDepartmentStatus" | "countDepartmentRepairs" | "departmentControls" | "departmentName" | "handleSetDepartmentControl" | "isDepartmentActive" | "overdueRepairs" | "rejectedHistoryRepairs" | "selectedDepartment" | "setAssignmentQueueAllDepartments" | "setPage" | "setRepairDateFrom" | "setRepairDateTo" | "setRepairDepartmentFilter" | "setRepairSearchTerm" | "visibleRepairDepartments">;

// Page "department-home" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function DepartmentHomePage({ canRequestRepair, canSetDepartmentStatus, countDepartmentRepairs, departmentControls, departmentName, handleSetDepartmentControl, isDepartmentActive, overdueRepairs, rejectedHistoryRepairs, selectedDepartment, setAssignmentQueueAllDepartments, setPage, setRepairDateFrom, setRepairDateTo, setRepairDepartmentFilter, setRepairSearchTerm, visibleRepairDepartments }: DepartmentHomePageProps) {
  return (
<main className="department-home-container">
    <section className="department-control-card" aria-label="สถานะการทำงานของแผนก">
      <h2>สถานะเครื่องจักร/การผลิต: {departmentName(selectedDepartment)}</h2>
      {departmentControls[selectedDepartment] ? (
        <p className={`department-control-current ${departmentControls[selectedDepartment].status}`}>
          สถานะปัจจุบัน: <strong>{departmentControls[selectedDepartment].status === "start" ? "START" : "STOP"}</strong>
          {departmentControls[selectedDepartment].updatedBy && <> · อัปเดตโดย {departmentControls[selectedDepartment].updatedBy}</>}
        </p>
      ) : <p className="department-control-current">ยังไม่มีการตั้งสถานะ</p>}
      {canSetDepartmentStatus && (
        <div className="department-control-actions">
          <button type="button" className={`department-control-button start ${departmentControls[selectedDepartment]?.status === "start" ? "active" : ""}`} onClick={() => handleSetDepartmentControl("start")}>▶ START</button>
          <button type="button" className={`department-control-button stop ${departmentControls[selectedDepartment]?.status === "stop" ? "active" : ""}`} onClick={() => handleSetDepartmentControl("stop")}>■ STOP</button>
        </div>
      )}
      <button
        type="button"
        className="department-control-history-link"
        onClick={() => setPage("department-control-history")}
      >
        ดูประวัติ START / STOP ทั้งหมด
      </button>
    </section>

    <div className="repair-section">

      <h2>งานแจ้งซ่อม</h2>

      {canRequestRepair && isDepartmentActive(selectedDepartment) && <button
        className="repair-new-button repair-new-button-prominent"
        onClick={() => setPage("new-repair")}
      >
        <span className="repair-new-button-icon" aria-hidden="true">＋</span>
        <span className="repair-new-button-copy">
          <strong>แจ้งซ่อมใหม่</strong>
          <small>สร้างรายการแจ้งซ่อม</small>
        </span>
        <span className="repair-new-button-action">เริ่มแจ้งซ่อม <span aria-hidden="true">→</span></span>
      </button>}

      <div className="status-grid">
        <StatusCard tone="waiting" icon="🟡" label="รออนุมัติ" count={countDepartmentRepairs("รออนุมัติ")} onOpen={() => setPage("approval-list")} />
        <StatusCard tone="not-approved" icon="🔴" label="ไม่อนุมัติงาน" count={rejectedHistoryRepairs.length} onOpen={() => setPage("approval-rejected-list")} />
        <StatusCard tone="waiting-assignment" icon="🟢" label="รอรับงาน" count={countDepartmentRepairs("รอรับงาน")} onOpen={() => { setAssignmentQueueAllDepartments(false); setPage("repair-assignment-list"); }} />
        <StatusCard tone="repairing" icon="🔵" label="กำลังซ่อม" count={countDepartmentRepairs("กำลังซ่อม")} onOpen={() => setPage("repairing-list")} />
        <StatusCard tone="time-proposal" icon="🟣" label="รอเสนอเวลาซ่อม" count={countDepartmentRepairs("รอเสนอเวลาซ่อม")} onOpen={() => setPage("repair-time-list")} />
        <StatusCard tone="inspection" icon="🟠" label="รอตรวจงาน" count={countDepartmentRepairs("รอตรวจงาน")} onOpen={() => setPage("inspection-list")} />
        <StatusCard tone="completed" icon="🟢" label="งานเสร็จแล้ว" count={countDepartmentRepairs("จบงาน")} onOpen={() => setPage("completed-list")} />
      </div>

      <button
        className="main-menu-button"
        onClick={() => {
          setRepairSearchTerm("");
          setRepairDepartmentFilter(selectedDepartment || visibleRepairDepartments[0] || "");
          setRepairDateFrom("");
          setRepairDateTo("");
          setPage("repairs");
        }}
      >
        🔧 ดูงานแจ้งซ่อมทั้งหมด
      </button>

      <button
        className="main-menu-button notification-button"
        onClick={() => setPage("notifications")}
      >
        🔔 การแจ้งเตือน · งานซ่อมเกินกำหนด {overdueRepairs.length} งาน
      </button>
    </div>

    <button
      className="back-button"
      onClick={() => setPage("department")}
    >
      ← กลับไปเลือกแผนก
    </button>

    <footer>ART Maintenance System</footer>

  </main>
  );
}
