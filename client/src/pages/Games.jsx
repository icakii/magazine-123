"use client"

import { useState, useEffect, useRef } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

function isoTodayUTC() {
  return new Date().toISOString().slice(0, 10)
}

function utcDayNumber(isoYYYYMMDD) {
  const [y, m, d] = isoYYYYMMDD.split("-").map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

// ---------- DAILY WORD (deterministic, no repeat per year) ----------
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

function dayOfYearUTC() {
  const now = new Date()
  const start = Date.UTC(now.getUTCFullYear(), 0, 1)
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )
  return Math.floor((today - start) / 86400000)
}

function pickDailyWordNoRepeatYear(words) {
  if (!words.length) return ""
  const rnd = mulberry32(seedFromYear(new Date().getUTCFullYear()))
  const idx = Array.from({ length: words.length }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return words[idx[dayOfYearUTC() % idx.length]]
}

// -------------------------------------------------------------------

export default function Games() {
  const { user } = useAuth()

  const [word, setWord] = useState("")
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState("")
  const [message, setMessage] = useState("")
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [usedLetters, setUsedLetters] = useState(new Set())
  const [streak, setStreak] = useState(0)
  const [attempts, setAttempts] = useState(5)

  const [allWords, setAllWords] = useState(new Set())
  const [possibleAnswers, setPossibleAnswers] = useState([])
  const [loadingGame, setLoadingGame] = useState(true)

  const winSyncedRef = useRef(false)

  const emailKey = user?.email || "guest"
  const STORAGE_KEY = `gameData_${emailKey}`

  // ---------- LOAD DICTIONARY ----------
  useEffect(() => {
    fetch("/dictionary.json")
      .then((r) => r.json())
      .then((data) => {
        const words = Array.from(
          new Set(data.map((w) => w.toUpperCase()))
        ).filter((w) => w.length === 5)
        setAllWords(new Set(words))
        setPossibleAnswers(words)
      })
  }, [])

  // ---------- INIT GAME ----------
  useEffect(() => {
    if (!user || !possibleAnswers.length) return

    async function init() {
      setLoadingGame(true)
      winSyncedRef.current = false

      // 🔥 streak = SERVER SOURCE OF TRUTH
      try {
        const res = await api.get("/user/streak")
        setStreak(Number(res.data?.effectiveStreak || 0))
      } catch {
        setStreak(0)
      }

      const todayISO = isoTodayUTC()
      const dailyWord = pickDailyWordNoRepeatYear(possibleAnswers)

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")

      if (saved.dateISO === todayISO && saved.word === dailyWord) {
        setWord(saved.word)
        setGuesses(saved.guesses || [])
        setWon(saved.won)
        setGameOver(saved.gameOver)
        setUsedLetters(new Set(saved.usedLetters || []))
        setAttempts(5 - (saved.guesses || []).length)
        if (saved.gameOver && !saved.won) {
          setMessage(`Game over! Word: ${saved.word}`)
        }
        if (saved.won) setMessage("Already solved today!")
      } else {
        setWord(dailyWord)
        setGuesses([])
        setUsedLetters(new Set())
        setAttempts(5)
        setMessage("")
        setWon(false)
        setGameOver(false)
      }

      setLoadingGame(false)
    }

    init()
  }, [user, possibleAnswers])

  // ---------- SAVE PROGRESS ----------
  useEffect(() => {
    if (!word || loadingGame) return
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        dateISO: isoTodayUTC(),
        word,
        guesses,
        won,
        gameOver,
        usedLetters: Array.from(usedLetters),
      })
    )
  }, [word, guesses, won, gameOver, usedLetters, loadingGame])

  // ---------- GAME LOGIC ----------
  function handleKeyDown(e) {
    if (gameOver || loadingGame) return
    const key = e.key.toUpperCase()

    if (key === "ENTER") {
      if (currentGuess.length !== 5) {
        setMessage("Word must be 5 letters")
        return
      }
      if (!allWords.has(currentGuess)) {
        setMessage("Not in word list")
        return
      }

      const nextGuesses = [...guesses, currentGuess]
      setGuesses(nextGuesses)
      setUsedLetters(new Set([...usedLetters, ...currentGuess]))
      setAttempts(5 - nextGuesses.length)

      // ✅ WIN
      if (currentGuess === word) {
        setWon(true)
        setGameOver(true)
        setMessage("🎉 You won!")

        if (!winSyncedRef.current) {
          winSyncedRef.current = true
          api.post("/user/streak", {}).then((res) => {
            setStreak(Number(res.data?.effectiveStreak || 0))
          })
        }
        return
      }

      // ❌ LOSE
      if (nextGuesses.length >= 5) {
        setGameOver(true)
        setWon(false)
        setStreak(0)
        setMessage(`Game over! Word: ${word}`)
        api.post("/user/streak", { streak: 0 }).catch(() => {})
        return
      }

      setCurrentGuess("")
      setMessage("")
    }

    if (key === "BACKSPACE") {
      setCurrentGuess((p) => p.slice(0, -1))
      setMessage("")
    }

    if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess((p) => p + key)
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  function getLetterColor(letter, index) {
    if (letter === word[index]) return "var(--olive)"
    if (word.includes(letter)) return "var(--clay)"
    return "#4a4a4a"
  }

  function getKeyboardButtonStyle(letter) {
    if (usedLetters.has(letter))
      return word.includes(letter) ? "#a0a0a0" : "#4a4a4a"
    return "#d3d3d3"
  }

  if (loadingGame) return null

  // ---------- UI (100% ORIGINAL) ----------
  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 className="headline">Daily Word Game</h2>

      <a
        href="/word-game-archive"
        className="btn ghost"
        style={{
          marginBottom: 20,
          border: "2px solid var(--oxide-red)",
          padding: "10px 20px",
          borderRadius: 8,
          color: "var(--oxide-red)",
          fontWeight: "bold",
        }}
      >
        📜 Play Past Games (Archive)
      </a>

      <p className="subhead">Attempts remaining: {attempts}</p>

      {streak > 0 && (
        <div style={{
          marginBottom: 16,
          padding: "8px 16px",
          background: "rgba(156,42,42,.10)",
          borderRadius: 8,
          color: "var(--oxide-red)",
          fontWeight: 600
        }}>
          🔥 Streak: {streak}
        </div>
      )}

      <div style={{ display: "grid", gap: 8, margin: "24px 0" }}>
        {guesses.map((guess, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", gap: 8 }}>
            {guess.split("").map((letter, colIdx) => (
              <div
                key={colIdx}
                style={{
                  width: 60,
                  height: 60,
                  display: "grid",
                  placeItems: "center",
                  background: getLetterColor(letter, colIdx),
                  color: "white",
                  fontWeight: 700,
                  borderRadius: 8,
                  fontSize: "1.4rem",
                }}
              >
                {letter}
              </div>
            ))}
          </div>
        ))}

        {!gameOver && (
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: 60,
                  height: 60,
                  display: "grid",
                  placeItems: "center",
                  background:
                    idx < currentGuess.length
                      ? "var(--oxide-red)"
                      : "var(--bg-muted)",
                  color: idx < currentGuess.length ? "white" : "var(--text)",
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "2px solid var(--nav-border)",
                  fontSize: "1.4rem",
                }}
              >
                {currentGuess[idx] || ""}
              </div>
            ))}
          </div>
        )}
      </div>

      {message && <p className={`msg ${won ? "success" : "warning"}`}>{message}</p>}

      {gameOver && (
        <a href="/leaderboards" className="btn primary" style={{ marginTop: 20 }}>
          🏆 View Leaderboards
        </a>
      )}
    </div>
  )
}
