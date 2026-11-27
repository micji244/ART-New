import { useEffect, useRef, useState } from "react";
import "./App.css";
import { loadAccountData, withApiBase } from "./api/client";
import ImageLightbox from "./components/ImageLightbox";
import NotificationsPage from "./pages/NotificationsPage";
import AddUserPage from "./pages/AddUserPage";
import ApprovalListPage from "./pages/ApprovalListPage";
import ApprovalRejectedListPage from "./pages/ApprovalRejectedListPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import CompletedListPage from "./pages/CompletedListPage";
import DepartmentControlHistoryPage from "./pages/DepartmentControlHistoryPage";
import DepartmentHomePage from "./pages/DepartmentHomePage";
import DepartmentPage from "./pages/DepartmentPage";
import DivisionPage from "./pages/DivisionPage";
import InspectionListPage from "./pages/InspectionListPage";
import InspectionPage from "./pages/InspectionPage";
import LoginPage from "./pages/LoginPage";
import NewRepairPage from "./pages/NewRepairPage";
import OrganizationAddPage from "./pages/OrganizationAddPage";
import OrganizationManagementPage from "./pages/OrganizationManagementPage";
import RejectedListPage from "./pages/RejectedListPage";
import RepairAssignmentListPage from "./pages/RepairAssignmentListPage";
import RepairAssignmentPage from "./pages/RepairAssignmentPage";
import RepairDetailPage from "./pages/RepairDetailPage";
import RepairExecutionPage from "./pages/RepairExecutionPage";
import RepairPdfPage from "./pages/RepairPdfPage";
import RepairTimeListPage from "./pages/RepairTimeListPage";
import RepairTimePage from "./pages/RepairTimePage";
import RepairTimeReviewPage from "./pages/RepairTimeReviewPage";
import RepairingListPage from "./pages/RepairingListPage";
import RepairsPage from "./pages/RepairsPage";
import SystemRecoveryPage from "./pages/SystemRecoveryPage";
import UserHistoryPage from "./pages/UserHistoryPage";
import UserManagementPage from "./pages/UserManagementPage";
import type { AppPageContext } from "./pages/pageContext";
import { fileToDataUrl } from "./lib/images";
import { getRepairUrgencyInfo, initialDepartmentRecords, initialDivisionRecords, isInRejectedHistory, maxRepairImages, userLifecycleActions, withoutImages } from "./lib/repairs";
import type { AdminAuditLog, AnnouncementRecord, AppTheme, AppUser, AuditLog, DepartmentControl, DepartmentRecord, DivisionRecord, OnlineUser, PreviewImage, RepairRecord } from "./types";

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

  // Everything the pages in src/pages need from App's state (see pages/pageContext.ts).
const pageContext: AppPageContext = {
  activeDepartmentRecords,
  activeDivisionRecords,
  addAuditLog,
  adminResetPassword,
  announcementDragging,
  announcementError,
  announcementFileInputRef,
  announcementSaving,
  announcements,
  approvalRejectReason,
  approvalWorkTypeSelections,
  assignmentQueueAllDepartments,
  assignmentRepairs,
  auditLogs,
  authError,
  backupBusy,
  backupMessage,
  calculateDuration,
  canApprove,
  canInspect,
  canRepair,
  canRepairUnit,
  canRequestRepair,
  canSetDepartmentStatus,
  confirmNewPassword,
  countDepartmentRepairs,
  currentPassword,
  currentUser,
  deleteOrganizationItem,
  deletedRepairs,
  deletedUsers,
  departmentControlHistory,
  departmentControls,
  departmentName,
  departmentRecords,
  divisionAssignmentRepairs,
  divisionDepartments,
  divisionName,
  divisionRecords,
  divisionRepairSearchQuery,
  divisionRepairSearchResults,
  divisionRepairSearchTerm,
  divisions,
  dueTime,
  editDepartmentName,
  editDivisionName,
  editableUserDepartments,
  editableUserDivisions,
  editingUserDepartments,
  editingUserDivisions,
  editingUserId,
  editingUserRepairUnits,
  editingUserRoles,
  filteredRepairHistory,
  getInspectorName,
  getRequesterName,
  handleAddDepartment,
  handleAddDivision,
  handleAddUser,
  handleAdminResetPassword,
  handleAnnouncementFiles,
  handleChangePassword,
  handleCreateBackup,
  handleDeleteAnnouncement,
  handleDeleteRepair,
  handleDeleteUser,
  handleDepartment,
  handleLogin,
  handleLogout,
  handleRejectApproval,
  handleRepairImageSelection,
  handleRestoreDeleted,
  handleSaveUserPermissions,
  handleSetDepartmentControl,
  isAdmin,
  isDepartmentActive,
  isSavingRepairStep,
  knownMachineCodes,
  lastSavedRepairsRef,
  machineCode,
  machineCodeHistory,
  machineName,
  managedUserGroups,
  newDepartmentCode,
  newDepartmentDivision,
  newDepartmentName,
  newDivisionCode,
  newDivisionName,
  newPassword,
  newUserDepartments,
  newUserDivisions,
  newUserId,
  newUserName,
  newUserPassword,
  newUserRepairUnits,
  newUserRoles,
  onlineUsers,
  organizationMessage,
  overdueRepairs,
  password,
  passwordChangeError,
  passwordChangeMessage,
  personName,
  problemDescription,
  rejectedHistoryRepairs,
  rejectingApprovalId,
  rememberPassword,
  repairAssignmentUnitFilter,
  repairAssignmentWorkTypeFilter,
  repairData,
  repairDateFrom,
  repairDateTo,
  repairDepartmentFilter,
  repairImages,
  repairImagesError,
  repairSearchTerm,
  repairWorkDetails,
  repairWorkNotes,
  repairs,
  resettingUserId,
  saveRepairStep,
  selectedDepartment,
  selectedDivision,
  selectedUrgency,
  setAdminResetPassword,
  setAnnouncementDragging,
  setApprovalRejectReason,
  setApprovalWorkTypeSelections,
  setAssignmentQueueAllDepartments,
  setConfirmNewPassword,
  setCurrentPassword,
  setDivisionRepairSearchTerm,
  setDueTime,
  setEditingUserDepartments,
  setEditingUserDivisions,
  setEditingUserId,
  setEditingUserRepairUnits,
  setEditingUserRoles,
  setMachineCode,
  setMachineName,
  setNewDepartmentCode,
  setNewDepartmentDivision,
  setNewDepartmentName,
  setNewDivisionCode,
  setNewDivisionName,
  setNewPassword,
  setNewUserDepartments,
  setNewUserDivisions,
  setNewUserId,
  setNewUserName,
  setNewUserPassword,
  setNewUserRepairUnits,
  setNewUserRoles,
  setPage,
  setPassword,
  setPasswordChangeError,
  setPasswordChangeMessage,
  setPreviewImage,
  setProblemDescription,
  setRejectingApprovalId,
  setRememberPassword,
  setRepairAssignmentUnitFilter,
  setRepairAssignmentWorkTypeFilter,
  setRepairData,
  setRepairDateFrom,
  setRepairDateTo,
  setRepairDepartmentFilter,
  setRepairImages,
  setRepairSearchTerm,
  setRepairWorkDetails,
  setRepairWorkNotes,
  setRepairs,
  setResettingUserId,
  setSelectedDepartment,
  setSelectedDivision,
  setSelectedUrgency,
  setShowOnlineUsers,
  setShowPassword,
  setStartTime,
  setUserId,
  setUserManagementDivision,
  setUserManagementSearch,
  showOnlineUsers,
  showPassword,
  startTime,
  toggleDepartmentStatus,
  toggleDivisionStatus,
  userId,
  userLifecycleLogs,
  userManagementDivision,
  userManagementSearch,
  users,
  visibleAssignmentRepairs,
  visibleDivisions,
  visibleRepairDepartments,
  visibleReportImages,
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
      {page === "login" && <LoginPage {...pageContext} />}
      {/* ================= COMPLETED LIST ================= */}
{page === "completed-list" && <CompletedListPage {...pageContext} />}
{/* ================= REPAIRING LIST ================= */}
{page === "repairing-list" && <RepairingListPage {...pageContext} />}
{/* ================= REPAIR LIST ================= */}
{page === "repairs" && <RepairsPage {...pageContext} />}
      {page === "new-repair" && <NewRepairPage {...pageContext} />}
      
      




{/* ================= REPAIR TIME ================= */}
{page === "repair-time" && <RepairTimePage {...pageContext} />}


{/* ================= REPAIR TIME LIST ================= */}
{page === "repair-time-list" && <RepairTimeListPage {...pageContext} />}
{/* ================= REPAIR TIME REVIEW ================= */}
{page === "repair-time-review" && <RepairTimeReviewPage {...pageContext} />}
{/* ================= INSPECTION LIST ================= */}
{page === "inspection-list" && <InspectionListPage {...pageContext} />}

{/* ================= REPAIR EXECUTION ================= */}
{page === "repair-execution" && <RepairExecutionPage {...pageContext} />}
{/* ================= INSPECTION ================= */}
{page === "inspection" && <InspectionPage {...pageContext} />}
{/* ================= REJECTED LIST ================= */}
{page === "rejected-list" && <RejectedListPage {...pageContext} />}
{/* ================= REPAIR ASSIGNMENT ================= */}
{page === "repair-assignment" && <RepairAssignmentPage {...pageContext} />}

{page === "approval-list" && <ApprovalListPage {...pageContext} />}

{page === "approval-rejected-list" && <ApprovalRejectedListPage {...pageContext} />}



{page === "repair-pdf" && repairData?.status === "จบงาน" && <RepairPdfPage {...pageContext} />}

{page === "repair-detail" && <RepairDetailPage {...pageContext} />}      
      {/* ================= DEPARTMENT ================= */}

      {/* ================= DEPARTMENT HOME ================= */}
{page === "department-home" && <DepartmentHomePage {...pageContext} />}
{page === "department-control-history" && <DepartmentControlHistoryPage {...pageContext} />}
{page === "repair-assignment-list" && <RepairAssignmentListPage {...pageContext} />}
      {page === "change-password" && <ChangePasswordPage {...pageContext} />}
      {page === "division" && <DivisionPage {...pageContext} />}
      {page === "department" && <DepartmentPage {...pageContext} />}

    {page === "notifications" && (
      <NotificationsPage
        departmentLabel={departmentName(selectedDepartment)}
        overdueRepairs={overdueRepairs}
        onOpenRepair={(repair) => { setRepairData(repair); setPage("repair-detail"); }}
        onBack={() => setPage("department-home")}
      />
    )}
  {page === "user-history" && isAdmin && <UserHistoryPage {...pageContext} />}

  {page === "system-recovery" && isAdmin && <SystemRecoveryPage {...pageContext} />}

  {page === "user-management" &&
  isAdmin && <UserManagementPage {...pageContext} />}
  {page === "organization-management" && isAdmin && <OrganizationManagementPage {...pageContext} />}

  {page === "organization-add" && isAdmin && <OrganizationAddPage {...pageContext} />}
  {page === "add-user" &&
  isAdmin && <AddUserPage {...pageContext} />}
      {previewImage && <ImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}

export default App;
