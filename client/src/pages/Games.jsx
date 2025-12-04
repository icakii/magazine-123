// client/src/pages/Games.jsx

"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth" // 1. Импортваме useAuth

export default function Games() {
  const { user } = useAuth() // 2. Взимаме текущия потребител
  const [word, setWord] = useState("")
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState("")
  const [message, setMessage] = useState("")
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [usedLetters, setUsedLetters] = useState(new Set())
  const [streak, setStreak] = useState(0)
  const [attempts, setAttempts] = useState(5)
  const [validWords, setValidWords] = useState([]) 
  const [loading, setLoading] = useState(true)

  // Помощна функция за ключа в LocalStorage
  // Сега ключът е уникален за всеки имейл!
  const getStorageKey = () => `gameData_${user?.email || 'guest'}`

  useEffect(() => {
    if (!user) return; // Чакаме да се зареди потребителят

    async function initGame() {
      try {
        const response = await fetch('https://raw.githubusercontent.com/tabatkins/wordle-list/main/words');
        const text = await response.text();
        const allWords = text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);
        
        setValidWords(allWords);

        const today = new Date().toDateString()
        
        // 3. Четем от уникалния ключ на потребителя
        const savedData = localStorage.getItem(getStorageKey())
        const parsedData = savedData ? JSON.parse(savedData) : {}

        if (parsedData.date === today && parsedData.word) {
          setWord(parsedData.word)
          setGuesses(parsedData.guesses || [])
          setWon(parsedData.won || false)
          setGameOver(parsedData.gameOver || false)
          setUsedLetters(new Set(parsedData.usedLetters || []))
          setStreak(parsedData.streak || 0)
          setAttempts(5 - (parsedData.guesses || []).length)
          if(parsedData.gameOver) setMessage(`Game over! Word: ${parsedData.word}`)
          if(parsedData.won) setMessage("Already solved today!")
        } else {
            // Зареждаме streak-а от локалния ключ също
            const currentStreak = localStorage.getItem(`streak_${user.email}`) ? parseInt(localStorage.getItem(`streak_${user.email}`)) : 0;
            
            const dateStr = new Date().toISOString().slice(0, 10);
            let seed = 0;
            for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
            const dailyIndex = (seed * 9301 + 49297) % allWords.length;
            
            setWord(allWords[dailyIndex])
            setStreak(currentStreak)
            setAttempts(5)
        }
      } catch (e) {
        console.error("Error loading words", e);
        setMessage("Error loading dictionary.");
      } finally {
        setLoading(false);
      }
    }
    initGame();
  }, [user]) // Рестартира играта, ако се смени потребителят

  useEffect(() => {
    if (word && user) {
      const today = new Date().toDateString()
      const gameData = { date: today, word, guesses, won, gameOver, usedLetters: Array.from(usedLetters), streak }
      // 4. Записваме в уникалния ключ
      localStorage.setItem(getStorageKey(), JSON.stringify(gameData))
    }
  }, [word, guesses, won, gameOver, usedLetters, streak, user])

  useEffect(() => {
      if (won && user) {
          // Записваме streak-а също уникално
          localStorage.setItem(`streak_${user.email}`, streak);
          
          api.post('/user/streak', { streak })
             .then(() => console.log('Streak synced with DB!'))
             .catch(err => console.error('Failed to sync streak:', err))
      }
  }, [won, streak, user])

  function handleKeyDown(e) {
    if (gameOver || loading) return
    const key = e.key.toUpperCase()

    if (key === "ENTER") {
      if (currentGuess.length !== 5) { setMessage("Word must be 5 letters"); return }
      if (!validWords.includes(currentGuess)) { setMessage("Not a valid word"); return }

      const newGuesses = [...guesses, currentGuess]
      setGuesses(newGuesses)
      setUsedLetters(new Set([...usedLetters, ...currentGuess.split("")]))
      setAttempts(5 - newGuesses.length)

      if (currentGuess === word) {
        setStreak(prev => prev + 1)
        setWon(true)
        setGameOver(true)
        setMessage("🎉 You won!")
        return
      }

      if (newGuesses.length >= 5) {
        setGameOver(true)
        setStreak(0)
        localStorage.setItem(`streak_${user?.email}`, 0) // Reset streak unique
        setMessage(`Game over! The word was: ${word}`)
        return
      }

      setCurrentGuess("")
      setMessage("")
    } else if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1))
      setMessage("")
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess((prev) => prev + key)
    }
  }

  function handleKeyClick(letter) {
    if (!gameOver && currentGuess.length < 5) setCurrentGuess(prev => prev + letter)
  }

  function handleBackspace() { if(!gameOver) setCurrentGuess(prev => prev.slice(0, -1)); setMessage("") }
  function handleSubmit() { if(!gameOver) handleKeyDown({ key: "Enter" }) }

  function getLetterColor(letter, index) {
    if (letter === word[index]) return "var(--success)"
    if (word.includes(letter)) return "var(--warning)"
    return "#4a4a4a"
  }

  function getKeyboardButtonStyle(letter) {
    if (usedLetters.has(letter)) return word.includes(letter) ? "#a0a0a0" : "#4a4a4a"
    return "#d3d3d3"
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentGuess, gameOver, word, guesses, usedLetters, validWords])

  if (loading) return <div className="page"><p>Loading...</p></div>

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 className="headline">Daily Word Game</h2>
      
      <a 
        href="/word-game-archive" 
        className="btn ghost" 
        style={{ 
            marginBottom: "20px", 
            textDecoration: "none", 
            border: "2px solid #e63946", 
            padding: "10px 20px",
            borderRadius: "8px",
            color: "#e63946",
            fontWeight: "bold",
            display: "inline-block"
        }}
      >
        📜 Play Past Games (Archive)
      </a>

      <p className="subhead">Attempts remaining: {attempts}</p>

      {streak > 0 && (
        <div style={{ marginBottom: 16, padding: "8px 16px", background: "rgba(230, 57, 70, 0.1)", borderRadius: 8, color: "var(--primary)", fontWeight: 600 }}>
          🔥 Streak: {streak}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: "grid", gap: 8, margin: "24px 0" }}>
        {guesses.map((guess, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {guess.split("").map((letter, colIdx) => (
              <div key={colIdx} style={{ width: 60, height: 60, display: "grid", placeItems: "center", background: getLetterColor(letter, colIdx), color: "white", fontWeight: 700, borderRadius: 8, fontSize: "1.4rem" }}>{letter}</div>
            ))}
          </div>
        ))}
        {!gameOver && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} style={{ width: 60, height: 60, display: "grid", placeItems: "center", background: idx < currentGuess.length ? "var(--primary)" : "var(--bg-muted)", color: idx < currentGuess.length ? "white" : "var(--text)", fontWeight: 700, borderRadius: 8, border: "2px solid var(--nav-border)", fontSize: "1.4rem" }}>{currentGuess[idx] || ""}</div>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard */}
      {!gameOver && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginTop: 24, maxWidth: 500 }}>
          {[["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"], ["A", "S", "D", "F", "G", "H", "J", "K", "L"], ["Z", "X", "C", "V", "B", "N", "M"]].map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              {rowIdx === 2 && <button onClick={handleBackspace} style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#999", color: "white", fontWeight: 600, cursor: "pointer" }}>←</button>}
              {row.map((letter) => (
                <button key={letter} onClick={() => handleKeyClick(letter)} style={{ width: 38, height: 38, borderRadius: 6, border: "none", background: getKeyboardButtonStyle(letter), color: usedLetters.has(letter) ? "white" : "black", fontWeight: 600, cursor: "pointer" }}>{letter}</button>
              ))}
              {rowIdx === 2 && <button onClick={handleSubmit} style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "var(--primary)", color: "white", fontWeight: 600, cursor: "pointer" }}>↵</button>}
            </div>
          ))}
        </div>
      )}

      {message && <p className={`msg ${won ? "success" : "warning"}`}>{message}</p>}

      {gameOver && (
        <a href="/leaderboards" className="btn primary" style={{ marginTop: 20, padding: "12px 24px", fontSize: "1.1rem", textDecoration: "none", display:"inline-block" }}>
          🏆 View Leaderboards
        </a>
      )}
    </div>
  )
}