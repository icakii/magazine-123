"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"

export default function Subscriptions() {
  const { user, loading } = useAuth()
  const [selected, setSelected] = useState("free")
  const [msg, setMsg] = useState("")
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    if (!loading && user) {
      api
        .get("/subscriptions")
        .then((res) => {
          const list = res.data || []
          setCurrent(list[0]?.plan || null)
          if (!list[0]) setSelected("free")
        })
        .catch(() => {})
    }
  }, [loading, user])

  async function activate(plan) {
    if (current === plan) {
      setMsg("Already on this plan.")
      return
    }
    try {
      const res = await api.post("/subscriptions", { plan })
      setMsg("Activated: " + res.data.plan)
      setCurrent(plan)
    } catch (err) {
      setMsg(err?.response?.data?.error || "Error")
    }
  }

  if (loading)
    return (
      <div className="page">
        <p className="text-muted">{t("loading")}</p>
      </div>
    )
  if (!user)
    return (
      <div className="page">
        <p>
          {t("not_logged_in")}{" "}
          <a href="/login" className="btn outline">
            {t("go_login")}
          </a>
        </p>
      </div>
    )

  return (
    <div className="page">
      <h2 className="headline">{t("subscriptions")}</h2>
      <p className="subhead">Choose a plan that works for you.</p>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 24,
          justifyContent: "space-between",
          alignItems: "stretch",
        }}
      >
        {/* Free Plan */}
        <div
          style={{
            flex: 1,
            padding: 24,
            borderRadius: 16,
            border: "2px solid #b0b0b0",
            backgroundColor: "var(--bg-muted)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Free</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>
            Forever free
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={() => activate("free")} style={{ width: "100%" }}>
            {current === "free" ? "Selected" : "Choose"}
          </button>
        </div>

        {/* Monthly Plan */}
        <div
          style={{
            flex: 1,
            padding: 24,
            borderRadius: 16,
            border: "2px solid #4a90e2",
            backgroundColor: "var(--bg-muted)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#4a90e2" }}>Monthly</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>
            €4.99 / month
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn primary" onClick={() => activate("monthly")} style={{ width: "100%" }}>
            {current === "monthly" ? "Selected" : "Choose"}
          </button>
        </div>

        {/* Yearly Plan */}
        <div
          style={{
            flex: 1,
            padding: 24,
            borderRadius: 16,
            border: "2px solid #d4a017",
            backgroundColor: "var(--bg-muted)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#d4a017" }}>Yearly</div>
          <div className="card-muted" style={{ fontSize: "0.9rem" }}>
            €47.99 / year
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="btn primary"
            onClick={() => activate("yearly")}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #d4a017, #aa7f0e)",
              color: "#1a1a1a",
            }}
          >
            {current === "yearly" ? "Selected" : "Choose"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 32, padding: 24, backgroundColor: "var(--bg-muted)", borderRadius: 12 }}>
        <h3 style={{ marginBottom: 16 }}>What you get with Premium:</h3>
        <ul style={{ listStyle: "none", padding: 0, gap: 8, display: "flex", flexDirection: "column" }}>
          <li>✓ Ad-free reading experience</li>
          <li>✓ Daily word game access</li>
          <li>✓ Full e-magazine with all pages</li>
          <li>✓ Exclusive content and articles</li>
          <li>✓ Priority support</li>
        </ul>
      </div>

      {msg && (
        <p className="msg" style={{ marginTop: 16 }}>
          {msg}
        </p>
      )}
    </div>
  )
}
