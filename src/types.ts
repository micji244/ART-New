/** Shared client-side contracts for the ART Maintenance System. */
export type AppTheme = "light" | "dark";
export type RepairUnit = "Maintenance" | "Electrical" | "Instrument";
export type ApprovalWorkType = "งานด่วน" | "งานรอวางแผน";

export interface DivisionRecord {
  code: string;
  name: string;
  active: boolean;
  [field: string]: any;
}

export interface DepartmentRecord {
  code: string;
  name: string;
  divisionCode: string;
  active: boolean;
  divisionActive?: boolean;
  effectiveActive?: boolean;
  [field: string]: any;
}

export interface AppUser {
  userId: string;
  name: string;
  roles: string[];
  departments: string[];
  divisions: string[];
  repairUnits?: string[];
  active?: boolean;
  [field: string]: any;
}

export interface ApprovalRejection {
  reason: string;
  rejectedBy: string;
  rejectedAt?: string;
  [field: string]: any;
}

export interface RepairRecord {
  id: string;
  department: string;
  status: string;
  createdAt?: string;
  machineCode?: string;
  machineName?: string;
  problemDescription?: string;
  requester?: string;
  urgency?: RepairUnit | string;
  approvalWorkType?: ApprovalWorkType | string;
  approvedBy?: string;
  approvedAt?: string;
  acceptedBy?: string;
  acceptedAt?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  startTime?: string;
  dueTime?: string;
  repairStartedAt?: string;
  repairCompletedAt?: string;
  repairWorkDetails?: string;
  repairWorkNotes?: string;
  images?: string[];
  approvalRejections?: ApprovalRejection[];
  approvalRejectedBy?: string;
  approvalRejectReason?: string;
  approvalRejectedAt?: string;
  rejectReason?: string;
  deletedAt?: string;
  deletedBy?: string;
  [field: string]: any;
}

export interface AuditLog {
  id: string | number;
  repairId?: string;
  department?: string;
  action?: string;
  actor?: string;
  userId?: string;
  timestamp?: string;
  createdAt?: string;
  [field: string]: any;
}

export interface AdminAuditLog extends AuditLog {
  targetType?: string;
  targetId?: string;
  occurredAt?: string;
  details?: string;
}

export interface AnnouncementRecord {
  id: string;
  imageData: string;
  createdBy?: string;
  createdAt: string;
}

export interface DepartmentControl {
  department: string;
  status: "start" | "stop";
  updatedBy?: string;
  updatedAt?: string;
  [field: string]: any;
}

export interface OnlineUser {
  userId: string;
  name?: string;
  [field: string]: any;
}

export interface PreviewImage {
  src: string;
  index: number;
}

export interface AccountData {
  user: AppUser;
  users?: AppUser[];
  repairs: RepairRecord[];
  divisions?: DivisionRecord[];
  departments?: DepartmentRecord[];
  departmentControls?: DepartmentControl[];
  departmentControlHistory?: AuditLog[];
  auditLogs?: AuditLog[];
  adminAuditLogs?: AdminAuditLog[];
  [field: string]: any;
}
