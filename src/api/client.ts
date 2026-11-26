import type { AccountData } from "../types";

// Base URL for the API backend. Empty (default) = same origin (dev / same-host).
// Set VITE_API_BASE_URL (e.g. https://api.example.onrender.com) when the static
// frontend is served from GitHub Pages and the API lives on Render (cross-origin).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").toString().replace(/\/+$/, "");
export function withApiBase(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function loadAccountData(): Promise<AccountData> {
  let response = await fetch(withApiBase("/api/data"), { credentials: "include" });
  let data = await response.json();
  if (!response.ok) throw new Error(data.error || "โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ");

  if (data.user.roles?.includes("admin") && data.repairs.length === 0) {
    try {
      const oldRepairs = JSON.parse(localStorage.getItem("cm_repairs") || "[]");
      const oldLogs = JSON.parse(localStorage.getItem("cm_auditLogs") || "[]");
      if (oldRepairs.length) {
        await fetch(withApiBase("/api/migrate-local"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ repairs: oldRepairs, auditLogs: oldLogs }),
        });
        response = await fetch(withApiBase("/api/data"), { credentials: "include" });
        data = await response.json();
      }
    } catch (error) {
      console.error("ย้ายข้อมูลงานเดิมไม่สำเร็จ:", error);
    }
  }
  return data;
}

