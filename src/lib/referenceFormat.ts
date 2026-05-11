// Format: MMDD{SeqLetter}{SurnameInitial}K/YY  e.g. 0510AGK/26
export function buildReference(date: Date, dailyCount: number, salespersonName: string): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const letter = String.fromCharCode(65 + Math.min(dailyCount, 25)) // A–Z
  const parts = salespersonName.trim().split(/\s+/)
  const initial = (parts[parts.length - 1]?.[0] ?? 'X').toUpperCase() // last name
  const yy = String(date.getFullYear()).slice(-2)
  return `${mm}${dd}${letter}${initial}K/${yy}`
}
