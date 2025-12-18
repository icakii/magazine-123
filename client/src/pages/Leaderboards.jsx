"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"

function planPillStyle(plan) {
  const p = String(plan || "free").toLowerCase()
  if (p === "monthly") {
    return {
      background: "rgba(56, 128, 255, 0.14)",
      border: "1px solid rgba(56, 128, 255, 0.28)",
    }
  }
  if (p === "yearly") {
    return {
      background: "rgba(255, 199, 64, 0.16)",
      border: "1px solid rgba(255, 199, 64, 0.32)",
    }
  }
  return {
    background: "var(--bg-muted)",
    border: "1px solid var(--nav-border)",
  }
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
      <div className="page">
        {header}
        <p className="subhead">Loading…</p>
      </div>
    )
  }

  return (
    <div className="page">
      {header}

      {err && <p className="msg warning">{err}</p>}

      <div className="leaderboard-head">
        <div className="lb-col lb-rank">#</div>
        <div className="lb-col lb-player">Player</div>
        <div className="lb-col lb-streak">Streak</div>
      </div>

      {rows.map((u, i) => {
        const plan = String(u.plan || "free").toLowerCase()
        const pill = planPillStyle(plan)
        const suffix = nameSuffix(plan)

        return (
          <div
            key={`${u.displayName || "user"}_${i}`}
            className="leaderboard-row"
            style={{ borderRadius: 14, overflow: "hidden" }}
          >
            <div className="lb-col lb-rank">{i + 1}</div>

            <div className="lb-col lb-player">
              <span
                style={{
                  fontWeight: 900,
                  padding: "6px 10px",
                  borderRadius: 999,
                  ...pill,
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                }}
                title={u.displayName || "Unknown"}
              >
                {u.displayName || "Unknown"}
                {suffix}
              </span>

              {u.lastWinDate && (
                <div className="text-muted" style={{ fontSize: "0.9rem", marginTop: 6 }}>
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
