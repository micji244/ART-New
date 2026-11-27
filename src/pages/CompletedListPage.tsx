import { formatThaiDateTime } from "../lib/format";
import type { AppPageContext } from "./pageContext";

type CompletedListPageProps = Pick<AppPageContext, "departmentName" | "getInspectorName" | "repairs" | "selectedDepartment" | "setPage" | "setRepairData">;

// Page "completed-list" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function CompletedListPage({ departmentName, getInspectorName, repairs, selectedDepartment, setPage, setRepairData }: CompletedListPageProps) {
  return (
<main className="repairs-container">

    <div className="repairs-header">
      <div className="cm-logo">ART</div>
      <h1>งานเสร็จแล้ว</h1>
      <p>
        แผนก: <strong>{departmentName(selectedDepartment)}</strong>
      </p>
    </div>

    <div className="repair-list">
      {repairs.filter(
        repair =>
          repair.status === "จบงาน" &&
          repair.department === selectedDepartment
      ).length === 0 ? (
        <div className="no-repair">
          ยังไม่มีงานที่จบแล้ว
        </div>
      ) : (
        repairs
          .filter(
            repair =>
              repair.status === "จบงาน" &&
              repair.department === selectedDepartment
          )
          .map(repair => (
            <div className="repair-card" key={repair.id}>

              <div className="repair-card-top">
                <strong>{repair.id}</strong>

                <span className="repair-status waiting">
                  จบงาน
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
              <p>
  <strong>ผู้ตรวจงาน:</strong>{" "}
  {getInspectorName(repair)}
</p>

<p>
  <strong>วันที่/เวลาจบงาน:</strong>{" "}
  {formatThaiDateTime(repair.inspectedAt, "ไม่ระบุ")}
</p>

              <button
                className="repair-detail-button"
                onClick={() => {
                  setRepairData(repair);
                  setPage("repair-detail");
                }}
              >
                ดูรายละเอียดงาน
              </button>

              <button
                className="repair-pdf-button"
                onClick={() => {
                  setRepairData(repair);
                  setPage("repair-pdf");
                }}
              >
                บันทึก / ดาวน์โหลด PDF
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
