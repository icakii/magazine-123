// client/src/pages/Games.jsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

const WORD_LEN = 5
const MAX_TRIES = 5

function isoTodayUTC() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
}

function dayOfYearUTC() {
  const now = new Date()
  const start = Date.UTC(now.getUTCFullYear(), 0, 1)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.floor((today - start) / 86400000)
}

// deterministic PRNG
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function seedFromYear(year) {
  return year * 1000003 + 49297
}

// same daily word across devices, no repeat inside year (shuffled list)
function pickDailyWordNoRepeatYear(words) {
  if (!words || words.length === 0) return ""
  const year = new Date().getUTCFullYear()
  const rnd = mulberry32(seedFromYear(year))

  const idx = Array.from({ length: words.length }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }

  const doy = dayOfYearUTC()
  return words[idx[doy % idx.length]]
}

// Wordle feedback per guess
// returns array of "correct" | "present" | "absent"
function gradeGuess(guess, answer) {
  const g = guess.toUpperCase()
  const a = answer.toUpperCase()

  const res = Array(WORD_LEN).fill("absent")
  const aCount = {}

  // mark correct + count remaining letters
  for (let i = 0; i < WORD_LEN; i++) {
    if (g[i] === a[i]) {
      res[i] = "correct"
    } else {
      aCount[a[i]] = (aCount[a[i]] || 0) + 1
    }
  }

  // mark present (yellow) using remaining counts
  for (let i = 0; i < WORD_LEN; i++) {
    if (res[i] === "correct") continue
    const ch = g[i]
    if (aCount[ch] > 0) {
      res[i] = "present"
      aCount[ch] -= 1
    }
  }

  return res
}

// letter status priority: correct > present > absent
function mergeLetterStatus(prev, next) {
  const rank = { correct: 3, present: 2, absent: 1, unknown: 0 }
  const p = prev || "unknown"
  const n = next || "unknown"
  return rank[n] > rank[p] ? n : p
}

export default function Games() {
  const { user } = useAuth()
  const emailKey = user?.email || "guest"

  const storageKeyGame = useMemo(() => `gameData_${emailKey}`, [emailKey])
  const storageKeyStreak = useMemo(() => `gameData_${emailKey}_streak`, [emailKey])
  const storageKeyLastWin = useMemo(() => `gameData_${emailKey}_lastWinISO`, [emailKey])

  const [allWords, setAllWords] = useState(new Set())
  const [possibleAnswers, setPossibleAnswers] = useState([])
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false)

  const [loading, setLoading] = useState(true)

  const [answer, setAnswer] = useState("")
  const [guesses, setGuesses] = useState([]) // array of strings
  const [currentGuess, setCurrentGuess] = useState("")

  const [message, setMessage] = useState("")
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  const [streak, setStreak] = useState(0)

  const winSyncedRef = useRef(false)

  // letterStatuses: { A: "absent|present|correct" }
  const letterStatuses = useMemo(() => {
    const status = {}
    for (const g of guesses) {
      const grades = gradeGuess(g, answer)
      for (let i = 0; i < WORD_LEN; i++) {
        const ch = g[i]
        status[ch] = mergeLetterStatus(status[ch], grades[i])
      }
    }
    return status
  }, [guesses, answer])

  const attemptsLeft = Math.max(0, MAX_TRIES - guesses.length)

  // ---- load dictionary.json ----
  useEffect(() => {
    async function loadDictionary() {
      try {
        const response = await fetch("/dictionary.json")
        if (!response.ok) throw new Error("Failed to load dictionary")
        const data = await response.json()

        const normalized = Array.from(
          new Set((data || []).map((w) => String(w || "").trim().toUpperCase()))
        ).filter((w) => w.length === WORD_LEN)

        setAllWords(new Set(normalized))
        setPossibleAnswers(normalized)
        setDictionaryLoaded(true)
      } catch (e) {
        console.error("Dictionary error:", e)
        setMessage("Error loading word database.")
      }
    }
    loadDictionary()
  }, [])

  // ---- init game per day ----
  useEffect(() => {
    if (!user || !dictionaryLoaded) return

    async function init() {
      try {
        setLoading(true)
        setMessage("")
        winSyncedRef.current = false

        const todayISO = isoTodayUTC()
        const daily = pickDailyWordNoRepeatYear(possibleAnswers)

        // streak: server is source of truth
        let effective = 0
        let lastWinISO = null
        try {
          const res = await api.get("/user/streak")
          effective = Number(res.data?.effectiveStreak || 0)
          lastWinISO = res.data?.lastWinDate ? String(res.data.lastWinDate).slice(0, 10) : null
        } catch {
          // fallback to localStorage only
          const stored = parseInt(localStorage.getItem(storageKeyStreak) || "0", 10)
          effective = Number.isFinite(stored) ? stored : 0
          lastWinISO = localStorage.getItem(storageKeyLastWin)
        }

        setStreak(effective)
        localStorage.setItem(storageKeyStreak, String(effective))
        if (lastWinISO) localStorage.setItem(storageKeyLastWin, lastWinISO)
        else localStorage.removeItem(storageKeyLastWin)

        // restore progress for today
        const savedRaw = localStorage.getItem(storageKeyGame)
        const saved = savedRaw ? JSON.parse(savedRaw) : null

        if (saved?.dateISO === todayISO && saved?.answer === daily) {
          setAnswer(saved.answer)
          setGuesses(Array.isArray(saved.guesses) ? saved.guesses : [])
          setWon(!!saved.won)
          setGameOver(!!saved.gameOver)
          setCurrentGuess("")
          setMessage(saved.gameOver ? (saved.won ? "Already solved today!" : `Game over! Word: ${saved.answer}`) : "")
        } else {
          setAnswer(daily)
          setGuesses([])
          setCurrentGuess("")
          setWon(false)
          setGameOver(false)
          setMessage("")
        }
      } catch (e) {
        console.error("Init game error:", e)
        setMessage("Error initializing game.")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [user, dictionaryLoaded, possibleAnswers, storageKeyGame, storageKeyLastWin, storageKeyStreak])

  // save progress
  useEffect(() => {
    if (!user || loading || !answer) return
    const payload = {
      dateISO: isoTodayUTC(),
      answer,
      guesses,
      won,
      gameOver,
    }
    localStorage.setItem(storageKeyGame, JSON.stringify(payload))
  }, [user, loading, answer, guesses, won, gameOver, storageKeyGame])

  function submitGuess() {
    if (gameOver) return

    const g = currentGuess.toUpperCase()

    if (g.length !== WORD_LEN) {
      setMessage("Word must be 5 letters")
      return
    }
    if (!allWords.has(g)) {
      setMessage("Not in word list")
      return
    }

    const nextGuesses = [...guesses, g]
    setGuesses(nextGuesses)
    setCurrentGuess("")
    setMessage("")

    // WIN
    if (g === answer) {
      setWon(true)
      setGameOver(true)
      setMessage("🎉 You won!")

      // sync ONCE (server enforces 1 win/day)
      if (!winSyncedRef.current) {
        winSyncedRef.current = true
        api
          .post("/user/streak", {}) // ✅ matches your server (it uses "today" internally)
          .then((res) => {
            const next = Number(res.data?.effectiveStreak ?? res.data?.streak ?? 0)
            setStreak(next)
            localStorage.setItem(storageKeyStreak, String(next))
            localStorage.setItem(storageKeyLastWin, isoTodayUTC())
          })
          .catch((e) => {
            console.warn("streak sync failed:", e?.message || e)
            localStorage.setItem(storageKeyLastWin, isoTodayUTC())
          })
      }
      return
    }

    // LOSE
    if (nextGuesses.length >= MAX_TRIES) {
      setWon(false)
      setGameOver(true)
      setMessage(`Game over! The word was: ${answer}`)
      setStreak(0)
      localStorage.setItem(storageKeyStreak, "0")
      localStorage.removeItem(storageKeyLastWin)
      api.post("/user/streak", { streak: 0 }).catch(() => {})
      return
    }
  }

  function onKey(key) {
    if (loading || gameOver) return

    if (key === "ENTER") return submitGuess()
    if (key === "BACKSPACE") {
      setCurrentGuess((p) => p.slice(0, -1))
      return
    }
    if (/^[A-Z]$/.test(key)) {
      setCurrentGuess((p) => (p.length < WORD_LEN ? p + key : p))
    }
  }

  // physical keyboard
  useEffect(() => {
    function handle(e) {
      const k = String(e.key || "")
      if (k === "Enter") return onKey("ENTER")
      if (k === "Backspace") return onKey("BACKSPACE")
      const up = k.toUpperCase()
      if (/^[A-Z]$/.test(up)) return onKey(up)
    }
    window.addEventListener("keydown", handle)
    return () => window.removeEventListener("keydown", handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, gameOver, currentGuess, guesses, answer])

  // UI helpers
  function tileStyle(state) {
    // keep your vintage look; just add subtle background changes
    const base = {
      height: 70,
      borderRadius: 14,
      border: "1px solid #2b2b2b",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      fontSize: "1.8rem",
      letterSpacing: "0.08em",
      userSelect: "none",
      background: "#f3e9da",
    }

    if (state === "correct") return { ...base, background: "#d9f2d9" }
    if (state === "present") return { ...base, background: "#fff2cc" }
    if (state === "absent") return { ...base, background: "#e6e6e6" }
    return base
  }

  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ]

  function keyStyle(k) {
    const base = {
      padding: k === "ENTER" || k === "BACKSPACE" ? "12px 12px" : "12px 10px",
      minWidth: k === "ENTER" || k === "BACKSPACE" ? 86 : 38,
      borderRadius: 12,
      border: "1px solid #2b2b2b",
      background: "#f3e9da",
      fontWeight: 900,
      cursor: "pointer",
      userSelect: "none",
    }

    const s = letterStatuses[k]
    if (s === "correct") return { ...base, background: "#d9f2d9" }
    if (s === "present") return { ...base, background: "#fff2cc" }
    if (s === "absent") return { ...base, background: "#e6e6e6" }
    return base
  }

  if (!user) {
    return (
      <div className="page">
        <p>Please login to play.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading game…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="headline">Word Game</h2>

      <p className="subhead">
        Streak: <b>{streak}</b> (UTC-based)
      </p>

      {message && <p className="msg">{message}</p>}

      <div
        className="card"
        style={{
          maxWidth: 820,
          padding: 28,
          borderRadius: 18,
          border: "1px solid #2b2b2b",
          background: "#f6efe5",
        }}
      >
        {/* GRID */}
        <div style={{ display: "grid", gap: 12 }}>
          {Array.from({ length: MAX_TRIES }, (_, row) => {
            const g = guesses[row] || ""
            const isActiveRow = row === guesses.length && !gameOver
            const show = isActiveRow ? currentGuess : g

            const grades = g ? gradeGuess(g, answer) : Array(WORD_LEN).fill(null)

            return (
              <div
                key={row}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${WORD_LEN}, 1fr)`,
                  gap: 14,
                }}
              >
                {Array.from({ length: WORD_LEN }, (_, col) => {
                  const ch = (show[col] || "").toUpperCase()
                  const state = g ? grades[col] : null
                  return (
                    <div key={col} style={tileStyle(state)}>
                      {ch}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 22, fontWeight: 700, opacity: 0.85 }}>
          Attempts left: {attemptsLeft}
        </div>

        {/* KEYBOARD */}
        <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
          {keyboardRows.map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {row.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onKey(k)}
                  style={keyStyle(k)}
                  disabled={loading || gameOver}
                >
                  {k === "BACKSPACE" ? "⌫" : k}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
