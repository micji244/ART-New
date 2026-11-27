import { getRepairUrgencyInfo } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type RepairsPageProps = Pick<AppPageContext, "departmentName" | "filteredRepairHistory" | "repairDateFrom" | "repairDateTo" | "repairDepartmentFilter" | "repairSearchTerm" | "selectedDepartment" | "setPage" | "setRepairData" | "setRepairDateFrom" | "setRepairDateTo" | "setRepairDepartmentFilter" | "setRepairSearchTerm" | "visibleRepairDepartments">;

// Page "repairs" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairsPage({ departmentName, filteredRepairHistory, repairDateFrom, repairDateTo, repairDepartmentFilter, repairSearchTerm, selectedDepartment, setPage, setRepairData, setRepairDateFrom, setRepairDateTo, setRepairDepartmentFilter, setRepairSearchTerm, visibleRepairDepartments }: RepairsPageProps) {
  return (
<main className="repairs-container">
    <div className="repairs-header">
      <div className="cm-logo">ART</div>

      <h1>งานแจ้งซ่อมทั้งหมด</h1>

      <p>
        แผนก: <strong>{departmentName(selectedDepartment)}</strong>
      </p>
    </div>

    <div className="repair-search repair-history-filters">
      <input type="search" value={repairSearchTerm}
        onChange={(event) => setRepairSearchTerm(event.target.value)}
        placeholder="ค้นหาเลขงาน รหัส หรือชื่อเครื่องจักร"
        aria-label="ค้นหาเลขงาน รหัสเครื่องจักร หรือชื่อเครื่องจักร" />
      <select value={repairDepartmentFilter || selectedDepartment}
        onChange={(event) => setRepairDepartmentFilter(event.target.value)} aria-label="กรองตามแผนก">
        {visibleRepairDepartments.map((department) => <option key={department} value={departmentName(department)}>{departmentName(department)}</option>)}
      </select>
      <label>ตั้งแต่ <input type="date" value={repairDateFrom} onChange={(event) => setRepairDateFrom(event.target.value)} /></label>
      <label>ถึง <input type="date" value={repairDateTo} onChange={(event) => setRepairDateTo(event.target.value)} /></label>
      <button type="button" className="back-button" onClick={() => {
        setRepairSearchTerm(""); setRepairDepartmentFilter(selectedDepartment);
        setRepairDateFrom(""); setRepairDateTo("");
      }}>ล้างตัวกรอง</button>
      <span className="repair-history-count">พบ {filteredRepairHistory.length} งาน</span>
    </div>

    <div className="repair-list">

   {filteredRepairHistory.length === 0 ? (
     <div className="no-repair">
       ไม่พบงานตามเงื่อนไขที่เลือก
     </div>
   ) : filteredRepairHistory.map((repair) => (
  <div className="repair-card" key={repair.id}>
    <div className="repair-card-top">
      <strong>{repair.id}</strong>

      <span className="repair-status waiting">
        {repair.status}
      </span>
    </div>

    <div className={`repair-urgency-badge ${getRepairUrgencyInfo(repair.urgency).color}`}>
      {getRepairUrgencyInfo(repair.urgency).icon} {getRepairUrgencyInfo(repair.urgency).label}
    </div>

    <h2>{repair.machineName || "ไม่มีข้อมูลเครื่องจักร"}</h2>
      {repair.machineCode && <p><strong>รหัสเครื่องจักร:</strong> {repair.machineCode}</p>}

    <p>
      อาการ: {repair.problemDescription || "ไม่มีข้อมูลอาการเสีย"}
    </p>

    <p>
      ผู้แจ้ง: <strong>{repair.requester}</strong>
    </p>

      <p>ผู้รับผิดชอบ: <span>{repair.acceptedBy || "รอมอบหมาย"}</span></p>

    <button
      className="repair-detail-button"
      onClick={() => {
        setRepairData(repair);
        setPage("repair-detail");
      }}
    >
      ดูรายละเอียดงาน
    </button>
  </div>
))}
    </div>

    <button
      className="repair-new-button"
      onClick={() => setPage("new-repair")}
    >
      ＋ แจ้งซ่อมใหม่
    </button>

    <button
      className="back-button"
      onClick={() => setPage("department-home")}
    >
      ← กลับหน้าหลักแผนก
    </button>

    
    <footer>ART Maintenance System</footer>
  </main>
  );
}
