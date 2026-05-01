// client/src/pages/Subscriptions.jsx
"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"
import Loader from "../components/Loader"

function looksLikeI18nKey(s) {
  if (!s) return true
  return /^[a-z0-9]+(_[a-z0-9]+)+$/i.test(String(s).trim())
}

const PERKS = {
  free: [
    { icon: "🌸", text: "Достъп до новини" },
    { icon: "🌸", text: "Коментари & харесвания" },
    { icon: "🌸", text: "Галерия & събития" },
    { icon: "🌸", text: "Участие в игри" },
    { icon: "🌸", text: "Изпрати статия за одобрение" },
  ],
  monthly: [
    { icon: "🌺", text: "Всичко от Free" },
    { icon: "🌺", text: "Премиум статии" },
    { icon: "🌺", text: "Поддръжка на проекта" },
    { icon: "🌺", text: "Ексклузивни функции" },
    { icon: "🌺", text: "Публикувай в News" },
    { icon: "🌺", text: "Топ писател награди" },
  ],
  yearly: [
    { icon: "🌹", text: "Всичко от Monthly" },
    { icon: "👑", text: "В хартиеното списание" },
    { icon: "👑", text: "Приоритетен преглед" },
    { icon: "👑", text: "Ранен достъп до броя" },
    { icon: "👑", text: "Годишна значка в профила" },
    { icon: "🌹", text: "Топ писател бонуси" },
  ],
}

const PLANS = [
  {
    key: "free",
    icon: "🌿",
    title: "Free",
    price: "Завинаги безплатно",
    gradient: null,
    btnGradient: null,
  },
  {
    key: "monthly",
    icon: "⭐",
    title: "Monthly",
    price: "€4.99 / месец",
    gradient: "linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6, #3b82f6)",
    btnGradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    glow: "rgba(99,102,241,0.4)",
  },
  {
    key: "yearly",
    icon: "👑",
    title: "Yearly",
    price: "€49.99 / година",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b, #fbbf24)",
    btnGradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    glow: "rgba(245,158,11,0.45)",
    particles: ["✦", "✧", "✦", "✧", "✦"],
  },
]

export default function Subscriptions() {
  const { user, loading } = useAuth()
  const [msg, setMsg] = useState("")
  const [current, setCurrent] = useState("free")
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const tt = (key, fallback) => {
    const v = t(key)
    if (!v || v === key || looksLikeI18nKey(v)) return fallback
    return v
  }

  useEffect(() => {
    if (!loading && user) {
      api.get("/subscriptions")
        .then((res) => setCurrent((res.data?.[0]?.plan || "free").toLowerCase()))
        .catch(() => setCurrent("free"))
    }
  }, [loading, user])

  async function activate(plan) {
    if (current === plan) { setMsg("Вече си на този план."); return }
    setLoadingPlan(plan); setMsg("")
    try {
      const { data } = await api.post("/create-checkout-session", { plan })
      if (data?.url) window.location.href = data.url
      else throw new Error()
    } catch (err) {
      setMsg(err?.response?.data?.error || "Грешка при стартиране на плащането.")
      setLoadingPlan(null)
    }
  }

  async function cancelSubscription(immediately = false) {
    if (!window.confirm(immediately ? "Отмени веднага?" : "Отмени в края на периода?")) return
    setCancelLoading(true); setMsg("")
    try {
      await api.post("/subscriptions/cancel", { immediately })
      setMsg(immediately ? "Абонаментът е отменен." : "Ще се отмени в края на периода.")
    } catch (err) {
      setMsg(err?.response?.data?.error || "Грешка при отмяна.")
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) return <div className="page"><Loader /></div>
  if (!user) return <div className="page"><p>{tt("not_logged_in", "Не си влязъл.")}</p></div>

  return (
    <div className="page">
      <h2 className="headline">{tt("subscriptions", "Абонаменти")}</h2>
      <p className="subhead" style={{ marginBottom: "2rem" }}>Избери план, който ти пасва.</p>

      {/* 3 cards in one row */}
      <div className="sub-page-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "stretch" }}>
        {PLANS.map((plan) => {
          const isCurrent = current === plan.key
          const isPaid = plan.key !== "free"
          const isLoading = loadingPlan === plan.key

          return (
            <div
              key={plan.key}
              style={{
                position: "relative",
                borderRadius: 20,
                padding: plan.gradient ? 3 : 0,
                background: plan.gradient
                  ? `${plan.gradient} / 300% 300%`
                  : "transparent",
                backgroundSize: "300% 300%",
                animation: plan.gradient ? "sub-shimmer 4s linear infinite" : "none",
                overflow: "hidden",
                border: plan.gradient ? "none" : "1.5px solid var(--border, rgba(255,255,255,0.1))",
                borderRadius: 20,
              }}
            >
              {/* floating particles for yearly */}
              {plan.particles && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 20, zIndex: 1 }}>
                  {plan.particles.map((s, i) => (
                    <span key={i} className={`sub-particle sub-particle--${i}`} style={{ color: "rgba(251,191,36,0.65)" }}>{s}</span>
                  ))}
                </div>
              )}

              {/* inner card surface */}
              <div style={{
                position: "relative", zIndex: 2,
                borderRadius: plan.gradient ? 17 : 18,
                background: "var(--bg, #111)",
                padding: "24px 20px",
                height: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: "2rem", lineHeight: 1 }}>{plan.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)" }}>{plan.title}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text)", opacity: 0.5, marginTop: 1 }}>{plan.price}</div>
                  </div>
                  {isCurrent && (
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "rgba(39,174,96,0.15)", color: "#27ae60", whiteSpace: "nowrap" }}>✓ Активен</span>
                  )}
                </div>

                {/* Button */}
                <div style={{ marginBottom: 20 }}>
                  {plan.key === "free" ? (
                    <button disabled style={{ width: "100%", padding: "11px", borderRadius: 12, border: "1.5px solid var(--border, rgba(255,255,255,0.1))", background: "transparent", color: "var(--text)", opacity: 0.45, fontWeight: 600, cursor: "not-allowed", fontSize: "0.88rem" }}>
                      {isCurrent ? "Текущ план" : "Избери план"}
                    </button>
                  ) : isCurrent ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button disabled style={{ width: "100%", padding: "11px", borderRadius: 12, border: "1.5px solid var(--border, rgba(255,255,255,0.1))", background: "transparent", color: "var(--text)", opacity: 0.45, fontWeight: 600, cursor: "not-allowed", fontSize: "0.88rem" }}>
                        Текущ план
                      </button>
                      <button
                        onClick={() => cancelSubscription(false)}
                        disabled={cancelLoading}
                        style={{ width: "100%", padding: "9px", borderRadius: 12, border: "1.5px solid var(--border, rgba(255,255,255,0.1))", background: "transparent", color: "var(--text)", opacity: 0.5, fontWeight: 500, cursor: "pointer", fontSize: "0.78rem", transition: "opacity 0.15s" }}
                        onMouseEnter={(e) => { e.target.style.opacity = 1; e.target.style.color = "#ef4444"; e.target.style.borderColor = "#ef4444" }}
                        onMouseLeave={(e) => { e.target.style.opacity = 0.5; e.target.style.color = "var(--text)"; e.target.style.borderColor = "var(--border, rgba(255,255,255,0.1))" }}
                      >
                        {cancelLoading ? "Отменя се..." : "Отмени в края на периода"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => activate(plan.key)}
                      disabled={isLoading || cancelLoading}
                      style={{
                        width: "100%", padding: "12px", borderRadius: 12, border: "none",
                        background: plan.btnGradient, color: "#fff",
                        fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
                        boxShadow: `0 4px 18px ${plan.glow}`,
                        opacity: isLoading ? 0.7 : 1,
                        transition: "transform 0.15s, box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = `0 6px 24px ${plan.glow}` }}
                      onMouseLeave={(e) => { e.target.style.transform = ""; e.target.style.boxShadow = `0 4px 18px ${plan.glow}` }}
                    >
                      {isLoading ? "Зарежда..." : "Избери план"}
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border, rgba(255,255,255,0.07))", marginBottom: 18 }} />

                {/* Perks */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {PERKS[plan.key].map((perk, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.4 }}>
                      <span style={{ fontSize: "1rem", lineHeight: 1.2, flexShrink: 0 }}>{perk.icon}</span>
                      <span style={{ opacity: 0.8 }}>{perk.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      {msg && <p className="msg" style={{ marginTop: 20 }}>{msg}</p>}

      {(current === "monthly" || current === "yearly") && (
        <p className="subhead" style={{ marginTop: 14, fontSize: "0.82rem" }}>
          💡 При отмяна в края на периода запазваш достъп до изтичане на абонамента.
        </p>
      )}

      {/* mobile scroll note */}
      <style>{`
        @media (max-width: 640px) {
          .sub-page-grid { grid-template-columns: repeat(3, minmax(240px, 1fr)) !important; overflow-x: auto; }
        }
      `}</style>
    </div>
  )
}
