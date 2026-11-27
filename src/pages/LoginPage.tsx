import LoginGearGraphic from "../components/LoginGearGraphic";
import type { AppPageContext } from "./pageContext";

type LoginPageProps = Pick<AppPageContext, "authError" | "handleLogin" | "password" | "rememberPassword" | "setPassword" | "setRememberPassword" | "setShowPassword" | "setUserId" | "showPassword" | "userId">;

// Page "login" — moved out of App.tsx unchanged. App decides when it is shown and passes the shared state it uses.
export default function LoginPage({ authError, handleLogin, password, rememberPassword, setPassword, setRememberPassword, setShowPassword, setUserId, showPassword, userId }: LoginPageProps) {
  return (
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
  );
}
