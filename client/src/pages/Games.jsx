"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

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

  // Dictionary State (Новите променливи)
  const [allWords, setAllWords] = useState(new Set()) // Бърза проверка
  const [possibleAnswers, setPossibleAnswers] = useState([]) // Списък за избиране
  const [loadingGame, setLoadingGame] = useState(true)
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false)

  // Уникален ключ за всеки потребител
  const getStorageKey = (suffix = '') => `gameData_${user?.email || 'guest'}${suffix}`;

  // 1. ЗАРЕЖДАНЕ НА РЕЧНИКА (Това липсваше в твоя код)
  useEffect(() => {
    async function loadDictionary() {
      try {
        // Fetch-ваме файла, който създаде със скрипта
        const response = await fetch('/dictionary.json');
        if (!response.ok) throw new Error("Failed to load dictionary");
        
        const data = await response.json();
        
        // Правим Set за мигновена проверка (O(1))
        setAllWords(new Set(data)); 
        setPossibleAnswers(data);   
        setDictionaryLoaded(true);
      } catch (error) {
        console.error("Dictionary error:", error);
        setMessage("Error loading word database.");
      }
    }
    loadDictionary();
  }, []);

  // 2. Инициализация на играта (чакаме user И речника)
  useEffect(() => {
    if (!user || !dictionaryLoaded) return;

    async function initGame() {
      try {
        const today = new Date().toDateString()
        
        // Проверка за streak
        const storedStreak = parseInt(localStorage.getItem(getStorageKey('_streak')) || 0)
        const lastWinDateStr = localStorage.getItem(getStorageKey('_lastWinDate'))
        let currentStreak = storedStreak
        
        if (lastWinDateStr && storedStreak > 0) {
            const lastWinDate = new Date(lastWinDateStr)
            const todayDate = new Date()
            const diffDays = Math.floor((todayDate - lastWinDate) / (1000 * 3600 * 24))

            if (diffDays > 1) { 
                currentStreak = 0
                localStorage.setItem(getStorageKey('_streak'), 0)
                api.post('/user/streak', { streak: 0 }).catch(e => console.error(e))
            }
        }

        // Избиране на дума (вече от пълния списък possibleAnswers)
        const dateStr = new Date().toISOString().slice(0, 10)
        let seed = 0
        for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i)
        
        const dailyIndex = (seed * 9301 + 49297) % possibleAnswers.length
        const targetWord = possibleAnswers[dailyIndex]

        // Проверка за запазена игра
        const savedData = localStorage.getItem(getStorageKey())
        const parsedData = savedData ? JSON.parse(savedData) : {}

        if (parsedData.date === today && parsedData.word === targetWord) {
          setWord(parsedData.word)
          setGuesses(parsedData.guesses || [])
          setWon(parsedData.won || false)
          setGameOver(parsedData.gameOver || false)
          setUsedLetters(new Set(parsedData.usedLetters || []))
          setStreak(currentStreak)
          setAttempts(5 - (parsedData.guesses || []).length)
          
          if(parsedData.gameOver) setMessage(`Game over! Word: ${parsedData.word}`)
          if(parsedData.won) setMessage("Already solved today!")
        } else {
            setWord(targetWord)
            setStreak(currentStreak) 
            setAttempts(5)
            setGuesses([])
            setWon(false)
            setGameOver(false)
            setUsedLetters(new Set())
            setMessage("")
        }
      } catch (e) {
        console.error("Error init game", e)
        setMessage("Error initializing game logic.")
      } finally {
        setLoadingGame(false)
      }
    }
    
    initGame()
  }, [user, dictionaryLoaded, possibleAnswers]);

  // Запазване на прогреса
  useEffect(() => {
    if (word && user && !loadingGame) {
      const today = new Date().toDateString()
      const gameData = { 
          date: today, 
          word, 
          guesses, 
          won, 
          gameOver, 
          usedLetters: Array.from(usedLetters), 
          streak 
      }
      localStorage.setItem(getStorageKey(), JSON.stringify(gameData))
    }
  }, [word, guesses, won, gameOver, usedLetters, streak, user, loadingGame])

  // Запазване на победата
  useEffect(() => {
      if (won && user) {
          localStorage.setItem(getStorageKey('_streak'), streak)
          localStorage.setItem(getStorageKey('_lastWinDate'), new Date().toDateString())
          
          api.post('/user/streak', { streak })
             .then(() => console.log('Streak synced'))
             .catch(err => console.error('Sync failed', err))
      }
  }, [won, streak, user])

  function handleKeyDown(e) {
    if (gameOver || loadingGame || !dictionaryLoaded) return
    const key = e.key.toUpperCase()

    if (key === "ENTER") {
      if (currentGuess.length !== 5) { setMessage("Word must be 5 letters"); return }
      
      // ТУК Е КЛЮЧЪТ: Проверяваме в огромния Set, не в малкия Array
      if (!allWords.has(currentGuess)) { setMessage("Not in word list"); return }

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
        localStorage.setItem(getStorageKey('_streak'), 0)
        api.post('/user/streak', { streak: 0 }).catch(console.error)
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

  function handleKeyClick(letter) { if (!gameOver && currentGuess.length < 5) setCurrentGuess(prev => prev + letter) }
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
  }, [currentGuess, gameOver, word, guesses, usedLetters, user, loadingGame, dictionaryLoaded])

  // Показваме лоудинг докато речникът се зареди
  if (loadingGame || !dictionaryLoaded) {
     return (
        <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: '10px' }}>Loading dictionary...</p>
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
            border: "2px solid var(--primary)", 
            padding: "10px 20px",
            borderRadius: "8px",
            color: "var(--primary)",
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