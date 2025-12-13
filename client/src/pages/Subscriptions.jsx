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
  const [loadingPlan, setLoadingPlan] = useState(null)

  useEffect(() => {
    if (!loading && user) {
      api
        .get("/subscriptions")
        .then((res) => {
          const list = res.data || []
          const currentPlan = list[0]?.plan || "free"
          setCurrent(currentPlan)
        })
        .catch(() => setCurrent("free"))
    }
  }, [loading, user])

  async function activate(plan) {
    if (current === plan) {
      setMsg("You are already on this plan.")
      return
    }
    if (plan === "free") {
      setMsg("You are already on the Free plan.")
      return
    }

    setLoadingPlan(plan)
    setMsg("")

    try {
      const response = await api.post("/create-checkout-session", { plan })
      const { url } = response.data

      if (url) window.location.href = url
      else throw new Error("Could not retrieve payment URL.")
    } catch (err) {
      console.error(err)
      setMsg(err?.response?.data?.error || "Error starting payment.")
      setLoadingPlan(null)
    }
  }

  if (loading) return <div className="page"><p className="text-muted">{t("loading")}</p></div>
  if (!user) return <div className="page"><p>{t("not_logged_in")}</p></div>

  const Benefits = () => (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("premium_benefits_title")}</div>
      <ul style={{ marginLeft: 18, lineHeight: 1.8 }}>
        <li>{t("premium_b1")}</li>
        <li>{t("premium_b2")}</li>
        <li>{t("premium_b3")}</li>
        <li>{t("premium_b4")}</li>
      </ul>
    </div>
  )

  return (
    <div className="page">
      <h2 className="headline">{t("subscriptions")}</h2>
      <p className="subhead">{t("subscriptions_subhead")}</p>

      <div style={{ display: "flex", gap: 16, marginTop: 24, justifyContent: "space-between", alignItems: "stretch", flexWrap: "wrap" }}>
        {/* Free */}
        <div style={{ flex: 1, minWidth: 260, padding: 24, borderRadius: 16, border: current === "free" ? "2px solid #4a90e2" : "2px solid #b0b0b0", backgroundColor: "var(--bg-muted)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{t("plan_free")}</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>Forever free</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" disabled style={{ width: "100%" }}>
            {current === "free" ? t("plan_current") : t("plan_choose")}
          </button>
        </div>

        {/* Monthly */}
        <div style={{ flex: 1, minWidth: 260, padding: 24, borderRadius: 16, border: current === "monthly" ? "2px solid #4a90e2" : "2px solid #b0b0b0", backgroundColor: "var(--bg-muted)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#4a90e2" }}>{t("plan_monthly")}</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>€4.99 / month</div>

          <Benefits />

          <div style={{ flex: 1 }} />
          <button
            className="btn primary"
            onClick={() => activate("monthly")}
            style={{ width: "100%" }}
            disabled={loadingPlan === "monthly" || current === "monthly"}
          >
            {loadingPlan === "monthly"
              ? t("plan_loading")
              : current === "monthly"
              ? t("plan_current")
              : t("plan_choose")}
          </button>
        </div>

        {/* Yearly */}
        <div style={{ flex: 1, minWidth: 260, padding: 24, borderRadius: 16, border: current === "yearly" ? "2px solid #4a90e2" : "2px solid #b0b0b0", backgroundColor: "var(--bg-muted)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#4a90e2" }}>{t("plan_yearly")}</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>€49.99 / year</div>

          <Benefits />

          <div style={{ flex: 1 }} />
          <button
            className="btn primary"
            onClick={() => activate("yearly")}
            style={{ width: "100%" }}
            disabled={loadingPlan === "yearly" || current === "yearly"}
          >
            {loadingPlan === "yearly"
              ? t("plan_loading")
              : current === "yearly"
              ? t("plan_current")
              : t("plan_choose")}
          </button>
        </div>
      </div>

      {msg && <p className="msg" style={{ marginTop: 16 }}>{msg}</p>}
    </div>
  )
}
