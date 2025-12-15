"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"

export default function Leaderboards() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    let mounted = true
    api
      .get("/leaderboards")
      .then((res) => {
        if (!mounted) return
        setRows(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        if (!mounted) return
        setErr("Failed to load leaderboards.")
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="page">
        <h2 className="headline">Leaderboards</h2>
        <p className="subhead">Loading…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="headline">Leaderboards</h2>
      <p className="subhead">Streaks reset automatically if a player hasn’t won yesterday/today (UTC).</p>

      {err && <p className="msg warning">{err}</p>}

      <div className="leaderboard-head">
        <div className="lb-col lb-rank">#</div>
        <div className="lb-col lb-player">Player</div>
        <div className="lb-col lb-streak">Streak</div>
      </div>

      {rows.map((u, i) => (
        <div key={u.id || i} className="leaderboard-row">
          <div className="lb-col lb-rank">{i + 1}</div>
          <div className="lb-col lb-player">
            <div style={{ fontWeight: 900 }}>{u.displayName || "Unknown"}</div>
            {u.lastWinDate && (
              <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                last win: {String(u.lastWinDate).slice(0, 10)}
              </div>
            )}
          </div>
          <div className="lb-col lb-streak">
            <span className="streak-pill">{Number(u.effectiveStreak || 0)}</span>
          </div>
        </div>
      ))}

      {rows.length === 0 && !err && <p className="text-muted">No players yet.</p>}
    </div>
  )
}
