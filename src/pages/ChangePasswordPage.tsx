import type { AppPageContext } from "./pageContext";

type ChangePasswordPageProps = Pick<AppPageContext, "confirmNewPassword" | "currentPassword" | "currentUser" | "handleChangePassword" | "newPassword" | "passwordChangeError" | "passwordChangeMessage" | "setConfirmNewPassword" | "setCurrentPassword" | "setNewPassword" | "setPage">;

// Page "change-password" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function ChangePasswordPage({ confirmNewPassword, currentPassword, currentUser, handleChangePassword, newPassword, passwordChangeError, passwordChangeMessage, setConfirmNewPassword, setCurrentPassword, setNewPassword, setPage }: ChangePasswordPageProps) {
  return (
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
  );
}
