import { getRepairUrgencyInfo } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type RepairTimeListPageProps = Pick<AppPageContext, "departmentName" | "repairs" | "selectedDepartment" | "setPage" | "setRepairData">;

// Page "repair-time-list" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairTimeListPage({ departmentName, repairs, selectedDepartment, setPage, setRepairData }: RepairTimeListPageProps) {
  return (
<main className="repair-list-container">
    <div className="repair-list-header">
      <div className="cm-logo">ART</div>
      <h1>งานรอเสนอเวลาซ่อม</h1>
      <p>
        แผนก <strong>{departmentName(selectedDepartment)}</strong>
      </p>
    </div>

    <div className="repair-list">
      {repairs.filter(
        (repair) =>
          repair.status === "รอเสนอเวลาซ่อม" &&
          repair.department === selectedDepartment
      ).length === 0 ? (
        <div className="empty-repair">
          <h2>ไม่มีงานรอเสนอเวลาซ่อม</h2>
          <p>ขณะนี้ยังไม่มีงานที่รอเสนอเวลาซ่อม</p>
        </div>
      ) : (
        repairs
          .filter(
            (repair) =>
              repair.status === "รอเสนอเวลาซ่อม" &&
              repair.department === selectedDepartment
          )
          .map((repair) => (
            <div
              key={repair.id}
              className="repair-card"
              onClick={() => {
                setRepairData(repair);
                setPage("repair-time");
              }}
            >
              <div className="repair-card-header">
                <strong>{repair.id}</strong>
                <span className="repair-status">
                  รอเสนอเวลาซ่อม
                </span>
              </div>

              <div className="repair-card-info">
                <p><strong>รหัสเครื่องจักร:</strong> {repair.machineCode || "ไม่ระบุ"}</p>
                <p>
                  <strong>เครื่องจักร:</strong>{" "}
                  {repair.machineName || "ไม่ระบุ"}
                </p>

                <p>
                  <strong>อาการ:</strong>{" "}
                  {repair.problemDescription || "ไม่ระบุ"}
                </p>

                <p>
                  <strong>หน่วยงานซ่อม:</strong>{" "}
                  {getRepairUrgencyInfo(repair.urgency).label}
                </p>
              </div>

             <div className="repair-card-action">
  📅&nbsp;&nbsp; เสนอเวลาซ่อม&nbsp;&nbsp; →
</div>
            </div>
          ))
      )}
    </div>

    <button
      className="back-button"
      onClick={() => setPage("department-home")}
    >
      ← กลับหน้าหลัก
    </button>

    <footer>ART Maintenance System</footer>
  </main>
  );
}
