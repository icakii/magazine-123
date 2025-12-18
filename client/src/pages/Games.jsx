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
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false)

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

  // init game
  useEffect(() => {
    if (!user || !dictionaryLoaded) return

    async function initGame() {
      try {
        winSyncedRef.current = false
        const todayISO = isoTodayUTC()

        // ✅ server = source of truth
        let currentStreak = 0
        try {
          const res = await api.get("/user/streak")
          currentStreak = Number(res.data?.effectiveStreak || 0)
        } catch {
          const stored = parseInt(localStorage.getItem(getStorageKey("_streak")) || "0", 10)
          currentStreak = Number.isFinite(stored) ? stored : 0
        }

        localStorage.setItem(getStorageKey("_streak"), String(currentStreak))

        const targetWord = pickDailyWordNoRepeatYear(possibleAnswers)

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
        setWon(true)
        setGameOver(true)
        setMessage("🎉 You won!")

        // ✅ sync ONCE: server decides streak
        if (winSyncedRef.current !== true) {
          winSyncedRef.current = true
          api
            .post("/user/streak", { type: "win" })
            .then((res) => {
              const next = Number(res.data?.effectiveStreak ?? res.data?.streak ?? 0)
              setStreak(next)
              localStorage.setItem(getStorageKey("_streak"), String(next))
            })
            .catch(() => {})
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
        api.post("/user/streak", { type: "reset" }).catch(() => {})
        return
      }

      setCurrentGuess("")
      setMessage("")
      return
    }

    if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1))
      setMessage("")
      return
    }

    if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess((prev) => prev + key)
    }
  }

  function handleKeyClick(letter) {
    if (gameOver || loadingGame || !dictionaryLoaded) return
    if (currentGuess.length < 5) setCurrentGuess((prev) => prev + letter)
  }
  function handleBackspace() {
    if (gameOver || loadingGame || !dictionaryLoaded) return
    setCurrentGuess((prev) => prev.slice(0, -1))
    setMessage("")
  }
  function handleSubmit() {
    if (gameOver || loadingGame || !dictionaryLoaded) return
    handleKeyDown({ key: "Enter" })
  }

  function getLetterColor(letter, index) {
    if (letter === word[index]) return "var(--olive)"
    if (word.includes(letter)) return "var(--clay)"
    return "#4a4a4a"
  }

  function getKeyboardButtonStyle(letter) {
    if (usedLetters.has(letter)) return word.includes(letter) ? "#a0a0a0" : "#4a4a4a"
    return "#d3d3d3"
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentGuess, gameOver, word, guesses, usedLetters, loadingGame, dictionaryLoaded])

  if (loadingGame || !dictionaryLoaded) {
    return (
      <div className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: "10px" }}>Loading dictionary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 className="headline">Daily Word Game</h2>

      <a
        href="/word-game-archive"
        className="btn ghost"
        style={{
          marginBottom: "20px",
          textDecoration: "none",
          border: "2px solid var(--oxide-red)",
          padding: "10px 20px",
          borderRadius: "8px",
          color: "var(--oxide-red)",
          fontWeight: "bold",
          display: "inline-block",
        }}
      >
        📜 Play Past Games (Archive)
      </a>

      <p className="subhead">Attempts remaining: {attempts}</p>

      {streak > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "8px 16px",
            background: "rgba(156, 42, 42, 0.10)",
            borderRadius: 8,
            color: "var(--oxide-red)",
            fontWeight: 600,
            border: "1px solid rgba(156, 42, 42, 0.25)",
          }}
        >
          🔥 Streak: {streak}
        </div>
      )}

      <div style={{ display: "grid", gap: 8, margin: "24px 0" }}>
        {guesses.map((guess, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", gap: 8, justifyContent: "center" }}>
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
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: 60,
                  height: 60,
                  display: "grid",
                  placeItems: "center",
                  background: idx < currentGuess.length ? "var(--oxide-red)" : "var(--bg-muted)",
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

      {!gameOver && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginTop: 24, maxWidth: 500 }}>
          {[["Q","W","E","R","T","Y","U","I","O","P"], ["A","S","D","F","G","H","J","K","L"], ["Z","X","C","V","B","N","M"]].map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              {rowIdx === 2 && (
                <button
                  onClick={handleBackspace}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#999", color: "white", fontWeight: 600, cursor: "pointer" }}
                >
                  ←
                </button>
              )}

              {row.map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleKeyClick(letter)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 6,
                    border: "none",
                    background: getKeyboardButtonStyle(letter),
                    color: usedLetters.has(letter) ? "white" : "black",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {letter}
                </button>
              ))}

              {rowIdx === 2 && (
                <button
                  onClick={handleSubmit}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "var(--oxide-red)", color: "white", fontWeight: 600, cursor: "pointer" }}
                >
                  ↵
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {message && <p className={`msg ${won ? "success" : "warning"}`}>{message}</p>}

      {gameOver && (
        <a href="/leaderboards" className="btn primary" style={{ marginTop: 20, padding: "12px 24px", fontSize: "1.1rem", textDecoration: "none", display: "inline-block" }}>
          🏆 View Leaderboards
        </a>
      )}
    </div>
  )
}
