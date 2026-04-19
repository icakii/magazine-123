// client/src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"
import { t } from "../lib/i18n"
import Loader from "../components/Loader"

const USERNAME_COOLDOWN_DAYS = 14
const INSTAGRAM_COOLDOWN_DAYS = 7

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

function planSuffix(plan) {
  const p = String(plan || "free").toLowerCase()
  if (p === "monthly") return "⭐"
  if (p === "yearly") return "👑"
  return ""
}

export default function Profile() {
  const { user, loading } = useAuth()

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

  const [newInstagram, setNewInstagram] = useState("")
  const [isEditingInstagram, setIsEditingInstagram] = useState(false)

  const [saving, setSaving] = useState(false)
  const [savingInstagram, setSavingInstagram] = useState(false)

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

  useEffect(() => {
    if (serverMe) {
      setNewInstagram(serverMe.instagramHandle || "")
    }
  }, [serverMe])

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

  const usernameCooldown = useMemo(() => {
    if (!lastUsernameChange) return { can: true, daysLeft: 0 }
    const diff = daysBetween(new Date(), lastUsernameChange)
    const daysLeft = Math.max(0, USERNAME_COOLDOWN_DAYS - diff)
    return { can: daysLeft === 0, daysLeft }
  }, [lastUsernameChange])

  const lastInstagramChange = useMemo(() => {
    const raw = serverMe?.instagramUpdatedAt
    if (!raw) return null
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }, [serverMe])

  const instagramCooldown = useMemo(() => {
    if (!lastInstagramChange) return { can: true, daysLeft: 0 }
    const diff = daysBetween(new Date(), lastInstagramChange)
    const daysLeft = Math.max(0, INSTAGRAM_COOLDOWN_DAYS - diff)
    return { can: daysLeft === 0, daysLeft }
  }, [lastInstagramChange])

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

    if (!usernameCooldown.can) {
      setMsg({ type: "error", text: `You can change your username once every ${USERNAME_COOLDOWN_DAYS} days. ${usernameCooldown.daysLeft} days left.` })
      return
    }

    if (name.length < 3) {
      setMsg({ type: "error", text: t("profile_username_too_short") })
      return
    }

    setSaving(true)
    try {
      await api.post("/user/update-username", { newUsername: name })
      setMsg({ type: "success", text: t("profile_username_updated") })
      setIsEditingName(false)
      try {
        const me = await api.get("/user/me")
        setServerMe(me.data || null)
      } catch {}
      setTimeout(() => location.reload(), 600)
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.error || t("profile_username_error"),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateInstagram() {
    setMsg({ type: "", text: "" })

    if (!instagramCooldown.can) {
      setMsg({ type: "error", text: `You can change your Instagram once every ${INSTAGRAM_COOLDOWN_DAYS} days. ${instagramCooldown.daysLeft} days left.` })
      return
    }

    setSavingInstagram(true)
    try {
      await api.post("/user/update-instagram", { instagramHandle: newInstagram })
      setMsg({ type: "success", text: "Instagram handle updated!" })
      setIsEditingInstagram(false)
      try {
        const me = await api.get("/user/me")
        setServerMe(me.data || null)
      } catch {}
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.error || "Failed to update Instagram",
      })
    } finally {
      setSavingInstagram(false)
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

  if (loading) return <div className="page"><Loader /></div>
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
          <span className={`plan-badge ${isPremium ? "plan-badge--premium" : "plan-badge--free"}`}>
            {currentPlan} {planSuffix(subs?.[0]?.plan)}
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
                disabled={!usernameCooldown.can}
                style={{
                  padding: "8px 12px",
                  fontSize: "0.86rem",
                  opacity: !usernameCooldown.can ? 0.6 : 1,
                  cursor: !usernameCooldown.can ? "not-allowed" : "pointer",
                }}
                title={!usernameCooldown.can ? `Available in ${usernameCooldown.daysLeft} days` : "Edit username"}
              >
                {!usernameCooldown.can ? `Wait ${usernameCooldown.daysLeft}d` : t("profile_edit")}
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

          <div className="text-muted" style={{ marginTop: 10, fontSize: "0.95rem" }}>
            Can be changed every {USERNAME_COOLDOWN_DAYS} days
          </div>
        </div>

        <hr className="profile-sep" />

        {/* INSTAGRAM */}
        <div>
          <div className="space-between" style={{ gap: 12 }}>
            <strong>Instagram</strong>

            {!isEditingInstagram && (
              <button
                className="btn ghost"
                onClick={() => setIsEditingInstagram(true)}
                disabled={!instagramCooldown.can}
                style={{
                  padding: "8px 12px",
                  fontSize: "0.86rem",
                  opacity: !instagramCooldown.can ? 0.6 : 1,
                  cursor: !instagramCooldown.can ? "not-allowed" : "pointer",
                }}
                title={!instagramCooldown.can ? `Available in ${instagramCooldown.daysLeft} days` : "Edit Instagram"}
              >
                {!instagramCooldown.can ? `Wait ${instagramCooldown.daysLeft}d` : t("profile_edit")}
              </button>
            )}
          </div>

          {!isEditingInstagram ? (
            <div style={{ marginTop: 8, fontWeight: 700 }}>
              {serverMe?.instagramHandle
                ? <a href={`https://instagram.com/${serverMe.instagramHandle}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--oxide-red)" }}>@{serverMe.instagramHandle}</a>
                : <span className="text-muted" style={{ fontWeight: 400 }}>Not set</span>
              }
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>@</span>
              <input
                className="input"
                value={newInstagram}
                onChange={(e) => setNewInstagram(e.target.value.replace(/^@/, ""))}
                style={{ flex: "1 1 220px" }}
                placeholder="your_handle"
              />
              <button onClick={handleUpdateInstagram} className="btn primary" disabled={savingInstagram}>
                {savingInstagram ? t("profile_saving") : t("profile_save")}
              </button>
              <button
                onClick={() => {
                  setIsEditingInstagram(false)
                  setNewInstagram(serverMe?.instagramHandle || "")
                  setMsg({ type: "", text: "" })
                }}
                className="btn ghost"
              >
                {t("profile_cancel")}
              </button>
            </div>
          )}

          <div className="text-muted" style={{ marginTop: 10, fontSize: "0.95rem" }}>
            Can be changed every {INSTAGRAM_COOLDOWN_DAYS} days
          </div>
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
