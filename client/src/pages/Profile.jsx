// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

function daysBetween(a, b) {
  const ms = Math.abs(a.getTime() - b.getTime())
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// Tries multiple endpoints/methods so you don't get stuck on a 404 mismatch
async function tryUpdateUsername(newUsername) {
  const attempts = [
    { method: "post", url: "/user/update-username" },
    { method: "post", url: "/users/update-username" },
    { method: "post", url: "/profile/update-username" },
    { method: "post", url: "/auth/update-username" },

    { method: "put", url: "/user/update-username" },
    { method: "put", url: "/users/update-username" },
    { method: "put", url: "/profile/update-username" },
    { method: "put", url: "/auth/update-username" },
  ]

  let lastErr = null

  for (const a of attempts) {
    try {
      const res =
        a.method === "post"
          ? await api.post(a.url, { newUsername })
          : await api.put(a.url, { newUsername })
      return res
    } catch (err) {
      lastErr = err
      const status = err?.response?.status
      // If endpoint doesn't exist -> try next
      if (status === 404) continue
      // Other errors are real (409, 400, 401...) -> stop
      throw err
    }
  }

  // all attempts were 404
  const e = new Error("Update username endpoint not found (404).")
  e.cause = lastErr
  throw e
}

export default function Profile() {
  const { user, loading } = useAuth()
  const [subs, setSubs] = useState([])
  const [newName, setNewName] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [is2FA, setIs2FA] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      api
        .get("/subscriptions")
        .then((res) => setSubs(res.data || []))
        .catch(() => setSubs([]))

      setNewName(user.displayName || "")
      setIs2FA(!!user.twoFaEnabled)
    }
  }, [loading, user])

  const currentPlan = subs[0]?.plan || "Free"
  const planLower = String(currentPlan).toLowerCase()
  const isPremium = ["monthly", "yearly"].includes(planLower)

  const planClass =
    planLower === "monthly"
      ? "plan-badge--monthly"
      : planLower === "yearly"
      ? "plan-badge--yearly"
      : ""

  const usernameGate = useMemo(() => {
    // Not premium -> always locked, label must be Premium Only
    if (!isPremium) {
      return {
        allowed: false,
        label: "Premium only 🔒",
        reason: "not_premium",
        daysLeft: null,
      }
    }

    // Premium: can change once per 14 days
    const last = user?.lastUsernameChange ? new Date(user.lastUsernameChange) : null
    if (!last || Number.isNaN(last.getTime())) {
      return { allowed: true, label: "Edit", reason: "ok", daysLeft: null }
    }

    const days = daysBetween(new Date(), last)
    if (days >= 14) {
      return { allowed: true, label: "Edit", reason: "ok", daysLeft: 0 }
    }

    const left = 14 - days
    return {
      allowed: false,
      label: `Wait (${left}d)`,
      reason: "cooldown",
      daysLeft: left,
    }
  }, [isPremium, user?.lastUsernameChange])

  async function handleLogout() {
    try {
      await api.post("/auth/logout")
    } catch {}
    localStorage.removeItem("auth_token")
    location.href = "/"
  }

  async function handleUpdateUsername() {
    setMsg({ type: "", text: "" })

    if (!usernameGate.allowed) {
      if (usernameGate.reason === "not_premium") {
        setMsg({ type: "error", text: "This is a Premium feature (1 change per 14 days)." })
      } else {
        setMsg({
          type: "error",
          text: `You can change your username again in ${usernameGate.daysLeft} day(s).`,
        })
      }
      return
    }

    const trimmed = String(newName || "").trim()
    if (trimmed.length < 3) {
      setMsg({ type: "error", text: "Name too short (min 3 chars)." })
      return
    }

    try {
      setSaving(true)
      await tryUpdateUsername(trimmed)
      setMsg({ type: "success", text: "Username updated!" })
      setIsEditingName(false)
      setTimeout(() => location.reload(), 900)
    } catch (err) {
      const status = err?.response?.status
      const backendError = err?.response?.data?.error

      if (status === 404) {
        setMsg({
          type: "error",
          text:
            "Update route not found (404). Check your backend route name for update username.",
        })
      } else {
        setMsg({ type: "error", text: backendError || err?.message || "Error updating username." })
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
    } catch (err) {
      setMsg({ type: "error", text: "Error sending link." })
    }
  }

  if (loading) return <div className="page"><p className="text-muted">{t("loading")}</p></div>
  if (!user) return <div className="page"><p>{t("not_logged_in")}</p></div>

  return (
    <div className="page profile-page">
      <h2 className="headline">{t("profile")}</h2>

      <div className="card stack profile-card">
        <div className="profile-row">
          <strong>{t("email")}:</strong>
          <span className="profile-mono">{user.email}</span>
        </div>

        <div className="profile-row">
          <strong>Subscription:</strong>

          <span className={`plan-badge ${planClass} ${isPremium ? "plan-badge--premium" : ""}`}>
            <span className="plan-name" style={{ textTransform: "capitalize" }}>
              {currentPlan}
            </span>
            {planLower === "monthly" && <span aria-hidden>⭐</span>}
            {planLower === "yearly" && <span aria-hidden>👑</span>}
          </span>
        </div>

        <div className="profile-divider" />

        <div className="profile-block">
          <div className="profile-block-top">
            <strong>{t("displayName")}:</strong>

            {!isEditingName && (
              <button
                onClick={() => {
                  setMsg({ type: "", text: "" })
                  setIsEditingName(true)
                }}
                disabled={!usernameGate.allowed}
                className="btn ghost profile-mini-btn"
                style={{ opacity: usernameGate.allowed ? 1 : 0.55 }}
                title={
                  usernameGate.reason === "not_premium"
                    ? "Premium feature (1 change per 14 days)"
                    : usernameGate.reason === "cooldown"
                    ? `Wait ${usernameGate.daysLeft} day(s)`
                    : "Edit username"
                }
              >
                {usernameGate.label}
              </button>
            )}
          </div>

          {!isEditingName ? (
            <span className="profile-name">{user.displayName}</span>
          ) : (
            <div className="profile-edit">
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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
                  setMsg({ type: "", text: "" })
                  setIsEditingName(false)
                  setNewName(user.displayName || "")
                }}
                className="btn ghost"
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="profile-divider" />

        <div className="profile-block">
          <strong>Security</strong>

          <div className="profile-actions">
            <button onClick={handlePasswordReset} className="btn outline profile-wide">
              Send email to reset password
            </button>

            {!is2FA ? (
              <Link to="/2fa/setup" className="btn outline profile-wide profile-2fa">
                🛡️ Configure Two-Factor Auth (2FA)
              </Link>
            ) : (
              <div className="profile-2fa-ok">✅ Two-Factor Authentication is Active</div>
            )}
          </div>
        </div>

        {msg.text && <p className={`msg ${msg.type === "error" ? "danger" : "success"}`}>{msg.text}</p>}
      </div>

      <div className="mt-3">
        <button className="btn secondary profile-logout" onClick={handleLogout}>
          {t("logout")}
        </button>
      </div>
    </div>
  )
}
