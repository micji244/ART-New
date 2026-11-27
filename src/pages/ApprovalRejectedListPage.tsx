import { getApprovalRejections } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type ApprovalRejectedListPageProps = Pick<AppPageContext, "departmentName" | "rejectedHistoryRepairs" | "selectedDepartment" | "setPage" | "setRepairData" | "users">;

// Page "approval-rejected-list" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function ApprovalRejectedListPage({ departmentName, rejectedHistoryRepairs, selectedDepartment, setPage, setRepairData, users }: ApprovalRejectedListPageProps) {
  return (
<main className="approval-container">
    <div className="approval-header">
      <div className="cm-logo">ART</div>
      <h1>ประวัติงานที่ไม่อนุมัติ</h1>
      <p>แผนก: <strong>{departmentName(selectedDepartment)}</strong></p>
      <p>งานที่รออนุมัติใหม่จะแสดงที่นี่ และจะออกจากรายการเมื่อได้รับอนุมัติ</p>
    </div>

    <div className="approval-summary">
      <div className="approval-count">
        <span>จำนวนงานที่เคยไม่อนุมัติ</span>
        <strong>{rejectedHistoryRepairs.length}</strong>
      </div>
    </div>

    {rejectedHistoryRepairs.length === 0 ? (
      <div className="approval-empty">
        <h2>ยังไม่มีประวัติงานที่ไม่อนุมัติ</h2>
        <p>งานที่ถูกส่งกลับมารออนุมัติใหม่จะแสดงในรายการนี้จนกว่าจะได้รับอนุมัติ</p>
      </div>
    ) : rejectedHistoryRepairs
      .map((repair) => (
        <div className="approval-card rejected-approval-card" key={repair.id}>
          <div className="approval-card-top">
            <strong>{repair.id}</strong>
            <span className={`approval-status ${repair.status === "รออนุมัติ" ? "" : "rejected-approval-status"}`}>
              {repair.status === "รออนุมัติ" ? "รออนุมัติใหม่" : "ไม่อนุมัติ"}
            </span>
          </div>
          <h2>{repair.machineName || "ไม่มีข้อมูลเครื่องจักร"}</h2>
          <p><strong>รหัสเครื่องจักร:</strong> {repair.machineCode || "ไม่ระบุ"}</p>
          <p><strong>อาการ:</strong> {repair.problemDescription || "ไม่มีข้อมูลอาการเสีย"}</p>
          {getApprovalRejections(repair).map((rejection, index) => (
            <p key={`${repair.id}-rejected-history-${index}`}>
              <strong>ไม่อนุมัติครั้งที่ {index + 1} โดย:</strong> {users.find((item) => item.userId === rejection.rejectedBy)?.name || rejection.rejectedBy || "ไม่ระบุ"}
              <br /><strong>เหตุผล:</strong> {rejection.reason || "ไม่ระบุเหตุผล"}
              {rejection.rejectedAt && <> · {new Date(rejection.rejectedAt).toLocaleString("th-TH")}</>}
            </p>
          ))}
          <button className="approval-detail-button" onClick={() => { setRepairData(repair); setPage("repair-detail"); }}>
            ดูรายละเอียดงาน
          </button>
        </div>
      ))}

    <button className="back-button" onClick={() => setPage("department-home")}>
      ← กลับหน้าหลักแผนก
    </button>
    <footer>ART Maintenance System</footer>
  </main>
  );
}
