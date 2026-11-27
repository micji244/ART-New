import type { AppPageContext } from "./pageContext";

type RejectedListPageProps = Pick<AppPageContext, "departmentName" | "repairs" | "selectedDepartment" | "setPage" | "setRepairData">;

// Page "rejected-list" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RejectedListPage({ departmentName, repairs, selectedDepartment, setPage, setRepairData }: RejectedListPageProps) {
  return (
<main className="approval-container">
    <div className="approval-header">
      <div className="cm-logo">ART</div>

      <h1>งานที่ไม่รับ</h1>

      <p>
        แผนก: <strong>{departmentName(selectedDepartment)}</strong>
      </p>
    </div>

    <div className="approval-summary">
      <div className="approval-count">
        <span>จำนวนงานที่ไม่รับ</span>
        <strong>
          {
            repairs.filter(
              (repair) =>
                repair.rejectReason &&
                repair.department === selectedDepartment
            ).length
          }
        </strong>
      </div>
    </div>

    {repairs.filter(
      (repair) =>
        repair.rejectReason &&
        repair.department === selectedDepartment
    ).length === 0 ? (
      <div className="empty-state">
        <p>ยังไม่มีงานที่ไม่รับ</p>
      </div>
    ) : (
      repairs
        .filter(
          (repair) =>
            repair.rejectReason &&
            repair.department === selectedDepartment
        )
        .map((repair) => (
          <div className="approval-card" key={repair.id}>
            <div className="approval-job-number">
              {repair.id}
            </div>

            <div className="approval-info">
              <p>
                <strong>เครื่องจักร:</strong>{" "}
                {repair.machineName || "ไม่ระบุ"}
              </p>
              <p><strong>รหัสเครื่องจักร:</strong> {repair.machineCode || "ไม่ระบุ"}</p>

              <p>
                <strong>อาการ:</strong>{" "}
                {repair.problemDescription || "ไม่ระบุ"}
              </p>

              <p>
                <strong>เหตุผลที่ไม่รับ:</strong>{" "}
                {repair.rejectReason}
              </p>
            </div>

            <button
              className="approval-detail-button"
              onClick={() => {
                setRepairData(repair);
                setPage("repair-assignment");
              }}
            >
              ดูรายละเอียดงาน
            </button>
          </div>
        ))
    )}

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
