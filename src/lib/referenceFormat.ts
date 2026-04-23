// Format: KP-YYYYMMDD-NNN  (NNN = daily sequence, zero-padded to 3 digits)
export function buildReference(date: Date, dailyCount: number): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const seq = String(dailyCount + 1).padStart(3, '0')
  return `KP-${y}${m}${d}-${seq}`
}
