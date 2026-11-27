import { getRepairUrgencyInfo } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type InspectionListPageProps = Pick<AppPageContext, "departmentName" | "repairs" | "selectedDepartment" | "setPage" | "setRepairData">;

// Page "inspection-list" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function InspectionListPage({ departmentName, repairs, selectedDepartment, setPage, setRepairData }: InspectionListPageProps) {
  return (
<main className="approval-container">
    <div className="approval-header">
      <div className="cm-logo">ART</div>

      <h1>งานรอตรวจงาน</h1>

      <p>
        แผนก: <strong>{departmentName(selectedDepartment)}</strong>
      </p>
    </div>

    <div className="approval-summary inspection-summary">
      <div className="approval-count inspection-count">
        <span>จำนวนงานรอตรวจ</span>

        <strong>
          {
            repairs.filter(
              (repair) =>
                repair.status === "รอตรวจงาน" &&
                repair.department === selectedDepartment
            ).length
          }
        </strong>
      </div>
    </div>

    <div className="inspection-review-list">
      {repairs.filter(
        (repair) =>
          repair.status === "รอตรวจงาน" &&
          repair.department === selectedDepartment
      ).length === 0 ? (
        <div className="approval-empty">
          ยังไม่มีงานรอตรวจ
        </div>
      ) : (
        repairs
          .filter(
            (repair) =>
              repair.status === "รอตรวจงาน" &&
              repair.department === selectedDepartment
          )
          .map((repair) => (
            <button
              type="button"
              className="inspection-review-card"
              key={repair.id}
              onClick={() => {
                setRepairData(repair);
                setPage("inspection");
              }}
            >
              <div className="inspection-review-card-top">
                <strong>{repair.id}</strong>
                <span className="inspection-review-status">รอตรวจงาน</span>
              </div>
              <h2>{repair.machineName || "ไม่ระบุเครื่องจักร"}</h2>
              <p className="inspection-review-description"><strong>รหัสเครื่องจักร:</strong> {repair.machineCode || "ไม่ระบุ"}</p>
              <p className="inspection-review-description">
                <strong>อาการที่แจ้ง</strong>
                <span>{repair.problemDescription || "ไม่มีรายละเอียด"}</span>
              </p>
              <div className="inspection-review-footer">
                <span>หน่วยงานซ่อม: <strong>{getRepairUrgencyInfo(repair.urgency).label}</strong></span>
                <span className="inspection-review-open">เปิดตรวจงาน&nbsp; →</span>
              </div>
            </button>
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
