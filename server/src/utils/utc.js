export function todayUTCDate() {
  // Returns a JS Date for "today in UTC" but we mainly need YYYY-MM-DD
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  const d = String(now.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}` // ISO date (UTC)
}
