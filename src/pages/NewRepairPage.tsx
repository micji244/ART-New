import { withApiBase } from "../api/client";
import { fileToDataUrl } from "../lib/images";
import { getRepairUrgencyInfo, maxRepairImages, repairUrgencyTypes } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type NewRepairPageProps = Pick<AppPageContext, "addAuditLog" | "currentUser" | "handleRepairImageSelection" | "knownMachineCodes" | "lastSavedRepairsRef" | "machineCode" | "machineCodeHistory" | "machineName" | "problemDescription" | "repairImages" | "selectedDepartment" | "selectedUrgency" | "setMachineCode" | "setMachineName" | "setPage" | "setProblemDescription" | "setRepairData" | "setRepairImages" | "setRepairs" | "setSelectedUrgency" | "userId">;

// Page "new-repair" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function NewRepairPage({ addAuditLog, currentUser, handleRepairImageSelection, knownMachineCodes, lastSavedRepairsRef, machineCode, machineCodeHistory, machineName, problemDescription, repairImages, selectedDepartment, selectedUrgency, setMachineCode, setMachineName, setPage, setProblemDescription, setRepairData, setRepairImages, setRepairs, setSelectedUrgency, userId }: NewRepairPageProps) {
  return (
<section className="new-repair-container">

    <div className="new-repair-header">
      <div className="cm-logo">ART</div>
      <h1>แจ้งซ่อมใหม่</h1>
      <p>สร้างรายการแจ้งซ่อม</p>
    </div>

    <div className="new-repair-card">

      <div className="new-repair-info">
        <span>แผนก</span>
        <strong>{selectedDepartment || "Agg1"}</strong>
      </div>

      <label htmlFor="new-repair-machine-code">รหัสเครื่องจักร *</label>
      <input
        id="new-repair-machine-code"
        type="text"
        className="new-repair-input"
        value={machineCode}
        onChange={(event) => setMachineCode(event.target.value)}
        placeholder="กรอกรหัสเครื่องจักร"
        list={`machine-code-history-${selectedDepartment || "default"}`}
        autoComplete="off"
        maxLength={80}
        required
      />
      <datalist id={`machine-code-history-${selectedDepartment || "default"}`}>
        {knownMachineCodes.map((code) => <option key={code} value={code} />)}
      </datalist>
      <p className="machine-code-history-hint" aria-live="polite">
        {machineCode.trim()
          ? machineCodeHistory.length > 0
            ? `รหัสนี้เคยมีประวัติแจ้งซ่อม ${machineCodeHistory.length} งานในแผนกนี้`
            : "รหัสใหม่นี้จะถูกจดจำไว้สำหรับค้นหาในครั้งต่อไป"
          : knownMachineCodes.length > 0
            ? `เลือกรหัสเดิมได้ · มีรหัสเครื่องจักรที่เคยบันทึก ${knownMachineCodes.length} รหัส`
            : ""}
      </p>

      <label htmlFor="new-repair-machine-name">ชื่อเครื่องจักร / อุปกรณ์ *</label>
      <input
        id="new-repair-machine-name"
        type="text"
        className="new-repair-input"
        value={machineName}
onChange={(e) => setMachineName(e.target.value)}
        placeholder="กรอกชื่อเครื่องจักรหรืออุปกรณ์"
      />

      <label>อาการเสีย / รายละเอียดปัญหา *</label>
      <textarea
        className="new-repair-textarea"
        value={problemDescription}
onChange={(e) => setProblemDescription(e.target.value)}
        placeholder="กรอกรายละเอียดอาการเสีย"
      />
<div className="urgency-section">
  <label>หน่วยงานซ่อม *</label>

  <div className="urgency-options">

    {repairUrgencyTypes.map((type) => (
      <button
        key={type.value}
        type="button"
        className={`urgency-option urgency-${type.color} ${selectedUrgency === type.value ? "selected" : ""}`}
        onClick={() => setSelectedUrgency(type.value)}
        aria-pressed={selectedUrgency === type.value}
      >
        {type.icon}
        <strong>{type.label}</strong>
      </button>
    ))}

  </div>
</div>
      <label>รูปภาพอาการเสีย *</label>
      <input
        type="file"
        className="new-repair-file"
        accept="image/*"
        multiple
        onChange={handleRepairImageSelection}
      />

      <p className="new-repair-note">
        เลือกได้หลายรูป หรือกดเลือกเพิ่มภายหลัง (สูงสุด {maxRepairImages} รูป) · ระบบย่อขนาดรูปให้อัตโนมัติ
      </p>
      {repairImages.length > 0 && (
        <div className="repair-image-selection" aria-live="polite">
          <strong>เลือกแล้ว {repairImages.length}/{maxRepairImages} รูป</strong>
          <ul>
            {repairImages.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`}>
                <span>{file.name}</span>
                <button type="button" onClick={() => setRepairImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`นำรูป ${file.name} ออก`}>นำออก</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="new-repair-auto">
        <p>ผู้แจ้ง: <strong>{currentUser?.name || userId || "ไม่ระบุ"}</strong></p>
        <p>วันที่และเวลาแจ้ง: <strong>ระบบบันทึกอัตโนมัติ</strong></p>
        <p>สถานะหลังส่ง: <strong>รออนุมัติ</strong></p>
      </div>

      <button
        type="button"
        className="repair-new-button"
onClick={async () => {
  if (!machineCode.trim()) {
    alert("กรุณากรอกรหัสเครื่องจักร");
    return;
  }
  if (!selectedUrgency) {
    alert("กรุณาเลือกหน่วยงานซ่อมก่อนส่งแจ้งซ่อม");
    return;
  }

let newRepair;
try {
  const repairDraft = {
    machineCode: machineCode.trim(),
    machineName,
    problemDescription,
    urgency: selectedUrgency,
    images: await Promise.all(repairImages.map((file) => fileToDataUrl(file))),
    requester: userId || "admin",
    department: selectedDepartment || "Agg1",
    status: "รออนุมัติ",
  };
  const response = await fetch(withApiBase("/api/repairs"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ repair: repairDraft }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "ส่งใบแจ้งซ่อมไม่สำเร็จ");
  newRepair = result.repair;
} catch (error) {
  alert(error.message);
  return;
}

lastSavedRepairsRef.current = [...lastSavedRepairsRef.current, newRepair];
setRepairs((prev) => [...prev, newRepair]);
setRepairImages([]);
addAuditLog(
  newRepair.id,
  "สร้างงานแจ้งซ่อม",
  `แจ้งซ่อมรหัสเครื่อง ${newRepair.machineCode} (${newRepair.machineName}) แผนก ${newRepair.department}`
);
setRepairData(newRepair);
  alert(`สร้างรายการแจ้งซ่อมเรียบร้อยแล้ว\n${getRepairUrgencyInfo(selectedUrgency).label}`);
  setPage("repairs");
}}
      >
        ✓ ส่งแจ้งซ่อม
      </button>

      <button
        type="button"
        className="back-button"
        onClick={() => setPage("department-home")}
      >
        ← กลับหน้าหลักแผนก
      </button>

    </div>

    <footer>ART Maintenance System</footer>

  </section>
  );
}
