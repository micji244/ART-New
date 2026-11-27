import { getRepairUrgencyInfo, repairUrgencyTypes } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type RepairAssignmentListPageProps = Pick<AppPageContext, "addAuditLog" | "assignmentQueueAllDepartments" | "assignmentRepairs" | "canRepair" | "canRepairUnit" | "departmentName" | "divisionName" | "repairAssignmentUnitFilter" | "repairAssignmentWorkTypeFilter" | "selectedDepartment" | "selectedDivision" | "setPage" | "setRepairAssignmentUnitFilter" | "setRepairAssignmentWorkTypeFilter" | "setRepairData" | "setRepairs" | "setSelectedDepartment" | "userId" | "visibleAssignmentRepairs">;

// Page "repair-assignment-list" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairAssignmentListPage({ addAuditLog, assignmentQueueAllDepartments, assignmentRepairs, canRepair, canRepairUnit, departmentName, divisionName, repairAssignmentUnitFilter, repairAssignmentWorkTypeFilter, selectedDepartment, selectedDivision, setPage, setRepairAssignmentUnitFilter, setRepairAssignmentWorkTypeFilter, setRepairData, setRepairs, setSelectedDepartment, userId, visibleAssignmentRepairs }: RepairAssignmentListPageProps) {
  return (
<main className="repair-list-container repair-assignment-queue-page">
    <div className="repair-list-header repair-assignment-queue-header">
      <h1>🟠 งานรอรับงาน</h1>
      <p>
        {assignmentQueueAllDepartments ? <>ทุกแผนกในฝ่าย <strong>{divisionName(selectedDivision)}</strong></> : <>แผนก <strong>{departmentName(selectedDepartment)}</strong></>}
      </p>
    </div>

    <section className="assignment-work-type-section" aria-label="แยกคิวงานด่วนและงานรอวางแผน">
      <h2>คิวตามประเภทงาน</h2>
      <div className="assignment-work-type-filters">
        {[
          { value: "all", label: "งานทั้งหมด", className: "all" },
          { value: "งานด่วน", label: "งานด่วน", className: "urgent" },
          { value: "งานรอวางแผน", label: "งานรอวางแผน", className: "planned" },
        ].map((type) => {
          const count = type.value === "all"
            ? assignmentRepairs.length
            : assignmentRepairs.filter((repair) => repair.approvalWorkType === type.value).length;
          return (
            <button
              key={type.value}
              type="button"
              className={`assignment-work-type-filter ${type.className} ${repairAssignmentWorkTypeFilter === type.value ? "selected" : ""}`}
              onClick={() => setRepairAssignmentWorkTypeFilter(type.value)}
              aria-pressed={repairAssignmentWorkTypeFilter === type.value}
            >
              {type.label}<strong>{count}</strong>
            </button>
          );
        })}
      </div>
    </section>

    <section className="repair-assignment-unit-section" aria-label="เลือกคิวหน่วยงานซ่อม">
      <h2>คิวรอรับงานตามหน่วยงานซ่อม</h2>
        <p>งานที่ผู้แจ้งเลือกจะเข้าคิวของหน่วยงานนั้นโดยอัตโนมัติ</p>
      <div className="repair-assignment-unit-filters">
        <button
          type="button"
          className={`repair-assignment-unit-filter all ${repairAssignmentUnitFilter === "all" ? "selected" : ""}`}
          onClick={() => setRepairAssignmentUnitFilter("all")}
          aria-pressed={repairAssignmentUnitFilter === "all"}
        >
          ทุกหน่วยงาน <strong>{assignmentRepairs.length}</strong>
        </button>
        {repairUrgencyTypes.map((type) => {
          const count = assignmentRepairs.filter((repair) => getRepairUrgencyInfo(repair.urgency).value === type.value).length;
          return (
            <button
              key={type.value}
              type="button"
              className={`repair-assignment-unit-filter ${type.color} ${repairAssignmentUnitFilter === type.value ? "selected" : ""}`}
              onClick={() => setRepairAssignmentUnitFilter(type.value)}
              aria-pressed={repairAssignmentUnitFilter === type.value}
            >
              <span>{type.icon}</span> {type.label} <strong>{count}</strong>
            </button>
          );
        })}
      </div>
    </section>

    <div className="repair-list">
      {visibleAssignmentRepairs.length === 0 ? (
        <div className="empty-repair">
          <h2>ไม่มีงานรอรับในคิวนี้</h2>
          <p>{repairAssignmentWorkTypeFilter !== "all" ? `ขณะนี้ไม่มี${repairAssignmentWorkTypeFilter}ในคิวที่เลือก` : repairAssignmentUnitFilter !== "all" ? `ขณะนี้ยังไม่มีงานในคิว ${getRepairUrgencyInfo(repairAssignmentUnitFilter).label}` : assignmentQueueAllDepartments ? `ขณะนี้ยังไม่มีงานรอรับในฝ่าย ${divisionName(selectedDivision)}` : "ขณะนี้ยังไม่มีรายการที่รอรับงานในแผนกนี้"}</p>
        </div>
      ) : (
        visibleAssignmentRepairs.map((repair) => (
            <div
              key={repair.id}
              className={`repair-card urgency-card-${getRepairUrgencyInfo(repair.urgency).color}`}
              onClick={() => {
                setRepairData(repair);
                setSelectedDepartment(repair.department);
                setPage("repair-assignment");
              }}
            >
              <div className="repair-card-header">
                <strong>{repair.id}</strong>

                <div className="repair-status">
                  รอรับงาน
                </div>
              </div>

              <div className={`assignment-work-type-badge ${repair.approvalWorkType === "งานด่วน" ? "urgent" : repair.approvalWorkType === "งานรอวางแผน" ? "planned" : "unspecified"}`}>
                {repair.approvalWorkType || "ยังไม่ระบุประเภทงาน"}
              </div>

              <div className="repair-assignment-machine-code">
                <span>รหัสเครื่องจักร</span>
                <strong>{repair.machineCode || "ไม่ระบุ"}</strong>
              </div>
              <h3>เครื่องจักร: {repair.machineName || "ไม่ระบุ"}</h3>

              <p>
                <strong>อาการ:</strong>{" "}
                {repair.problemDescription}
              </p>

              <p>
                <strong>ผู้แจ้ง:</strong>{" "}
                {repair.requester}
              </p>

              <p className="repair-assignment-card-department">
                <strong>แผนก:</strong> {repair.department || "ไม่ระบุ"}
              </p>

              <div className={`repair-urgency-badge ${getRepairUrgencyInfo(repair.urgency).color}`}>
                {getRepairUrgencyInfo(repair.urgency).icon} {getRepairUrgencyInfo(repair.urgency).label}
              </div>
              {canRepair && canRepairUnit(repair) && (
                <button
                  type="button"
                  className="accept-job-button repair-assignment-quick-accept"
                  onClick={(event) => {
                    event.stopPropagation();
                    const updatedRepair = {
                      ...repair,
                      status: "รอเสนอเวลาซ่อม",
                      acceptedBy: userId,
                      acceptedAt: new Date().toISOString(),
                    };
                    setRepairs((previous) => previous.map((item) => item.id === repair.id ? updatedRepair : item));
                    addAuditLog(repair.id, "รับงานซ่อม", `ผู้รับงาน ${userId || "admin"} รับงานซ่อม`);
                    setRepairData(updatedRepair);
                    setSelectedDepartment(repair.department);
                    setPage("repair-time");
                  }}
                >
                  ✓ รับงานซ่อมนี้
                </button>
              )}
            </div>
          ))
      )}
    </div>

    <button
      className="back-button"
      onClick={() => setPage(assignmentQueueAllDepartments ? "department" : "department-home")}
    >
      ← {assignmentQueueAllDepartments ? "กลับไปเลือกแผนก" : "กลับหน้าหลักแผนก"}
    </button>
  </main>
  );
}
