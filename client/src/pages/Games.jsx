// client/src/pages/Games.jsx
"use client"

import { useState, useEffect, useRef } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

function isoTodayUTC() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function dayOfYearUTC() {
  const now = new Date()
  const start = Date.UTC(now.getUTCFullYear(), 0, 1)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.floor((today - start) / 86400000)
}

// seeded PRNG (deterministic)
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

function pickDailyWordNoRepeatYear(words) {
  if (!words || words.length === 0) return ""
  const year = new Date().getUTCFullYear()
  const rnd = mulberry32(seedFromYear(year))

  // deterministic shuffle
  const idx = Array.from({ length: words.length }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }

  const doy = dayOfYearUTC()
  const chosenIndex = idx[doy % idx.length]
  return words[chosenIndex]
}

export default function Games() {
  const { user } = useAuth()

  // Game State
  const [word, setWord] = useState("")
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState("")
  const [message, setMessage] = useState("")
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [usedLetters, setUsedLetters] = useState(new Set())
  const [streak, setStreak] = useState(0)
  const [attempts, setAttempts] = useState(5)

  // Dictionary State
  const [allWords, setAllWords] = useState(new Set())
  const [possibleAnswers, setPossibleAnswers] = useState([])
  const [loadingGame, setLoadingGame] = useState(true)
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false)

  // prevent double-win sync
  const winSyncedRef = useRef(false)

  const emailKey = user?.email || "guest"
  const getStorageKey = (suffix = "") => `gameData_${emailKey}${suffix}`

  // load dictionary
  useEffect(() => {
    async function loadDictionary() {
      try {
        const response = await fetch("/dictionary.json")
        if (!response.ok) throw new Error("Failed to load dictionary")
        const data = await response.json()
        const normalized = Array.from(
          new Set((data || []).map((w) => String(w || "").trim().toUpperCase()))
        ).filter(Boolean)

        setAllWords(new Set(normalized))
        setPossibleAnswers(normalized)
        setDictionaryLoaded(true)
      } catch (error) {
        console.error("Dictionary error:", error)
        setMessage("Error loading word database.")
      }
    }
    loadDictionary()
  }, [])

  // init game (wait user + dictionary)
  useEffect(() => {
    if (!user || !dictionaryLoaded) return

    async function initGame() {
      try {
        winSyncedRef.current = false
        const todayISO = isoTodayUTC()

        // --- streak: SOURCE OF TRUTH = server (fixes multi-device & messy localStorage) ---
        let currentStreak = 0
        let lastWinISO = null
        try {
          const res = await api.get("/user/streak")
          currentStreak = Number(res.data?.effectiveStreak || 0)
          lastWinISO = res.data?.lastWinDate ? String(res.data.lastWinDate).slice(0, 10) : null
        } catch {
          // fallback to localStorage (offline / first load)
          const stored = parseInt(localStorage.getItem(getStorageKey("_streak")) || "0", 10)
          currentStreak = Number.isFinite(stored) ? stored : 0
          lastWinISO = localStorage.getItem(getStorageKey("_lastWinISO"))
        }

        // Keep local in sync (so UI is instant even if API is slow next time)
        localStorage.setItem(getStorageKey("_streak"), String(currentStreak))
        if (lastWinISO) localStorage.setItem(getStorageKey("_lastWinISO"), lastWinISO)
        else localStorage.removeItem(getStorageKey("_lastWinISO"))

        // daily word without repeats (year-shuffle)
        const targetWord = pickDailyWordNoRepeatYear(possibleAnswers)

        // load saved progress
        const savedData = localStorage.getItem(getStorageKey())
        const parsedData = savedData ? JSON.parse(savedData) : {}

        if (parsedData.dateISO === todayISO && parsedData.word === targetWord) {
          setWord(parsedData.word)
          setGuesses(parsedData.guesses || [])
          setWon(!!parsedData.won)
          setGameOver(!!parsedData.gameOver)
          setUsedLetters(new Set(parsedData.usedLetters || []))
          setStreak(currentStreak)
          setAttempts(5 - (parsedData.guesses || []).length)

          if (parsedData.gameOver && !parsedData.won) setMessage(`Game over! Word: ${parsedData.word}`)
          if (parsedData.won) setMessage("Already solved today!")
        } else {
          setWord(targetWord)
          setGuesses([])
          setWon(false)
          setGameOver(false)
          setUsedLetters(new Set())
          setMessage("")
          setAttempts(5)
          setStreak(currentStreak)
        }
      } catch (e) {
        console.error("Error init game", e)
        setMessage("Error initializing game logic.")
      } finally {
        setLoadingGame(false)
      }
    }

    initGame()
  }, [user, dictionaryLoaded, possibleAnswers])

  // save progress
  useEffect(() => {
    if (word && user && !loadingGame) {
      const todayISO = isoTodayUTC()
      const gameData = {
        dateISO: todayISO,
        word,
        guesses,
        won,
        gameOver,
        usedLetters: Array.from(usedLetters),
        streak,
      }
      localStorage.setItem(getStorageKey(), JSON.stringify(gameData))
    }
  }, [word, guesses, won, gameOver, usedLetters, streak, user, loadingGame])

  function handleKeyDown(e) {
    if (gameOver || loadingGame || !dictionaryLoaded) return

    const key = String(e?.key || "").toUpperCase()

    if (key === "ENTER") {
      if (currentGuess.length !== 5) {
        setMessage("Word must be 5 letters")
        return
      }
      if (!allWords.has(currentGuess)) {
        setMessage("Not in word list")
        return
      }

      const newGuesses = [...guesses, currentGuess]
      setGuesses(newGuesses)
      setUsedLetters(new Set([...usedLetters, ...currentGuess.split("")]))
      setAttempts(5 - newGuesses.length)

      // ✅ WIN
      if (currentGuess === word) {
        const todayISO = isoTodayUTC()

        setWon(true)
        setGameOver(true)
        setMessage("🎉 You won!")

        // ✅ sync ONCE (server decides if streak should increment; safe across devices)
        if (winSyncedRef?.current !== true) {
          winSyncedRef.current = true
          api
            .post("/user/streak", { lastWinISO: todayISO })
            .then((res) => {
              const next = Number(res.data?.effectiveStreak ?? res.data?.streak ?? 0)
              setStreak(next)
              localStorage.setItem(getStorageKey("_streak"), String(next))
              localStorage.setItem(getStorageKey("_lastWinISO"), todayISO)
            })
            .catch(() => {
              // keep last win so UI doesn't look broken
              localStorage.setItem(getStorageKey("_lastWinISO"), todayISO)
            })
        }

        return
      }

      // ❌ LOSE
      if (newGuesses.length >= 5) {
        setGameOver(true)
        setWon(false)
        setStreak(0)
        setMessage(`Game over! The word was: ${word}`)

        localStorage.setItem(getStorageKey("_streak"), "0")
        localStorage.removeItem(getStorageKey("_lastWinISO"))

        api.post("/user/streak", { streak: 0 }).catch(() => {})
        return
      }

      setCurrentGuess("")
      setMessage("")
      return
    }

    if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1))
      return
    }

    if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess((prev) => prev + key)
      return
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleKeyDown, currentGuess, guesses, gameOver, loadingGame, dictionaryLoaded])

  if (!user) return <div className="page"><p>Please login to play.</p></div>
  if (loadingGame) return <div className="page"><p>Loading game…</p></div>

  return (
    <div className="page">
      <h2 className="headline">Word Game</h2>
      <p className="subhead">Streak: <b>{streak}</b> (UTC-based)</p>

      {message && <p className="msg">{message}</p>}

      <div className="card" style={{ maxWidth: 520 }}>
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const g = guesses[i] || ""
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {Array.from({ length: 5 }, (_, j) => {
                  const ch = g[j] || (i === guesses.length ? currentGuess[j] : "") || ""
                  const isFilled = !!ch
                  return (
                    <div
                      key={j}
                      style={{
                        height: 52,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 10,
                        border: "1px solid var(--nav-border)",
                        fontWeight: 900,
                        fontSize: "1.2rem",
                        opacity: isFilled ? 1 : 0.55,
                      }}
                    >
                      {ch}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="text-muted" style={{ marginTop: 14 }}>
          Attempts left: {attempts}
        </div>
      </div>
    </div>
  )
}
