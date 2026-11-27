import type { AppPageContext } from "./pageContext";

type DivisionPageProps = Pick<AppPageContext, "announcementDragging" | "announcementError" | "announcementFileInputRef" | "announcementSaving" | "announcements" | "divisionName" | "handleAnnouncementFiles" | "handleDeleteAnnouncement" | "handleLogout" | "isAdmin" | "setAnnouncementDragging" | "setPage" | "setPasswordChangeError" | "setPasswordChangeMessage" | "setPreviewImage" | "setSelectedDepartment" | "setSelectedDivision" | "visibleDivisions">;

// Page "division" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function DivisionPage({ announcementDragging, announcementError, announcementFileInputRef, announcementSaving, announcements, divisionName, handleAnnouncementFiles, handleDeleteAnnouncement, handleLogout, isAdmin, setAnnouncementDragging, setPage, setPasswordChangeError, setPasswordChangeMessage, setPreviewImage, setSelectedDepartment, setSelectedDivision, visibleDivisions }: DivisionPageProps) {
  return (
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
  );
}
