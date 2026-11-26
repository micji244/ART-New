import type { DepartmentRecord, DivisionRecord, RepairRecord } from "../types";

export const initialDivisionRecords: DivisionRecord[] = [{ code: "RM", name: "Raw Material", active: true }];
export const initialDepartmentRecords: DepartmentRecord[] = ["Agg1", "Agg2", "Agg3", "Jaw1", "Jaw2", "Jaw3", "Jaw4", "Cde1", "Cde2"].map((code) => ({ code, name: code, divisionCode: "RM", active: true, divisionActive: true, effectiveActive: true }));
export const maxRepairImages = 8;
export const userLifecycleActions = new Set(["เพิ่มผู้ใช้", "ลบผู้ใช้", "กู้คืนผู้ใช้"]);
export const repairUrgencyTypes = [
  { value: "Maintenance", label: "หน่วยงาน Maintenance", color: "maintenance", icon: "🟢" },
  { value: "Electrical", label: "หน่วยงาน Electrical", color: "electrical", icon: "🟡" },
  { value: "Instrument", label: "หน่วยงาน Instrument", color: "instrument", icon: "🔴" },
];

export function getRepairUrgencyInfo(value: string | null | undefined) {
  const legacyValues: Record<string, string> = {
    "รอได้ไม่เกิน 3 วัน": "Maintenance",
    "รอได้ไม่เกิน 1 วัน": "Electrical",
    "ซ่อมด่วนทันที": "Instrument",
  };
  const normalizedValue = legacyValues[value] || value;
  return repairUrgencyTypes.find((type) => type.value === normalizedValue) || repairUrgencyTypes[0];
}

export function getApprovalRejections(repair: RepairRecord | null | undefined) {
  if (Array.isArray(repair?.approvalRejections) && repair.approvalRejections.length > 0) return repair.approvalRejections;
  return repair?.approvalRejectedBy
    ? [{
        reason: repair.approvalRejectReason || "ไม่ระบุเหตุผล",
        rejectedBy: repair.approvalRejectedBy,
        rejectedAt: repair.approvalRejectedAt || "",
      }]
    : [];
}

export function isInRejectedHistory(repair: RepairRecord): boolean {
  return repair.status === "ไม่อนุมัติ" || (repair.status === "รออนุมัติ" && getApprovalRejections(repair).length > 0);
}


// Photos are fixed once a repair is created and the server keeps the stored copy,
// so they never need to be sent back on a workflow step.
export const withoutImages = (repair: RepairRecord): RepairRecord => {
  const { images: _images, ...rest } = repair;
  return rest as RepairRecord;
};
