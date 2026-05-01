// client/src/pages/Profile.jsx
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
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

function planBadgeClass(plan) {
  const p = String(plan || "free").toLowerCase()
  if (p === "yearly") return "plan-badge plan-badge--yearly"
  if (p === "monthly") return "plan-badge plan-badge--monthly"
  return "plan-badge plan-badge--free"
}

const PROFILE_TABS = [
  { key: "account", label: "Акаунт" },
  { key: "liked", label: "❤️ Харесани" },
  { key: "saved", label: "🔖 Запазени" },
  { key: "orders", label: "📦 Поръчки" },
]

function ArticleCard({ article, onUnsave, onUnlike, actionLabel }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {article.image_url && (
        <img src={article.image_url} alt={article.title} style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }} />
      )}
      <h4 style={{ margin: 0, fontWeight: 700 }}>{article.title}</h4>
      <p className="text-muted" style={{ fontSize: "0.82rem", margin: 0 }}>
        {article.author} · {article.date ? new Date(article.date).toLocaleDateString("bg-BG") : ""}
      </p>
      {(onUnsave || onUnlike) && (
        <button
          type="button"
          className="btn ghost"
          style={{ fontSize: "0.82rem", alignSelf: "flex-start", marginTop: 4 }}
          onClick={onUnsave || onUnlike}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default function Profile() {
  const { user, loading } = useAuth()

  const [, setLangTick] = useState(0)
  useEffect(() => {
    const onLang = () => setLangTick((x) => x + 1)
    window.addEventListener("lang:change", onLang)
    return () => window.removeEventListener("lang:change", onLang)
  }, [])

  const [activeTab, setActiveTab] = useState("account")
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

  // PFP
  const pfpInputRef = useRef()
  const [pfpUrl, setPfpUrl] = useState("")
  const [pfpUploading, setPfpUploading] = useState(false)

  // Liked / Saved / Orders
  const [likedArticles, setLikedArticles] = useState(null)
  const [savedArticles, setSavedArticles] = useState(null)
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    if (!loading && user) {
      api.get("/subscriptions").then((res) => setSubs(res.data || [])).catch(() => setSubs([]))
      api.get("/user/me").then((res) => {
        const data = res.data || null
        setServerMe(data)
        if (data?.pfp_url) setPfpUrl(data.pfp_url)
        setNewInstagram(data?.instagramHandle || data?.instagram_handle || "")
      }).catch(() => setServerMe(null))
      setNewName(user.displayName || "")
      setIs2FA(!!user.twoFaEnabled)
    }
  }, [loading, user])

  useEffect(() => {
    if (activeTab === "liked" && likedArticles === null) {
      api.get("/user/liked-articles").then((r) => setLikedArticles(r.data || [])).catch(() => setLikedArticles([]))
    }
    if (activeTab === "saved" && savedArticles === null) {
      api.get("/user/saved-articles").then((r) => setSavedArticles(r.data || [])).catch(() => setSavedArticles([]))
    }
    if (activeTab === "orders" && orders === null) {
      api.get("/user/orders").then((r) => setOrders(r.data || [])).catch(() => setOrders([]))
    }
  }, [activeTab, likedArticles, savedArticles, orders])

  const currentPlan = useMemo(() => toTitleCasePlan(subs?.[0]?.plan), [subs])
  const isPremium = useMemo(() => ["monthly", "yearly"].includes(String(subs?.[0]?.plan || "").toLowerCase()), [subs])

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

  async function handlePfpUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPfpUploading(true)
    setMsg({ type: "", text: "" })
    try {
      const form = new FormData()
      form.append("file", file)
      const uploadRes = await api.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
      const url = uploadRes.data?.secure_url || uploadRes.data?.url || ""
      if (!url) throw new Error("Upload failed")
      await api.post("/user/pfp", { pfp_url: url })
      setPfpUrl(url)
      setMsg({ type: "success", text: "✅ Снимката е обновена!" })
    } catch {
      setMsg({ type: "error", text: "Грешка при качване на снимката." })
    } finally {
      setPfpUploading(false)
    }
  }

  async function handleLogout() {
    try { await api.post("/auth/logout") } catch {}
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
      try { const me = await api.get("/user/me"); setServerMe(me.data || null) } catch {}
      setTimeout(() => location.reload(), 600)
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.error || t("profile_username_error") })
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
      try { const me = await api.get("/user/me"); setServerMe(me.data || null) } catch {}
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.error || "Failed to update Instagram" })
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

  const displayName = user.displayName || serverMe?.display_name || user.email?.split("@")[0] || "?"
  const initials = displayName[0]?.toUpperCase() || "?"
  const plan = subs?.[0]?.plan || "free"

  return (
    <div className="page profile-page">
      <h2 className="headline">{t("profile")}</h2>

      {/* Avatar + name header */}
      <div className="profile-hero">
        <div className="profile-avatar-wrap" onClick={() => pfpInputRef.current?.click()} title="Смени снимката">
          {pfpUrl
            ? <img src={pfpUrl} alt="PFP" className="profile-avatar-img" />
            : <div className="profile-avatar-placeholder">{initials}</div>
          }
          <div className="profile-avatar-overlay">
            {pfpUploading ? "⏳" : "📷"}
          </div>
        </div>
        <input ref={pfpInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePfpUpload} />

        <div className="profile-hero-info">
          <div className="profile-hero-name">{displayName}</div>
          <div className="profile-hero-email text-muted">{user.email}</div>
          <span className={planBadgeClass(plan)}>
            {currentPlan} {planSuffix(plan)}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="profile-tabs">
        {PROFILE_TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            className={`profile-tab${activeTab === tb.key ? " profile-tab--active" : ""}`}
            onClick={() => { setActiveTab(tb.key); setMsg({ type: "", text: "" }) }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {msg.text && (
        <p className={`msg ${msg.type === "error" ? "danger" : "success"}`} style={{ textAlign: "center", marginBottom: "1rem" }}>
          {msg.text}
        </p>
      )}

      {/* ACCOUNT TAB */}
      {activeTab === "account" && (
        <div className="card stack profile-card">
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
                  style={{ padding: "8px 12px", fontSize: "0.86rem", opacity: !usernameCooldown.can ? 0.6 : 1, cursor: !usernameCooldown.can ? "not-allowed" : "pointer" }}
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
                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: "1 1 260px" }} placeholder={t("profile_new_username_placeholder")} />
                <button onClick={handleUpdateUsername} className="btn primary" disabled={saving}>{saving ? t("profile_saving") : t("profile_save")}</button>
                <button onClick={() => { setIsEditingName(false); setNewName(user.displayName || ""); setMsg({ type: "", text: "" }) }} className="btn ghost">{t("profile_cancel")}</button>
              </div>
            )}
            <div className="text-muted" style={{ marginTop: 10, fontSize: "0.95rem" }}>Can be changed every {USERNAME_COOLDOWN_DAYS} days</div>
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
                  style={{ padding: "8px 12px", fontSize: "0.86rem", opacity: !instagramCooldown.can ? 0.6 : 1, cursor: !instagramCooldown.can ? "not-allowed" : "pointer" }}
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
                <input className="input" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value.replace(/^@/, ""))} style={{ flex: "1 1 220px" }} placeholder="your_handle" />
                <button onClick={handleUpdateInstagram} className="btn primary" disabled={savingInstagram}>{savingInstagram ? t("profile_saving") : t("profile_save")}</button>
                <button onClick={() => { setIsEditingInstagram(false); setNewInstagram(serverMe?.instagramHandle || ""); setMsg({ type: "", text: "" }) }} className="btn ghost">{t("profile_cancel")}</button>
              </div>
            )}
            <div className="text-muted" style={{ marginTop: 10, fontSize: "0.95rem" }}>Can be changed every {INSTAGRAM_COOLDOWN_DAYS} days</div>
          </div>

          <hr className="profile-sep" />

          {/* SECURITY */}
          <div>
            <strong>{t("security")}</strong>
            <div className="profile-big-actions">
              <button onClick={handlePasswordReset} className="btn outline big-action">{t("profile_reset_btn")}</button>
              {!is2FA
                ? <Link to="/2fa/setup" className="btn outline big-action" style={{ textAlign: "center" }}>{t("profile_2fa_setup_btn")}</Link>
                : <div className="msg success" style={{ textAlign: "center" }}>{t("profile_2fa_active")}</div>
              }
            </div>
          </div>

          <hr className="profile-sep" />

          <div className="mt-1">
            <button className="btn secondary" onClick={handleLogout}>{t("logout")}</button>
          </div>
        </div>
      )}

      {/* LIKED TAB */}
      {activeTab === "liked" && (
        <div>
          {likedArticles === null && <Loader />}
          {likedArticles !== null && likedArticles.length === 0 && (
            <p className="text-muted" style={{ textAlign: "center", marginTop: "2rem" }}>Все още не си харесал нито статия.</p>
          )}
          {likedArticles !== null && likedArticles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 }}>
              {likedArticles.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  actionLabel="💔 Премахни харесването"
                  onUnlike={async () => {
                    try {
                      await api.delete(`/articles/${a.id}/like`)
                      setLikedArticles((prev) => prev.filter((x) => x.id !== a.id))
                    } catch {}
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* SAVED TAB */}
      {activeTab === "saved" && (
        <div>
          {savedArticles === null && <Loader />}
          {savedArticles !== null && savedArticles.length === 0 && (
            <p className="text-muted" style={{ textAlign: "center", marginTop: "2rem" }}>Все още не си запазил нито статия.</p>
          )}
          {savedArticles !== null && savedArticles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 }}>
              {savedArticles.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  actionLabel="🗑️ Премахни"
                  onUnsave={async () => {
                    try {
                      await api.delete(`/articles/${a.id}/save`)
                      setSavedArticles((prev) => prev.filter((x) => x.id !== a.id))
                    } catch {}
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <div>
          {orders === null && <Loader />}
          {orders !== null && orders.length === 0 && (
            <p className="text-muted" style={{ textAlign: "center", marginTop: "2rem" }}>Нямаш поръчани списания.</p>
          )}
          {orders !== null && orders.length > 0 && (
            <div className="list" style={{ maxWidth: 680 }}>
              {orders.map((o) => {
                const addr = o.shipping_address || {}
                const addrLine = [addr.line1, addr.city, addr.country].filter(Boolean).join(", ")
                return (
                  <div key={o.id} className="card" style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>Поръчка #{o.id}</div>
                        <div className="text-muted" style={{ fontSize: "0.82rem" }}>
                          {new Date(o.created_at).toLocaleDateString("bg-BG")} · {o.quantity} бр.
                        </div>
                        {o.courier && <div className="text-muted" style={{ fontSize: "0.82rem" }}>Куриер: {o.courier} {o.shipping_type ? `(${o.shipping_type})` : ""}</div>}
                        {addrLine && <div className="text-muted" style={{ fontSize: "0.82rem" }}>📍 {addrLine}</div>}
                        {o.tracking_number && (
                          <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                            📦 Tracking: <strong>{o.tracking_number}</strong>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                          {o.amount_total ? `${(o.amount_total / 100).toFixed(2)} ${o.currency?.toUpperCase() || "EUR"}` : "—"}
                        </div>
                        <span
                          style={{
                            display: "inline-block", marginTop: 4, padding: "2px 10px", borderRadius: 20,
                            fontSize: "0.78rem", fontWeight: 600,
                            background: o.status === "paid" ? "rgba(39,174,96,0.15)" : "rgba(200,200,200,0.2)",
                            color: o.status === "paid" ? "#27ae60" : "var(--text)",
                          }}
                        >
                          {o.status === "paid" ? "✅ Платена" : o.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
