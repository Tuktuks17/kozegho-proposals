// Format: MMDD{SeqLetter}{FirstNameInitial}K/YY  e.g. 0510AAK/26

const TITLE_RE = /^(eng|dr|dra|sr|sra|prof|lic|mr|ms|mrs)\.?\s+/i

function firstNameInitial(fullName: string): string {
  const stripped = fullName.trim().replace(TITLE_RE, '')
  const firstName = stripped.split(/\s+/)[0] ?? ''
  return (firstName[0] ?? 'X').toUpperCase()
}

export function buildReference(date: Date, dailyCount: number, salespersonName: string): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const letter = String.fromCharCode(65 + Math.min(dailyCount, 25)) // A–Z
  const initial = firstNameInitial(salespersonName)
  const yy = String(date.getFullYear()).slice(-2)
  return `${mm}${dd}${letter}${initial}K/${yy}`
}
