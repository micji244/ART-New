// Thai date-time as shown across the app ("25/11/2569 13:39:18"), or the fallback when empty.
export function formatThaiDateTime(value: string | number | Date | null | undefined, fallback = "ไม่ระบุ"): string {
  return value ? new Date(value).toLocaleString("th-TH") : fallback;
}
