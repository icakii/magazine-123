export const ADMIN_EMAILS = [
  "icaki@mirenmagazine.com",
  "info@mirenmagazine.com",
  "info@mirenmagaizne.com",
  "icaki06@gmail.com",
  "icaki2k@gmail.com",
  "mirenmagazine@gmail.com",
  "andreivelch@gmail.com",
  "vlvd@gmail.com",
]

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email)
}
