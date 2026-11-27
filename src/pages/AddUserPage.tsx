import { repairUrgencyTypes } from "../lib/repairs";
import type { AppPageContext } from "./pageContext";

type AddUserPageProps = Pick<AppPageContext, "activeDepartmentRecords" | "activeDivisionRecords" | "departmentName" | "departmentRecords" | "divisionName" | "handleAddUser" | "isDepartmentActive" | "newUserDepartments" | "newUserDivisions" | "newUserId" | "newUserName" | "newUserPassword" | "newUserRepairUnits" | "newUserRoles" | "setNewUserDepartments" | "setNewUserDivisions" | "setNewUserId" | "setNewUserName" | "setNewUserPassword" | "setNewUserRepairUnits" | "setNewUserRoles" | "setPage">;

// Page "add-user" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function AddUserPage({ activeDepartmentRecords, activeDivisionRecords, departmentName, departmentRecords, divisionName, handleAddUser, isDepartmentActive, newUserDepartments, newUserDivisions, newUserId, newUserName, newUserPassword, newUserRepairUnits, newUserRoles, setNewUserDepartments, setNewUserDivisions, setNewUserId, setNewUserName, setNewUserPassword, setNewUserRepairUnits, setNewUserRoles, setPage }: AddUserPageProps) {
  return (
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
  );
}
