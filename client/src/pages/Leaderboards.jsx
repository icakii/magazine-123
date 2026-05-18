"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"
import Loader from "../components/Loader"
import { SubNamePill } from "../components/SubNamePill"
import { ProfileMiniCard } from "../components/ArticleSocial"

export default function Leaderboards() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [profileCard, setProfileCard] = useState(null)

  useEffect(() => {
    let mounted = true

    api
      .get("/leaderboards")
      .then((res) => {
        if (!mounted) return
        const list = Array.isArray(res.data) ? res.data : []
        setRows(list)
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
        <Loader />
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

        return (
          <div
            key={`${u.displayName || "user"}_${i}`}
            className="leaderboard-row"
            style={{ borderRadius: 14, overflow: "hidden" }}
          >
            <div className="lb-col lb-rank">{i + 1}</div>

            <div className="lb-col lb-player">
              <SubNamePill
                pfp_url={u.pfpUrl}
                display_name={u.displayName || "Unknown"}
                plan={plan}
                size="md"
                onClick={(e) => {
                  if (!u.displayName) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  setProfileCard({ displayName: u.displayName, rect })
                }}
              />
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

      {profileCard && (
        <ProfileMiniCard
          displayName={profileCard.displayName}
          anchorRect={profileCard.rect}
          onClose={() => setProfileCard(null)}
        />
      )}
    </div>
  )
}
