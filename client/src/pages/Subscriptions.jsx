// client/src/pages/Subscriptions.jsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"
import Loader from "../components/Loader"

function looksLikeI18nKey(s) {
  if (!s) return true
  // ако t() връща самия key или нещо като premium_benefits_title
  return /^[a-z0-9]+(_[a-z0-9]+)+$/i.test(String(s).trim())
}

export default function Subscriptions() {
  const { user, loading } = useAuth()
  const [msg, setMsg] = useState("")
  const [current, setCurrent] = useState("free")
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  // safe translation with fallback
  const tt = (key, fallback) => {
    const v = t(key)
    if (!v || v === key || looksLikeI18nKey(v)) return fallback
    return v
  }

  useEffect(() => {
    if (!loading && user) {
      api
        .get("/subscriptions")
        .then((res) => {
          const list = res.data || []
          const currentPlan = (list[0]?.plan || "free").toLowerCase()
          setCurrent(currentPlan)
        })
        .catch(() => setCurrent("free"))
    }
  }, [loading, user])

  async function activate(plan) {
    const normalized = String(plan || "").toLowerCase()

    if (current === normalized) {
      setMsg(tt("plan_already_on", "You are already on this plan."))
      return
    }
    if (normalized === "free") {
      setMsg(tt("plan_free_already", "You are already on the Free plan."))
      return
    }

    setLoadingPlan(normalized)
    setMsg("")

    try {
      const response = await api.post("/create-checkout-session", { plan: normalized })
      const { url } = response.data || {}
      if (url) window.location.href = url
      else throw new Error("Could not retrieve payment URL.")
    } catch (err) {
      console.error(err)
      setMsg(err?.response?.data?.error || tt("payment_error", "Error starting payment."))
      setLoadingPlan(null)
    }
  }

  async function cancelSubscription(immediately = false) {
    if (!(current === "monthly" || current === "yearly")) {
      setMsg(tt("no_active_paid_sub", "You don't have an active paid subscription."))
      return
    }

    const question = immediately
      ? tt("confirm_cancel_now", "Cancel now? Access may stop immediately.")
      : tt("confirm_cancel_end", "Cancel at period end? You keep access until billing period ends.")

    if (!window.confirm(question)) return

    setCancelLoading(true)
    setMsg("")
    try {
      await api.post("/subscriptions/cancel", { immediately })
      setMsg(
        immediately
          ? tt("cancel_done_now", "Subscription canceled immediately. It may take a few seconds to sync.")
          : tt("cancel_done_end", "Subscription will cancel at period end.")
      )
    } catch (err) {
      setMsg(err?.response?.data?.error || tt("cancel_error", "Failed to cancel subscription."))
    } finally {
      setCancelLoading(false)
    }
  }
  const Benefits = useMemo(() => {
    return (
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {tt("premium_benefits_title", "Premium benefits")}
        </div>
        <ul style={{ marginLeft: 18, lineHeight: 1.85 }}>
          <li>{tt("premium_b1", "Unlock premium articles")}</li>
          <li>{tt("premium_b2", "Support the project")}</li>
          <li>{tt("premium_b3", "Access exclusive features")}</li>
          <li>{tt("premium_b4", "Priority updates & improvements")}</li>
        </ul>
      </div>
    )
  }, [])

  if (loading) {
    return (
      <div className="page">
        <Loader />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <p>{tt("not_logged_in", "You are not logged in.")}</p>
      </div>
    )
  }

  const PlanCard = ({ plan, title, price, highlight }) => {
    const isCurrent = current === plan
    const isPaid = plan === "monthly" || plan === "yearly"
    const isYearly = plan === "yearly"
    const isMonthly = plan === "monthly"

    const cardClass = [
      "sub-card",
      isMonthly ? "sub-card--monthly" : "",
      isYearly ? "sub-card--yearly" : "",
      isCurrent && isMonthly ? "sub-card--monthly-active" : "",
      isCurrent && isYearly ? "sub-card--yearly-active" : "",
    ].filter(Boolean).join(" ")

    const icon = isYearly ? "👑" : isMonthly ? "⭐" : "🌿"

    return (
      <div className={cardClass}>
        {/* animated glow ring for paid plans */}
        {isPaid && <div className="sub-card-glow" />}

        {/* floating particles for yearly */}
        {isYearly && (
          <div className="sub-particles" aria-hidden>
            {["✦","✧","✦","✧","✦"].map((s, i) => (
              <span key={i} className={`sub-particle sub-particle--${i}`}>{s}</span>
            ))}
          </div>
        )}

        <div className="sub-card-inner">
          <div className="sub-card-header">
            <span className="sub-card-icon">{icon}</span>
            <div>
              <div className="sub-card-title">{title}</div>
              <div className="sub-card-price">{price}</div>
            </div>
            {isCurrent && <span className="sub-current-pill">✓ Активен</span>}
          </div>

          {isPaid && Benefits}

          <div style={{ flex: 1 }} />

          <div className="sub-card-actions">
            {plan === "free" ? (
              <button className="btn ghost sub-btn" disabled style={{ width: "100%" }}>
                {isCurrent ? tt("plan_current", "Текущ план") : tt("plan_choose", "Избери план")}
              </button>
            ) : isCurrent ? (
              <>
                <button className="btn ghost sub-btn" disabled style={{ width: "100%" }}>
                  {tt("plan_current", "Текущ план")}
                </button>
                <button className="btn sub-btn sub-btn--cancel" onClick={() => cancelSubscription(false)} disabled={cancelLoading} style={{ width: "100%" }}>
                  {cancelLoading ? tt("cancel_loading", "Отменя се...") : tt("cancel_at_period_end", "Отмени в края на периода")}
                </button>
                <button className="btn sub-btn sub-btn--cancel" onClick={() => cancelSubscription(true)} disabled={cancelLoading} style={{ width: "100%", opacity: 0.75 }}>
                  {cancelLoading ? tt("cancel_loading", "Отменя се...") : tt("cancel_now", "Отмени веднага")}
                </button>
              </>
            ) : (
              <button
                className={`btn sub-btn ${isYearly ? "sub-btn--yearly" : "sub-btn--monthly"}`}
                onClick={() => activate(plan)}
                style={{ width: "100%" }}
                disabled={loadingPlan === plan || cancelLoading}
              >
                {loadingPlan === plan ? tt("plan_loading", "Зарежда...") : tt("plan_choose", "Избери план")}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="headline">{tt("subscriptions", "Subscriptions")}</h2>
      <p className="subhead">{tt("subscriptions_subhead", "Choose a plan that fits you.")}</p>

      <div className="sub-cards-row">
        <PlanCard
          plan="free"
          title={tt("plan_free", "Free")}
          price={tt("plan_free_price", "Forever free")}
        />

        <PlanCard
          plan="monthly"
          title={tt("plan_monthly", "Monthly")}
          price={tt("plan_monthly_price", "€4.99 / month")}
          highlight
        />

        <PlanCard
          plan="yearly"
          title={tt("plan_yearly", "Yearly")}
          price={tt("plan_yearly_price", "€49.99 / year")}
          highlight
        />
      </div>

      {msg && (
        <p className="msg" style={{ marginTop: 16 }}>
          {msg}
        </p>
      )}
      
      {(current === "monthly" || current === "yearly") && (
        <p className="subhead" style={{ marginTop: 10 }}>
          {tt("cancel_hint", "Tip: Use Cancel at period end so users keep access until the cycle finishes.")}
        </p>
      )}  
    </div>
  )
}
