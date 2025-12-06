"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { Link } from "react-router-dom" 

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

  // --- СТИЛИЗАЦИЯ ЗА АБОНАМЕНТИТЕ ---
  function getPlanStyle(plan) {
    if (plan === "yearly") {
        return { 
            color: "#d4a017", // Златисто-оранжев текст
            background: "linear-gradient(90deg, rgba(255, 215, 0, 0.15), transparent)", // Лек златен фон
            borderLeft: "4px solid #FFD700", // Златен бордюр отляво
            fontWeight: "bold" 
        }
    }
    if (plan === "monthly") {
        return { 
            color: "#007bff", // Наситено синьо
            background: "linear-gradient(90deg, rgba(0, 123, 255, 0.1), transparent)", // Лек син фон
            borderLeft: "4px solid #007bff", // Син бордюр отляво
            fontWeight: "600" 
        }
    }
    // За всички останали (Free users)
    return { 
        color: "var(--text)", 
        borderLeft: "4px solid transparent" 
    }
  }

  function getPlanIcon(plan) {
    if (plan === "yearly") return " 👑" // Корона за годишни
    if (plan === "monthly") return " ⭐" // Звезда за месечни
    return ""
  }

  if (loading) return <div className="page"><p>Loading rankings...</p></div>

  const visibleData = data.slice(0, limit)

  return (
    <div className="page">
      <h2 className="headline" style={{ textAlign: "center", marginBottom: 30 }}>Leaderboards 🏆</h2>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 30, gap: 10 }}>
        <Link 
            to="/games" 
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
                
                {/* Тук се прилага цветът на името и иконата */}
                <div style={{ flex: 1, fontSize: "1.1rem" }}>
                    {player.displayName || player.email} 
                    {getPlanIcon(player.plan)}
                </div>
                
                <div style={{ width: "80px", textAlign: "center", fontWeight: "bold", fontSize: "1.2rem", color: "var(--success)" }}>{player.streak} 🔥</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}