"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"

function planClass(plan) {
  const p = String(plan || "free").toLowerCase()
  if (p === "monthly") return "lb-pill lb-pill--monthly"
  if (p === "yearly") return "lb-pill lb-pill--yearly"
  return "lb-pill lb-pill--free"
}

function nameSuffix(plan) {
  const p = String(plan || "free").toLowerCase()
  if (p === "monthly") return " ⭐"
  if (p === "yearly") return " 👑"
  return ""
}

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
        const list = Array.isArray(res.data) ? res.data : []
        const cleaned = list.filter((u) => Number(u?.streak || 0) > 0)
        setRows(cleaned)
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

  const header = useMemo(() => {
    return (
      <>
        <h2 className="headline">Leaderboards</h2>
        <p className="subhead">
          Streaks reset automatically if a player hasn’t won yesterday/today (UTC).
        </p>
      </>
    )
  }, [])

  if (loading) {
    return (
      <div className="page leaderboard-page">
        {header}
        <p className="subhead">Loading…</p>
      </div>
    )
  }

  return (
    <div className="page leaderboard-page">
      {header}

      {err && <p className="msg warning">{err}</p>}

      <div className="leaderboard-head">
        <div className="lb-col lb-rank">#</div>
        <div className="lb-col lb-player">Player</div>
        <div className="lb-col lb-streak">Streak</div>
      </div>

      {rows.map((u, i) => {
        const pillCls = planClass(u.plan)
        const suffix = nameSuffix(u.plan)

        return (
          <div key={`${u.displayName || "user"}_${i}`} className="leaderboard-row lb-row">
            <div className="lb-col lb-rank">{i + 1}</div>

            <div className="lb-col lb-player">
              <span className={pillCls} title={u.displayName || "Unknown"}>
                {u.displayName || "Unknown"}
                {suffix}
              </span>

              {u.lastWinDate && (
                <div className="text-muted lb-sub">
                  last win: {String(u.lastWinDate).slice(0, 10)}
                </div>
              )}
            </div>

            <div className="lb-col lb-streak">
              <span className="streak-pill">{Number(u.streak || 0)}</span>
            </div>
          </div>
        )
      })}

      {rows.length === 0 && !err && <p className="text-muted">No players yet.</p>}
    </div>
  )
}
