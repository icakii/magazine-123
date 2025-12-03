// client/src/pages/Subscriptions.jsx

"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"

export default function Subscriptions() {
  const { user, loading } = useAuth()
  const [msg, setMsg] = useState("")
  const [current, setCurrent] = useState(null)
  
  // State за въртене на бутона
  const [loadingPlan, setLoadingPlan] = useState(null) 

  // Взимане на текущия план
  useEffect(() => {
    if (!loading && user) {
      api
        .get("/subscriptions")
        .then((res) => {
          const list = res.data || []
          const currentPlan = list[0]?.plan || 'free'
          setCurrent(currentPlan)
        })
        .catch(() => {
          setCurrent('free')
        })
    }
  }, [loading, user])

  // --- ФУНКЦИЯТА ЗА ПЛАЩАНЕ (Stripe) ---
  async function activate(plan) {
    if (current === plan) {
      setMsg("You are already on this plan.")
      return
    }

    if (plan === 'free') {
      setMsg("You are already on the Free plan.")
      return
    }

    setLoadingPlan(plan)
    setMsg("")

    try {
      // 1. Извикваме Stripe сесията от сървъра
      const response = await api.post("/create-checkout-session", { plan })
      const { url } = response.data

      // 2. Пренасочваме към Stripe
      if (url) {
        window.location.href = url
      } else {
        throw new Error("Could not retrieve payment URL.")
      }

    } catch (err) {
      console.error(err)
      setMsg(err?.response?.data?.error || "Error starting payment.")
      setLoadingPlan(null)
    }
  }

  if (loading) return <div className="page"><p className="text-muted">{t("loading")}</p></div>
  if (!user) return <div className="page"><p>{t("not_logged_in")}</p></div>

  return (
    <div className="page">
      <h2 className="headline">{t("subscriptions")}</h2>
      <p className="subhead">Choose a plan that works for you.</p>

      <div style={{ display: "flex", gap: 16, marginTop: 24, justifyContent: "space-between", alignItems: "stretch" }}>
        
        {/* Free Plan */}
        <div style={{ flex: 1, padding: 24, borderRadius: 16, border: current === 'free' ? "2px solid #4a90e2" : "2px solid #b0b0b0", backgroundColor: "var(--bg-muted)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Free</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>Forever free</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" disabled style={{ width: "100%" }}>
            {current === "free" ? "Current Plan" : "Choose"}
          </button>
        </div>

        {/* Monthly Plan */}
        <div style={{ flex: 1, padding: 24, borderRadius: 16, border: current === 'monthly' ? "2px solid #4a90e2" : "2px solid #b0b0b0", backgroundColor: "var(--bg-muted)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#4a90e2" }}>Monthly</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>€4.99 / month</div>
          <div style={{ flex: 1 }} />
          <button 
            className="btn primary" 
            onClick={() => activate("monthly")} 
            style={{ width: "100%" }}
            disabled={loadingPlan === 'monthly' || current === 'monthly'}
          >
            {loadingPlan === 'monthly' ? "Loading..." : (current === "monthly" ? "Current Plan" : "Choose")}
          </button>
        </div>

        {/* Yearly Plan */}
        <div style={{ flex: 1, padding: 24, borderRadius: 16, border: current === 'yearly' ? "2px solid #d4a017" : "2px solid #b0b0b0", backgroundColor: "var(--bg-muted)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#d4a017" }}>Yearly</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>€47.99 / year</div>
          <div style={{ flex: 1 }} />
          <button
            className="btn primary"
            onClick={() => activate("yearly")}
            style={{ width: "100%", background: "linear-gradient(135deg, #d4a017, #aa7f0e)", color: "#1a1a1a" }}
            disabled={loadingPlan === 'yearly' || current === 'yearly'}
          >
            {loadingPlan === 'yearly' ? "Loading..." : (current === "yearly" ? "Current Plan" : "Choose")}
          </button>
        </div>
      </div>

      {msg && <p className="msg" style={{ marginTop: 16 }}>{msg}</p>}
    </div>
  )
}