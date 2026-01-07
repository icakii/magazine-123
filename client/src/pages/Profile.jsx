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

  // ✅ force re-render when language changes
  const [, setLangTick] = useState(0)
  useEffect(() => {
    const onLang = () => setLangTick((x) => x + 1)
    window.addEventListener("lang:change", onLang)
    return () => window.removeEventListener("lang:change", onLang)
  }, [])

  const [subs, setSubs] = useState([])
  const [serverMe, setServerMe] = useState(null)

  const [newName, setNewName] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [saving, setSaving] = useState(false)

  const [msg, setMsg] = useState({ type: "", text: "" })
  const [is2FA, setIs2FA] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      api
        .get("/subscriptions")
        .then((res) => setSubs(res.data || []))
        .catch(() => setSubs([]))

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

  const lastUsernameChange = useMemo(() => {
    const raw = serverMe?.lastUsernameChange || user?.lastUsernameChange
    if (!raw) return null
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }, [serverMe, user])

  const cooldown = useMemo(() => {
    if (!lastUsernameChange) return { can: true, daysLeft: 0 }
    const diff = daysBetween(new Date(), lastUsernameChange)
    const daysLeft = Math.max(0, COOLDOWN_DAYS - diff)
    return { can: daysLeft === 0, daysLeft }
  }, [lastUsernameChange])

  const editButtonLabel = useMemo(() => {
    if (!isPremium) return t("profile_premium_only")
    if (!cooldown.can) return t("profile_wait").replace("{days}", String(cooldown.daysLeft))
    return t("profile_edit")
  }, [isPremium, cooldown])

  async function handleLogout() {
    try {
      await api.post("/auth/logout")
    } catch {}

    localStorage.removeItem("auth_token")
    localStorage.removeItem("token")
    location.href = "/"
  }

  async function handleUpdateUsername() {
    const name = String(newName || "").trim()
    setMsg({ type: "", text: "" })

    if (!isPremium) {
      setMsg({ type: "error", text: t("profile_premium_feature_error") })
      return
    }

    // ✅ само premium user, който е използвал промяната -> тогава показваме WAIT
    if (!cooldown.can) {
      setMsg({
        type: "error",
        text: t("profile_username_cooldown_error").replace("{days}", String(COOLDOWN_DAYS)),
      })
      return
    }

    if (name.length < 3) {
      setMsg({ type: "error", text: t("profile_username_too_short") })
      return
    }

    setSaving(true)
    try {
      // ⚠️ ако backend route липсва -> ще даде 404
      await api.post("/user/update-username", { newUsername: name })

      setMsg({ type: "success", text: t("profile_username_updated") })
      setIsEditingName(false)

      try {
        const me = await api.get("/user/me")
        setServerMe(me.data || null)
      } catch {}

      setTimeout(() => location.reload(), 600)
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        setMsg({ type: "error", text: t("profile_endpoint_missing") })
      } else {
        setMsg({
          type: "error",
          text: err?.response?.data?.error || t("profile_username_error"),
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
      setMsg({ type: "success", text: t("profile_reset_sent") })
    } catch {
      setMsg({ type: "error", text: t("profile_reset_error") })
    }
  }

  if (loading) return <div className="page"><p className="text-muted">{t("loading")}</p></div>
  if (!user) return <div className="page"><p>{t("not_logged_in")}</p></div>

  return (
    <div className="page profile-page">
      <h2 className="headline">{t("profile")}</h2>

      <div className="card stack profile-card">
        {/* EMAIL */}
        <div className="inline">
          <strong>{t("email")}:</strong> <span>{user.email}</span>
        </div>

        {/* SUBSCRIPTION */}
        <div className="inline" style={{ alignItems: "center", gap: 10 }}>
          <strong>{t("subscription")}:</strong>

          {/* ✅ animation like leaderboard style */}
          <span className={`plan-badge ${isPremium ? "plan-badge--premium" : "plan-badge--free"}`}>
            {currentPlan} {isPremium && "★"}
          </span>
        </div>

        <hr className="profile-sep" />

        {/* USERNAME */}
        <div>
          <div className="space-between" style={{ gap: 12 }}>
            <strong>{t("profile_username_section")}</strong>

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
                    ? t("profile_premium_only")
                    : !cooldown.can
                      ? t("profile_available_in").replace("{days}", String(cooldown.daysLeft))
                      : t("profile_edit")
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
                placeholder={t("profile_new_username_placeholder")}
              />
              <button onClick={handleUpdateUsername} className="btn primary" disabled={saving}>
                {saving ? t("profile_saving") : t("profile_save")}
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false)
                  setNewName(user.displayName || "")
                  setMsg({ type: "", text: "" })
                }}
                className="btn ghost"
              >
                {t("profile_cancel")}
              </button>
            </div>
          )}

          {isPremium && (
            <div className="text-muted" style={{ marginTop: 10, fontSize: "0.95rem" }}>
              {t("profile_username_hint").replace("{days}", String(COOLDOWN_DAYS))}
            </div>
          )}
        </div>

        <hr className="profile-sep" />

        {/* SECURITY */}
        <div>
          <strong>{t("security")}</strong>

          <div className="profile-big-actions">
            <button onClick={handlePasswordReset} className="btn outline big-action">
              {t("profile_reset_btn")}
            </button>

            {!is2FA ? (
              <Link to="/2fa/setup" className="btn outline big-action" style={{ textAlign: "center" }}>
                {t("profile_2fa_setup_btn")}
              </Link>
            ) : (
              <div className="msg success" style={{ textAlign: "center" }}>
                {t("profile_2fa_active")}
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
