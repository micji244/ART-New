import type { AppPageContext } from "./pageContext";

type OrganizationAddPageProps = Pick<AppPageContext, "activeDivisionRecords" | "handleAddDepartment" | "handleAddDivision" | "newDepartmentCode" | "newDepartmentDivision" | "newDepartmentName" | "newDivisionCode" | "newDivisionName" | "organizationMessage" | "setNewDepartmentCode" | "setNewDepartmentDivision" | "setNewDepartmentName" | "setNewDivisionCode" | "setNewDivisionName" | "setPage">;

// Page "organization-add" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function OrganizationAddPage({ activeDivisionRecords, handleAddDepartment, handleAddDivision, newDepartmentCode, newDepartmentDivision, newDepartmentName, newDivisionCode, newDivisionName, organizationMessage, setNewDepartmentCode, setNewDepartmentDivision, setNewDepartmentName, setNewDivisionCode, setNewDivisionName, setPage }: OrganizationAddPageProps) {
  return (
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
  );
}
