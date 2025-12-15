// client/src/pages/Games.jsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

/* =========================
   UTC HELPERS
========================= */
function isoTodayUTC() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function utcDayNumber(isoYYYYMMDD) {
  // isoYYYYMMDD -> number of days since epoch (UTC)
  const [y, m, d] = isoYYYYMMDD.split("-").map(Number)
  const ms = Date.UTC(y, m - 1, d)
  return Math.floor(ms / 86400000)
}

function dayOfYearUTC() {
  const now = new Date()
  const start = Date.UTC(now.getUTCFullYear(), 0, 1)
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )
  return Math.floor((today - start) / 86400000) // 0-based
}

/* =========================
   SEEDED PRNG (DETERMINISTIC)
========================= */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromYear(year) {
  // simple stable seed
  return year * 1000003 + 49297
}

function pickDailyWordNoRepeatYear(words) {
  if (!words || words.length === 0) return ""
  const year = new Date().getUTCFullYear()
  const rnd = mulberry32(seedFromYear(year))

  // create deterministic shuffled index mapping (Fisher-Yates)
  const idx = Array.from({ length: words.length }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }

  const doy = dayOfYearUTC()
  const chosenIndex = idx[doy % idx.length]
  return words[chosenIndex]
}

/* =========================
   COMPONENT
========================= */
export default function Games() {
  const { user } = useAuth()

  // IMPORTANT: you use 5 attempts in this project
  const MAX_ATTEMPTS = 5
  const WORD_LEN = 5

  // Game State
  const [word, setWord] = useState("")
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState("")
  const [message, setMessage] = useState("")
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [usedLetters, setUsedLetters] = useState(new Set())
  const [streak, setStreak] = useState(0)
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS)

  // Dictionary State
  const [allWords, setAllWords] = useState(new Set())
  const [possibleAnswers, setPossibleAnswers] = useState([])
  const [loadingGame, setLoadingGame] = useState(true)
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false)

  const emailKey = user?.email || "guest"
  const getStorageKey = (suffix = "") => `gameData_${emailKey}${suffix}`

  /* =========================
     LOAD DICTIONARY
  ========================= */
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

  /* =========================
     INIT GAME (WAIT USER + DICTIONARY)
  ========================= */
  useEffect(() => {
    if (!user || !dictionaryLoaded) return

    async function initGame() {
      try {
        const todayISO = isoTodayUTC()

        // ✅ streak reset using UTC day numbers (fix timezone/parsing bugs)
        const storedStreak = parseInt(
          localStorage.getItem(getStorageKey("_streak")) || "0",
          10
        )
        const lastWinISO = localStorage.getItem(getStorageKey("_lastWinISO")) // YYYY-MM-DD
        let currentStreak = Number.isFinite(storedStreak) ? storedStreak : 0

        if (lastWinISO && currentStreak > 0) {
          const diff = utcDayNumber(todayISO) - utcDayNumber(lastWinISO)
          if (diff > 1) {
            currentStreak = 0
            localStorage.setItem(getStorageKey("_streak"), "0")
            api.post("/user/streak", { streak: 0 }).catch((e) => console.error(e))
          }
        }

        // ✅ daily word without repeats (year-shuffle)
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

          const used = (parsedData.guesses || []).length
          setAttempts(MAX_ATTEMPTS - used)

          if (parsedData.gameOver && !parsedData.won)
            setMessage(`Game over! Word: ${parsedData.word}`)
          if (parsedData.won) setMessage("Already solved today!")
        } else {
          setWord(targetWord)
          setGuesses([])
          setWon(false)
          setGameOver(false)
          setUsedLetters(new Set())
          setMessage("")
          setAttempts(MAX_ATTEMPTS)
          setStreak(currentStreak)
          setCurrentGuess("")
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

  /* =========================
     SAVE PROGRESS
  ========================= */
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

  /* =========================
     SAVE WIN + SYNC STREAK
  ========================= */
  useEffect(() => {
    if (won && user) {
      const todayISO = isoTodayUTC()
      localStorage.setItem(getStorageKey("_streak"), String(streak))
      localStorage.setItem(getStorageKey("_lastWinISO"), todayISO)

      api
        .post("/user/streak", { streak })
        .then(() => console.log("Streak synced"))
        .catch((err) => console.error("Sync failed", err))
    }
  }, [won, streak, user])

  /* =========================
     TILE COLORING (WORDLE-LIKE)
     - green: correct place
     - clay : exists elsewhere
     - dark : not in word
  ========================= */
  function getLetterColor(letter, index) {
    if (!letter) return "transparent"
    if (letter === word[index]) return "var(--olive)"
    if (word.includes(letter)) return "var(--clay)"
    return "#4a4a4a"
  }

  function getKeyboardButtonStyle(letter) {
    // keep your original logic
    if (usedLetters.has(letter))
      return word.includes(letter) ? "#a0a0a0" : "#4a4a4a"
    return "#d3d3d3"
  }

  /* =========================
     SUBMIT LOGIC
  ========================= */
  function submitGuess(guessRaw) {
    if (gameOver || loadingGame || !dictionaryLoaded) return

    const guess = String(guessRaw || "").toUpperCase()

    if (guess.length !== WORD_LEN) {
      setMessage("Word must be 5 letters")
      return
    }
    if (!allWords.has(guess)) {
      setMessage("Not in word list")
      return
    }

    const newGuesses = [...guesses, guess]
    setGuesses(newGuesses)
    setUsedLetters(new Set([...usedLetters, ...guess.split("")]))

    const remaining = MAX_ATTEMPTS - newGuesses.length
    setAttempts(remaining)

    if (guess === word) {
      setStreak((prev) => prev + 1)
      setWon(true)
      setGameOver(true)
      setMessage("🎉 You won!")
      setCurrentGuess("")
      return
    }

    if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameOver(true)
      setWon(false)
      setStreak(0)
      localStorage.setItem(getStorageKey("_streak"), "0")
      api.post("/user/streak", { streak: 0 }).catch(console.error)
      setMessage(`Game over! The word was: ${word}`)
      setCurrentGuess("")
      return
    }

    setCurrentGuess("")
    setMessage("")
  }

  /* =========================
     KEYBOARD EVENTS
  ========================= */
  function handleKeyDown(e) {
    if (gameOver || loadingGame || !dictionaryLoaded) return
    const key = String(e.key || "").toUpperCase()

    if (key === "ENTER") {
      submitGuess(currentGuess)
      return
    }

    if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1))
      setMessage("")
      return
    }

    if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LEN) {
      setCurrentGuess((prev) => prev + key)
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // keep deps like your original (avoid stale closures)
  }, [currentGuess, gameOver, word, guesses, usedLetters, user, loadingGame, dictionaryLoaded])

  /* =========================
     ON-SCREEN KEYBOARD
  ========================= */
  function handleKeyClick(letter) {
    if (gameOver || loadingGame) return
    if (currentGuess.length < WORD_LEN) setCurrentGuess((prev) => prev + letter)
  }

  function handleBackspace() {
    if (gameOver || loadingGame) return
    setCurrentGuess((prev) => prev.slice(0, -1))
    setMessage("")
  }

  function handleSubmit() {
    if (gameOver || loadingGame) return
    submitGuess(currentGuess)
  }

  /* =========================
     RENDER ROWS (FIXED)
     ✅ IMPORTANT FIX:
     - only 1 current row shows currentGuess
     - other empty rows stay empty
  ========================= */
  const rows = useMemo(() => {
    const result = []
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      if (i < guesses.length) {
        result.push({ type: "guess", value: guesses[i] })
      } else if (i === guesses.length && !gameOver) {
        result.push({ type: "current", value: currentGuess })
      } else {
        result.push({ type: "empty", value: "" })
      }
    }
    return result
  }, [guesses, currentGuess, gameOver])

  /* =========================
     LOADING UI
  ========================= */
  if (loadingGame || !dictionaryLoaded) {
    return (
      <div
        className="page"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: "10px" }}>Loading dictionary...</p>
        </div>
      </div>
    )
  }

  /* =========================
     MAIN UI
  ========================= */
  return (
    <div
      className="page"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
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

      {/* ✅ Attempts always visible + stable */}
      <p className="subhead" style={{ marginTop: 6 }}>
        Attempts remaining:{" "}
        <span style={{ fontWeight: 800 }}>{Math.max(0, attempts)}</span>
      </p>

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

      {/* =========================
          GRID (FIXED)
          - no repeating currentGuess on empty rows
      ========================= */}
      <div style={{ display: "grid", gap: 8, margin: "24px 0" }}>
        {rows.map((row, rowIdx) => {
          const letters = Array.from({ length: WORD_LEN }).map((_, i) => row.value[i] || "")

          // row coloring:
          const isGuessRow = row.type === "guess"
          const isCurrentRow = row.type === "current"

          return (
            <div
              key={rowIdx}
              style={{ display: "flex", gap: 8, justifyContent: "center" }}
            >
              {letters.map((letter, colIdx) => {
                const baseStyle = {
                  width: 60,
                  height: 60,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  borderRadius: 8,
                  fontSize: "1.4rem",
                  border: "2px solid var(--nav-border)",
                  color: "var(--text)",
                  background: "var(--bg-muted)",
                }

                // ✅ guess row -> colored tiles
                if (isGuessRow) {
                  return (
                    <div
                      key={colIdx}
                      style={{
                        ...baseStyle,
                        background: getLetterColor(letter, colIdx),
                        color: "white",
                        border: "none",
                      }}
                    >
                      {letter}
                    </div>
                  )
                }

                // ✅ current row -> red fill for typed letters (your old style)
                if (isCurrentRow) {
                  const filled = colIdx < row.value.length
                  return (
                    <div
                      key={colIdx}
                      style={{
                        ...baseStyle,
                        background: filled ? "var(--oxide-red)" : "var(--bg-muted)",
                        color: filled ? "white" : "var(--text)",
                      }}
                    >
                      {letter}
                    </div>
                  )
                }

                // ✅ empty rows
                return (
                  <div key={colIdx} style={baseStyle}>
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* =========================
          ON-SCREEN KEYBOARD (RESTORED)
      ========================= */}
      {!gameOver && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "center",
            marginTop: 24,
            maxWidth: 520,
            width: "100%",
          }}
        >
          {[
            ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
            ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
            ["Z", "X", "C", "V", "B", "N", "M"],
          ].map((row, rowIdx) => (
            <div
              key={rowIdx}
              style={{ display: "flex", gap: 6, justifyContent: "center" }}
            >
              {rowIdx === 2 && (
                <button
                  onClick={handleBackspace}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#999",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
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
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {letter}
                </button>
              ))}

              {rowIdx === 2 && (
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "var(--oxide-red)",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ↵
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message */}
      {message && <p className={`msg ${won ? "success" : "warning"}`}>{message}</p>}

      {/* Game over CTA */}
      {gameOver && (
        <a
          href="/leaderboards"
          className="btn primary"
          style={{
            marginTop: 20,
            padding: "12px 24px",
            fontSize: "1.1rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          🏆 View Leaderboards
        </a>
      )}
    </div>
  )
}
