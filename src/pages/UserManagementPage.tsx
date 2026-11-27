import { repairUrgencyTypes } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type UserManagementPageProps = Pick<AppPageContext, "adminResetPassword" | "currentUser" | "departmentName" | "departmentRecords" | "divisionName" | "divisions" | "editableUserDepartments" | "editableUserDivisions" | "editingUserDepartments" | "editingUserDivisions" | "editingUserId" | "editingUserRepairUnits" | "editingUserRoles" | "handleAdminResetPassword" | "handleDeleteUser" | "handleSaveUserPermissions" | "isDepartmentActive" | "managedUserGroups" | "onlineUsers" | "resettingUserId" | "setAdminResetPassword" | "setEditingUserDepartments" | "setEditingUserDivisions" | "setEditingUserId" | "setEditingUserRepairUnits" | "setEditingUserRoles" | "setPage" | "setResettingUserId" | "setShowOnlineUsers" | "setUserManagementDivision" | "setUserManagementSearch" | "showOnlineUsers" | "userManagementDivision" | "userManagementSearch">;

// Page "user-management" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function UserManagementPage({ adminResetPassword, currentUser, departmentName, departmentRecords, divisionName, divisions, editableUserDepartments, editableUserDivisions, editingUserDepartments, editingUserDivisions, editingUserId, editingUserRepairUnits, editingUserRoles, handleAdminResetPassword, handleDeleteUser, handleSaveUserPermissions, isDepartmentActive, managedUserGroups, onlineUsers, resettingUserId, setAdminResetPassword, setEditingUserDepartments, setEditingUserDivisions, setEditingUserId, setEditingUserRepairUnits, setEditingUserRoles, setPage, setResettingUserId, setShowOnlineUsers, setUserManagementDivision, setUserManagementSearch, showOnlineUsers, userManagementDivision, userManagementSearch }: UserManagementPageProps) {
  return (
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
  );
}
