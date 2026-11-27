import { getRepairUrgencyInfo } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type ApprovalListPageProps = Pick<AppPageContext, "approvalRejectReason" | "approvalWorkTypeSelections" | "canApprove" | "departmentName" | "getRequesterName" | "handleRejectApproval" | "isSavingRepairStep" | "rejectingApprovalId" | "repairs" | "saveRepairStep" | "selectedDepartment" | "setApprovalRejectReason" | "setApprovalWorkTypeSelections" | "setPage" | "setRejectingApprovalId" | "setRepairData" | "userId" | "users">;

// Page "approval-list" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function ApprovalListPage({ approvalRejectReason, approvalWorkTypeSelections, canApprove, departmentName, getRequesterName, handleRejectApproval, isSavingRepairStep, rejectingApprovalId, repairs, saveRepairStep, selectedDepartment, setApprovalRejectReason, setApprovalWorkTypeSelections, setPage, setRejectingApprovalId, setRepairData, userId, users }: ApprovalListPageProps) {
  return (
<main className="approval-container">

    <div className="approval-header">
      <div className="cm-logo">ART</div>

      <h1>งานรออนุมัติ</h1>

      <p>
        แผนก: <strong>{departmentName(selectedDepartment)}</strong>
      </p>
    </div>

    <div className="approval-summary">
      <div className="approval-count">
        <span>งานรออนุมัติ</span>
       <strong>
  {repairs.filter(
    (repair) =>
      repair.status === "รออนุมัติ" &&
      repair.department === selectedDepartment
  ).length}
</strong>
      </div>

      <div className="approval-count">
        <span>เกินกำหนด</span>
        <strong>0</strong>
      </div>
    </div>

    {/* งานที่รออนุมัติ */}
   {repairs
  .filter(
    (repair) =>
      repair.status === "รออนุมัติ" &&
      repair.department === selectedDepartment
  )
  .map((repair) => (
    <div className="approval-card" key={repair.id}>

      <div className="approval-card-top">
       <strong>{repair.id}</strong>

        <span className="approval-status">
          {(Array.isArray(repair.approvalRejections) && repair.approvalRejections.length > 0) || repair.approvalRejectedBy ? "รออนุมัติใหม่" : "รออนุมัติ"}
        </span>
      </div>

    <h2>{repair.machineName || "ไม่มีข้อมูลเครื่องจักร"}</h2>
      <p><strong>รหัสเครื่องจักร:</strong> {repair.machineCode || "ไม่ระบุ"}</p>

      <p>
<strong>อาการ:</strong> {repair.problemDescription || "ไม่มีข้อมูลอาการเสีย"}
      </p>

      <p>
        <strong>ผู้แจ้ง:</strong> {getRequesterName(repair)}
      </p>

      <p>
        <strong>แผนก:</strong> {departmentName(selectedDepartment)}
      </p>

      <p>
        <strong>หน่วยงานที่รับซ่อม:</strong>
        <span className={`repair-urgency-badge ${getRepairUrgencyInfo(repair.urgency).color}`}>
          {getRepairUrgencyInfo(repair.urgency).icon} {getRepairUrgencyInfo(repair.urgency).label}
        </span>
      </p>

      {(repair.approvalRejections?.length > 0 || repair.approvalRejectedBy) && (
        <div className="approval-rejection-history">
          <p><strong>งานนี้เคยถูกไม่อนุมัติ</strong> — ขณะนี้รอผู้อนุมัติพิจารณาใหม่</p>
          {(repair.approvalRejections || [{
            reason: repair.approvalRejectReason || "ไม่ระบุเหตุผล",
            rejectedBy: repair.approvalRejectedBy || "ไม่ระบุ",
            rejectedAt: repair.approvalRejectedAt,
          }]).map((rejection, index) => (
            <p key={`${repair.id}-rejection-${index}`}>
              ครั้งที่ {index + 1}: ไม่อนุมัติโดย <strong>{users.find((item) => item.userId === rejection.rejectedBy)?.name || rejection.rejectedBy || "ไม่ระบุ"}</strong>
              {rejection.reason ? ` — เหตุผล: ${rejection.reason}` : ""}
              {rejection.rejectedAt && ` (${new Date(rejection.rejectedAt).toLocaleString("th-TH")})`}
            </p>
          ))}
        </div>
      )}

      {canApprove && <div className="approval-buttons">

        <fieldset className="approval-work-type">
          <legend>กำหนดประเภทงานก่อนอนุมัติ <span aria-hidden="true">*</span></legend>
          {["งานด่วน", "งานรอวางแผน"].map((workType) => (
            <label className={`approval-work-type-option ${approvalWorkTypeSelections[repair.id] === workType ? "selected" : ""}`} key={`${repair.id}-${workType}`}>
              <input
                type="radio"
                name={`approval-work-type-${repair.id}`}
                value={workType}
                checked={approvalWorkTypeSelections[repair.id] === workType}
                onChange={() => setApprovalWorkTypeSelections((previous) => ({ ...previous, [repair.id]: workType }))}
              />
              <span>{workType}</span>
            </label>
          ))}
        </fieldset>

        <button
          className="approve-button"
          disabled={isSavingRepairStep || !approvalWorkTypeSelections[repair.id]}
onClick={async () => {
  const approvalWorkType = approvalWorkTypeSelections[repair.id];
  if (!["งานด่วน", "งานรอวางแผน"].includes(approvalWorkType)) {
    alert("กรุณาเลือกประเภทงานก่อนอนุมัติ");
    return;
  }
  const updatedRepair = {
    ...repair,
    status: "รอรับงาน",
    approvalWorkType,
    approvedBy: userId,
    approvedAt: new Date().toISOString(),
  };
  const saved = await saveRepairStep(
    updatedRepair,
    "อนุมัติงาน",
    `อนุมัติงาน ${repair.id} ประเภท${approvalWorkType} ให้เข้าสู่ขั้นตอนรอรับงาน`
  );
  if (saved) setPage("repair-assignment");
}}
        >
          ✓ อนุมัติ
        </button>

        <button
          className="reject-button"
          type="button"
          onClick={() => {
            setRejectingApprovalId(repair.id);
            setApprovalRejectReason("");
          }}
        >
          ✕ ไม่อนุมัติ
        </button>

      </div>}

      {canApprove && rejectingApprovalId === repair.id && (
        <form className="approval-reject-form" onSubmit={(event) => handleRejectApproval(event, repair)}>
          <label htmlFor={`approval-reject-reason-${repair.id}`}>เหตุผลที่ไม่อนุมัติ <span aria-hidden="true">*</span></label>
          <textarea
            id={`approval-reject-reason-${repair.id}`}
            value={approvalRejectReason}
            onChange={(event) => setApprovalRejectReason(event.target.value)}
            placeholder="ระบุเหตุผลเพื่อให้ผู้แจ้งทราบ"
            maxLength={500}
            required
          />
          <button className="confirm-reject-button" type="submit" disabled={isSavingRepairStep}>ยืนยันไม่อนุมัติงาน</button>
          <button
            className="reject-cancel-button"
            type="button"
            onClick={() => {
              setRejectingApprovalId("");
              setApprovalRejectReason("");
            }}
          >
            ยกเลิก
          </button>
        </form>
      )}

      <button
        className="approval-detail-button"
      onClick={() => {
  setRepairData(repair);
  setPage("repair-detail");
}}
      >
        ดูรายละเอียดงาน
      </button>

    </div>
    ))}

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
