// client/src/pages/Games.jsx
"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

/* ===================== DATE HELPERS (UTC SAFE) ===================== */
function isoTodayUTC() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function utcDayNumber(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
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

/* ===================== SEEDED RNG ===================== */
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
  if (!words.length) return ""
  const year = new Date().getUTCFullYear()
  const rnd = mulberry32(seedFromYear(year))

  const idx = Array.from({ length: words.length }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }

  return words[idx[dayOfYearUTC() % idx.length]]
}

/* ===================== COMPONENT ===================== */
export default function Games() {
  const { user } = useAuth()

  const MAX_ATTEMPTS = 5

  const [word, setWord] = useState("")
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState("")
  const [usedLetters, setUsedLetters] = useState(new Set())

  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [streak, setStreak] = useState(0)

  const [won, setWon] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [message, setMessage] = useState("")

  const [dictionary, setDictionary] = useState([])
  const [allWords, setAllWords] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const emailKey = user?.email || "guest"
  const STORAGE_KEY = `wordgame_${emailKey}`

  /* ===================== LOAD DICTIONARY ===================== */
  useEffect(() => {
    fetch("/dictionary.json")
      .then(r => r.json())
      .then(data => {
        const words = Array.from(
          new Set(data.map(w => w.toUpperCase()))
        )
        setDictionary(words)
        setAllWords(new Set(words))
      })
      .catch(() => setMessage("Dictionary load error"))
  }, [])

  /* ===================== INIT GAME ===================== */
  useEffect(() => {
    if (!user || !dictionary.length) return

    const today = isoTodayUTC()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")

    const dailyWord = pickDailyWordNoRepeatYear(dictionary)

    if (saved.date === today && saved.word === dailyWord) {
      setWord(saved.word)
      setGuesses(saved.guesses || [])
      setCurrentGuess("")
      setUsedLetters(new Set(saved.usedLetters || []))
      setWon(saved.won)
      setGameOver(saved.gameOver)
      setAttemptsLeft(MAX_ATTEMPTS - (saved.guesses?.length || 0))
      setStreak(saved.streak || 0)
      setMessage(saved.message || "")
    } else {
      setWord(dailyWord)
      setGuesses([])
      setCurrentGuess("")
      setUsedLetters(new Set())
      setWon(false)
      setGameOver(false)
      setAttemptsLeft(MAX_ATTEMPTS)
      setMessage("")
    }

    setLoading(false)
  }, [user, dictionary])

  /* ===================== SAVE ===================== */
  useEffect(() => {
    if (!word || loading) return

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        date: isoTodayUTC(),
        word,
        guesses,
        usedLetters: [...usedLetters],
        won,
        gameOver,
        streak,
        message,
      })
    )
  }, [word, guesses, usedLetters, won, gameOver, streak, message, loading])

  /* ===================== INPUT ===================== */
  function submitGuess() {
    if (gameOver) return

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

    const left = MAX_ATTEMPTS - nextGuesses.length
    setAttemptsLeft(left)

    if (currentGuess === word) {
      const nextStreak = streak + 1
      setWon(true)
      setGameOver(true)
      setStreak(nextStreak)
      setMessage("🎉 You won!")
      api.post("/user/streak", { streak: nextStreak }).catch(() => {})
      return
    }

    if (left === 0) {
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

  function handleKey(e) {
    if (loading || gameOver) return
    const k = e.key.toUpperCase()

    if (k === "ENTER") submitGuess()
    else if (k === "BACKSPACE") setCurrentGuess(g => g.slice(0, -1))
    else if (/^[A-Z]$/.test(k) && currentGuess.length < 5)
      setCurrentGuess(g => g + k)
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  })

  /* ===================== RENDER ===================== */
  if (loading) {
    return (
      <div className="page center" style={{ minHeight: "50vh" }}>
        Loading game…
      </div>
    )
  }

  return (
    <div className="page center">
      <h2 className="headline">Daily Word Game</h2>

      {/* 🔴 THIS WAS THE PROBLEM AREA — NOW FIXED */}
      <p className="subhead">
        Attempts remaining: <strong>{attemptsLeft}</strong>
      </p>

      {streak > 0 && (
        <div className="streak-pill">🔥 Streak: {streak}</div>
      )}

      {/* GRID */}
      <div className="word-grid">
        {Array.from({ length: MAX_ATTEMPTS }).map((_, r) => {
          const guess = guesses[r] || currentGuess
          return (
            <div className="word-row" key={r}>
              {Array.from({ length: 5 }).map((_, c) => {
                const letter = guess?.[c] || ""
                return (
                  <div className="word-tile" key={c}>
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {message && (
        <p className={`msg ${won ? "success" : "warning"}`}>{message}</p>
      )}

      {gameOver && (
        <a href="/leaderboards" className="btn primary mt-3">
          🏆 View Leaderboards
        </a>
      )}
    </div>
  )
}
