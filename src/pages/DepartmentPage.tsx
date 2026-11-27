import type { AppPageContext } from "./pageContext";

type DepartmentPageProps = Pick<AppPageContext, "canApprove" | "currentUser" | "departmentControls" | "departmentName" | "divisionAssignmentRepairs" | "divisionDepartments" | "divisionName" | "divisionRepairSearchQuery" | "divisionRepairSearchResults" | "divisionRepairSearchTerm" | "handleDepartment" | "isDepartmentActive" | "repairs" | "selectedDepartment" | "selectedDivision" | "setAssignmentQueueAllDepartments" | "setDivisionRepairSearchTerm" | "setPage" | "setRepairAssignmentUnitFilter" | "setRepairAssignmentWorkTypeFilter" | "setRepairData" | "setSelectedDepartment">;

// Page "department" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function DepartmentPage({ canApprove, currentUser, departmentControls, departmentName, divisionAssignmentRepairs, divisionDepartments, divisionName, divisionRepairSearchQuery, divisionRepairSearchResults, divisionRepairSearchTerm, handleDepartment, isDepartmentActive, repairs, selectedDepartment, selectedDivision, setAssignmentQueueAllDepartments, setDivisionRepairSearchTerm, setPage, setRepairAssignmentUnitFilter, setRepairAssignmentWorkTypeFilter, setRepairData, setSelectedDepartment }: DepartmentPageProps) {
  return (
<main className="department-container">

          <button
            type="button"
            className="technician-assignment-entry"
            onClick={() => {
              setAssignmentQueueAllDepartments(true);
              setRepairAssignmentUnitFilter("all");
              setRepairAssignmentWorkTypeFilter("all");
              setPage("repair-assignment-list");
            }}
          >
            <span className="technician-assignment-entry-label">สำหรับช่างซ่อม</span>
            <strong className="technician-assignment-entry-title">🛠️ งานรอรับงานซ่อม</strong>
            <span className="technician-assignment-entry-count">
              {divisionAssignmentRepairs.length} งานรอรับ
            </span>
            <span className="technician-assignment-entry-categories">
              <span className="urgent-work-count">งานด่วน <strong>{divisionAssignmentRepairs.filter((repair) => repair.approvalWorkType === "งานด่วน").length}</strong></span>
              <span className="planned-work-count">งานรอวางแผน <strong>{divisionAssignmentRepairs.filter((repair) => repair.approvalWorkType === "งานรอวางแผน").length}</strong></span>
            </span>
            <span className="technician-assignment-entry-action">เปิดคิวรอรับงาน →</span>
          </button>

          <section className="division-repair-search" aria-label="ค้นหางานซ่อมในฝ่ายที่เลือก">
            <label htmlFor="division-repair-search-input">ค้นหางานซ่อมในฝ่าย {divisionName(selectedDivision)}</label>
            <input
              id="division-repair-search-input"
              type="search"
              value={divisionRepairSearchTerm}
              onChange={(event) => setDivisionRepairSearchTerm(event.target.value)}
              placeholder="เลขที่งาน รหัสเครื่องจักร ชื่อเครื่อง หรืออาการเสีย"
            />
            {divisionRepairSearchQuery && (
              <div className="division-repair-search-results" aria-live="polite">
                <p className="division-repair-search-count">พบ {divisionRepairSearchResults.length} งาน</p>
                {divisionRepairSearchResults.length ? divisionRepairSearchResults.slice(0, 30).map((repair) => (
                  <button
                    type="button"
                    className="division-repair-search-result"
                    key={repair.id}
                    onClick={() => {
                      setSelectedDepartment(repair.department);
                      setRepairData(repair);
                      setPage("repair-detail");
                    }}
                  >
                    <strong>{repair.id}</strong>
                    <span>{departmentName(repair.department)} · รหัสเครื่องจักร {repair.machineCode || "ไม่ระบุ"}</span>
                    <span>{repair.machineName || "ไม่ระบุเครื่องจักร"} · {repair.status || "ไม่ทราบสถานะ"}</span>
                  </button>
                )) : <p className="division-repair-search-empty">ไม่พบงานซ่อมในฝ่ายนี้</p>}
                {divisionRepairSearchResults.length > 30 && <small>แสดง 30 รายการแรกจากทั้งหมด {divisionRepairSearchResults.length} งาน</small>}
              </div>
            )}
          </section>

          <div className="department-list">
            {(divisionDepartments[selectedDivision] || []).filter((department) => currentUser?.roles?.includes("admin") || currentUser?.departments?.includes(department)).map((department) => (
              <button
                key={department}
                className={`department-button ${selectedDepartment === department ? "selected" : ""} ${departmentControls[department] ? `status-${departmentControls[department].status}` : ""}`}
                onClick={() => handleDepartment(department)}
              >
                {departmentName(department)}{!isDepartmentActive(department) && " (ปิดใช้งาน)"}
                {canApprove && (() => {
                  const pendingApprovalCount = repairs.filter((repair) =>
                    repair.department === department && repair.status === "รออนุมัติ"
                  ).length;
                  return pendingApprovalCount > 0 ? (
                    <span className="department-approval-count" aria-label={`${pendingApprovalCount} งานรออนุมัติ`}>
                      {pendingApprovalCount}
                    </span>
                  ) : null;
                })()}
                {departmentControls[department] && <span className={`department-control-badge ${departmentControls[department].status}`}>
                  {departmentControls[department].status === "start" ? "START" : "STOP"}
                </span>}
              </button>
            ))}
            {(divisionDepartments[selectedDivision] || []).filter((department) => currentUser?.roles?.includes("admin") || currentUser?.departments?.includes(department)).length === 0 && (
              <p className="division-empty-note">ฝ่าย {divisionName(selectedDivision || "—")} ยังไม่มีแผนกที่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบเมื่อมีการเพิ่มแผนกในฝ่ายนี้</p>
            )}
          </div>

          <button className="back-button" onClick={() => { setSelectedDepartment(""); setPage("division"); }}>← กลับไปเลือกฝ่าย</button>

          <footer>ART Maintenance System</footer>
        </main>
  );
}
