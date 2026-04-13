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

  const borderFor = (plan) => {
    if (current === plan) return "2px solid rgba(107, 123, 78, 0.55)" // olive-ish
    return "2px solid var(--nav-border)"
  }

  const badgeClass = (plan) => {
    if (plan === "monthly") return "plan-badge plan-badge--monthly"
    if (plan === "yearly") return "plan-badge plan-badge--yearly"
    return "plan-badge"
  }

  const PlanCard = ({ plan, title, price, highlight }) => {
    const isCurrent = current === plan
    const isPaid = plan === "monthly" || plan === "yearly"

    return (
      <div
        className="card"
        style={{
          flex: 1,
          minWidth: 260,
          padding: 24,
          borderRadius: 16,
          border: borderFor(plan),
          background: "var(--bg-muted)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: "1.12rem", color: highlight ? "var(--oxide-red)" : "var(--text)" }}>
            {title}
          </div>

          <span className={badgeClass(plan)}>
            <span className="plan-name">
              {plan === "free"
                ? tt("plan_badge_free", "Free")
                : plan === "monthly"
                ? tt("plan_badge_monthly", "Monthly")
                : tt("plan_badge_yearly", "Yearly")}
            </span>
          </span>
        </div>

        <div className="card-muted" style={{ fontSize: "0.95rem" }}>
          {price}
        </div>

        {isPaid && Benefits}

        <div style={{ flex: 1 }} />

        {plan === "free" ? (
          <button className="btn ghost" disabled style={{ width: "100%" }}>
            {isCurrent ? tt("plan_current", "Current plan") : tt("plan_choose", "Choose plan")}
          </button>
           ) : isCurrent ? (
          <div style={{ display: "grid", gap: 8 }}>
            <button className="btn ghost" disabled style={{ width: "100%" }}>
              {tt("plan_current", "Current plan")}
            </button>
            <button
              className="btn"
              onClick={() => cancelSubscription(false)}
              disabled={cancelLoading}
              style={{ width: "100%" }}
            >
              {cancelLoading
                ? tt("cancel_loading", "Cancelling...")
                : tt("cancel_at_period_end", "Cancel at period end")}
            </button>
            <button
              className="btn"
              onClick={() => cancelSubscription(true)}
              disabled={cancelLoading}
              style={{ width: "100%", opacity: 0.88 }}
            >
              {cancelLoading
                ? tt("cancel_loading", "Cancelling...")
                : tt("cancel_now", "Cancel now")}
            </button>
          </div>
        ) : (
          <button
            className="btn primary"
            onClick={() => activate(plan)}
            style={{ width: "100%" }}
            disabled={loadingPlan === plan || cancelLoading}
          >
            {loadingPlan === plan
              ? tt("plan_loading", "Loading...")
              
              : tt("plan_choose", "Choose plan")}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="headline">{tt("subscriptions", "Subscriptions")}</h2>
      <p className="subhead">{tt("subscriptions_subhead", "Choose a plan that fits you.")}</p>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 24,
          justifyContent: "space-between",
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
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
