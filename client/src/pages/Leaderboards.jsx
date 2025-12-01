"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { Link } from "react-router-dom" // Импортираме Link

export default function Leaderboards() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(10)
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

  function getPlanStyle(plan) {
    if (plan === "yearly") return { color: "#d4a017", background: "linear-gradient(90deg, rgba(212, 160, 23, 0.15), transparent)", borderLeft: "4px solid #d4a017", fontWeight: "bold" }
    if (plan === "monthly") return { color: "#4a90e2", background: "rgba(74, 144, 226, 0.05)", borderLeft: "4px solid #4a90e2", fontWeight: "600" }
    return { color: "var(--text)", borderLeft: "4px solid transparent" }
  }

  function getPlanIcon(plan) {
    if (plan === "yearly") return "👑"
    if (plan === "monthly") return "⭐"
    return ""
  }

  if (loading) return <div className="page"><p>Loading rankings...</p></div>

  const visibleData = data.slice(0, limit)

  return (
    <div className="page">
      <h2 className="headline" style={{ textAlign: "center", marginBottom: 30 }}>Leaderboards 🏆</h2>

      {/* ПРОМЯНА: Link вместо бутон, за да работи навигацията */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 30, gap: 10 }}>
        <Link 
            to="/games" // Смени с пътя към твоята игра, ако е различен
            className="btn primary"
            style={{ textDecoration: 'none' }}
        >
          Play Daily Word Game
        </Link>
      </div>

      <div className="card stack">
        <div style={{ display: "flex", padding: "10px", borderBottom: "1px solid var(--nav-border)", fontWeight: "bold", opacity: 0.7 }}>
          <div style={{ width: "50px", textAlign: "center" }}>#</div>
          <div style={{ flex: 1 }}>Player</div>
          <div style={{ width: "80px", textAlign: "center" }}>Streak</div>
        </div>

        {visibleData.length === 0 ? (
          <p style={{ textAlign: "center", padding: 20 }} className="text-muted">No records yet. Be the first to win!</p>
        ) : (
          visibleData.map((player, index) => {
            const style = getPlanStyle(player.plan)
            return (
              <div key={index} style={{ display: "flex", padding: "16px 10px", alignItems: "center", borderBottom: "1px solid var(--nav-border)", borderRadius: "0 8px 8px 0", ...style }}>
                <div style={{ width: "50px", textAlign: "center", fontWeight: "bold", fontSize: "1.2rem", color: "var(--text-muted)" }}>{index + 1}</div>
                <div style={{ flex: 1, fontSize: "1.1rem" }}>{player.displayName || player.email} {getPlanIcon(player.plan)}</div>
                <div style={{ width: "80px", textAlign: "center", fontWeight: "bold", fontSize: "1.2rem", color: "var(--success)" }}>{player.streak} 🔥</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}