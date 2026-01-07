import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function Profile() {
  const { user, loading } = useAuth()
  const [subs, setSubs] = useState([])
  const [newName, setNewName] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [is2FA, setIs2FA] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      api.get("/subscriptions").then((res) => setSubs(res.data || [])).catch(() => setSubs([]))
      setNewName(user.displayName || "")
      setIs2FA(!!user.twoFaEnabled)
    }
  }, [loading, user])

  const currentPlan = subs[0]?.plan || "Free"
  const planLower = String(currentPlan).toLowerCase()
  const isPremium = ["monthly", "yearly"].includes(planLower)

  const canChangeNameVisual = () => {
    if (!isPremium) return false
    if (!user.lastUsernameChange) return true
    const diffDays = Math.ceil(
      Math.abs(new Date() - new Date(user.lastUsernameChange)) / (1000 * 60 * 60 * 24)
    )
    return diffDays >= 14
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout")
    } catch {}
    localStorage.removeItem("auth_token")
    location.href = "/"
  }

  async function handleUpdateUsername() {
    if (newName.length < 3) {
      setMsg({ type: "error", text: "Name too short" })
      return
    }
    try {
      await api.post("/user/update-username", { newUsername: newName })
      setMsg({ type: "success", text: "Username updated!" })
      setIsEditingName(false)
      setTimeout(() => location.reload(), 900)
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.error || "Error updating" })
    }
  }

  async function handlePasswordReset() {
    try {
      await api.post("/auth/reset-password-request", { email: user.email })
      setMsg({ type: "success", text: "Reset link sent to your email!" })
    } catch (err) {
      setMsg({ type: "error", text: "Error sending link." })
    }
  }

  if (loading) return <div className="page"><p className="text-muted">{t("loading")}</p></div>
  if (!user) return <div className="page"><p>{t("not_logged_in")}</p></div>

  const planClass =
    planLower === "monthly" ? "plan-badge--monthly" : planLower === "yearly" ? "plan-badge--yearly" : ""

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
                onClick={() => setIsEditingName(true)}
                disabled={!canChangeNameVisual()}
                className="btn ghost profile-mini-btn"
                title={!canChangeNameVisual() ? "Premium only / wait timer" : "Edit username"}
              >
                {canChangeNameVisual() ? "Edit" : isPremium ? "Premium only 🔒" : "Wait"}
              </button>
            )}
          </div>

          {!isEditingName ? (
            <span className="profile-name">{user.displayName}</span>
          ) : (
            <div className="profile-edit">
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <button onClick={handleUpdateUsername} className="btn primary">
                Save
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
