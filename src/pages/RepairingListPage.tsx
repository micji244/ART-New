import type { AppPageContext } from "./pageContext";

type RepairingListPageProps = Pick<AppPageContext, "departmentName" | "repairs" | "selectedDepartment" | "setPage" | "setRepairData">;

// Page "repairing-list" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function RepairingListPage({ departmentName, repairs, selectedDepartment, setPage, setRepairData }: RepairingListPageProps) {
  return (
<main className="repairs-container">
    <div className="repairs-header">
      <div className="cm-logo">ART</div>

      <h1>กำลังซ่อม</h1>

      <p>
        แผนก: <strong>{departmentName(selectedDepartment)}</strong>
      </p>
    </div>

    <div className="repair-list">
      {repairs.filter(
        (repair) =>
          repair.status === "กำลังซ่อม" &&
          repair.department === selectedDepartment
      ).length === 0 ? (
        <div className="no-repair">
          ยังไม่มีงานที่กำลังซ่อม
        </div>
      ) : (
        repairs
          .filter(
            (repair) =>
              repair.status === "กำลังซ่อม" &&
              repair.department === selectedDepartment
          )
          .map((repair) => (
            <div className="repair-card" key={repair.id}>
              <div className="repair-card-top">
                <strong>{repair.id}</strong>

                <span className="repair-status waiting">
                  {repair.status}
                </span>
              </div>

              <h2>
                {repair.machineName || "ไม่มีข้อมูลเครื่องจักร"}
              </h2>
              <p><strong>รหัสเครื่องจักร:</strong> {repair.machineCode || "ไม่ระบุ"}</p>

              <p>
                <strong>อาการ:</strong>{" "}
                {repair.problemDescription || "ไม่มีข้อมูลอาการ"}
              </p>

              <p>
                <strong>ผู้แจ้ง:</strong>{" "}
                {repair.requester || "ไม่ระบุ"}
              </p>

              <button
                className="repair-detail-button"
                onClick={() => {
                  setRepairData(repair);
               setPage("repair-execution");
                }}
              >
                ดูรายละเอียดงาน
              </button>
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
