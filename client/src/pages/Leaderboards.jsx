// client/src/pages/Leaderboards.jsx
"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { Link } from "react-router-dom"

export default function Leaderboards() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [game, setGame] = useState("wordle")

  useEffect(() => { loadData() }, [game])

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

  function planClass(plan) {
    const p = (plan || "").toLowerCase()
    if (p === "yearly") return "plan-badge plan-badge--yearly"
    if (p === "monthly") return "plan-badge plan-badge--monthly"
    return "plan-badge"
  }

  function planIcon(plan) {
    const p = (plan || "").toLowerCase()
    if (p === "yearly") return " 👑"
    if (p === "monthly") return " ⭐"
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
      <h2 className="headline" style={{ textAlign: "center", marginBottom: 30 }}>
        Leaderboards 🏆
      </h2>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 30, gap: 10 }}>
        <Link to="/games" className="btn primary" style={{ textDecoration: "none" }}>
          Play Daily Word Game
        </Link>
      </div>

      <div className="card stack leaderboard-card">
        <div className="leaderboard-head">
          <div className="lb-col lb-rank">#</div>
          <div className="lb-col lb-player">Player</div>
          <div className="lb-col lb-streak">Streak</div>
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
              <div key={player.userId || index} className="leaderboard-row">
                <div className="lb-col lb-rank">{index + 1}</div>

                <div className="lb-col lb-player">
                  <span className={planClass(player.plan)}>
                    <span className="plan-name">{name}</span>
                    <span className="plan-icon">{planIcon(player.plan)}</span>
                  </span>
                </div>

                <div className="lb-col lb-streak">
                  <span className="streak-pill">{player.streak} 🔥</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
