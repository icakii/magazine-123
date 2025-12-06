// client/src/pages/Leaderboards.jsx
"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { Link } from "react-router-dom" 

export default function Leaderboards() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [game, setGame] = useState("wordle")

  useEffect(() => {
    loadData()
  }, [game])

  async function loadData() {
    setLoading(true)
    try {
      const res = await api.get(`/leaderboard?game=${game}`)
      setData(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- BADGE СТИЛ ЗА ИМЕТО СПОРЕД ПЛАНА ---
  function getPlanBadgeStyle(plan) {
    if (plan === "yearly") {
      return {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 9999,
        backgroundColor: "#fff7cc",   // светло жълто
        color: "#ff8c00",             // оранжев текст
        fontWeight: 700,
      }
    }

    if (plan === "monthly") {
      return {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 9999,
        backgroundColor: "#e3f0ff",   // светло син фон
        color: "#1f5fbf",             // син текст
        fontWeight: 600,
      }
    }

    // free / няма абонамент
    return {}
  }

  // --- ЕМОДЖИ СПОРЕД ПЛАНА ---
  function getPlanIcon(plan) {
    if (plan === "yearly") return " 👑"
    if (plan === "monthly") return " ⭐"
    return ""
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading rankings.</p>
      </div>
    )
  }

  const visibleData = data.slice(0, 10)

  return (
    <div className="page">
      <h2
        className="headline"
        style={{ textAlign: "center", marginBottom: 30 }}
      >
        Leaderboards 🏆
      </h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 30,
          gap: 10,
        }}
      >
        <Link
          to="/games"
          className="btn primary"
          style={{ textDecoration: "none" }}
        >
          Play Daily Word Game
        </Link>
      </div>

      <div className="card stack">
        {/* header row */}
        <div
          style={{
            display: "flex",
            padding: "10px",
            borderBottom: "1px solid var(--nav-border)",
            fontWeight: "bold",
            opacity: 0.7,
          }}
        >
          <div style={{ width: "50px", textAlign: "center" }}>#</div>
          <div style={{ flex: 1 }}>Player</div>
          <div style={{ width: "80px", textAlign: "center" }}>Streak</div>
        </div>

        {visibleData.length === 0 ? (
          <p style={{ textAlign: "center", padding: 20 }}>No records yet.</p>
        ) : (
          visibleData.map((player, index) => {
            const name =
              player.displayName ||
              player.username ||
              player.email ||
              "Unknown"

            return (
              <div
                key={player.userId || index}
                style={{
                  display: "flex",
                  padding: "16px 10px",
                  alignItems: "center",
                  borderBottom: "1px solid var(--nav-border)",
                  borderRadius: "0 8px 8px 0",
                }}
              >
                {/* позиция */}
                <div
                  style={{
                    width: "50px",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    opacity: 0.7,
                  }}
                >
                  {index + 1}
                </div>

                {/* име + badge */}
                <div style={{ flex: 1, fontSize: "1.1rem" }}>
                  <span style={getPlanBadgeStyle(player.plan)}>
                    {name}
                    {getPlanIcon(player.plan)}
                  </span>
                </div>

                {/* streak */}
                <div
                  style={{
                    width: "80px",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    color: "var(--success)",
                  }}
                >
                  {player.streak} 🔥
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
