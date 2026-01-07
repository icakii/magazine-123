// client/src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

const COOLDOWN_DAYS = 14

function daysBetween(a, b) {
  const ms = Math.abs(a.getTime() - b.getTime())
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function toTitleCasePlan(plan) {
  const p = String(plan || "free").toLowerCase()
  if (p === "monthly") return "Monthly"
  if (p === "yearly") return "Yearly"
  return "Free"
}

export default function Profile() {
  const { user, loading } = useAuth()

  const [subs, setSubs] = useState([])
  const [serverMe, setServerMe] = useState(null)

  const [newName, setNewName] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [saving, setSaving] = useState(false)

  const [msg, setMsg] = useState({ type: "", text: "" })
  const [is2FA, setIs2FA] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      // subs
      api
        .get("/subscriptions")
        .then((res) => setSubs(res.data || []))
        .catch(() => setSubs([]))

      // user/me (за да имаме последни данни от server)
      api
        .get("/user/me")
        .then((res) => setServerMe(res.data || null))
        .catch(() => setServerMe(null))

      setNewName(user.displayName || "")
      setIs2FA(!!user.twoFaEnabled)
    }
  }, [loading, user])

  const currentPlan = useMemo(() => {
    const p = subs?.[0]?.plan
    return toTitleCasePlan(p)
  }, [subs])

  const isPremium = useMemo(() => {
    return ["monthly", "yearly"].includes(String(subs?.[0]?.plan || "").toLowerCase())
  }, [subs])

  // lastUsernameChange може да идва от useAuth или от /user/me (ако го връщаш)
  const lastUsernameChange = useMemo(() => {
    // предпочитаме serverMe ако го има
    const fromServer = serverMe?.lastUsernameChange
    const fromAuth = user?.lastUsernameChange
    const raw = fromServer || fromAuth
    if (!raw) return null
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }, [serverMe, user])

  const cooldown = useMemo(() => {
    if (!lastUsernameChange) {
      return { can: true, daysLeft: 0 }
    }
    const diff = daysBetween(new Date(), lastUsernameChange)
    const daysLeft = Math.max(0, COOLDOWN_DAYS - diff)
    return { can: daysLeft === 0, daysLeft }
  }, [lastUsernameChange])

  const editButtonLabel = useMemo(() => {
    if (!isPremium) return "Premium only 🔒"
    if (!cooldown.can) return `Wait ${cooldown.daysLeft} day${cooldown.daysLeft === 1 ? "" : "s"}`
    return "Edit"
  }, [isPremium, cooldown])

  async function handleLogout() {
    try {
      await api.post("/auth/logout")
    } catch {}

    // чистим и двата key-а (защото ти ги ползваш различно на места)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("token")

    location.href = "/"
  }

  async function handleUpdateUsername() {
    const name = String(newName || "").trim()
    setMsg({ type: "", text: "" })

    if (!isPremium) {
      setMsg({ type: "error", text: "This is a Premium feature." })
      return
    }

    if (!cooldown.can) {
      setMsg({ type: "error", text: `You can change your username once every ${COOLDOWN_DAYS} days.` })
      return
    }

    if (name.length < 3) {
      setMsg({ type: "error", text: "Name too short (min 3 chars)." })
      return
    }

    setSaving(true)
    try {
      // ✅ ВАЖНО: този endpoint ГО НЯМА при теб в backend -> ще върне 404 докато не го добавиш
      await api.post("/user/update-username", { newUsername: name })

      setMsg({ type: "success", text: "Username updated!" })
      setIsEditingName(false)

      // refresh profile data
      try {
        const me = await api.get("/user/me")
        setServerMe(me.data || null)
      } catch {}

      setTimeout(() => location.reload(), 700)
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        setMsg({
          type: "error",
          text: "Username endpoint not found (404). Add backend route: POST /api/user/update-username",
        })
      } else {
        setMsg({
          type: "error",
          text: err?.response?.data?.error || "Error updating username.",
        })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordReset() {
    setMsg({ type: "", text: "" })
    try {
      await api.post("/auth/reset-password-request", { email: user.email })
      setMsg({ type: "success", text: "Reset link sent to your email!" })
    } catch {
      setMsg({ type: "error", text: "Error sending link." })
    }
  }

  if (loading) return <div className="page"><p className="text-muted">{t("loading")}</p></div>
  if (!user) return <div className="page"><p>{t("not_logged_in")}</p></div>

  return (
    <div className="page">
      <h2 className="headline">{t("profile")}</h2>

      <div className="card stack">
        <div className="inline">
          <strong>{t("email")}:</strong> <span>{user.email}</span>
        </div>

        <div className="inline">
          <strong>Subscription:</strong>
          <span style={{ fontWeight: 900, textTransform: "none" }}>
            {currentPlan} {isPremium && "⭐"}
          </span>
        </div>

        <hr style={{ margin: "14px 0", border: 0, borderTop: "1px solid rgba(0,0,0,0.08)" }} />

        <div>
          <div className="space-between" style={{ gap: 12 }}>
            <strong>{t("displayName")}:</strong>

            {!isEditingName && (
              <button
                className="btn ghost"
                onClick={() => setIsEditingName(true)}
                disabled={!isPremium || !cooldown.can}
                style={{
                  padding: "8px 12px",
                  fontSize: "0.86rem",
                  opacity: !isPremium || !cooldown.can ? 0.6 : 1,
                  cursor: !isPremium || !cooldown.can ? "not-allowed" : "pointer",
                }}
                title={
                  !isPremium
                    ? "Premium only"
                    : !cooldown.can
                      ? `Available in ${cooldown.daysLeft} day(s)`
                      : "Edit your username"
                }
              >
                {editButtonLabel}
              </button>
            )}
          </div>

          {!isEditingName ? (
            <div style={{ marginTop: 8, fontWeight: 900 }}>{user.displayName}</div>
          ) : (
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ flex: "1 1 260px" }}
                placeholder="New username"
              />
              <button
                onClick={handleUpdateUsername}
                className="btn primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false)
                  setNewName(user.displayName || "")
                  setMsg({ type: "", text: "" })
                }}
                className="btn ghost"
              >
                Cancel
              </button>
            </div>
          )}

          {isPremium && (
            <div className="text-muted" style={{ marginTop: 10, fontSize: "0.95rem" }}>
              You can change your username once every {COOLDOWN_DAYS} days.
            </div>
          )}
        </div>

        <hr style={{ margin: "14px 0", border: 0, borderTop: "1px solid rgba(0,0,0,0.08)" }} />

        <div>
          <strong>Security</strong>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <button onClick={handlePasswordReset} className="btn outline" style={{ width: "100%" }}>
              Send Email to Reset Password
            </button>

            {!is2FA ? (
              <Link to="/2fa/setup" className="btn outline" style={{ width: "100%", textAlign: "center" }}>
                🛡️ Configure Two-Factor Auth (2FA)
              </Link>
            ) : (
              <div className="msg success" style={{ textAlign: "center" }}>
                ✅ Two-Factor Authentication is Active
              </div>
            )}
          </div>
        </div>

        {msg.text && (
          <p className={`msg ${msg.type === "error" ? "danger" : "success"}`} style={{ textAlign: "center" }}>
            {msg.text}
          </p>
        )}
      </div>

      <div className="mt-3">
        <button className="btn secondary" onClick={handleLogout}>
          {t("logout")}
        </button>
      </div>
    </div>
  )
}
