// client/src/pages/Games.jsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

/* ===================== DATE HELPERS ===================== */
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
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.floor((today - start) / 86400000)
}

/* ===================== RNG ===================== */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5)
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

  const idx = [...words.keys()]
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }

  return words[idx[dayOfYearUTC() % idx.length]]
}

/* ===================== GAME ===================== */
export default function Games() {
  const { user } = useAuth()

  const [word, setWord] = useState("")
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState("")
  const [usedLetters, setUsedLetters] = useState(new Set())
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [message, setMessage] = useState("")
  const [streak, setStreak] = useState(0)
  const [attempts, setAttempts] = useState(5)

  const [dictionaryLoaded, setDictionaryLoaded] = useState(false)
  const [allWords, setAllWords] = useState(new Set())
  const [possibleAnswers, setPossibleAnswers] = useState([])
  const [loadingGame, setLoadingGame] = useState(true)

  const emailKey = user?.email || "guest"
  const storageKey = `gameData_${emailKey}`

  /* ===================== LOAD DICTIONARY ===================== */
  useEffect(() => {
    fetch("/dictionary.json")
      .then(r => r.json())
      .then(data => {
        const words = [...new Set(data.map(w => w.trim().toUpperCase()))]
        setAllWords(new Set(words))
        setPossibleAnswers(words)
        setDictionaryLoaded(true)
      })
      .catch(() => setMessage("Dictionary load error"))
  }, [])

  /* ===================== INIT GAME ===================== */
  useEffect(() => {
    if (!dictionaryLoaded || !user) return

    const today = isoTodayUTC()
    const target = pickDailyWordNoRepeatYear(possibleAnswers)

    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}")

    if (saved.dateISO === today && saved.word === target) {
      setWord(target)
      setGuesses(saved.guesses || [])
      setUsedLetters(new Set(saved.usedLetters || []))
      setGameOver(saved.gameOver)
      setWon(saved.won)
      setAttempts(5 - (saved.guesses?.length || 0))
      setMessage(saved.won ? "Already solved today!" : "")
    } else {
      setWord(target)
      setGuesses([])
      setUsedLetters(new Set())
      setGameOver(false)
      setWon(false)
      setAttempts(5)
      setMessage("")
    }

    setLoadingGame(false)
  }, [dictionaryLoaded, possibleAnswers, user])

  /* ===================== SAVE ===================== */
  useEffect(() => {
    if (!word || loadingGame) return
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        dateISO: isoTodayUTC(),
        word,
        guesses,
        usedLetters: [...usedLetters],
        gameOver,
        won,
      })
    )
  }, [word, guesses, usedLetters, gameOver, won, loadingGame])

  /* ===================== INPUT HANDLER (FIXED) ===================== */
  const handleInput = useCallback(
    (key) => {
      if (gameOver || loadingGame) return

      if (key === "ENTER") {
        if (currentGuess.length !== 5) return setMessage("Word must be 5 letters")
        if (!allWords.has(currentGuess)) return setMessage("Not in word list")

        const nextGuesses = [...guesses, currentGuess]
        setGuesses(nextGuesses)
        setUsedLetters(new Set([...usedLetters, ...currentGuess]))
        setAttempts(5 - nextGuesses.length)

        if (currentGuess === word) {
          setWon(true)
          setGameOver(true)
          setStreak(s => s + 1)
          setMessage("🎉 You won!")
          return
        }

        if (nextGuesses.length >= 5) {
          setGameOver(true)
          setStreak(0)
          setMessage(`Game over! Word: ${word}`)
          return
        }

        setCurrentGuess("")
        setMessage("")
        return
      }

      if (key === "BACKSPACE") {
        setCurrentGuess(g => g.slice(0, -1))
        return
      }

      if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess(g => g + key)
      }
    },
    [currentGuess, guesses, usedLetters, word, gameOver, loadingGame, allWords]
  )

  /* ===================== SINGLE KEYDOWN LISTENER (FIX) ===================== */
  useEffect(() => {
    const onKeyDown = (e) => handleInput(e.key.toUpperCase())
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleInput])

  /* ===================== UI ===================== */
  if (loadingGame) {
    return <div className="page">Loading…</div>
  }

  return (
    <div className="page center">
      <h2 className="headline">Daily Word Game</h2>
      <p className="subhead">Attempts remaining: {attempts}</p>

      {message && <p className={`msg ${won ? "success" : "warning"}`}>{message}</p>}

      {!gameOver && (
        <div className="keyboard">
          {["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row, i) => (
            <div key={i} className="keyboard-row">
              {row.split("").map(l => (
                <button key={l} className="key" onClick={() => handleInput(l)}>
                  {l}
                </button>
              ))}
              {i === 2 && (
                <>
                  <button className="key wide" onClick={() => handleInput("BACKSPACE")}>←</button>
                  <button className="key wide" onClick={() => handleInput("ENTER")}>↵</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
