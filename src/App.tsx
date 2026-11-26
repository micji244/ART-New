import { useEffect, useRef, useState } from "react";
import "./App.css";
import { loadAccountData, withApiBase } from "./api/client";
import ImageLightbox from "./components/ImageLightbox";
import LoginGearGraphic from "./components/LoginGearGraphic";
import StatusCard from "./components/StatusCard";
import NotificationsPage from "./pages/NotificationsPage";
import { formatThaiDateTime } from "./lib/format";
import { fileToDataUrl } from "./lib/images";
import { getApprovalRejections, getRepairUrgencyInfo, initialDepartmentRecords, initialDivisionRecords, isInRejectedHistory, maxRepairImages, repairUrgencyTypes, userLifecycleActions, withoutImages } from "./lib/repairs";
import type { AccountData, AdminAuditLog, AnnouncementRecord, AppTheme, AppUser, AuditLog, DepartmentControl, DepartmentRecord, DivisionRecord, OnlineUser, PreviewImage, RepairRecord, RepairUnit } from "./types";

function App() {
const [divisionRecords, setDivisionRecords] = useState<DivisionRecord[]>(initialDivisionRecords);
const [departmentRecords, setDepartmentRecords] = useState<DepartmentRecord[]>(initialDepartmentRecords);
const divisions = divisionRecords.map((division) => division.code);
const activeDivisionRecords = divisionRecords.filter((division) => division.active);
const departments = departmentRecords.map((department) => department.code);
const divisionName = (code) => divisionRecords.find((division) => division.code === code)?.name || code || "—";
const departmentName = (code) => departmentRecords.find((department) => department.code === code)?.name || code || "ไม่ระบุ";
const divisionDepartments = departmentRecords.reduce<Record<string, string[]>>((grouped, department) => ({ ...grouped, [department.divisionCode]: [...(grouped[department.divisionCode] || []), department.code] }), {});
const activeDepartmentRecords = departmentRecords.filter((department) => department.effectiveActive !== false && department.active !== false);
const isDepartmentActive = (code) => activeDepartmentRecords.some((department) => department.code === code);
const [newDivisionCode, setNewDivisionCode] = useState("");
const [newDivisionName, setNewDivisionName] = useState("");
const [newDepartmentCode, setNewDepartmentCode] = useState("");
const [newDepartmentName, setNewDepartmentName] = useState("");
const [newDepartmentDivision, setNewDepartmentDivision] = useState("RM");
const [organizationMessage, setOrganizationMessage] = useState("");
const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
const announcementImageCacheRef = useRef<Map<string, string>>(new Map());
const [announcementSaving, setAnnouncementSaving] = useState(false);
const [announcementDragging, setAnnouncementDragging] = useState(false);
const [announcementError, setAnnouncementError] = useState("");
const announcementFileInputRef = useRef<HTMLInputElement | null>(null);
  const [page, setPage] = useState("login");
const [appTheme, setAppTheme] = useState<AppTheme>(() => localStorage.getItem("art_app_theme") === "dark" ? "dark" : "light");
const [userId, setUserId] = useState(() => localStorage.getItem("cm_userId") || "");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
const [hasLoadedServerData, setHasLoadedServerData] = useState(false);
const [authError, setAuthError] = useState("");
const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmNewPassword, setConfirmNewPassword] = useState("");
const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
const [passwordChangeError, setPasswordChangeError] = useState("");

const [rememberPassword, setRememberPassword] = useState(false);
const [selectedDivision, setSelectedDivision] = useState("");
const [selectedDepartment, setSelectedDepartment] = useState("");
const [repairSearchTerm, setRepairSearchTerm] = useState("");
const [divisionRepairSearchTerm, setDivisionRepairSearchTerm] = useState("");
const [repairDepartmentFilter, setRepairDepartmentFilter] = useState("");
const [assignmentQueueAllDepartments, setAssignmentQueueAllDepartments] = useState(false);
const [repairDateFrom, setRepairDateFrom] = useState("");
const [repairDateTo, setRepairDateTo] = useState("");
const [repairAssignmentUnitFilter, setRepairAssignmentUnitFilter] = useState("all");
const [repairAssignmentWorkTypeFilter, setRepairAssignmentWorkTypeFilter] = useState("all");
  const [selectedUrgency, setSelectedUrgency] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [machineName, setMachineName] = useState("");
const [problemDescription, setProblemDescription] = useState("");
const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
const [departmentControlHistory, setDepartmentControlHistory] = useState<AuditLog[]>([]);
const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>([]);
const [deletedUsers, setDeletedUsers] = useState<AppUser[]>([]);
const [deletedRepairs, setDeletedRepairs] = useState<RepairRecord[]>([]);
useEffect(() => {
  localStorage.removeItem("cm_password");
}, []);
useEffect(() => {
  document.documentElement.dataset.theme = appTheme;
  localStorage.setItem("art_app_theme", appTheme);
}, [appTheme]);
const [users, setUsers] = useState<AppUser[]>([]);
const lastSavedRepairsRef = useRef<RepairRecord[]>([]);
const localRepairsVersionRef = useRef(0);
// Server data version from the last full /api/data the client applied.
// Polls send it back; the server answers "unchanged" (a few bytes) when nothing moved.
const dataVersionRef = useRef("");
// Audit log ids the server already has, so only new entries are uploaded.
const savedAuditLogIdsRef = useRef<Set<string>>(new Set());
const markAuditLogsSaved = (logs: AuditLog[] = []) => {
  for (const log of logs) savedAuditLogIdsRef.current.add(String(log.id));
};
// Display name for a stored user id (falls back to the id itself, or to `fallback` when empty).
// Number of repairs in the selected department with the given status.
const countDepartmentRepairs = (status: string) => repairs.filter((repair) => repair.status === status && repair.department === selectedDepartment).length;
const personName = (id: string | null | undefined, fallback = "ไม่ระบุ") =>
  id ? (users.find((user) => user.userId?.toLowerCase() === String(id).toLowerCase())?.name || id) : fallback;
const [editingUserId, setEditingUserId] = useState("");
const [userManagementSearch, setUserManagementSearch] = useState("");
const [userManagementDivision, setUserManagementDivision] = useState("all");
const [editingUserRoles, setEditingUserRoles] = useState([]);
const [editingUserRepairUnits, setEditingUserRepairUnits] = useState([]);
const [editingUserDepartments, setEditingUserDepartments] = useState([]);
const [editingUserDivisions, setEditingUserDivisions] = useState(["RM"]);
const editableUserDivisions = divisionRecords.filter((division) => division.active || editingUserDivisions.includes(division.code));
const editableUserDepartments = departmentRecords.filter((department) => (department.effectiveActive || editingUserDepartments.includes(department.code)) && editingUserDivisions.includes(department.divisionCode)).map((department) => department.code);

const [resettingUserId, setResettingUserId] = useState("");
const [adminResetPassword, setAdminResetPassword] = useState("");
const [backupBusy, setBackupBusy] = useState(false);
const [backupMessage, setBackupMessage] = useState("");
const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
const [showOnlineUsers, setShowOnlineUsers] = useState(false);

useEffect(() => {
  if (!previewImage) return undefined;
  const handleKeyDown = (event) => {
    if (event.key === "Escape") setPreviewImage(null);
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [previewImage]);

const [newUserId, setNewUserId] = useState("");
const [newUserName, setNewUserName] = useState("");
const [newUserRoles, setNewUserRoles] = useState(["user"]);
const [newUserRepairUnits, setNewUserRepairUnits] = useState<string[]>([]);
const [newUserPassword, setNewUserPassword] = useState("");
const [newUserDepartments, setNewUserDepartments] = useState([]);
const [newUserDivisions, setNewUserDivisions] = useState(["RM"]);

const handleSessionLogout = () => {
  void fetch(withApiBase("/api/logout"), { method: "POST", credentials: "include" }).catch(() => {});
  setAuthError("");
  setHasLoadedServerData(false);
  setCurrentUser(null);
  setSelectedDivision("");
  setSelectedDepartment("");
  setUsers([]);
  setRepairs([]);
  setAnnouncements([]);
  setDepartmentControls({});
  setDepartmentControlHistory([]);
  setAuditLogs([]);
  setPage("login");
};

const [repairImages, setRepairImages] = useState<File[]>([]);
const [repairData, setRepairData] = useState<RepairRecord | null>(null);
const [repairImagesError, setRepairImagesError] = useState("");
const [departmentControls, setDepartmentControls] = useState<Record<string, DepartmentControl>>({});
const [repairWorkDetails, setRepairWorkDetails] = useState("");
const [repairWorkNotes, setRepairWorkNotes] = useState("");

const [repairs, setRepairs] = useState<RepairRecord[]>([]);
const [isSavingRepairStep, setIsSavingRepairStep] = useState(false);
const isSavingRepairStepRef = useRef(false);
const [rejectingApprovalId, setRejectingApprovalId] = useState("");
const [approvalRejectReason, setApprovalRejectReason] = useState("");
const [approvalWorkTypeSelections, setApprovalWorkTypeSelections] = useState({});
useEffect(() => {
  if (page === "repair-execution" && repairData) {
    setRepairWorkDetails(repairData.repairWorkDetails || "");
    setRepairWorkNotes(repairData.repairWorkNotes || "");
  }
}, [page, repairData?.id]);
useEffect(() => {
  const pagesNeedingImages = ["repair-assignment", "repair-detail", "repair-pdf"];
  const repairId = repairData?.id;
  if (!hasLoadedServerData || !repairId || !pagesNeedingImages.includes(page) || Array.isArray(repairData?.images)) return undefined;
  let cancelled = false;
  setRepairImagesError("");
  fetch(withApiBase(`/api/repairs/${encodeURIComponent(repairId)}/images`), { credentials: "include" })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดรูปภาพไม่สำเร็จ");
      if (!cancelled) {
        setRepairData((current) => current?.id === repairId ? { ...current, images: result.images || [] } : current);
      }
    })
    .catch((error) => {
      if (!cancelled) {
        setRepairImagesError(error.message || "โหลดรูปภาพไม่สำเร็จ");
        setRepairData((current) => current?.id === repairId ? { ...current, images: [] } : current);
      }
    });
  return () => { cancelled = true; };
}, [page, repairData?.id, repairData?.images, hasLoadedServerData]);
useEffect(() => {
  if (page !== "repair-pdf" || !repairData?.id || !Array.isArray(repairData.images)) return undefined;
  const previousTitle = document.title;
  document.title = `ART-Repair-Report-${repairData?.id || "job"}`;
  const restoreTitle = () => { document.title = previousTitle; };
  const printTimer = window.setTimeout(() => window.print(), 350);
  window.addEventListener("afterprint", restoreTitle, { once: true });
  return () => {
    window.clearTimeout(printTimer);
    window.removeEventListener("afterprint", restoreTitle);
    restoreTitle();
  };
}, [page, repairData?.id, repairData?.images]);
useEffect(() => {
  let cancelled = false;
  fetch(withApiBase("/api/session"), { credentials: "include" })
    .then(async (response) => {
      if (!response.ok) return null;
      return response.json();
    })
    .then(async (session) => {
      if (!session || cancelled) return;
      const data = await loadAccountData();
      if (cancelled) return;
      setCurrentUser(data.user);
      setDivisionRecords(data.divisions || initialDivisionRecords);
      setDepartmentRecords(data.departments || initialDepartmentRecords);
      setUserId(data.user.userId);
      setUsers(data.users || []);
      setRepairs(data.repairs || []);
      setDepartmentControls(Object.fromEntries((data.departmentControls || []).map((item) => [item.department, item])));
      setDepartmentControlHistory(data.departmentControlHistory || []);
      lastSavedRepairsRef.current = data.repairs || [];
      dataVersionRef.current = data.dataVersion || "";
      markAuditLogsSaved(data.auditLogs);
      setAuditLogs(data.auditLogs || []);
      setAdminAuditLogs(data.adminAuditLogs || []);
      setHasLoadedServerData(true);
      setPage("division");
    })
    .catch((error) => {
      if (!cancelled) setAuthError(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ${error.message}`);
    });
  return () => { cancelled = true; };
}, []);
useEffect(() => {
  if (!hasLoadedServerData || page !== "division") return undefined;
  let cancelled = false;
  let requestInProgress = false;
  const loadAnnouncements = async () => {
    if (requestInProgress) return;
    requestInProgress = true;
    try {
      const response = await fetch(withApiBase("/api/announcements"), { credentials: "include", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดป้ายประกาศไม่สำเร็จ");
      if (!cancelled) {
        const records = result.announcements || [];
        const activeIds = new Set(records.map((item) => item.id));
        for (const cachedId of announcementImageCacheRef.current.keys()) {
          if (!activeIds.has(cachedId)) announcementImageCacheRef.current.delete(cachedId);
        }
        setAnnouncements(records.map((item) => ({ ...item, imageData: announcementImageCacheRef.current.get(item.id) || "" })));
        setAnnouncementError("");
        await Promise.all(records.filter((item) => !announcementImageCacheRef.current.has(item.id)).map(async (item) => {
          try {
            const imageResponse = await fetch(withApiBase(`/api/announcements/${encodeURIComponent(item.id)}/image`), { credentials: "include", cache: "force-cache" });
            const imageResult = await imageResponse.json();
            if (!imageResponse.ok) throw new Error(imageResult.error || "โหลดภาพประกาศไม่สำเร็จ");
            announcementImageCacheRef.current.set(item.id, imageResult.imageData || "");
            if (!cancelled) setAnnouncements((current) => current.map((announcement) => announcement.id === item.id ? { ...announcement, imageData: imageResult.imageData || "" } : announcement));
          } catch (error) {
            if (!cancelled) setAnnouncementError(error.message || "โหลดภาพประกาศไม่สำเร็จ");
          }
        }));
      }
    } catch (error) {
      if (!cancelled) setAnnouncementError(error.message || "โหลดป้ายประกาศไม่สำเร็จ");
    } finally {
      requestInProgress = false;
    }
  };
  void loadAnnouncements();
  const intervalId = window.setInterval(loadAnnouncements, 30_000);
  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}, [hasLoadedServerData, page]);
useEffect(() => {
  if (!hasLoadedServerData) return;
  const previousById = new Map(lastSavedRepairsRef.current.map((repair) => [repair.id, repair]));
  const changedRepairs = repairs.filter((repair) => JSON.stringify(previousById.get(repair.id)) !== JSON.stringify(repair));
  lastSavedRepairsRef.current = repairs;
  if (changedRepairs.length === 0) return;
  localRepairsVersionRef.current += 1;
  fetch(withApiBase("/api/repairs"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ repairs: changedRepairs.map(withoutImages) }),
  }).then(async (response) => {
    if (!response.ok) throw new Error((await response.json()).error || "บันทึกงานซ่อมไม่สำเร็จ");
  }).catch((error) => console.error("บันทึกข้อมูลส่วนกลางไม่สำเร็จ:", error));
}, [repairs, hasLoadedServerData]);

useEffect(() => {
  if (!hasLoadedServerData) return;
  let requestInProgress = false;
  const refreshSharedRepairs = async () => {
    if (requestInProgress) return;
    requestInProgress = true;
    const versionAtStart = localRepairsVersionRef.current;
    try {
      // Navigation, focus and the timer all call this. With ?since= the server
      // replies {unchanged:true} in a few bytes unless shared data really changed.
      const since = dataVersionRef.current ? `?since=${encodeURIComponent(dataVersionRef.current)}` : "";
      const response = await fetch(withApiBase(`/api/data${since}`), { credentials: "include", cache: "no-store" });
      if (response.status === 401) {
        handleSessionLogout();
        return;
      }
      if (!response.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${response.status})`);
      const data = await response.json();
      if (data.unchanged) return;
      if (localRepairsVersionRef.current !== versionAtStart) return;
      dataVersionRef.current = data.dataVersion || "";
      lastSavedRepairsRef.current = data.repairs || [];
      setRepairs(data.repairs || []);
      setDepartmentControls(Object.fromEntries((data.departmentControls || []).map((item) => [item.department, item])));
      setDepartmentControlHistory(data.departmentControlHistory || []);
      setCurrentUser(data.user);
      setDivisionRecords(data.divisions || initialDivisionRecords);
      setDepartmentRecords(data.departments || initialDepartmentRecords);
      if (data.users) setUsers(data.users);
      setAdminAuditLogs(data.adminAuditLogs || []);
      if (["user-management", "organization-management", "organization-add"].includes(page) && !data.user.roles?.includes("admin")) setPage("division");
      if (selectedDivision && !data.user.roles?.includes("admin") && !data.user.divisions?.includes(selectedDivision)) {
        setSelectedDivision("");
        setSelectedDepartment("");
        setPage("division");
      }
      if (selectedDepartment && !data.user.roles?.includes("admin") && !data.user.departments?.includes(selectedDepartment)) {
        setSelectedDepartment("");
        setPage("division");
      }
    } catch (error) {
      console.warn("อัปเดตรายการงานจากเซิร์ฟเวอร์ไม่สำเร็จ:", error);
    } finally {
      requestInProgress = false;
    }
  };
  const refreshWhenVisible = () => {
    if (document.visibilityState === "visible") void refreshSharedRepairs();
  };
  void refreshSharedRepairs();
  const intervalId = window.setInterval(refreshSharedRepairs, 38_000);
  window.addEventListener("focus", refreshWhenVisible);
  document.addEventListener("visibilitychange", refreshWhenVisible);
  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener("focus", refreshWhenVisible);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  };
}, [hasLoadedServerData, page, selectedDepartment, selectedDivision]);

useEffect(() => {
  if (!hasLoadedServerData || !currentUser) return undefined;
  let lastSentAt = 0;
  let requestInProgress = false;
  const recordActivity = () => {
    const now = Date.now();
    if (now - lastSentAt < 15_000 || requestInProgress) return;
    lastSentAt = now;
    requestInProgress = true;
    fetch(withApiBase("/api/activity"), { method: "POST", credentials: "include", cache: "no-store" })
      .then((response) => {
        if (response.status === 401) handleSessionLogout();
      })
      .catch((error) => console.warn("ต่ออายุเซสชันไม่สำเร็จ:", error))
      .finally(() => { requestInProgress = false; });
  };
  const activityEvents = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"];
  activityEvents.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
  return () => activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
}, [hasLoadedServerData, currentUser?.userId]);

useEffect(() => {
  if (!hasLoadedServerData || !currentUser) return undefined;
  let sending = false;
  const sendPresence = async () => {
    if (document.visibilityState !== "visible" || sending) return;
    sending = true;
    try {
      await fetch(withApiBase("/api/presence"), { method: "POST", credentials: "include", cache: "no-store" });
    } catch (error) {
      console.warn("อัปเดตสถานะออนไลน์ไม่สำเร็จ:", error);
    } finally {
      sending = false;
    }
  };
  void sendPresence();
  const timer = window.setInterval(sendPresence, 15_000);
  document.addEventListener("visibilitychange", sendPresence);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", sendPresence);
  };
}, [hasLoadedServerData, currentUser?.userId]);

useEffect(() => {
  if (!showOnlineUsers || !currentUser?.roles?.includes("admin")) return undefined;
  let cancelled = false;
  let inProgress = false;
  const refreshOnlineUsers = async () => {
    if (inProgress) return;
    inProgress = true;
    try {
      const response = await fetch(withApiBase("/api/admin/online-users"), { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("โหลดรายชื่อผู้ใช้ออนไลน์ไม่สำเร็จ");
      const data = await response.json();
      if (!cancelled) setOnlineUsers(data.onlineUsers || []);
    } catch (error) {
      console.warn(error.message);
    } finally {
      inProgress = false;
    }
  };
  void refreshOnlineUsers();
  const timer = window.setInterval(refreshOnlineUsers, 5_000);
  return () => { cancelled = true; window.clearInterval(timer); };
}, [showOnlineUsers, currentUser?.userId, currentUser?.roles?.includes("admin")]);

useEffect(() => {
  if (!["user-history", "system-recovery"].includes(page) || !currentUser?.roles?.includes("admin")) return undefined;
  let cancelled = false;
  let inProgress = false;
  const refreshRecovery = async () => {
    if (inProgress) return;
    inProgress = true;
    try {
      const response = await fetch(withApiBase("/api/admin/recovery"), { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("โหลดประวัติผู้ดูแลและรายการที่ลบไม่สำเร็จ");
      const data = await response.json();
      if (cancelled) return;
      setAdminAuditLogs(data.adminAuditLogs || []);
      setDeletedUsers(data.deletedUsers || []);
      setDeletedRepairs(data.deletedRepairs || []);
    } catch (error) {
      console.warn(error.message);
    } finally {
      inProgress = false;
    }
  };
  void refreshRecovery();
  const intervalId = window.setInterval(refreshRecovery, 35_000);
  return () => { cancelled = true; window.clearInterval(intervalId); };
}, [page, currentUser?.userId, currentUser?.roles?.includes("admin")]);

useEffect(() => {
  if (!hasLoadedServerData) return;
  // Upload only entries the server doesn't have yet. Previously the whole log
  // (every entry ever loaded) was sent back on login and after each action.
  const unsavedLogs = auditLogs.filter((log) => !savedAuditLogIdsRef.current.has(String(log.id)));
  if (unsavedLogs.length === 0) return;
  markAuditLogsSaved(unsavedLogs);
  fetch(withApiBase("/api/audit-logs"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ auditLogs: unsavedLogs }),
  }).then(async (response) => {
    if (!response.ok) throw new Error((await response.json()).error || "บันทึกประวัติไม่สำเร็จ");
  }).catch((error) => {
    // Let the next change retry these entries.
    for (const log of unsavedLogs) savedAuditLogIdsRef.current.delete(String(log.id));
    console.error("บันทึกประวัติส่วนกลางไม่สำเร็จ:", error);
  });
}, [auditLogs, hasLoadedServerData]);
const addAuditLog = (repairId, action, details = "") => {
  const newLog = {
    id: Date.now(),
    repairId,
    action,
    details,
   user: currentUser?.name || userId || "admin",
    timestamp: new Date().toISOString(),
  };

  setAuditLogs((prev) => [...prev, newLog]);
};
const saveRepairStep = async (updatedRepair, action, details) => {
  if (isSavingRepairStepRef.current) return false;
  if (!hasLoadedServerData) {
    alert("ระบบยังโหลดข้อมูลจากเซิร์ฟเวอร์ไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่");
    return false;
  }
  if (!repairs.some((repair) => repair.id === updatedRepair.id)) {
    alert("ไม่พบงานนี้ในข้อมูลปัจจุบัน กรุณากลับไปโหลดรายการงานใหม่");
    return false;
  }

  isSavingRepairStepRef.current = true;
  setIsSavingRepairStep(true);
  localRepairsVersionRef.current += 1;
  const requestedLog = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    repairId: updatedRepair.id,
    action,
    details,
  };

  try {
    const response = await fetch(withApiBase("/api/repairs"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ repairs: [withoutImages(updatedRepair)], auditLogs: [requestedLog] }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "เซิร์ฟเวอร์บันทึกขั้นตอนงานไม่สำเร็จ");

    const savedRepair = result.repairs?.[0] || updatedRepair;
    const nextRepairs = repairs.map((repair) => repair.id === savedRepair.id ? savedRepair : repair);
    const savedLogs = result.auditLogs || [];
    markAuditLogsSaved(savedLogs);
    lastSavedRepairsRef.current = nextRepairs;
    localRepairsVersionRef.current += 1;
    setRepairs(nextRepairs);
    setAuditLogs((previous) => {
      const merged = new Map(previous.map((log) => [String(log.id), log]));
      for (const log of savedLogs) merged.set(String(log.id), log);
      return [...merged.values()];
    });
    setRepairData(savedRepair);
    return true;
  } catch (error) {
    try {
      const refreshResponse = await fetch(withApiBase("/api/data"), { credentials: "include", cache: "no-store" });
      if (refreshResponse.ok) {
        const latestData = await refreshResponse.json();
        const savedRepair = (latestData.repairs || []).find((repair) => repair.id === updatedRepair.id);
        const sameCommittedStep = savedRepair?.status === updatedRepair.status && (
          action === "ไม่อนุมัติงาน"
            ? JSON.stringify(savedRepair.approvalRejections || []) === JSON.stringify(updatedRepair.approvalRejections || [])
            : action === "อนุมัติงาน"
              ? savedRepair.approvedBy === updatedRepair.approvedBy && savedRepair.approvedAt === updatedRepair.approvedAt && savedRepair.approvalWorkType === updatedRepair.approvalWorkType
              : action === "เสนอเวลาซ่อม"
            ? savedRepair.timeProposedAt === updatedRepair.timeProposedAt && savedRepair.startTime === updatedRepair.startTime && savedRepair.dueTime === updatedRepair.dueTime
            : savedRepair.repairCompletedAt === updatedRepair.repairCompletedAt && savedRepair.repairWorkDetails === updatedRepair.repairWorkDetails && savedRepair.repairWorkNotes === updatedRepair.repairWorkNotes
        );
        if (sameCommittedStep) {
          const latestRepairs = latestData.repairs || [];
          localRepairsVersionRef.current += 1;
          lastSavedRepairsRef.current = latestRepairs;
          setRepairs(latestRepairs);
          markAuditLogsSaved(latestData.auditLogs);
          setAuditLogs(latestData.auditLogs || []);
          setRepairData(savedRepair);
          return true;
        }
      }
    } catch (refreshError) {
      console.error("ตรวจสอบผลบันทึกล่าสุดไม่สำเร็จ:", refreshError);
    }
    localRepairsVersionRef.current += 1;
    console.error("บันทึกขั้นตอนงานซ่อมไม่สำเร็จ:", error);
    alert(`ยังบันทึกงานไม่สำเร็จ: ${error.message}\nงานยังไม่ถูกส่งไปขั้นตอนถัดไป กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง`);
    return false;
  } finally {
    isSavingRepairStepRef.current = false;
    setIsSavingRepairStep(false);
  }
};
  const [startTime, setStartTime] = useState("");
const [dueTime, setDueTime] = useState("");

  const calculateDuration = () => {
  if (!startTime || !dueTime) {
    return "ระบบจะคำนวณให้อัตโนมัติ";
  }

  const start = new Date(startTime);
  const due = new Date(dueTime);

  if (due <= start) {
    return "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม";
  }

  const diffMinutes = Math.floor((due.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours === 0) {
    return `${minutes} นาที`;
  }

  if (minutes === 0) {
    return `${hours} ชั่วโมง`;
  }

  return `${hours} ชั่วโมง ${minutes} นาที`;
};
const handleRepairImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFiles = Array.from(event.target.files || []);
  const availableSlots = Math.max(0, maxRepairImages - repairImages.length);
  if (selectedFiles.length > availableSlots) {
    alert(`แนบรูปได้ไม่เกิน ${maxRepairImages} รูป เลือกเพิ่มได้อีก ${availableSlots} รูป`);
  }
  setRepairImages((current) => [...current, ...selectedFiles.slice(0, availableSlots)]);
  event.target.value = "";
};
const handleLogin = async () => {
  if (!userId || !password) {
    setAuthError("กรุณากรอก User และรหัสผ่าน");
    return;
  }
  setAuthError("");
  try {
    const response = await fetch(withApiBase("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId, password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
    const data = await loadAccountData();
    setCurrentUser(data.user);
      setDivisionRecords(data.divisions || initialDivisionRecords);
      setDepartmentRecords(data.departments || initialDepartmentRecords);
    setUserId(data.user.userId);
    setUsers(data.users || []);
    setRepairs(data.repairs || []);
    lastSavedRepairsRef.current = data.repairs || [];
    markAuditLogsSaved(data.auditLogs);
    setAuditLogs(data.auditLogs || []);
    setHasLoadedServerData(true);
    setPassword("");
    if (rememberPassword) localStorage.setItem("cm_userId", data.user.userId);
    else localStorage.removeItem("cm_userId");
    setPage("division");
  } catch (error) {
    setAuthError(error.message);
  }
};

const handleLogout = async () => {
  await fetch(withApiBase("/api/logout"), { method: "POST", credentials: "include" }).catch(() => {});
  setHasLoadedServerData(false);
  setCurrentUser(null);
  setSelectedDivision("");
  setSelectedDepartment("");
  setUsers([]);
  setRepairs([]);
  setAnnouncements([]);
  setDepartmentControls({});
  setDepartmentControlHistory([]);
  lastSavedRepairsRef.current = [];
  setAuditLogs([]);
  setPassword("");
  setPage("login");
};

const handleChangePassword = async (event) => {
  event.preventDefault();
  setPasswordChangeMessage("");
  setPasswordChangeError("");
  if (newPassword !== confirmNewPassword) {
    setPasswordChangeError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
    return;
  }
  try {
    const response = await fetch(withApiBase("/api/change-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    setPasswordChangeMessage(result.message);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  } catch (error) {
    setPasswordChangeError(error.message);
  }
};

const handleCreateBackup = async () => {
  setBackupBusy(true);
  setBackupMessage("");
  try {
    const response = await fetch(withApiBase("/api/admin/backup"), {
      method: "POST",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "สำรองข้อมูลไม่สำเร็จ");
    const fileName = result.backup?.fileName || "สำรองข้อมูลสำเร็จ";
    const time = result.backup?.createdAt
      ? new Date(result.backup.createdAt).toLocaleString("th-TH")
      : new Date().toLocaleString("th-TH");
    setBackupMessage(`สำรองข้อมูลเรียบร้อย: ${fileName} (${time})`);
  } catch (error) {
    setBackupMessage(`สำรองข้อมูลไม่สำเร็จ: ${error.message}`);
  } finally {
    setBackupBusy(false);
  }
};

const refreshOrganizationData = async () => {
  const data = await loadAccountData();
  setDivisionRecords(data.divisions || []);
  setDepartmentRecords(data.departments || []);
  setCurrentUser(data.user);
};
const saveOrganizationChange = async (path: string, method: string, body?: unknown) => {
  setOrganizationMessage("");
  try {
    const response = await fetch(withApiBase(path), { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "บันทึกข้อมูลไม่สำเร็จ");
    await refreshOrganizationData();
    setOrganizationMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
    return true;
  } catch (error) {
    setOrganizationMessage(`บันทึกไม่สำเร็จ: ${error.message}`);
    return false;
  }
};
const editDivisionName = async (division) => {
  const name = window.prompt("แก้ไขชื่อฝ่าย", division.name)?.trim();
  if (name && name !== division.name) await saveOrganizationChange(`/api/divisions/${encodeURIComponent(division.code)}`, "PUT", { name, active: division.active });
};
const toggleDivisionStatus = async (division) => {
  const active = !division.active;
  if (!active && !window.confirm(`ปิดใช้งานฝ่าย ${division.name} ใช่หรือไม่? ข้อมูลและประวัติงานเดิมจะยังคงอยู่`)) return;
  await saveOrganizationChange(`/api/divisions/${encodeURIComponent(division.code)}`, "PUT", { name: division.name, active });
};
const editDepartmentName = async (department) => {
  const name = window.prompt("แก้ไขชื่อแผนก", department.name)?.trim();
  if (name && name !== department.name) await saveOrganizationChange(`/api/departments/${encodeURIComponent(department.code)}`, "PUT", { name, divisionCode: department.divisionCode, active: department.active });
};
const toggleDepartmentStatus = async (department) => {
  const active = !department.active;
  if (!active && !window.confirm(`ปิดใช้งานแผนก ${department.name} ใช่หรือไม่? ข้อมูลและประวัติงานเดิมจะยังคงอยู่`)) return;
  await saveOrganizationChange(`/api/departments/${encodeURIComponent(department.code)}`, "PUT", { name: department.name, divisionCode: department.divisionCode, active });
};const deleteOrganizationItem = async (kind, item) => {
  const label = kind === "divisions" ? "ฝ่าย" : "แผนก";
  if (!window.confirm(`ต้องการลบ${label} ${item.name} ใช่หรือไม่? หากมีประวัติงาน ระบบจะไม่ลบและให้ปิดใช้งานแทน`)) return;
  await saveOrganizationChange(`/api/${kind}/${encodeURIComponent(item.code)}`, "DELETE");
};const handleAddDivision = async (event) => {
  event.preventDefault();
  const saved = await saveOrganizationChange("/api/divisions", "POST", { code: newDivisionCode, name: newDivisionName });
  if (saved) { setNewDivisionCode(""); setNewDivisionName(""); }
};
const handleAddDepartment = async (event) => {
  event.preventDefault();
  const saved = await saveOrganizationChange("/api/departments", "POST", { code: newDepartmentCode, name: newDepartmentName, divisionCode: newDepartmentDivision });
  if (saved) { setNewDepartmentCode(""); setNewDepartmentName(""); }
};const handleDepartment = (department) => {
    setSelectedDepartment(department);
    setPage("department-home");
  };

  const handleSetDepartmentControl = async (status) => {
    if (!selectedDepartment) return;
    let reason = "";
    if (status === "stop") {
      reason = window.prompt("กรุณาระบุเหตุผลที่กด STOP")?.trim() || "";
      if (!reason) {
        alert("กรุณาระบุเหตุผลก่อนกด STOP");
        return;
      }
    }
    try {
      const response = await fetch(withApiBase(`/api/department-controls/${encodeURIComponent(selectedDepartment)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เปลี่ยนสถานะหน่วยงานไม่สำเร็จ");
      setDepartmentControls((current) => ({ ...current, [result.control.department]: result.control }));
      if (result.historyItem) setDepartmentControlHistory((current) => [result.historyItem, ...current].slice(0, 100));
    } catch (error) {
      alert(error.message);
    }
  };

const handleRejectApproval = async (event, repair) => {
  event.preventDefault();
  const reason = approvalRejectReason.trim();
  if (!reason) {
    alert("กรุณาระบุเหตุผลที่ไม่อนุมัติงาน");
    return;
  }

  const rejection = {
    reason,
    rejectedBy: userId || "ผู้อนุมัติ",
    rejectedAt: new Date().toISOString(),
  };
  const previousRejections = Array.isArray(repair.approvalRejections)
    ? repair.approvalRejections
    : repair.approvalRejectedBy
      ? [{
          reason: repair.approvalRejectReason || "ไม่ระบุเหตุผล",
          rejectedBy: repair.approvalRejectedBy,
          rejectedAt: repair.approvalRejectedAt || "",
        }]
      : [];
  const updatedRepair = {
    ...repair,
    status: "รออนุมัติ",
    approvalRejections: [...previousRejections, rejection],
    approvalRejectReason: reason,
    approvalRejectedBy: rejection.rejectedBy,
    approvalRejectedAt: rejection.rejectedAt,
  };
  const saved = await saveRepairStep(
    updatedRepair,
    "ไม่อนุมัติงาน",
    `ไม่อนุมัติโดย ${rejection.rejectedBy}; งานกลับสู่สถานะรออนุมัติใหม่; เหตุผล: ${reason}`
  );
  if (!saved) return;
  setRejectingApprovalId("");
  setApprovalRejectReason("");
  setPage("approval-list");
};

const handleAddUser = async (event) => {
    event.preventDefault();

    const normalizedUserId = newUserId.trim();
    const normalizedName = newUserName.trim();

    if (!normalizedUserId || !normalizedName) {
      alert("กรุณากรอก User และชื่อผู้ใช้");
      return;
    }

    if (users.some((user) => user.userId.toLowerCase() === normalizedUserId.toLowerCase())) {
      alert("User นี้มีอยู่แล้ว กรุณาใช้รหัสอื่น");
      return;
    }

    if (newUserDivisions.length === 0) {
      alert("กรุณาเลือกฝ่ายที่ผู้ใช้มีสิทธิ์อย่างน้อย 1 ฝ่าย");
      return;
    }

    if (newUserDivisions.length > 0 && newUserDepartments.length === 0) {
      alert("กรุณาเลือกแผนกที่รับผิดชอบอย่างน้อย 1 แผนก");
      return;
    }

    if (newUserRoles.length === 0) {
      alert("กรุณาเลือกบทบาทหรือสิทธิ์อย่างน้อย 1 อย่าง");
      return;
    }

    if (newUserRoles.includes("technician") && newUserRepairUnits.length === 0) {
      alert("กรุณาเลือกหน่วยงานซ่อมให้ช่างอย่างน้อย 1 หน่วยงาน");
      return;
    }

    if (newUserPassword.length < 6) {
      alert("กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร");
      return;
    }

    try {
      const response = await fetch(withApiBase("/api/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: normalizedUserId,
          name: normalizedName,
          password: newUserPassword,
          roles: newUserRoles,
          divisions: newUserDivisions,
          departments: newUserDepartments,
          repairUnits: newUserRepairUnits,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกบัญชีไม่สำเร็จ");
      setUsers((currentUsers) => [...currentUsers, result.user]);
    } catch (error) {
      alert(error.message);
      return;
    }
    setNewUserId("");
    setNewUserName("");
    setNewUserPassword("");
    setNewUserRoles(["user"]);
    setNewUserRepairUnits([]);
    setNewUserDivisions(["RM"]);
    setNewUserDepartments([]);
    setPage("user-management");
  };

  const handleAdminResetPassword = async (event, targetUserId) => {
    event.preventDefault();
    if (adminResetPassword.length < 6) {
      alert("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    try {
      const response = await fetch(withApiBase(`/api/users/${encodeURIComponent(targetUserId)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: adminResetPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
      setAdminResetPassword("");
      setResettingUserId("");
      alert("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว แจ้งรหัสใหม่นี้แก่ผู้ใช้ผ่านช่องทางที่ปลอดภัย");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSaveUserPermissions = async (event, targetUserId) => {
    event.preventDefault();
    if (!editingUserRoles.length || !editingUserDivisions.length || (editingUserDivisions.length > 0 && !editingUserDepartments.length) || (editingUserRoles.includes("technician") && !editingUserRepairUnits.length)) {
      alert("กรุณาเลือกบทบาท ฝ่าย และแผนกที่รับผิดชอบอย่างน้อย 1 รายการ");
      return;
    }
    try {
      const response = await fetch(withApiBase(`/api/users/${encodeURIComponent(targetUserId)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roles: editingUserRoles, divisions: editingUserDivisions, departments: editingUserDepartments, repairUnits: editingUserRepairUnits }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกสิทธิ์ผู้ใช้ไม่สำเร็จ");
      setUsers((currentUsers) => currentUsers.map((item) => item.userId === targetUserId ? result.user : item));
      if (currentUser?.userId === targetUserId) {
        setCurrentUser(result.user);
        if (!result.user.roles?.includes("admin")) setPage("division");
      }
      setEditingUserId("");
      alert("บันทึกสิทธิ์ผู้ใช้เรียบร้อยแล้ว");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`ยืนยันลบบัญชี ${targetUser.userId} (${targetUser.name}) ใช่หรือไม่? บัญชีจะถูกปิดใช้งานและกู้คืนได้จากส่วน “รายการที่ลบ”`)) return;
    try {
      const response = await fetch(withApiBase(`/api/users/${encodeURIComponent(targetUser.userId)}`), {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ลบผู้ใช้ไม่สำเร็จ");
      setUsers((currentUsers) => currentUsers.filter((item) => item.userId !== targetUser.userId));
      if (editingUserId === targetUser.userId) setEditingUserId("");
      alert("ปิดใช้งานบัญชีแล้ว หากลบผิดสามารถกู้คืนได้จากส่วนรายการที่ลบ");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteRepair = async () => {
    if (!repairData?.id) return;
    if (!window.confirm(`ยืนยันย้ายงาน ${repairData.id} สถานะ “${repairData.status || "ไม่ทราบสถานะ"}” ไปยังรายการที่ลบหรือไม่? งานจะหายจากรายการปกติ แต่กู้คืนได้พร้อมประวัติเดิม`)) return;
    try {
      const response = await fetch(withApiBase(`/api/repairs/${encodeURIComponent(repairData.id)}`), {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ลบงานไม่สำเร็จ");
      const deletedId = repairData.id;
      setRepairs((currentRepairs) => currentRepairs.filter((item) => item.id !== deletedId));
      setRepairData(null);
      setPage("department-home");
      alert("ย้ายงานไปยังรายการที่ลบแล้ว สามารถกู้คืนพร้อมประวัติเดิมได้จากหน้าจัดการผู้ใช้");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRestoreDeleted = async (type, targetId) => {
    const kind = type === "user" ? "ผู้ใช้" : "งานแจ้งซ่อม";
    if (!window.confirm(`ยืนยันกู้คืน${kind} ${targetId} ใช่หรือไม่?`)) return;
    try {
      const response = await fetch(withApiBase(`/api/admin/recovery/${type}/${encodeURIComponent(targetId)}`), {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `กู้คืน${kind}ไม่สำเร็จ`);
      const data = await loadAccountData();
      setUsers(data.users || []);
      setRepairs(data.repairs || []);
      lastSavedRepairsRef.current = data.repairs || [];
      markAuditLogsSaved(data.auditLogs);
      setAuditLogs(data.auditLogs || []);
      setAdminAuditLogs(data.adminAuditLogs || []);
      alert(`กู้คืน${kind}เรียบร้อยแล้ว`);
    } catch (error) {
      alert(error.message);
    }
  };

  const overdueRepairs = repairs.filter((repair) => {
    const dueDate = repair.dueTime ? new Date(repair.dueTime) : null;
    return repair.status === "กำลังซ่อม" &&
      repair.department === selectedDepartment &&
      dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
  });
  const visibleReportImages = repairData?.images?.slice(0, 8) || [];
  const isAdmin = currentUser?.roles?.includes("admin") === true;
  const getRequesterName = (repair) => {
    if (!repair) return "ไม่ระบุ";
    if (repair.requesterName) return repair.requesterName;
    if (repair.requester && currentUser?.userId?.toLocaleLowerCase() === repair.requester.toLocaleLowerCase() && currentUser.name) return currentUser.name;
    return users.find((item) => item.userId?.toLocaleLowerCase() === repair.requester?.toLocaleLowerCase())?.name || repair.requester || "ไม่ระบุ";
  };
  const getUserDisplayName = (userId) => {
    if (!userId) return "ไม่ระบุ";
    if (currentUser?.userId?.toLocaleLowerCase() === userId.toLocaleLowerCase() && currentUser.name) return currentUser.name;
    return users.find((item) => item.userId?.toLocaleLowerCase() === userId.toLocaleLowerCase())?.name || userId;
  };
  const getInspectorName = (repair) => repair?.inspectedByName || getUserDisplayName(repair?.inspectedBy);
  const hasRole = (role) => isAdmin || currentUser?.roles?.includes(role) === true;
  const canApprove = hasRole("approver");
  const canRepair = hasRole("technician");
  const canRepairUnit = (repair) => isAdmin || !currentUser?.roles?.includes("technician") || currentUser?.repairUnits?.includes(getRepairUrgencyInfo(repair?.urgency).value);
  const canInspect = hasRole("inspector");
  const canRequestRepair = hasRole("user");
  const canSetDepartmentStatus = hasRole("production-control");
  const visibleDivisions = isAdmin
    ? divisions
    : divisions.filter((division) => currentUser?.divisions?.includes(division));
  const userManagementQuery = userManagementSearch.trim().toLocaleLowerCase();
  const managedUserGroups = (userManagementDivision === "all" ? divisions : [userManagementDivision])
    .map((division) => ({
      division,
      users: users.filter((user) => {
        const userDivisions = user.divisions?.length ? user.divisions : ["RM"];
        const belongsToDivision = userDivisions.includes(division);
        const matchesQuery = !userManagementQuery || [
          user.name,
          user.userId,
          ...(user.roles || []),
          ...(user.departments || []),
          ...(user.divisions || []),
        ].some((value) => String(value || "").toLocaleLowerCase().includes(userManagementQuery));
        return belongsToDivision && matchesQuery;
      }),
    }))
    .filter((group) => group.users.length > 0 || !userManagementQuery);
  const userLifecycleLogs = adminAuditLogs.filter((log) =>
    log.targetType === "ผู้ใช้" && userLifecycleActions.has(log.action)
  );
  const visibleRepairDepartments = isAdmin
    ? departments
    : departments.filter((department) => currentUser?.departments?.includes(department));
  const filteredRepairHistory = repairs.filter((repair) => {
    const department = repairDepartmentFilter || selectedDepartment;
    if (!department || repair.department !== department) return false;
    const query = repairSearchTerm.trim().toLocaleLowerCase();
    if (query && ![repair.id, repair.machineCode, repair.machineName, repair.department]
      .some((value) => String(value || "").toLocaleLowerCase().includes(query))) return false;
    const auditDate = auditLogs
      .filter((log) => log.repairId === repair.id)
      .map((log) => log.timestamp || log.createdAt)
      .filter(Boolean)
      .sort()[0];
    const createdDate = repair.createdAt || auditDate;
    const date = createdDate ? new Date(createdDate) : null;
    const localDate = date && !Number.isNaN(date.getTime())
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      : "";
    if (repairDateFrom && (!localDate || localDate < repairDateFrom)) return false;
    if (repairDateTo && (!localDate || localDate > repairDateTo)) return false;
    return true;
  });
  const normalizedMachineCode = machineCode.trim().toLocaleUpperCase();
  const machineCodeHistory = repairs.filter((repair) =>
    repair.department === selectedDepartment &&
    normalizedMachineCode &&
    String(repair.machineCode || "").trim().toLocaleUpperCase() === normalizedMachineCode
  );
  const knownMachineCodes = [...new Map(repairs
    .filter((repair) => repair.department === selectedDepartment && String(repair.machineCode || "").trim())
    .map((repair) => [String(repair.machineCode).trim().toLocaleUpperCase(), String(repair.machineCode).trim()])).values()];
  const rejectedHistoryRepairs = repairs.filter((repair) =>
    repair.department === selectedDepartment && isInRejectedHistory(repair)
  );
  const departmentsInSelectedDivision = (divisionDepartments[selectedDivision] || []).filter((department) => visibleRepairDepartments.includes(department));
  const divisionRepairSearchQuery = divisionRepairSearchTerm.trim().toLocaleLowerCase();
  const divisionRepairSearchResults = divisionRepairSearchQuery
    ? repairs.filter((repair) => {
        if (!departmentsInSelectedDivision.includes(repair.department)) return false;
        return [repair.id, repair.machineCode, repair.machineName, repair.problemDescription, repair.department, repair.status]
          .some((value) => String(value || "").toLocaleLowerCase().includes(divisionRepairSearchQuery));
      }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    : [];
  const assignmentQueueDepartments = assignmentQueueAllDepartments
    ? departmentsInSelectedDivision
    : [selectedDepartment].filter((department) => department && visibleRepairDepartments.includes(department) && departmentRecords.find((record) => record.code === department)?.divisionCode === selectedDivision);
  const assignmentRepairs = repairs.filter((repair) =>
    repair.status === "รอรับงาน" && assignmentQueueDepartments.includes(repair.department) && canRepairUnit(repair)
  );
  const divisionAssignmentRepairs = repairs.filter((repair) =>
    repair.status === "รอรับงาน" && departmentsInSelectedDivision.includes(repair.department) && canRepairUnit(repair)
  );
  const workTypeFilteredAssignmentRepairs = assignmentRepairs.filter((repair) =>
    repairAssignmentWorkTypeFilter === "all" || repair.approvalWorkType === repairAssignmentWorkTypeFilter
  );
  const visibleAssignmentRepairs = workTypeFilteredAssignmentRepairs.filter((repair) =>
    repairAssignmentUnitFilter === "all" || getRepairUrgencyInfo(repair.urgency).value === repairAssignmentUnitFilter
  );
const handleAnnouncementFiles = async (fileList: FileList | File[] | null | undefined) => {
  if (!isAdmin || announcementSaving) return;
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const invalidFiles = files.filter((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type));
  if (invalidFiles.length) {
    setAnnouncementError("รองรับรูปภาพ JPG, PNG หรือ WebP");
    return;
  }
  setAnnouncementSaving(true);
  setAnnouncementError("");
  try {
    for (const file of files) {
      const imageData = await fileToDataUrl(file);
      if (imageData.length > 8_500_000) throw new Error("ไฟล์ภาพใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดเล็กลง");
      const response = await fetch(withApiBase("/api/announcements"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageData }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เพิ่มรูปประกาศไม่สำเร็จ");
      announcementImageCacheRef.current.set(result.announcement.id, result.announcement.imageData);
      setAnnouncements((current) => [result.announcement, ...current]);
    }
  } catch (error) {
    setAnnouncementError(error.message || "เพิ่มรูปประกาศไม่สำเร็จ");
  } finally {
    setAnnouncementSaving(false);
    if (announcementFileInputRef.current) announcementFileInputRef.current.value = "";
  }
};
const handleDeleteAnnouncement = async (announcement) => {
  if (!isAdmin) return;
  try {
    const response = await fetch(withApiBase(`/api/announcements/${encodeURIComponent(announcement.id)}`), {
      method: "DELETE",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "ลบประกาศไม่สำเร็จ");
    announcementImageCacheRef.current.delete(announcement.id);
    setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
  } catch (error) {
    setAnnouncementError(error.message || "ลบประกาศไม่สำเร็จ");
  }
};

  return (
    <div className={`app ${page !== "login" ? "app-has-back-navigation" : ""}`}>
      <button
        type="button"
        className="theme-toggle-button no-print"
        onClick={() => setAppTheme((theme) => theme === "light" ? "dark" : "light")}
        aria-label={appTheme === "light" ? "เปลี่ยนเป็นโหมดกลางคืน" : "เปลี่ยนเป็นโหมดกลางวัน"}
        title={appTheme === "light" ? "เปลี่ยนเป็นโหมดกลางคืน" : "เปลี่ยนเป็นโหมดกลางวัน"}
      >
        <span aria-hidden="true">{appTheme === "light" ? "🌙" : "☀️"}</span>
        <span>{appTheme === "light" ? "กลางคืน" : "กลางวัน"}</span>
      </button>
      {currentUser && page !== "login" && (
        <button
          className="global-logout-button"
          type="button"
          onClick={handleLogout}
          aria-label="ออกจากระบบ"
        >
          ออกจากระบบ
        </button>
      )}

      {/* ================= LOGIN ================= */}
      {page === "login" && (
        <main className="login-container">
          <div className="login-gear-scene" aria-hidden="true">
            <div className="login-gear-grid" />
            <div className="login-glow login-glow-one" />
            <div className="login-glow login-glow-two" />
            <div className="login-gear-orbit login-orbit-one" />
            <div className="login-gear-orbit login-orbit-two" />
            <LoginGearGraphic className="login-gear-hero" />
            <LoginGearGraphic className="login-gear-medium" />
            <LoginGearGraphic className="login-gear-small" />
            <LoginGearGraphic className="login-gear-lower" />
            <span className="login-spark login-spark-one" />
            <span className="login-spark login-spark-two" />
            <span className="login-spark login-spark-three" />
          </div>
          <div className="login-banner">
            <div className="login-banner-content">
              <span className="login-overline"><span /> ENGINEERING · MAINTENANCE SYSTEM</span>
              <div className="cm-logo">ART</div>
              <h1>ระบบบริหารงานแจ้งซ่อม</h1>
              <p>ART Maintenance System</p>
              <div className="login-banner-divider" />
              <div className="login-banner-caption">แจ้งซ่อม · ติดตามงาน · ตรวจสอบประวัติ</div>
            </div>
            <div className="login-banner-index" aria-hidden="true">ART<span> / </span>01</div>
          </div>

          <div className="login-card">
            <div className="login-card-heading">
              <span className="login-card-mark" aria-hidden="true">✦</span>
              <div>
                <span className="login-card-overline">SECURE WORKSPACE</span>
                <h2>เข้าสู่ระบบ</h2>
              </div>
              <span className="login-card-status"><i /> ART SYSTEM</span>
            </div>

            <label>User</label>
            <input
              type="text"
              placeholder="กรอก User"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />

            <label>รหัสผ่าน</label>

            <div className="password-box">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "ซ่อน" : "แสดง"}
              </button>
            </div>

<label className="remember-password">
  <input
    type="checkbox"
    checked={rememberPassword}
    onChange={(e) => setRememberPassword(e.target.checked)}
  />
  จำ User ไว้ในเครื่องนี้
</label>
            {authError && <p className="login-error" role="alert">{authError}</p>}
            <button className="login-button" onClick={handleLogin}>
              เข้าสู่ระบบ
            </button>

            <p className="forgot-button">ลืมรหัสผ่านใช่ไหม? กรุณาติดต่อผู้ดูแลระบบ</p>
          </div>

          <footer>ART Maintenance System</footer>
        </main>
      )}
      {/* ================= COMPLETED LIST ================= */}
{page === "completed-list" && (
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
)}
{/* ================= REPAIRING LIST ================= */}
{page === "repairing-list" && (
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
)}
{/* ================= REPAIR LIST ================= */}
{page === "repairs" && (
  <main className="repairs-container">
    <div className="repairs-header">
      <div className="cm-logo">ART</div>

      <h1>งานแจ้งซ่อมทั้งหมด</h1>

      <p>
        แผนก: <strong>{departmentName(selectedDepartment)}</strong>
      </p>
    </div>

    <div className="repair-search repair-history-filters">
      <input type="search" value={repairSearchTerm}
        onChange={(event) => setRepairSearchTerm(event.target.value)}
        placeholder="ค้นหาเลขงาน รหัส หรือชื่อเครื่องจักร"
        aria-label="ค้นหาเลขงาน รหัสเครื่องจักร หรือชื่อเครื่องจักร" />
      <select value={repairDepartmentFilter || selectedDepartment}
        onChange={(event) => setRepairDepartmentFilter(event.target.value)} aria-label="กรองตามแผนก">
        {visibleRepairDepartments.map((department) => <option key={department} value={departmentName(department)}>{departmentName(department)}</option>)}
      </select>
      <label>ตั้งแต่ <input type="date" value={repairDateFrom} onChange={(event) => setRepairDateFrom(event.target.value)} /></label>
      <label>ถึง <input type="date" value={repairDateTo} onChange={(event) => setRepairDateTo(event.target.value)} /></label>
      <button type="button" className="back-button" onClick={() => {
        setRepairSearchTerm(""); setRepairDepartmentFilter(selectedDepartment);
        setRepairDateFrom(""); setRepairDateTo("");
      }}>ล้างตัวกรอง</button>
      <span className="repair-history-count">พบ {filteredRepairHistory.length} งาน</span>
    </div>

    <div className="repair-list">

   {filteredRepairHistory.length === 0 ? (
     <div className="no-repair">
       ไม่พบงานตามเงื่อนไขที่เลือก
     </div>
   ) : filteredRepairHistory.map((repair) => (
  <div className="repair-card" key={repair.id}>
    <div className="repair-card-top">
      <strong>{repair.id}</strong>

      <span className="repair-status waiting">
        {repair.status}
      </span>
    </div>

    <div className={`repair-urgency-badge ${getRepairUrgencyInfo(repair.urgency).color}`}>
      {getRepairUrgencyInfo(repair.urgency).icon} {getRepairUrgencyInfo(repair.urgency).label}
    </div>

    <h2>{repair.machineName || "ไม่มีข้อมูลเครื่องจักร"}</h2>
      {repair.machineCode && <p><strong>รหัสเครื่องจักร:</strong> {repair.machineCode}</p>}

    <p>
      อาการ: {repair.problemDescription || "ไม่มีข้อมูลอาการเสีย"}
    </p>

    <p>
      ผู้แจ้ง: <strong>{repair.requester}</strong>
    </p>

      <p>ผู้รับผิดชอบ: <span>{repair.acceptedBy || "รอมอบหมาย"}</span></p>

    <button
      className="repair-detail-button"
      onClick={() => {
        setRepairData(repair);
        setPage("repair-detail");
      }}
    >
      ดูรายละเอียดงาน
    </button>
  </div>
))}
    </div>

    <button
      className="repair-new-button"
      onClick={() => setPage("new-repair")}
    >
      ＋ แจ้งซ่อมใหม่
    </button>

    <button
      className="back-button"
      onClick={() => setPage("department-home")}
    >
      ← กลับหน้าหลักแผนก
    </button>

    
    <footer>ART Maintenance System</footer>
  </main>
)}
      {page === "new-repair" && (
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
)}
      
      




{/* ================= REPAIR TIME ================= */}
{page === "repair-time" && (
  <main className="repair-time-container">

    <div className="repair-time-header">
      <div className="cm-logo">ART</div>

      <h1>เสนอเวลาซ่อม</h1>

      <div className="repair-time-job-number">
{repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="repair-time-status">
        รอเสนอเวลาซ่อม
      </div>
    </div>

    {/* ข้อมูลงาน */}
    <section className="repair-time-card">
      <h2>📋 ข้อมูลงาน</h2>

      <div className="repair-time-row">
        <span>แผนก</span>
        <strong>{departmentName(selectedDepartment)}</strong>
      </div>

      <div className="repair-time-row">
        <span>เครื่องจักร</span>
   <strong>{repairData?.machineName || "ไม่มีข้อมูลเครื่องจักร"}</strong>
      </div>
      <div className="repair-time-row"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>
      <div className="repair-time-row">
  <span>อาการ / ปัญหา</span>
  <strong>{repairData?.problemDescription || "ไม่มีข้อมูลอาการเสีย"}</strong>
</div>

      <div className="repair-time-row">
        <span>ผู้รับผิดชอบ</span>
        <strong>{personName(repairData?.acceptedBy, "รอมอบหมาย")}</strong>
      </div>
    </section>

    {/* เสนอเวลา */}
    <section className="repair-time-card">
      <h2>🕒 กำหนดเวลาซ่อม</h2>

      <label className="repair-time-label">
        วันและเวลาเริ่มซ่อม
      </label>

<div className="datetime-picker-box">
  <input
    id="start-time-input"
    className="repair-time-input"
    type="datetime-local"
    value={startTime}
    onChange={(e) => setStartTime(e.target.value)}
  />

  <button
    type="button"
    className="datetime-picker-button"
    onClick={() => (document.getElementById("start-time-input") as HTMLInputElement | null)?.showPicker()}
  >
    📅
  </button>
</div>
      

      <label className="repair-time-label">
        วันและเวลาคาดว่าจะเสร็จ
      </label>

<div className="datetime-picker-box">
  <input
    id="due-time-input"
    className="repair-time-input"
    type="datetime-local"
    value={dueTime}
    onChange={(e) => setDueTime(e.target.value)}
  />

  <button
    type="button"
    className="datetime-picker-button"
    onClick={() => (document.getElementById("due-time-input") as HTMLInputElement | null)?.showPicker()}
  >
    📅
  </button>
</div>
      <div className="duration-box">
        ระยะเวลาซ่อม
       <strong>{calculateDuration()}</strong>
      </div>

      {canRepair && <button
        className="submit-repair-time-button"
disabled={isSavingRepairStep}
onClick={async () => {
  if (!startTime || !dueTime) {
    alert("กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด");
    return;
  }
  const proposedStart = new Date(startTime);
  const proposedDue = new Date(dueTime);
  if (Number.isNaN(proposedStart.getTime()) || Number.isNaN(proposedDue.getTime()) || proposedDue <= proposedStart) {
    alert("เวลาคาดว่าจะเสร็จต้องอยู่หลังเวลาเริ่มซ่อม");
    return;
  }

  const updatedRepair = {
    ...repairData,
    startTime,
    dueTime,
    proposedDuration: calculateDuration(),
    timeProposedBy: userId,
    timeProposedAt: new Date().toISOString(),
    status: "กำลังซ่อม",
  };
  const saved = await saveRepairStep(
    updatedRepair,
    "เสนอเวลาซ่อม",
    `เสนอเวลาซ่อม ${startTime} ถึง ${dueTime} รวม ${calculateDuration()}`
  );
  if (saved) setPage("repair-execution");
}}
      >
        {isSavingRepairStep ? "กำลังบันทึกเวลาซ่อม…" : "✓ เสนอเวลาซ่อม"}
      </button>}
    </section>

    {/* ประวัติ */}
    <section className="repair-time-card">
      <h2>📜 ประวัติการเสนอเวลา</h2>

      <div className="time-history">
        <strong>ยังไม่มีการเสนอเวลา</strong>
        <p>เมื่อมีการเสนอเวลา ระบบจะแสดงประวัติไว้ที่นี่</p>
      </div>
    </section>

    <button
      className="back-button"
      onClick={() => setPage("repair-assignment")}
    >
      ← กลับหน้ารับผิดชอบงาน
    </button>

    <footer>ART Maintenance System</footer>

  </main>
)}


{/* ================= REPAIR TIME LIST ================= */}
{page === "repair-time-list" && (
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
)}
{/* ================= REPAIR TIME REVIEW ================= */}
{page === "repair-time-review" && (
  <main className="repair-time-review-container">

    <div className="repair-time-review-header">
      <div className="cm-logo">ART</div>
      <h1>ตรวจสอบเวลาซ่อม</h1>

      <div className="repair-time-review-job-number">
  {repairData?.id || "ไม่พบเลขงาน"}
      </div>

 <div className="repair-time-review-status">
  รอซ่อม
</div>
    </div>

    <section className="repair-time-review-card">
      <h2>🔧 รายละเอียดงานซ่อม</h2>

      <div className="review-info">
        <span>แผนก</span>
        <strong>{selectedDepartment || "Agg1"}</strong>
      </div>

      <div className="review-info">
        <span>เครื่องจักร / อุปกรณ์</span>
   <strong>{repairData?.machineName || "ไม่มีข้อมูลเครื่องจักร"}</strong>
      </div>
      <div className="review-info"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>

      <div className="review-info">
        <span>อาการเสีย</span>
<strong>{repairData?.problemDescription || "ไม่มีข้อมูลอาการเสีย"}</strong>
      </div>
    </section>

    <section className="repair-time-review-card">
      <h2>👨‍🔧 ผู้รับผิดชอบ</h2>

      <div className="review-info">
        <span>ผู้เสนอเวลาซ่อม</span>
        <strong>{personName(repairData?.timeProposedBy || repairData?.acceptedBy, "ยังไม่ได้ระบุ")}</strong>
      </div>
    </section>

    <section className="repair-time-review-card">
      <h2>🕐 เวลาซ่อมที่เสนอ</h2>

      <div className="review-time-box">
        <span>วันและเวลาเริ่มซ่อม</span>
        <strong>
{formatThaiDateTime(repairData?.startTime, "ยังไม่ได้ระบุ")}
        </strong>
      </div>

      <div className="review-time-box">
        <span>วันและเวลาคาดว่าจะเสร็จ</span>
        <strong>
   {formatThaiDateTime(repairData?.dueTime, "ยังไม่ได้ระบุ")}
        </strong>
      </div>

      <div className="review-duration-box">
        <span>ระยะเวลาซ่อม</span>
   <strong>{repairData?.proposedDuration || "ยังไม่ได้ระบุ"}</strong>
      </div>
    </section>
{canRepair && <button
  className="start-repair-button"
  onClick={() => {
    const updatedRepair = {
      ...repairData,
      status: "กำลังซ่อม",
      repairStartedAt: new Date().toISOString(),
    };

    setRepairs((prev) =>
      prev.map((item) =>
        item.id === repairData?.id ? updatedRepair : item
      )
    );
    addAuditLog(
  repairData.id,
  "เริ่มซ่อม",
  `เริ่มซ่อมโดย ${userId || "admin"}`
);

    setRepairData(updatedRepair);
    setPage("repair-execution");
  }}
>
  🔧 เริ่มซ่อม
</button>}
    <button
      className="back-button"
      onClick={() => setPage("repair-time")}
    >
      ← กลับไปหน้าเสนอเวลาซ่อม
    </button>

    <footer>ART Maintenance System</footer>

  </main>
)}
{/* ================= INSPECTION LIST ================= */}
{page === "inspection-list" && (
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
)}

{/* ================= REPAIR EXECUTION ================= */}
{page === "repair-execution" && (
  <main className="repair-execution-container">

    <div className="repair-execution-header">
      <div className="cm-logo">ART</div>

      <h1>กำลังซ่อม</h1>

      <div className="repair-execution-job-number">
    {repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="repair-execution-status">
        🔧 กำลังซ่อม
      </div>
    </div>

    <section className="repair-execution-card">
      <h2>🔧 รายละเอียดงานซ่อม</h2>

      <div className="execution-info">
        <span>แผนก</span>
        <strong>{selectedDepartment || "Agg1"}</strong>
      </div>

      <div className="execution-info">
        <span>เครื่องจักร / อุปกรณ์</span>
      <strong>{repairData?.machineName || "ไม่พบข้อมูล"}</strong>
      </div>
      <div className="execution-info"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>

      <div className="execution-info">
        <span>อาการเสีย</span>
    <strong>{repairData?.problemDescription || "ไม่พบข้อมูล"}</strong>
      </div>
    </section>

    <section className="repair-execution-card">
      <h2>👨‍🔧 ผู้รับผิดชอบ</h2>

      <div className="execution-info">
        <span>ผู้รับผิดชอบงาน</span>
        <strong>{personName(repairData?.acceptedBy)}</strong>
      </div>

      <div className="execution-info">
        <span>ผู้อนุมัติงาน</span>
        <strong>{personName(repairData?.approvedBy)}</strong>
      </div>
    </section>

    <section className="repair-execution-card">
      <h2>🕐 กำหนดเวลาซ่อม</h2>

      {/* Use the saved times. The local inputs are only filled on the device that proposed them. */}
      <div className="execution-time-box">
        <span>เริ่มซ่อม</span>
        <strong>
          {(repairData?.startTime || startTime)
            ? new Date(repairData?.startTime || startTime).toLocaleString("th-TH")
            : "ยังไม่ได้ระบุ"}
        </strong>
      </div>

      <div className="execution-time-box">
        <span>คาดว่าจะเสร็จ</span>
        <strong>
          {(repairData?.dueTime || dueTime)
            ? new Date(repairData?.dueTime || dueTime).toLocaleString("th-TH")
            : "ยังไม่ได้ระบุ"}
        </strong>
      </div>

      <div className="execution-duration-box">
        <span>ระยะเวลาซ่อม</span>
        <strong>{repairData?.proposedDuration || calculateDuration()}</strong>
      </div>
    </section>

    <section className="repair-execution-card">
      <h2>📝 การดำเนินงาน</h2>

      <label className="execution-label">
        รายละเอียดการซ่อม
      </label>

      <textarea
        className="execution-textarea"
        value={repairWorkDetails}
        onChange={(event) => setRepairWorkDetails(event.target.value)}
        placeholder="บันทึกรายละเอียดการซ่อม..."
      />

      <label className="execution-label">
        หมายเหตุเพิ่มเติม *
      </label>

      <textarea
        className="execution-textarea"
        value={repairWorkNotes}
        onChange={(event) => setRepairWorkNotes(event.target.value)}
        placeholder="กรอกหมายเหตุเพิ่มเติมก่อนส่งตรวจงาน"
        required
        aria-required="true"
      />
    </section>

    {canRepair && <button
      className="complete-repair-button"
      disabled={isSavingRepairStep}
      onClick={async () => {
  if (!repairWorkDetails.trim()) {
    alert("กรุณาบันทึกรายละเอียดการซ่อมก่อนส่งตรวจงาน");
    return;
  }
  if (!repairWorkNotes.trim()) {
    alert("กรุณาระบุหมายเหตุเพิ่มเติมก่อนส่งตรวจงาน");
    return;
  }
  const updatedRepair = {
    ...repairData,
    repairWorkDetails: repairWorkDetails.trim(),
    repairWorkNotes: repairWorkNotes.trim(),
    status: "รอตรวจงาน",
    repairCompletedAt: new Date().toISOString(),
  };
  const saved = await saveRepairStep(
    updatedRepair,
    "ส่งตรวจงาน",
    `แจ้งซ่อมเสร็จโดย ${userId || "admin"} และส่งงานให้ตรวจ`
  );
  if (saved) setPage("inspection");
}}
    >
      {isSavingRepairStep ? "กำลังบันทึกและส่งตรวจ…" : "✓ แจ้งซ่อมเสร็จ / ส่งตรวจงาน"}
    </button>}

    <button
      className="back-button"
      onClick={() => setPage("repair-time-review")}
    >
      ← กลับหน้าตรวจสอบเวลาซ่อม
    </button>

    <footer>ART Maintenance System</footer>

  </main>
)}
{/* ================= INSPECTION ================= */}
{page === "inspection" && (
  <main className="inspection-container">

    <div className="inspection-header">
      <div className="cm-logo">ART</div>
      <h1>ตรวจงานซ่อม</h1>

      <div className="inspection-job-number">
        {repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="inspection-status">
        รอตรวจงาน
      </div>
    </div>

    <section className="inspection-card">
      <h2>📋 ข้อมูลงาน</h2>

      <div className="inspection-info">
        <span>แผนก</span>
        <strong>
          {departmentName(repairData?.department || selectedDepartment)}
        </strong>
      </div>

      <div className="inspection-info">
        <span>เครื่องจักร</span>
        <strong>
          {repairData?.machineName || "ไม่พบข้อมูล"}
        </strong>
      </div>
      <div className="inspection-info"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>

      <div className="inspection-info">
        <span>อาการเสีย</span>
        <strong>
          {repairData?.problemDescription || "ไม่พบข้อมูล"}
        </strong>
      </div>
    </section>

    <section className="inspection-card">
      <h2>🔧 ผลการตรวจงาน</h2>

      {canInspect && <>
      <button
        className="inspection-pass-button"
        onClick={async () => {
          const updatedRepair = {
            ...repairData,
            status: "จบงาน",
            inspectedBy: currentUser?.userId || userId || "ผู้ตรวจงาน",
            inspectedAt: new Date().toISOString(),
          };

          const saved = await saveRepairStep(updatedRepair, "ตรวจงานผ่าน", "ตรวจงานผ่านและปิดงานโดย " + (userId || "admin"));
          if (!saved) return;
          alert("ตรวจงานผ่าน และปิดงานเรียบร้อยแล้ว");
          setPage("repair-pdf");
        }}
      >
        ✓ ผ่านการตรวจงาน / จบงาน
      </button>

      <button
        className="inspection-fail-button"
        onClick={async () => {
          const reason = prompt(
            "กรุณาระบุเหตุผลที่ไม่ผ่านการตรวจงาน"
          );

          if (!reason || !reason.trim()) {
            return;
          }

          const updatedRepair = {
            ...repairData,
            status: "กำลังซ่อม",
            inspectionRejectReason: reason.trim(),
            inspectionRejectedAt: new Date().toISOString(),
            inspectionRejectedBy: userId || "ผู้ตรวจงาน",
          };

          const saved = await saveRepairStep(updatedRepair, "ตรวจงานไม่ผ่าน", "ตรวจงานไม่ผ่านโดย " + (userId || "ผู้ตรวจงาน") + "; ส่งกลับให้ช่างซ่อม; เหตุผล: " + reason.trim());
          if (!saved) return;
          alert("บันทึกผลตรวจไม่ผ่าน และส่งกลับงานซ่อมแล้ว");
          setPage("repair-execution");
        }}
      >
        ✕ ไม่ผ่านการตรวจงาน / ส่งกลับซ่อม
      </button>
      </>}
    </section>

    <button
      className="back-button"
      onClick={() => setPage("department-home")}
    >
      ← กลับหน้าหลัก
    </button>

    <footer>ART Maintenance System</footer>

  </main>
)}
{/* ================= REJECTED LIST ================= */}
{page === "rejected-list" && (
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
)}
{/* ================= REPAIR ASSIGNMENT ================= */}
{page === "repair-assignment" && (
  <main className="assignment-container">

    <div className="assignment-header">
      <div className="cm-logo">ART</div>

      <h1>รับผิดชอบงานซ่อม</h1>

      <div className="assignment-job-number">
{repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="assignment-status">
        รอรับงาน
      </div>
    </div>

    {/* ข้อมูลงาน */}
    <section className="assignment-card">
      <h2>📋 ข้อมูลงาน</h2>

      <div className="assignment-row">
        <span>แผนก</span>
        <strong>{departmentName(repairData?.department || selectedDepartment)}</strong>
      </div>

      <div className="assignment-row">
        <span>เครื่องจักร</span>
<strong>{repairData?.machineName || "ไม่มีข้อมูลเครื่องจักร"}</strong>
      </div>
      <div className="assignment-row"><span>รหัสเครื่องจักร</span><strong>{repairData?.machineCode || "ไม่ระบุ"}</strong></div>

      <div className="assignment-row">
        <span>อาการ / ปัญหา</span>
  <strong>{repairData?.problemDescription || "ไม่มีข้อมูลอาการเสีย"}</strong>
      </div>
    </section>

    {/* ผู้เกี่ยวข้อง */}
    {/* รูปภาพปัญหา */}
<section className="assignment-card">
  <h2>📷 รูปภาพปัญหา</h2>

  {repairImagesError ? (
    <div className="assignment-no-photo">โหลดรูปภาพไม่สำเร็จ: {repairImagesError}</div>
  ) : repairData?.images?.length > 0 ? (
    <div className="assignment-photo-grid">
      {repairData.images.map((image, index) => (
        <div className="assignment-photo-item" key={index}>
          <button type="button" className="repair-photo-button" onClick={() => setPreviewImage({ src: image, index })} aria-label={`เปิดดูรูปปัญหา ${index + 1}`}>
            <img src={image} alt={`รูปปัญหา ${index + 1}`} />
          </button>
          <p>รูปที่ {index + 1}</p>
        </div>
      ))}
    </div>
  ) : (
    <div className="assignment-no-photo">
      ไม่มีรูปภาพแนบมา
    </div>
  )}
</section>
    <section className="assignment-card">
      <h2>👥 ผู้เกี่ยวข้อง</h2>

      <div className="assignment-row">
        <span>ผู้แจ้งซ่อม</span>
        <strong>{getRequesterName(repairData)}</strong>
      </div>

      <div className="assignment-row">
        <span>ผู้อนุมัติของงาน</span>
        <strong>{personName(repairData?.approvedBy, "รออนุมัติ")}</strong>
      </div>

      <div className="assignment-row">
        <span>ผู้รับผิดชอบปัจจุบัน</span>
        <strong>{personName(repairData?.acceptedBy, "รอรับงาน")}</strong>
      </div>
    </section>
    <section className="assignment-card">
  <h2>ประวัติการดำเนินงาน</h2>

  {auditLogs.filter((log) => log.repairId === repairData?.id).length === 0 ? (
    <p>ยังไม่มีประวัติการดำเนินงาน</p>
  ) : (
    auditLogs
      .filter((log) => log.repairId === repairData?.id)
      .map((log) => (
        <div className="assignment-row" key={log.id}>
          <div>
            <strong>{log.action}</strong>
            <p>{log.details}</p>
            <small>
  ผู้ดำเนินการ: {users.find((item) => item.userId?.toLocaleLowerCase() === log.user?.toLocaleLowerCase())?.name || log.user || "ไม่ระบุ"} |{" "}
  {new Date(log.timestamp).toLocaleString("th-TH")}
</small>
          </div>
        </div>
      ))
  )}
</section>

    {/* การรับงาน */}
    <section className="assignment-card">
      <h2>🔧 การรับงาน</h2>

      <p className="assignment-note">
        กรุณารับงาน หากคุณเป็นผู้รับผิดชอบงานซ่อมนี้
      </p>


      <div className="assignment-buttons">

    {canRepair && <button
  className="accept-job-button"
  onClick={() => {
 const updatedRepair = {
  ...repairData,
  status: "รอเสนอเวลาซ่อม",
  acceptedBy: userId,
  acceptedAt: new Date().toISOString(),

};

    setRepairs((prev) =>
      prev.map((item) =>
        item.id === repairData?.id ? updatedRepair : item
      )
    );
    addAuditLog(
  repairData.id,
  "รับงานซ่อม",
  `ผู้รับงาน ${userId || "admin"} รับงานซ่อม`
);

    setRepairData(updatedRepair);
    setPage("repair-time");
  }}
>
  ✓ รับงาน
</button>}

  

      </div>
    </section>

    <button
      className="back-button"
      onClick={() => setPage("repair-assignment-list")}
    >
      ← กลับคิวรอรับงาน
    </button>

    <footer>ART Maintenance System</footer>

  </main>
)}

{page === "approval-list" && (
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
)}

{page === "approval-rejected-list" && (
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
)}



{page === "repair-pdf" && repairData?.status === "จบงาน" && (
  <main className="maintenance-report-print">
    <div className="maintenance-report-top-actions no-print">
      <button className="back-button maintenance-report-back-button" type="button" onClick={() => setPage("completed-list")}>
        ← กลับรายการงานเสร็จ
      </button>
    </div>
    <header className="maintenance-report-header">
      <div className="maintenance-report-topline">
        <div className="maintenance-report-brand">
          <div className="cm-logo">ART</div>
          <div>
            <strong>ART Maintenance System</strong>
            <span>Corrective Maintenance</span>
          </div>
        </div>
        <div className="maintenance-report-state"><span>✓</span> ปิดงานแล้ว</div>
      </div>
      <div className="maintenance-report-title-row">
        <div>
          <span className="maintenance-report-eyebrow">MAINTENANCE SERVICE REPORT</span>
          <h1>รายงานผลการซ่อมบำรุง</h1>
          <p>สรุปผลการดำเนินงานและการตรวจรับ</p>
        </div>
        <div className="maintenance-report-ticket">
          <span>เลขที่ใบงาน</span>
          <strong>{repairData.id}</strong>
        </div>
      </div>
      <div className="maintenance-report-meta-strip">
        <div><span>แผนก</span><strong>{repairData.department || "ไม่ระบุ"}</strong></div>
        <div><span>รหัสเครื่องจักร</span><strong>{repairData.machineCode || "ไม่ระบุ"}</strong></div>
        <div><span>เครื่องจักร</span><strong>{repairData.machineName || "ไม่ระบุ"}</strong></div>
        <div><span>ประเภทงาน</span><strong>{repairData.approvalWorkType || "ไม่ระบุ"}</strong></div>
      </div>
    </header>

    <section className="maintenance-report-section maintenance-report-section-01">
      <h2><span className="maintenance-report-section-no">01</span> ข้อมูลใบแจ้งซ่อม</h2>
      <div className="maintenance-report-grid">
        <div><span>วันที่แจ้ง</span><strong>{formatThaiDateTime(repairData.createdAt, "ไม่ระบุ")}</strong></div>
        <div><span>ผู้แจ้งซ่อม</span><strong>{getRequesterName(repairData)}</strong></div>
        <div><span>รหัสเครื่องจักร</span><strong>{repairData.machineCode || "ไม่ระบุ"}</strong></div>
        <div><span>ชื่อเครื่องจักร</span><strong>{repairData.machineName || "ไม่ระบุ"}</strong></div>
      </div>
      <div className="maintenance-report-description"><span>อาการเสียของเครื่องจักร</span><p>{repairData.problemDescription || "ไม่ระบุ"}</p></div>
    </section>

    <section className="maintenance-report-section maintenance-report-section-02">
      <h2><span className="maintenance-report-section-no">02</span> การดำเนินงานซ่อม</h2>
      <div className="maintenance-report-grid">
        <div><span>ผู้อนุมัติ</span><strong>{repairData.approvedBy || "ไม่ระบุ"}</strong></div>
        <div><span>วันที่ / เวลาอนุมัติ</span><strong>{formatThaiDateTime(repairData.approvedAt, "ไม่ระบุ")}</strong></div>
        <div><span>ผู้รับงานซ่อม</span><strong>{repairData.acceptedBy || "ไม่ระบุ"}</strong></div>
        <div><span>วันที่ / เวลารับงาน</span><strong>{formatThaiDateTime(repairData.acceptedAt, "ไม่ระบุ")}</strong></div>
        <div><span>ผู้ตรวจเช็กงาน</span><strong>{getInspectorName(repairData)}</strong></div>
        <div><span>วันที่ / เวลาตรวจเช็ก</span><strong>{formatThaiDateTime(repairData.inspectedAt, "ไม่ระบุ")}</strong></div>
        <div><span>เวลาเริ่มงาน</span><strong>{repairData.repairStartedAt ? new Date(repairData.repairStartedAt).toLocaleString("th-TH") : formatThaiDateTime(repairData.startTime, "ไม่ระบุ")}</strong></div>
        <div><span>เวลาจบงาน</span><strong>{formatThaiDateTime(repairData.repairCompletedAt, "ไม่ระบุ")}</strong></div>
        <div><span>ระยะเวลาตั้งแต่แจ้งซ่อมจนจบงาน</span><strong>{(() => {
          const startedAt = repairData.createdAt ? new Date(repairData.createdAt).getTime() : NaN;
          const completedAt = repairData.repairCompletedAt || repairData.inspectedAt;
          const endedAt = completedAt ? new Date(completedAt).getTime() : NaN;
          if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) return "ไม่ระบุ";
          const totalMinutes = Math.floor((endedAt - startedAt) / 60000);
          const days = Math.floor(totalMinutes / 1440);
          const hours = Math.floor((totalMinutes % 1440) / 60);
          const minutes = totalMinutes % 60;
          return [days ? `${days} วัน` : "", hours ? `${hours} ชั่วโมง` : "", `${minutes} นาที`].filter(Boolean).join(" ");
        })()}</strong></div>
      </div>
    </section>

    <section className="maintenance-report-section maintenance-report-section-03">
      <h2><span className="maintenance-report-section-no">03</span> ประวัติการซ่อม</h2>
      <div className="maintenance-report-description"><span>รายละเอียดการซ่อม</span><p>{repairData.repairWorkDetails || "ไม่มีรายละเอียดบันทึกไว้"}</p></div>
      <div className="maintenance-report-description"><span>หมายเหตุเพิ่มเติม</span><p>{repairData.repairWorkNotes || "ไม่มีหมายเหตุเพิ่มเติม"}</p></div>
    </section>

    <section className="maintenance-report-section maintenance-report-images">
      <h2><span className="maintenance-report-section-no">04</span> ภาพประกอบการซ่อม</h2>
      {repairImagesError ? <p className="maintenance-report-empty">โหลดภาพประกอบไม่สำเร็จ: {repairImagesError}</p> : visibleReportImages.length > 0 ? (
        <div>{visibleReportImages.map((image, index) => <figure key={index}><img src={image} alt={`ภาพประกอบงาน ${index + 1}`} /><figcaption>ภาพที่ {index + 1}</figcaption></figure>)}</div>
      ) : <p className="maintenance-report-empty">ไม่มีภาพแนบสำหรับงานนี้</p>}
      {(repairData.images || []).length > visibleReportImages.length && <small className="maintenance-report-note">แสดง 8 ภาพแรก · ดูภาพเพิ่มเติมได้ในระบบ</small>}
    </section>

    <section className="maintenance-report-section maintenance-report-section-05 maintenance-report-signature">
      <h2><span className="maintenance-report-section-no">05</span> ลายเซ็นวิศวกร</h2>
      <div className="maintenance-report-signature-line">
        <span>ลงชื่อ</span><i></i><span>วิศวกร (ระดับวิศวกรขึ้นไป)</span>
      </div>
    </section>

    <div className="maintenance-report-actions no-print">
      <p>ในหน้าต่างพิมพ์ เลือกปลายทางเป็น “บันทึกเป็น PDF” เพื่อดาวน์โหลดเอกสาร</p>
      <button className="main-menu-button" type="button" onClick={() => window.print()}>เปิดหน้าต่างบันทึก PDF อีกครั้ง</button>
    </div>
  </main>
)}

{page === "repair-detail" && (
  <main className="repair-detail-container">

    <div className="repair-detail-header">
      <div className="cm-logo">ART</div>

      <h1>รายละเอียดงานแจ้งซ่อม</h1>

      <div className="job-number">
    {repairData?.id || "ไม่พบเลขงาน"}
      </div>

      <div className="detail-status">
  {repairData?.status || "ไม่ทราบสถานะ"}
</div>
      {repairData?.status === "ไม่อนุมัติ" && repairData?.approvalRejectReason && (
        <p className="detail-rejection-reason"><strong>เหตุผลที่ไม่อนุมัติ:</strong> {repairData.approvalRejectReason}</p>
      )}
    </div>

    {/* ข้อมูลงาน */}
    <section className="detail-card">
      <h2>📋 ข้อมูลงาน</h2>

      <div className="detail-row">
        <span>แผนก</span>
        <strong>{departmentName(selectedDepartment)}</strong>
      </div>

      <div className="detail-row">
        <span>รหัสเครื่องจักร</span>
        <strong>{repairData?.machineCode || "ยังไม่มีข้อมูลรหัสเครื่องจักร"}</strong>
      </div>

      <div className="detail-row">
        <span>เครื่องจักร</span>
        <strong>{repairData?.machineName || "ยังไม่มีข้อมูลเครื่องจักร"}</strong>
      </div>

      <div className="detail-row">
        <span>อาการ / ปัญหา</span>
        <strong>{repairData?.problemDescription || "ยังไม่มีข้อมูลอาการเสีย"}</strong>
      </div>

      {repairData?.approvalWorkType && <div className="detail-row">
        <span>ประเภทงานที่อนุมัติ</span>
        <strong>{repairData.approvalWorkType}</strong>
      </div>}
    </section>
  <div className="detail-row inspection-info">
  <span>ผู้ตรวจงาน</span>
  <strong>
    {repairData?.inspectedBy ? getInspectorName(repairData) : "ยังไม่มีข้อมูล"}
  </strong>
</div>

<div className="detail-row inspection-info">
  <span>วันที่/เวลาจบงาน</span>
  <strong>
    {formatThaiDateTime(repairData?.inspectedAt, "ยังไม่มีข้อมูล")}
  </strong>
</div>

    {/* รูปภาพ */}
    <section className="detail-card">
      <h2>📷 รูปภาพปัญหา</h2>

<div className="photo-placeholder">
  {repairImagesError ? (
    `โหลดรูปภาพไม่สำเร็จ: ${repairImagesError}`
  ) : repairData?.images?.length > 0 ? (
    <div className="repair-photo-grid">
      {repairData.images.map((image, index) => (
        <button type="button" key={index} className="repair-photo-button repair-detail-photo-button" onClick={() => setPreviewImage({ src: image, index })} aria-label={`เปิดดูรูปอาการเสีย ${index + 1}`}>
          <img src={image} alt={`รูปอาการเสีย ${index + 1}`} className="repair-detail-image" />
        </button>
      ))}
    </div>
  ) : (
    "ยังไม่มีรูปภาพ"
  )}
</div>
</section>

    {/* ผู้เกี่ยวข้อง */}
    <section className="detail-card">
      <h2>👥 ผู้เกี่ยวข้อง</h2>

      <div className="detail-row">
        <span>ผู้แจ้งซ่อม</span>
        <strong>{getRequesterName(repairData)}</strong>
      </div>

      <div className="detail-row">
        <span>ผู้อนุมัติ</span>
        <strong>{personName(repairData?.approvedBy, "รออนุมัติ")}</strong>
      </div>

      <div className="detail-row">
        <span>ผู้รับผิดชอบซ่อม</span>
      <strong>{personName(repairData?.acceptedBy, "รอมอบหมาย")}</strong>
      </div>
<div className="detail-row">
  <span>เวลาเริ่มซ่อม</span>
  <strong>
    {formatThaiDateTime(repairData?.startTime, "ยังไม่มีข้อมูล")}
  </strong>
</div>

<div className="detail-row">
  <span>เวลาซ่อมเสร็จ</span>
  <strong>
    {formatThaiDateTime(repairData?.dueTime, "ยังไม่มีข้อมูล")}
  </strong>
</div>

<div className="detail-row">
  <span>ระยะเวลาที่เสนอ</span>
  <strong>
    {repairData?.proposedDuration || "ยังไม่มีข้อมูล"}
  </strong>
</div>
     <div className="detail-row inspection-info">
        <span>ผู้ตรวจงาน</span>
     <strong>{repairData?.inspectedBy ? getInspectorName(repairData) : "ยังไม่มีข้อมูล"}</strong>
      </div>
    </section>

    {/* ประวัติ */}
    <section className="detail-card">
      <h2>🕒 ประวัติการดำเนินงาน</h2>

      {/* Built from the saved record instead of fixed text, so it shows what really happened. */}
      {[
        { label: "แจ้งซ่อม", by: repairData?.requester, at: repairData?.createdAt },
        { label: "อนุมัติงาน", by: repairData?.approvedBy, at: repairData?.approvedAt },
        { label: "รับงานซ่อม", by: repairData?.acceptedBy, at: repairData?.acceptedAt },
        { label: "เสนอเวลาซ่อม", by: repairData?.timeProposedBy, at: repairData?.timeProposedAt },
        { label: "ซ่อมเสร็จ / ส่งตรวจงาน", by: repairData?.acceptedBy, at: repairData?.repairCompletedAt },
        { label: "ตรวจงานผ่าน / จบงาน", by: repairData?.inspectedBy, at: repairData?.inspectedAt },
      ].filter((step) => step.at).map((step) => (
        <div className="timeline-item" key={step.label}>
          <strong>{step.label}</strong>
          <p>โดย: {personName(step.by)}</p>
          <p>{new Date(step.at).toLocaleString("th-TH")}</p>
        </div>
      ))}
      <div className="timeline-item">
        <strong>สถานะปัจจุบัน</strong>
        <p>{repairData?.status || "ไม่ทราบสถานะ"}</p>
      </div>
    </section>

    {isAdmin && (
      <button className="danger-button" type="button" onClick={handleDeleteRepair}>
        ย้ายงานนี้ไปยังรายการที่ลบ
      </button>
    )}

    {repairData?.status === "จบงาน" && (
      <button className="repair-pdf-button" type="button" onClick={() => setPage("repair-pdf")}>
        บันทึก / ดาวน์โหลด PDF
      </button>
    )}

    <button
      className="back-button"
      onClick={() => setPage(repairData?.status === "กำลังซ่อม" ? "notifications" : "repairs")}
    >
      ← กลับหน้าก่อนหน้า
    </button>

    <footer>ART Maintenance System</footer>

  </main>
)}      
      {/* ================= DEPARTMENT ================= */}

      {/* ================= DEPARTMENT HOME ================= */}
{page === "department-home" && (
  <main className="department-home-container">
    <section className="department-control-card" aria-label="สถานะการทำงานของแผนก">
      <h2>สถานะเครื่องจักร/การผลิต: {departmentName(selectedDepartment)}</h2>
      {departmentControls[selectedDepartment] ? (
        <p className={`department-control-current ${departmentControls[selectedDepartment].status}`}>
          สถานะปัจจุบัน: <strong>{departmentControls[selectedDepartment].status === "start" ? "START" : "STOP"}</strong>
          {departmentControls[selectedDepartment].updatedBy && <> · อัปเดตโดย {departmentControls[selectedDepartment].updatedBy}</>}
        </p>
      ) : <p className="department-control-current">ยังไม่มีการตั้งสถานะ</p>}
      {canSetDepartmentStatus && (
        <div className="department-control-actions">
          <button type="button" className={`department-control-button start ${departmentControls[selectedDepartment]?.status === "start" ? "active" : ""}`} onClick={() => handleSetDepartmentControl("start")}>▶ START</button>
          <button type="button" className={`department-control-button stop ${departmentControls[selectedDepartment]?.status === "stop" ? "active" : ""}`} onClick={() => handleSetDepartmentControl("stop")}>■ STOP</button>
        </div>
      )}
      <button
        type="button"
        className="department-control-history-link"
        onClick={() => setPage("department-control-history")}
      >
        ดูประวัติ START / STOP ทั้งหมด
      </button>
    </section>

    <div className="repair-section">

      <h2>งานแจ้งซ่อม</h2>

      {canRequestRepair && isDepartmentActive(selectedDepartment) && <button
        className="repair-new-button repair-new-button-prominent"
        onClick={() => setPage("new-repair")}
      >
        <span className="repair-new-button-icon" aria-hidden="true">＋</span>
        <span className="repair-new-button-copy">
          <strong>แจ้งซ่อมใหม่</strong>
          <small>สร้างรายการแจ้งซ่อม</small>
        </span>
        <span className="repair-new-button-action">เริ่มแจ้งซ่อม <span aria-hidden="true">→</span></span>
      </button>}

      <div className="status-grid">
        <StatusCard tone="waiting" icon="🟡" label="รออนุมัติ" count={countDepartmentRepairs("รออนุมัติ")} onOpen={() => setPage("approval-list")} />
        <StatusCard tone="not-approved" icon="🔴" label="ไม่อนุมัติงาน" count={rejectedHistoryRepairs.length} onOpen={() => setPage("approval-rejected-list")} />
        <StatusCard tone="waiting-assignment" icon="🟢" label="รอรับงาน" count={countDepartmentRepairs("รอรับงาน")} onOpen={() => { setAssignmentQueueAllDepartments(false); setPage("repair-assignment-list"); }} />
        <StatusCard tone="repairing" icon="🔵" label="กำลังซ่อม" count={countDepartmentRepairs("กำลังซ่อม")} onOpen={() => setPage("repairing-list")} />
        <StatusCard tone="time-proposal" icon="🟣" label="รอเสนอเวลาซ่อม" count={countDepartmentRepairs("รอเสนอเวลาซ่อม")} onOpen={() => setPage("repair-time-list")} />
        <StatusCard tone="inspection" icon="🟠" label="รอตรวจงาน" count={countDepartmentRepairs("รอตรวจงาน")} onOpen={() => setPage("inspection-list")} />
        <StatusCard tone="completed" icon="🟢" label="งานเสร็จแล้ว" count={countDepartmentRepairs("จบงาน")} onOpen={() => setPage("completed-list")} />
      </div>

      <button
        className="main-menu-button"
        onClick={() => {
          setRepairSearchTerm("");
          setRepairDepartmentFilter(selectedDepartment || visibleRepairDepartments[0] || "");
          setRepairDateFrom("");
          setRepairDateTo("");
          setPage("repairs");
        }}
      >
        🔧 ดูงานแจ้งซ่อมทั้งหมด
      </button>

      <button
        className="main-menu-button notification-button"
        onClick={() => setPage("notifications")}
      >
        🔔 การแจ้งเตือน · งานซ่อมเกินกำหนด {overdueRepairs.length} งาน
      </button>
    </div>

    <button
      className="back-button"
      onClick={() => setPage("department")}
    >
      ← กลับไปเลือกแผนก
    </button>

    <footer>ART Maintenance System</footer>

  </main>
)}
{page === "department-control-history" && (
  <main className="department-control-history-page">
    <div className="department-control-history-page-header">
      <div className="cm-logo">ART</div>
      <h1>ประวัติ START / STOP</h1>
      <p>แผนก <strong>{departmentName(selectedDepartment)}</strong></p>
    </div>

    {(() => {
      const history = departmentControlHistory
        .filter((item) => item.department === selectedDepartment)
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const startCount = history.filter((item) => item.status === "start").length;
      const stopCount = history.filter((item) => item.status === "stop").length;
      return (
        <>
          <div className="department-control-history-summary">
            <div><span>รายการทั้งหมด</span><strong>{history.length}</strong></div>
            <div className="start"><span>START</span><strong>{startCount}</strong></div>
            <div className="stop"><span>STOP</span><strong>{stopCount}</strong></div>
          </div>
          {history.length ? (
            <ol className="department-control-history-list">
              {history.map((item) => (
                <li key={item.id}>
                  <span className={`department-control-history-status ${item.status}`}>
                    {item.status === "start" ? "▶ START" : "■ STOP"}
                  </span>
                  <div className="department-control-history-entry">
                    <strong>{users.find((user) => user.userId === item.updatedBy)?.name || item.updatedBy || "ไม่ระบุผู้ดำเนินการ"}</strong>
                    <time dateTime={item.updatedAt}>{formatThaiDateTime(item.updatedAt, "ไม่ระบุเวลา")}</time>
                    {item.reason && <p>เหตุผล: {item.reason}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="department-control-history-empty-card">
              <h2>ยังไม่มีประวัติ</h2>
              <p>เมื่อมีการเปลี่ยนสถานะ START หรือ STOP รายการจะแสดงที่หน้านี้</p>
            </div>
          )}
        </>
      );
    })()}

    <button type="button" className="back-button" onClick={() => setPage("department-home")}>
      ← กลับหน้าหลักแผนก
    </button>
    <footer>ART Maintenance System</footer>
  </main>
)}
{page === "repair-assignment-list" && (
  <main className="repair-list-container repair-assignment-queue-page">
    <div className="repair-list-header repair-assignment-queue-header">
      <h1>🟠 งานรอรับงาน</h1>
      <p>
        {assignmentQueueAllDepartments ? <>ทุกแผนกในฝ่าย <strong>{divisionName(selectedDivision)}</strong></> : <>แผนก <strong>{departmentName(selectedDepartment)}</strong></>}
      </p>
    </div>

    <section className="assignment-work-type-section" aria-label="แยกคิวงานด่วนและงานรอวางแผน">
      <h2>คิวตามประเภทงาน</h2>
      <div className="assignment-work-type-filters">
        {[
          { value: "all", label: "งานทั้งหมด", className: "all" },
          { value: "งานด่วน", label: "งานด่วน", className: "urgent" },
          { value: "งานรอวางแผน", label: "งานรอวางแผน", className: "planned" },
        ].map((type) => {
          const count = type.value === "all"
            ? assignmentRepairs.length
            : assignmentRepairs.filter((repair) => repair.approvalWorkType === type.value).length;
          return (
            <button
              key={type.value}
              type="button"
              className={`assignment-work-type-filter ${type.className} ${repairAssignmentWorkTypeFilter === type.value ? "selected" : ""}`}
              onClick={() => setRepairAssignmentWorkTypeFilter(type.value)}
              aria-pressed={repairAssignmentWorkTypeFilter === type.value}
            >
              {type.label}<strong>{count}</strong>
            </button>
          );
        })}
      </div>
    </section>

    <section className="repair-assignment-unit-section" aria-label="เลือกคิวหน่วยงานซ่อม">
      <h2>คิวรอรับงานตามหน่วยงานซ่อม</h2>
        <p>งานที่ผู้แจ้งเลือกจะเข้าคิวของหน่วยงานนั้นโดยอัตโนมัติ</p>
      <div className="repair-assignment-unit-filters">
        <button
          type="button"
          className={`repair-assignment-unit-filter all ${repairAssignmentUnitFilter === "all" ? "selected" : ""}`}
          onClick={() => setRepairAssignmentUnitFilter("all")}
          aria-pressed={repairAssignmentUnitFilter === "all"}
        >
          ทุกหน่วยงาน <strong>{assignmentRepairs.length}</strong>
        </button>
        {repairUrgencyTypes.map((type) => {
          const count = assignmentRepairs.filter((repair) => getRepairUrgencyInfo(repair.urgency).value === type.value).length;
          return (
            <button
              key={type.value}
              type="button"
              className={`repair-assignment-unit-filter ${type.color} ${repairAssignmentUnitFilter === type.value ? "selected" : ""}`}
              onClick={() => setRepairAssignmentUnitFilter(type.value)}
              aria-pressed={repairAssignmentUnitFilter === type.value}
            >
              <span>{type.icon}</span> {type.label} <strong>{count}</strong>
            </button>
          );
        })}
      </div>
    </section>

    <div className="repair-list">
      {visibleAssignmentRepairs.length === 0 ? (
        <div className="empty-repair">
          <h2>ไม่มีงานรอรับในคิวนี้</h2>
          <p>{repairAssignmentWorkTypeFilter !== "all" ? `ขณะนี้ไม่มี${repairAssignmentWorkTypeFilter}ในคิวที่เลือก` : repairAssignmentUnitFilter !== "all" ? `ขณะนี้ยังไม่มีงานในคิว ${getRepairUrgencyInfo(repairAssignmentUnitFilter).label}` : assignmentQueueAllDepartments ? `ขณะนี้ยังไม่มีงานรอรับในฝ่าย ${divisionName(selectedDivision)}` : "ขณะนี้ยังไม่มีรายการที่รอรับงานในแผนกนี้"}</p>
        </div>
      ) : (
        visibleAssignmentRepairs.map((repair) => (
            <div
              key={repair.id}
              className={`repair-card urgency-card-${getRepairUrgencyInfo(repair.urgency).color}`}
              onClick={() => {
                setRepairData(repair);
                setSelectedDepartment(repair.department);
                setPage("repair-assignment");
              }}
            >
              <div className="repair-card-header">
                <strong>{repair.id}</strong>

                <div className="repair-status">
                  รอรับงาน
                </div>
              </div>

              <div className={`assignment-work-type-badge ${repair.approvalWorkType === "งานด่วน" ? "urgent" : repair.approvalWorkType === "งานรอวางแผน" ? "planned" : "unspecified"}`}>
                {repair.approvalWorkType || "ยังไม่ระบุประเภทงาน"}
              </div>

              <div className="repair-assignment-machine-code">
                <span>รหัสเครื่องจักร</span>
                <strong>{repair.machineCode || "ไม่ระบุ"}</strong>
              </div>
              <h3>เครื่องจักร: {repair.machineName || "ไม่ระบุ"}</h3>

              <p>
                <strong>อาการ:</strong>{" "}
                {repair.problemDescription}
              </p>

              <p>
                <strong>ผู้แจ้ง:</strong>{" "}
                {repair.requester}
              </p>

              <p className="repair-assignment-card-department">
                <strong>แผนก:</strong> {repair.department || "ไม่ระบุ"}
              </p>

              <div className={`repair-urgency-badge ${getRepairUrgencyInfo(repair.urgency).color}`}>
                {getRepairUrgencyInfo(repair.urgency).icon} {getRepairUrgencyInfo(repair.urgency).label}
              </div>
              {canRepair && canRepairUnit(repair) && (
                <button
                  type="button"
                  className="accept-job-button repair-assignment-quick-accept"
                  onClick={(event) => {
                    event.stopPropagation();
                    const updatedRepair = {
                      ...repair,
                      status: "รอเสนอเวลาซ่อม",
                      acceptedBy: userId,
                      acceptedAt: new Date().toISOString(),
                    };
                    setRepairs((previous) => previous.map((item) => item.id === repair.id ? updatedRepair : item));
                    addAuditLog(repair.id, "รับงานซ่อม", `ผู้รับงาน ${userId || "admin"} รับงานซ่อม`);
                    setRepairData(updatedRepair);
                    setSelectedDepartment(repair.department);
                    setPage("repair-time");
                  }}
                >
                  ✓ รับงานซ่อมนี้
                </button>
              )}
            </div>
          ))
      )}
    </div>

    <button
      className="back-button"
      onClick={() => setPage(assignmentQueueAllDepartments ? "department" : "department-home")}
    >
      ← {assignmentQueueAllDepartments ? "กลับไปเลือกแผนก" : "กลับหน้าหลักแผนก"}
    </button>
  </main>
)}
      {page === "change-password" && (
        <section className="user-management-container">
          <div className="user-management-header">
            <div className="cm-logo">ART</div>
            <h1>เปลี่ยนรหัสผ่าน</h1>
            <p>บัญชีผู้ใช้: {currentUser?.userId}</p>
          </div>
          <form className="user-management-card add-user-form" onSubmit={handleChangePassword}>
            <label htmlFor="current-password">รหัสผ่านปัจจุบัน</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
            <label htmlFor="new-password">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <label htmlFor="confirm-new-password">ยืนยันรหัสผ่านใหม่</label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              required
            />
            {passwordChangeError && <p role="alert">{passwordChangeError}</p>}
            {passwordChangeMessage && <p role="status">{passwordChangeMessage}</p>}
            <button className="main-menu-button" type="submit">บันทึกรหัสผ่านใหม่</button>
            <button className="back-button" type="button" onClick={() => setPage("division")}>กลับหน้าเลือกฝ่าย</button>
          </form>
        </section>
      )}
      {page === "division" && (
        <main className="department-container">
          <section className="announcement-board" aria-labelledby="announcement-board-title">
            <div className="announcement-board-heading">
              <span className="announcement-board-icon" aria-hidden="true">▤</span>
              <div>
                <h2 id="announcement-board-title">ป้ายประกาศ</h2>
                <p>ข่าวสารและประกาศจากผู้ดูแลระบบ</p>
              </div>
            </div>
            {isAdmin && (
              <div
                className={`announcement-dropzone ${announcementDragging ? "is-dragging" : ""} ${announcementSaving ? "is-saving" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => !announcementSaving && announcementFileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !announcementSaving) {
                    event.preventDefault();
                    announcementFileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => { event.preventDefault(); setAnnouncementDragging(true); }}
                onDragLeave={(event) => { event.preventDefault(); setAnnouncementDragging(false); }}
                onDrop={(event) => {
                  event.preventDefault();
                  setAnnouncementDragging(false);
                  void handleAnnouncementFiles(event.dataTransfer.files);
                }}
                onPaste={(event) => {
                  const pastedImages = Array.from(event.clipboardData.items || []).map((item) => item.getAsFile()).filter(Boolean);
                  if (pastedImages.length) {
                    event.preventDefault();
                    void handleAnnouncementFiles(pastedImages);
                  }
                }}
              >
                <input
                  ref={announcementFileInputRef}
                  className="announcement-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => void handleAnnouncementFiles(event.target.files)}
                />
                <span className="announcement-upload-icon" aria-hidden="true">＋</span>
                <strong>{announcementSaving ? "กำลังเพิ่มประกาศ…" : "ลากรูปภาพมาวาง หรือคลิกเพื่อเลือกรูป"}</strong>
                <small>รองรับ JPG, PNG และ WebP · เลือกได้หลายรูป</small>
              </div>
            )}
            {announcementError && <p className="announcement-board-error" role="alert">{announcementError}</p>}
            {announcements.length > 0 ? (
              <div className="announcement-image-grid">
                {announcements.map((announcement) => (
                  <figure className="announcement-image-card" key={announcement.id}>
                    <button
                      type="button"
                      className="announcement-image-view"
                      onClick={() => setPreviewImage({ src: announcement.imageData, index: 0 })}
                      aria-label="เปิดดูรูปประกาศ"
                    >
                      <img src={announcement.imageData} alt="ประกาศจากผู้ดูแลระบบ" />
                    </button>
                    <figcaption>
                      <span>{new Date(announcement.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}</span>
                      {isAdmin && <button type="button" className="announcement-delete-button" onClick={() => void handleDeleteAnnouncement(announcement)}>ลบ</button>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="announcement-board-empty">ยังไม่มีประกาศ</div>
            )}
          </section>
          {isAdmin && (
            <button className="main-menu-button department-user-management-button" onClick={() => setPage("user-management")}>
              ⚙️ จัดการผู้ใช้
            </button>
          )}
          <button className="main-menu-button" onClick={() => {
            setPasswordChangeError(""); setPasswordChangeMessage(""); setPage("change-password");
          }}>🔒 เปลี่ยนรหัสผ่าน</button>
          <div className="department-list division-list">
            {visibleDivisions.map((division) => (
              <button key={division} className="department-button" onClick={() => {
                setSelectedDivision(division);
                setSelectedDepartment("");
                setPage("department");
              }}>ฝ่าย {divisionName(division)}</button>
            ))}
            {visibleDivisions.length === 0 && <p>ยังไม่มีฝ่ายที่ได้รับสิทธิ์ กรุณาติดต่อผู้ดูแลระบบ</p>}
          </div>
          <button className="back-button" onClick={handleLogout}>← ออกจากระบบ</button>
          <footer>ART Maintenance System</footer>
        </main>
      )}
      {page === "department" && (
        <main className="department-container">

          <button
            type="button"
            className="technician-assignment-entry"
            onClick={() => {
              setAssignmentQueueAllDepartments(true);
              setRepairAssignmentUnitFilter("all");
              setRepairAssignmentWorkTypeFilter("all");
              setPage("repair-assignment-list");
            }}
          >
            <span className="technician-assignment-entry-label">สำหรับช่างซ่อม</span>
            <strong className="technician-assignment-entry-title">🛠️ งานรอรับงานซ่อม</strong>
            <span className="technician-assignment-entry-count">
              {divisionAssignmentRepairs.length} งานรอรับ
            </span>
            <span className="technician-assignment-entry-categories">
              <span className="urgent-work-count">งานด่วน <strong>{divisionAssignmentRepairs.filter((repair) => repair.approvalWorkType === "งานด่วน").length}</strong></span>
              <span className="planned-work-count">งานรอวางแผน <strong>{divisionAssignmentRepairs.filter((repair) => repair.approvalWorkType === "งานรอวางแผน").length}</strong></span>
            </span>
            <span className="technician-assignment-entry-action">เปิดคิวรอรับงาน →</span>
          </button>

          <section className="division-repair-search" aria-label="ค้นหางานซ่อมในฝ่ายที่เลือก">
            <label htmlFor="division-repair-search-input">ค้นหางานซ่อมในฝ่าย {divisionName(selectedDivision)}</label>
            <input
              id="division-repair-search-input"
              type="search"
              value={divisionRepairSearchTerm}
              onChange={(event) => setDivisionRepairSearchTerm(event.target.value)}
              placeholder="เลขที่งาน รหัสเครื่องจักร ชื่อเครื่อง หรืออาการเสีย"
            />
            {divisionRepairSearchQuery && (
              <div className="division-repair-search-results" aria-live="polite">
                <p className="division-repair-search-count">พบ {divisionRepairSearchResults.length} งาน</p>
                {divisionRepairSearchResults.length ? divisionRepairSearchResults.slice(0, 30).map((repair) => (
                  <button
                    type="button"
                    className="division-repair-search-result"
                    key={repair.id}
                    onClick={() => {
                      setSelectedDepartment(repair.department);
                      setRepairData(repair);
                      setPage("repair-detail");
                    }}
                  >
                    <strong>{repair.id}</strong>
                    <span>{departmentName(repair.department)} · รหัสเครื่องจักร {repair.machineCode || "ไม่ระบุ"}</span>
                    <span>{repair.machineName || "ไม่ระบุเครื่องจักร"} · {repair.status || "ไม่ทราบสถานะ"}</span>
                  </button>
                )) : <p className="division-repair-search-empty">ไม่พบงานซ่อมในฝ่ายนี้</p>}
                {divisionRepairSearchResults.length > 30 && <small>แสดง 30 รายการแรกจากทั้งหมด {divisionRepairSearchResults.length} งาน</small>}
              </div>
            )}
          </section>

          <div className="department-list">
            {(divisionDepartments[selectedDivision] || []).filter((department) => currentUser?.roles?.includes("admin") || currentUser?.departments?.includes(department)).map((department) => (
              <button
                key={department}
                className={`department-button ${selectedDepartment === department ? "selected" : ""} ${departmentControls[department] ? `status-${departmentControls[department].status}` : ""}`}
                onClick={() => handleDepartment(department)}
              >
                {departmentName(department)}{!isDepartmentActive(department) && " (ปิดใช้งาน)"}
                {canApprove && (() => {
                  const pendingApprovalCount = repairs.filter((repair) =>
                    repair.department === department && repair.status === "รออนุมัติ"
                  ).length;
                  return pendingApprovalCount > 0 ? (
                    <span className="department-approval-count" aria-label={`${pendingApprovalCount} งานรออนุมัติ`}>
                      {pendingApprovalCount}
                    </span>
                  ) : null;
                })()}
                {departmentControls[department] && <span className={`department-control-badge ${departmentControls[department].status}`}>
                  {departmentControls[department].status === "start" ? "START" : "STOP"}
                </span>}
              </button>
            ))}
            {(divisionDepartments[selectedDivision] || []).filter((department) => currentUser?.roles?.includes("admin") || currentUser?.departments?.includes(department)).length === 0 && (
              <p className="division-empty-note">ฝ่าย {divisionName(selectedDivision || "—")} ยังไม่มีแผนกที่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบเมื่อมีการเพิ่มแผนกในฝ่ายนี้</p>
            )}
          </div>

          <button className="back-button" onClick={() => { setSelectedDepartment(""); setPage("division"); }}>← กลับไปเลือกฝ่าย</button>

          <footer>ART Maintenance System</footer>
        </main>
      )}

    {page === "notifications" && (
      <NotificationsPage
        departmentLabel={departmentName(selectedDepartment)}
        overdueRepairs={overdueRepairs}
        onOpenRepair={(repair) => { setRepairData(repair); setPage("repair-detail"); }}
        onBack={() => setPage("department-home")}
      />
    )}
  {page === "user-history" && isAdmin && (
  <section className="user-management-container">
    <div className="user-management-header">
      <div className="cm-logo">ART</div>
      <h1>📋 ประวัติเพิ่ม-ลบผู้ใช้</h1>
      <p>แสดงเฉพาะการเพิ่ม ลบ และกู้คืนบัญชีผู้ใช้ แยกจากหน้าจัดการผู้ใช้</p>
    </div>

    <section className="user-management-card admin-user-history-card">
      <h2>รายการล่าสุด</h2>
      {userLifecycleLogs.length === 0 ? (
        <div className="approval-empty">
          <h2>ยังไม่มีประวัติผู้ใช้</h2>
          <p>เมื่อมีการเพิ่ม ลบ หรือกู้คืนผู้ใช้ ระบบจะแสดงรายการไว้ที่นี่</p>
        </div>
      ) : (
        <div className="admin-user-history-list">
          {userLifecycleLogs.slice(0, 100).map((log) => (
            <article className={`admin-user-history-entry ${log.action === "ลบผู้ใช้" ? "deleted" : ""}`} key={log.id}>
              <div className="admin-user-history-entry-heading">
                <strong>{log.action}</strong>
                <span>{log.targetId}</span>
              </div>
              <p>{log.details || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
              <small>ดำเนินการโดย {log.actor || "ไม่ระบุ"} · {formatThaiDateTime(log.occurredAt, "ไม่ระบุเวลา")}</small>
            </article>
          ))}
        </div>
      )}
    </section>

    <section className="user-management-card admin-user-history-card">
      <h2>ผู้ใช้ที่ลบแล้ว · กู้คืนได้</h2>
      {deletedUsers.length === 0 ? <p>ไม่มีบัญชีผู้ใช้ที่รอการกู้คืน</p> : (
        <div className="admin-user-history-list">
          {deletedUsers.map((deletedUser) => (
            <article className="admin-user-history-entry deleted" key={`deleted-user-${deletedUser.userId}`}>
              <div className="admin-user-history-entry-heading">
                <strong>{deletedUser.name}</strong>
                <span>{deletedUser.userId}</span>
              </div>
              <p>บัญชีถูกปิดใช้งาน · กู้คืนแล้วผู้ใช้จะเข้าสู่ระบบได้อีกครั้ง</p>
              <button className="user-permission-edit-button" type="button" onClick={() => handleRestoreDeleted("user", deletedUser.userId)}>
                กู้คืนผู้ใช้
              </button>
            </article>
          ))}
        </div>
      )}
    </section>

    <button className="back-button" type="button" onClick={() => setPage("user-management")}>
      ← กลับไปจัดการผู้ใช้
    </button>
  </section>
  )}

  {page === "system-recovery" && isAdmin && (
  <section className="user-management-container">
        <div className="user-management-header">
      <div className="cm-logo">ART</div>
      <h1>💾 สำรองข้อมูลและกู้คืนงาน</h1>
      <p>จัดการสำเนาฐานข้อมูลและกู้คืนเฉพาะงานแจ้งซ่อมที่ลบไป</p>
    </div>
<section className="admin-backup-card">
      <div>
        <h2>สำรองข้อมูลระบบ</h2>
        <p>ระบบสำรองฐานข้อมูลให้อัตโนมัติตอนเปิดเซิร์ฟเวอร์และทุก 24 ชั่วโมง โดยเก็บสำเนา 30 วัน</p>
        <code>D:\MC-Maintenance-system-data\backups</code>
      </div>
      <button className="main-menu-button" type="button" onClick={handleCreateBackup} disabled={backupBusy}>
        {backupBusy ? "กำลังสำรองข้อมูล…" : "สำรองข้อมูลตอนนี้"}
      </button>
      {backupMessage && <p className="admin-backup-message" role="status">{backupMessage}</p>}
    </section>

    <section className="user-management-card admin-recovery-card">
      <h2>งานแจ้งซ่อมที่ลบแล้ว · กู้คืนได้</h2>
      <p className="admin-section-hint">การกู้คืนงานจะนำประวัติการดำเนินงานเดิมกลับมาด้วย</p>
      {deletedRepairs.length === 0 ? <p>ไม่มีงานแจ้งซ่อมที่รอการกู้คืน</p> : deletedRepairs.map((deletedRepair) => (
        <div className="user-management-item" key={`deleted-repair-${deletedRepair.id}`}>
          <div>
            <strong>{deletedRepair.id}</strong>
            <p>{deletedRepair.department} · รหัสเครื่องจักร {deletedRepair.machineCode || "ไม่ระบุ"} · {deletedRepair.machineName || "ไม่ระบุเครื่องจักร"} · {deletedRepair.status || "ไม่ทราบสถานะ"}</p>
            <small>ลบโดย: {deletedRepair.deletedBy || "ไม่ระบุ"} · {formatThaiDateTime(deletedRepair.deletedAt, "ไม่ระบุเวลา")}</small>
          </div>
          <button className="user-permission-edit-button" type="button" onClick={() => handleRestoreDeleted("repair", deletedRepair.id)}>กู้คืนงาน</button>
        </div>
      ))}
    </section>

    <button className="back-button" type="button" onClick={() => setPage("user-management")}>
      ← กลับไปจัดการผู้ใช้
    </button>
  </section>
  )}

  {page === "user-management" &&
  isAdmin && (
  <section className="user-management-container">
        <div className="user-management-header">
      <div className="cm-logo">ART</div>
      <h1>⚙️ จัดการผู้ใช้</h1>
      <p>จัดการบัญชีและสิทธิ์การใช้งานระบบ</p>
      <button className="main-menu-button admin-add-user-top-button" type="button" onClick={() => setPage("add-user")}>
        ➕ เพิ่มผู้ใช้
      </button>
      <button className="user-permission-edit-button" type="button" onClick={() => setPage("user-history")}>
        📋 ดูประวัติเพิ่ม-ลบผู้ใช้
      </button>
      <button className="user-permission-edit-button" type="button" onClick={() => setPage("system-recovery")}>
        💾 สำรองข้อมูลและกู้คืนงาน
      </button>
      <button className="user-permission-edit-button" type="button" onClick={() => setPage("organization-management")}>
        🏢 จัดการฝ่ายและแผนก
      </button>
    </div>
<section className="user-management-card online-users-management-card">
      <h2>🟢 สถานะผู้ใช้งาน</h2>
      <button className="user-permission-edit-button online-users-toggle" type="button" onClick={() => setShowOnlineUsers((visible) => !visible)} aria-expanded={showOnlineUsers}>
        {showOnlineUsers ? "ซ่อนรายชื่อผู้ใช้ออนไลน์" : "ดูว่าใครออนไลน์อยู่"}
      </button>
      {showOnlineUsers && (
        <div className="online-users-list" aria-live="polite">
          <h3>ผู้ใช้ออนไลน์ ({onlineUsers.length})</h3>
          {onlineUsers.length === 0 ? <p>ยังไม่พบผู้ใช้ออนไลน์</p> : onlineUsers.map((onlineUser) => (
            <div className="online-user-item" key={onlineUser.userId}>
              <span className="online-user-indicator" aria-label="ออนไลน์" />
              <strong>{onlineUser.name}</strong>
              <span>{onlineUser.userId}</span>
            </div>
          ))}
          <small>อัปเดตรายชื่ออัตโนมัติทุก 5 วินาที</small>
        </div>
      )}
    </section>

    <div className="user-management-card">
        <h2>👥 รายชื่อผู้ใช้</h2>

      <div className="admin-user-filters">
        <label>
          ค้นหาผู้ใช้
          <input
            type="search"
            value={userManagementSearch}
            onChange={(event) => setUserManagementSearch(event.target.value)}
            placeholder="ค้นหาด้วย User ชื่อ หรือแผนก"
          />
        </label>
        <label>
          เลือกฝ่าย
          <select value={userManagementDivision} onChange={(event) => setUserManagementDivision(event.target.value)}>
            <option value="all">ทุกฝ่าย</option>
            {divisions.map((division) => <option key={division} value={division}>{divisionName(division)}</option>)}
          </select>
        </label>
      </div>

      {managedUserGroups.length === 0 ? (
        <p className="admin-user-filter-empty">ไม่พบผู้ใช้ที่ตรงกับคำค้นหา</p>
      ) : managedUserGroups.map(({ division, users: divisionUsers }) => (
        <section className="admin-user-division-group" key={division}>
          <div className="admin-user-division-heading">
            <h3>ฝ่าย {divisionName(division)}</h3>
            <span>{divisionUsers.length} บัญชี</span>
          </div>
          {divisionUsers.length === 0 ? <p className="admin-user-filter-empty">ยังไม่มีผู้ใช้ในฝ่ายนี้</p> : divisionUsers.map((user) => (
        <div className="user-management-item" key={user.userId}>
          <div>
            <strong>{user.name}</strong>
            <p>User: {user.userId}</p>
            <p>สิทธิ์: {user.roles?.join(", ") || "ยังไม่ได้กำหนด"}</p>
            <p>ฝ่าย: {user.divisions?.map(divisionName).join(", ") || "ยังไม่ได้กำหนด"}</p>
            <p>แผนก: {user.departments?.map(departmentName).join(", ") || "ยังไม่ได้กำหนด"}</p>
            {user.roles?.includes("technician") && <p>หน่วยงานซ่อม: {user.repairUnits?.join(", ") || "ยังไม่ได้กำหนด"}</p>}
          </div>

          {editingUserId === user.userId ? (
            <form className="user-permission-editor" onSubmit={(event) => handleSaveUserPermissions(event, user.userId)}>
              <fieldset className="add-user-departments add-user-roles">
                <legend>บทบาท / สิทธิ์</legend>
                <div className="add-user-department-list">
                  {[
                    ["user", "ผู้ตรวจเช็กเครื่องจักร"],
                    ["technician", "ช่างซ่อมบำรุง"],
                    ["approver", "ผู้อนุมัติ"],
                    ["manager", "Manager (ผู้จัดการ)"],
                    ["inspector", "ผู้ตรวจงาน"],
                    ["production-control", "ควบคุมปุ่ม START / STOP"],
                    ["admin", "ผู้ดูแลระบบ"],
                  ].map(([role, label]) => (
                    <label key={role}>
                      <input
                        type="checkbox"
                        checked={editingUserRoles.includes(role)}
                        onChange={(event) => {
                          setEditingUserRoles((current) => event.target.checked ? [...current, role] : current.filter((item) => item !== role));
                          if (!event.target.checked && role === "technician") setEditingUserRepairUnits([]);
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {editingUserRoles.includes("technician") && (
                <fieldset className="add-user-departments add-user-roles">
                  <legend>หน่วยงานซ่อมที่ช่างรับผิดชอบ</legend>
                  <div className="add-user-department-list">
                    {repairUrgencyTypes.map((unit) => (
                      <label key={unit.value}>
                        <input type="checkbox" checked={editingUserRepairUnits.includes(unit.value)} onChange={(event) => setEditingUserRepairUnits((current) => event.target.checked ? [...current, unit.value] : current.filter((item) => item !== unit.value))} />
                        {unit.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

      <p className="role-scope-note">สิทธิ์ตามบทบาท: ผู้อนุมัติอนุมัติหรือไม่อนุมัติ, ช่างรับงานและบันทึกการซ่อม, ผู้ตรวจงานปิดงานหรือส่งกลับแก้ไข, ผู้ควบคุม START/STOP เปลี่ยนสถานะของแผนกที่ได้รับมอบหมาย; ลบงานได้เฉพาะผู้ดูแลระบบ</p>

              <fieldset className="add-user-departments">
                <legend>ฝ่ายที่ผู้ใช้มีสิทธิ์</legend>
                <div className="add-user-department-list">
                  {editableUserDivisions.map((item) => (
                    <label key={item.code}>
                      <input type="checkbox" checked={editingUserDivisions.includes(item.code)} disabled={!item.active && !editingUserDivisions.includes(item.code)} onChange={(event) => {
                      setEditingUserDivisions((current) => event.target.checked ? [...current, item.code] : current.filter((code) => code !== item.code));
                      if (!event.target.checked) setEditingUserDepartments((current) => current.filter((department) => departmentRecords.find((entry) => entry.code === department)?.divisionCode !== item.code));
                    }} />
                    {divisionName(item.code)}
                  </label>))}
                </div>
              </fieldset>

              <fieldset className="add-user-departments">
                <legend>แผนกที่รับผิดชอบ</legend>
                <div className="add-user-department-list">
                  {editableUserDepartments.map((department) => (
                    <label key={department}>
                      <input
                        type="checkbox"
                        disabled={!isDepartmentActive(department) && !editingUserDepartments.includes(department)}
                        checked={editingUserDepartments.includes(department)}
                        onChange={(event) => setEditingUserDepartments((current) => event.target.checked ? [...current, department] : current.filter((item) => item !== department))}
                      />
                      {departmentName(department)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="user-permission-actions">
                <button className="main-menu-button" type="submit">บันทึกสิทธิ์</button>
                <button className="back-button" type="button" onClick={() => setEditingUserId("")}>ยกเลิก</button>
              </div>
            </form>
          ) : (
            <button
              className="user-permission-edit-button"
              type="button"
              onClick={() => {
                setEditingUserId(user.userId);
                setResettingUserId("");
                setAdminResetPassword("");
                setEditingUserRoles(user.roles || []);
                setEditingUserDivisions(user.divisions || ["RM"]);
                setEditingUserDepartments(user.departments || []);
                setEditingUserRepairUnits(user.repairUnits || []);
              }}
            >
              แก้ไขสิทธิ์
            </button>
          )}
          {user.userId !== currentUser?.userId && (
            resettingUserId === user.userId ? (
              <form className="admin-password-reset-form" onSubmit={(event) => handleAdminResetPassword(event, user.userId)}>
                <label htmlFor={`reset-password-${user.userId}`}>ตั้งรหัสผ่านใหม่ให้ผู้ใช้ (อย่างน้อย 6 ตัว)</label>
                <input
                  id={`reset-password-${user.userId}`}
                  type="text"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={128}
                  value={adminResetPassword}
                  onChange={(event) => setAdminResetPassword(event.target.value)}
                  placeholder="กำหนดรหัสผ่านใหม่"
                  required
                />
                <p>รหัสผ่านเดิมไม่สามารถเรียกคืนได้ ระบบจะบันทึกเฉพาะค่าแฮช</p>
                <button className="main-menu-button" type="submit">บันทึกรหัสผ่านใหม่</button>
                <button className="reject-cancel-button" type="button" onClick={() => { setResettingUserId(""); setAdminResetPassword(""); }}>ยกเลิก</button>
              </form>
            ) : (
              <button
                className="user-permission-edit-button"
                type="button"
                onClick={() => { setEditingUserId(""); setResettingUserId(user.userId); setAdminResetPassword(""); }}
              >
                ตั้งรหัสผ่านใหม่
              </button>
            )
          )}
          {user.userId !== currentUser?.userId && (
            <button
              className="danger-button user-delete-button"
              type="button"
              onClick={() => handleDeleteUser(user)}
            >
              ลบผู้ใช้
            </button>
          )}
        </div>
          ))}
        </section>
      ))}

    </div>

    <button
      className="back-button"
      onClick={() => setPage("division")}
    >
      ← กลับไปหน้าเลือกฝ่าย
    </button>
  </section>
)}
  {page === "organization-management" && isAdmin && (
    <section className="user-management-container">
      <div className="user-management-header">
        <div className="cm-logo">ART</div>
        <h1>🏢 ฝ่ายและแผนก</h1>
        <p>รายการฝ่ายและแผนกที่มีอยู่ จัดการชื่อและสถานะได้ที่หน้านี้</p>
        <button className="main-menu-button" type="button" onClick={() => setPage("organization-add")}>
          ➕ เพิ่มฝ่ายหรือแผนก
        </button>
      </div>

      <section className="user-management-card organization-management-card">
        <h2>รายการฝ่าย</h2>
        <p>ปิดใช้งานเพื่อหยุดรับงานใหม่ โดยเก็บประวัติเดิมไว้</p>
        <div className="organization-config-list">
          {divisionRecords.map((division) => (
            <div className="organization-config-row" key={division.code}>
              <div><strong>{division.name}</strong><small>รหัส {division.code} · {division.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</small></div>
              <button className="user-permission-edit-button" type="button" onClick={() => editDivisionName(division)}>แก้ชื่อ</button>
              <button className="user-permission-edit-button" type="button" onClick={() => toggleDivisionStatus(division)}>{division.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
              <button className="danger-button" type="button" onClick={() => deleteOrganizationItem("divisions", division)}>ลบถาวร</button>
            </div>
          ))}
        </div>

        <h2>รายการแผนก</h2>
        <p>แผนกที่มีประวัติงานจะลบถาวรไม่ได้ ให้ปิดใช้งานแทนเพื่อเก็บประวัติและ PDF</p>
        <div className="organization-config-list">
          {departmentRecords.map((department) => (
            <div className="organization-config-row" key={department.code}>
              <div><strong>{department.name}</strong><small>รหัส {department.code} · ฝ่าย {divisionName(department.divisionCode)} · {department.effectiveActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}</small></div>
              <button className="user-permission-edit-button" type="button" onClick={() => editDepartmentName(department)}>แก้ชื่อ</button>
              <button className="user-permission-edit-button" type="button" onClick={() => toggleDepartmentStatus(department)}>{department.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
              <button className="danger-button" type="button" onClick={() => deleteOrganizationItem("departments", department)}>ลบถาวร</button>
            </div>
          ))}
        </div>
        {organizationMessage && <p role="status">{organizationMessage}</p>}
      </section>

      <button className="back-button" type="button" onClick={() => setPage("user-management")}>← กลับไปจัดการผู้ใช้</button>
    </section>
  )}

  {page === "organization-add" && isAdmin && (
    <section className="user-management-container">
      <div className="user-management-header">
        <div className="cm-logo">ART</div>
        <h1>➕ เพิ่มฝ่ายและแผนก</h1>
        <p>กรอกข้อมูลรายการใหม่ รายการเดิมอยู่ในหน้าฝ่ายและแผนก</p>
      </div>

      <section className="user-management-card organization-management-card">
        <h2>เพิ่มฝ่าย</h2>
        <form className="admin-user-filters" onSubmit={handleAddDivision}>
          <label>รหัสฝ่าย<input value={newDivisionCode} onChange={(event) => setNewDivisionCode(event.target.value.toUpperCase())} placeholder="เช่น RM2" maxLength={16} required /></label>
          <label>ชื่อฝ่าย<input value={newDivisionName} onChange={(event) => setNewDivisionName(event.target.value)} placeholder="ชื่อฝ่าย" maxLength={80} required /></label>
          <button className="main-menu-button" type="submit">บันทึกฝ่าย</button>
        </form>

        <h2>เพิ่มแผนก</h2>
        <form className="admin-user-filters" onSubmit={handleAddDepartment}>
          <label>รหัสแผนก<input value={newDepartmentCode} onChange={(event) => setNewDepartmentCode(event.target.value.toUpperCase())} placeholder="เช่น AGG2" maxLength={20} required /></label>
          <label>ชื่อแผนก<input value={newDepartmentName} onChange={(event) => setNewDepartmentName(event.target.value)} placeholder="ชื่อแผนก" maxLength={80} required /></label>
          <label>ฝ่าย<select value={newDepartmentDivision} onChange={(event) => setNewDepartmentDivision(event.target.value)} required>{activeDivisionRecords.map((division) => <option key={division.code} value={division.code}>{division.name}</option>)}</select></label>
          <button className="main-menu-button" type="submit" disabled={activeDivisionRecords.length === 0}>บันทึกแผนก</button>
        </form>
        {organizationMessage && <p role="status">{organizationMessage}</p>}
      </section>

      <button className="back-button" type="button" onClick={() => setPage("organization-management")}>← กลับไปหน้าฝ่ายและแผนก</button>
    </section>
  )}
  {page === "add-user" &&
  isAdmin && (
  <section className="user-management-container">
    <div className="user-management-header">
      <div className="cm-logo">ART</div>
      <h1>➕ เพิ่มผู้ใช้</h1>
      <p>กรอกข้อมูลบัญชีและกำหนดสิทธิ์การใช้งาน</p>
    </div>

    <form className="user-management-card add-user-form" onSubmit={handleAddUser}>
      <label htmlFor="new-user-id">User</label>
      <input
        id="new-user-id"
        type="text"
        autoComplete="off"
        value={newUserId}
        onChange={(event) => setNewUserId(event.target.value)}
        placeholder="กรอก User"
        required
      />

      <label htmlFor="new-user-name">ชื่อผู้ใช้</label>
      <input
        id="new-user-name"
        type="text"
        value={newUserName}
        onChange={(event) => setNewUserName(event.target.value)}
        placeholder="กรอกชื่อผู้ใช้"
        required
      />

      <label htmlFor="new-user-password">รหัสผ่านเริ่มต้น (อย่างน้อย 6 ตัวอักษร)</label>
      <input
        id="new-user-password"
        type="password"
        autoComplete="new-password"
        minLength={6}
        value={newUserPassword}
        onChange={(event) => setNewUserPassword(event.target.value)}
        placeholder="กำหนดรหัสผ่านเริ่มต้นให้ผู้ใช้"
        required
      />

      <fieldset className="add-user-departments add-user-roles">
        <legend>บทบาท / สิทธิ์ (เลือกได้มากกว่า 1 อย่าง)</legend>
        <div className="add-user-department-list">
          {[
            ["user", "ผู้ตรวจเช็กเครื่องจักร"],
            ["technician", "ช่างซ่อมบำรุง"],
              ["approver", "ผู้อนุมัติ"],
              ["manager", "Manager (ผู้จัดการ)"],
              ["inspector", "ผู้ตรวจงาน"],
            ["production-control", "ควบคุมปุ่ม START / STOP"],
            ["admin", "ผู้ดูแลระบบ"],
          ].map(([role, label]) => (
            <label key={role}>
              <input
                type="checkbox"
                checked={newUserRoles.includes(role)}
                onChange={(event) => {
                  setNewUserRoles((currentRoles) =>
                    event.target.checked
                      ? [...currentRoles, role]
                      : currentRoles.filter((item) => item !== role)
                  );
                  if (!event.target.checked && role === "technician") setNewUserRepairUnits([]);
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

              {newUserRoles.includes("technician") && (
        <fieldset className="add-user-departments add-user-roles">
          <legend>หน่วยงานซ่อมที่ช่างรับผิดชอบ (เลือกได้มากกว่า 1)</legend>
          <div className="add-user-department-list">
            {repairUrgencyTypes.map((unit) => (
              <label key={unit.value}>
                <input type="checkbox" checked={newUserRepairUnits.includes(unit.value)} onChange={(event) => setNewUserRepairUnits((current) => event.target.checked ? [...current, unit.value] : current.filter((item) => item !== unit.value))} />
                {unit.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <p className="role-scope-note">สิทธิ์ตามบทบาท: ผู้อนุมัติอนุมัติหรือไม่อนุมัติ, ช่างรับงานและบันทึกการซ่อม, ผู้ตรวจงานปิดงานหรือส่งกลับแก้ไข, ผู้ควบคุม START/STOP เปลี่ยนสถานะของแผนกที่ได้รับมอบหมาย; ลบงานได้เฉพาะผู้ดูแลระบบ</p>

      <fieldset className="add-user-departments">
        <legend>ฝ่ายที่ผู้ใช้มีสิทธิ์</legend>
        <div className="add-user-department-list">
          {activeDivisionRecords.map((item) => <label key={item.code}>
            <input type="checkbox" checked={newUserDivisions.includes(item.code)} onChange={(event) => {
              setNewUserDivisions((current) => event.target.checked ? [...current, item.code] : current.filter((code) => code !== item.code));
              if (!event.target.checked) setNewUserDepartments((current) => current.filter((department) => departmentRecords.find((entry) => entry.code === department)?.divisionCode !== item.code));
            }} />
            {divisionName(item.code)}
          </label>)}
        </div>
      </fieldset>

      <fieldset className="add-user-departments">
        <legend>แผนกที่รับผิดชอบ</legend>
        <div className="add-user-department-list">
          {activeDepartmentRecords.filter((item) => newUserDivisions.includes(item.divisionCode)).map(({ code: department }) => (
            <label key={department}>
              <input
                type="checkbox"
                disabled={!isDepartmentActive(department)}
                checked={newUserDepartments.includes(department)}
                onChange={(event) => {
                  setNewUserDepartments((currentDepartments) =>
                    event.target.checked
                      ? [...currentDepartments, department]
                      : currentDepartments.filter((item) => item !== department)
                  );
                }}
              />
              {departmentName(department)}
            </label>
          ))}
        </div>
      </fieldset>

      <button className="main-menu-button" type="submit">บันทึกผู้ใช้</button>
      <button
        className="back-button add-user-cancel"
        type="button"
        onClick={() => setPage("user-management")}
      >
        ยกเลิกและกลับ
      </button>
    </form>
  </section>
)}
      {previewImage && <ImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}

export default App;
