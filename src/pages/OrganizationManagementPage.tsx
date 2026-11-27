import type { AppPageContext } from "./pageContext";

type OrganizationManagementPageProps = Pick<AppPageContext, "deleteOrganizationItem" | "departmentRecords" | "divisionName" | "divisionRecords" | "editDepartmentName" | "editDivisionName" | "organizationMessage" | "setPage" | "toggleDepartmentStatus" | "toggleDivisionStatus">;

// Page "organization-management" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function OrganizationManagementPage({ deleteOrganizationItem, departmentRecords, divisionName, divisionRecords, editDepartmentName, editDivisionName, organizationMessage, setPage, toggleDepartmentStatus, toggleDivisionStatus }: OrganizationManagementPageProps) {
  return (
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
  );
}
