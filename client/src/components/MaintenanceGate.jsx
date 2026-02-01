// client/src/components/MaintenanceGate.jsx
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"

// ✅ Allowed emails (see the site even while locked)
const ALLOWED_EMAILS = [
  "icaki06@gmail.com",
  "icaki2k@gmail.com",
  "mirenmagazine@gmail.com",
]

// ✅ Target: March 1st, 18:00 Europe/Sofia
// Note: March 1st is normally UTC+2 (EET), so 18:00 Sofia = 16:00 UTC.
// We compute “this year” target; if already passed, we use next year.
function getTargetUtcMs() {
  const now = new Date()
  const year = now.getFullYear()
  const thisYearTarget = Date.UTC(year, 2, 1, 16, 0, 0) // Mar=2 (0-based), 16:00 UTC = 18:00 Sofia
  if (now.getTime() < thisYearTarget) return thisYearTarget
  return Date.UTC(year + 1, 2, 1, 16, 0, 0)
}

function pad2(n) {
  return String(Math.max(0, n)).padStart(2, "0")
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  return { days, hours, mins, secs }
}

export default function MaintenanceGate({ children }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isAllowed = useMemo(() => {
    const email = String(user?.email || "").toLowerCase().trim()
    return !!email && ALLOWED_EMAILS.includes(email)
  }, [user])

  const targetUtcMs = useMemo(() => getTargetUtcMs(), [])
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remainingMs = Math.max(0, targetUtcMs - nowMs)
  const lockedByTime = remainingMs > 0

  // ✅ Block everyone except allowed emails while time lock is active
  const shouldLock = lockedByTime && !isAllowed

  // ✅ While locked, force URL to /home so people can’t “sit” on hidden routes
  useEffect(() => {
    if (!shouldLock) return
    if (location.pathname !== "/home") {
      navigate("/home", { replace: true })
    }
  }, [shouldLock, location.pathname, navigate])

  // ✅ Stop background scroll while locked
  useEffect(() => {
    if (!shouldLock) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [shouldLock])

  // ✅ Show your normal site
  if (!shouldLock) return children

  const cd = formatCountdown(remainingMs)

  return (
    <div className="maint-overlay">
      <div className="maint-card">
        <div className="maint-badge">MIREN • Maintenance</div>

        <h1 className="maint-title">We’re preparing the launch</h1>
        <p className="maint-sub">
          The website is temporarily locked while we finish payments & updates.
        </p>

        <div className="maint-countdown">
          <div className="maint-box">
            <div className="maint-num">{cd.days}</div>
            <div className="maint-label">Days</div>
          </div>

          <div className="maint-box">
            <div className="maint-num">{pad2(cd.hours)}</div>
            <div className="maint-label">Hours</div>
          </div>

          <div className="maint-box">
            <div className="maint-num">{pad2(cd.mins)}</div>
            <div className="maint-label">Minutes</div>
          </div>

          <div className="maint-box">
            <div className="maint-num">{pad2(cd.secs)}</div>
            <div className="maint-label">Seconds</div>
          </div>
        </div>

        <div className="maint-meta">
          <div className="maint-row">
            <span className="maint-dot" />
            Opens on <b>March 1, 18:00 (Sofia)</b>
          </div>

          <div className="maint-row maint-muted">
            {loading ? (
              "Checking access…"
            ) : (
              "If you’re an admin, log in with the allowed email."
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
