import { useState, useEffect } from "react"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api" // Импортираме API за проверка на абонамента

// Примерни стари игри
const ARCHIVE_GAMES = [
    { id: 1, date: "2023-10-01", word: "APPLE" },
    { id: 2, date: "2023-10-02", word: "GHOST" },
    { id: 3, date: "2023-10-03", word: "SMILE" },
    { id: 4, date: "2023-10-04", word: "BEACH" },
    { id: 5, date: "2023-10-05", word: "PIZZA" },
]

// --- КОМПОНЕНТ ЗА ИГРАТА (Вътрешен) ---
function ArchiveGameBoard({ gameData, onBack }) {
    const targetWord = gameData.word
    const [guesses, setGuesses] = useState([])
    const [currentGuess, setCurrentGuess] = useState("")
    const [gameOver, setGameOver] = useState(false)
    const [won, setWon] = useState(false)
    const [message, setMessage] = useState("")
    const [attempts, setAttempts] = useState(5)

    function getLetterColor(letter, index) {
        if (!targetWord) return "#4a4a4a"
        if (letter === targetWord[index]) return "#16a34a"
        if (targetWord.includes(letter)) return "#ca8a04"
        return "#4a4a4a"
    }

    function getKeyboardButtonStyle(letter) {
        const allGuessed = guesses.join("")
        if (allGuessed.includes(letter)) {
             if (targetWord.includes(letter)) return "#a0a0a0"
             return "#4a4a4a"
        }
        return "#d3d3d3"
    }

    function handleKeyDown(e) {
        if (gameOver) return
        const key = e.key.toUpperCase()

        if (key === "ENTER") {
            if (currentGuess.length !== 5) { setMessage("Думата трябва да е 5 букви"); return }
            
            const newGuesses = [...guesses, currentGuess]
            setGuesses(newGuesses)
            setAttempts(5 - newGuesses.length)

            if (currentGuess === targetWord) {
                setWon(true)
                setGameOver(true)
                setMessage("🎉 Победа! (Архивен режим)")
                return
            }

            if (newGuesses.length >= 5) {
                setGameOver(true)
                setMessage(`Край на играта! Думата беше: ${targetWord}`)
                return
            }

            setCurrentGuess("")
            setMessage("")
        } else if (key === "BACKSPACE") {
            setCurrentGuess(prev => prev.slice(0, -1))
            setMessage("")
        } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
            setCurrentGuess(prev => prev + key)
        }
    }

    function handleKeyClick(letter) {
        if (!gameOver && currentGuess.length < 5) setCurrentGuess(prev => prev + letter)
    }
    function handleBackspace() { if(!gameOver) setCurrentGuess(prev => prev.slice(0, -1)); setMessage("") }
    function handleSubmit() { if(!gameOver) handleKeyDown({ key: "Enter" }) }

    useEffect(() => {
        const listener = (e) => handleKeyDown(e)
        window.addEventListener("keydown", listener)
        return () => window.removeEventListener("keydown", listener)
    }, [currentGuess, gameOver, guesses])

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <h3 style={{marginBottom: 10}}>Playing: {gameData.date}</h3>
            <p className="subhead">Оставащи опити: {attempts}</p>

            {/* МРЕЖА С БУКВИ */}
            <div style={{ display: "grid", gap: 5, margin: "20px 0" }}>
                {guesses.map((guess, rowIdx) => (
                    <div key={rowIdx} style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                        {guess.split("").map((letter, colIdx) => (
                            <div key={colIdx} style={{ width: 50, height: 50, display: "grid", placeItems: "center", background: getLetterColor(letter, colIdx), color: "white", fontWeight: 700, borderRadius: 4, fontSize: "1.4rem" }}>{letter}</div>
                        ))}
                    </div>
                ))}
                {!gameOver && (
                    <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} style={{ width: 50, height: 50, display: "grid", placeItems: "center", background: idx < currentGuess.length ? "#e63946" : "#f0f0f0", color: idx < currentGuess.length ? "white" : "black", fontWeight: 700, borderRadius: 4, border: "2px solid #ccc", fontSize: "1.4rem" }}>{currentGuess[idx] || ""}</div>
                        ))}
                    </div>
                )}
                {!gameOver && guesses.length < 4 && Array.from({ length: 4 - guesses.length }).map((_, r) => (
                     <div key={`empty-${r}`} style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                        {Array.from({ length: 5 }).map((_, c) => (
                            <div key={c} style={{ width: 50, height: 50, border: "2px solid #eee", borderRadius: 4 }}></div>
                        ))}
                     </div>
                ))}
            </div>

            {/* КЛАВИАТУРА */}
            {!gameOver && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginTop: 10, maxWidth: 500 }}>
                    {[["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"], ["A", "S", "D", "F", "G", "H", "J", "K", "L"], ["Z", "X", "C", "V", "B", "N", "M"]].map((row, rowIdx) => (
                        <div key={rowIdx} style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            {rowIdx === 2 && <button onClick={handleBackspace} style={{ padding: "10px 15px", borderRadius: 6, border: "none", background: "#999", color: "white", fontWeight: 600, cursor: "pointer" }}>←</button>}
                            {row.map((letter) => (
                                <button key={letter} onClick={() => handleKeyClick(letter)} style={{ width: 35, height: 45, borderRadius: 6, border: "none", background: getKeyboardButtonStyle(letter), color: "black", fontWeight: 600, cursor: "pointer" }}>{letter}</button>
                            ))}
                            {rowIdx === 2 && <button onClick={handleSubmit} style={{ padding: "10px 15px", borderRadius: 6, border: "none", background: "#e63946", color: "white", fontWeight: 600, cursor: "pointer" }}>↵</button>}
                        </div>
                    ))}
                </div>
            )}

            {message && <p style={{ marginTop: 20, fontSize: "1.2rem", fontWeight: "bold", color: won ? "green" : "red" }}>{message}</p>}

            <button onClick={onBack} className="btn ghost" style={{ marginTop: 30, padding: "10px 30px", border: "1px solid #ccc", background: "white", cursor: "pointer", borderRadius: 4 }}>Обратно към списъка</button>
        </div>
    )
}

// --- ОСНОВЕН КОМПОНЕНТ ---
export default function WordGameArchive() {
    const { user } = useAuth()
    const [selectedGame, setSelectedGame] = useState(null)
    const [isPremium, setIsPremium] = useState(false)
    const [loading, setLoading] = useState(true)
    const [detectedPlan, setDetectedPlan] = useState("Checking...")

    useEffect(() => {
        // 1. Проверяваме локалния user обект
        const localPlan = user?.subscription?.toLowerCase() || ""
        let hasPremiumAccess = localPlan === 'monthly' || localPlan === 'yearly'
        
        if (hasPremiumAccess) {
            setIsPremium(true)
            setDetectedPlan(user.subscription)
            setLoading(false)
            return // Ако локално е премиум, няма нужда да чакаме API
        }

        // 2. Ако локално е "free", питаме сървъра за по-актуално инфо
        if (user) {
            api.get('/subscriptions')
                .then(res => {
                    const subs = res.data || []
                    // Взимаме последния (или първия) активен абонамент
                    const activeSub = subs.find(s => s.plan) || subs[0]
                    const serverPlan = activeSub?.plan?.toLowerCase() || "free"
                    
                    if (serverPlan === 'monthly' || serverPlan === 'yearly') {
                        setIsPremium(true)
                        setDetectedPlan(activeSub.plan)
                    } else {
                        setIsPremium(false)
                        setDetectedPlan(serverPlan)
                    }
                })
                .catch(err => {
                    console.error(err)
                    setIsPremium(false)
                    setDetectedPlan("Error / Free")
                })
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [user])

    if (loading) {
        return <div className="page" style={{textAlign:'center', marginTop: 50}}>Checking subscription...</div>
    }

    // 3. ЗАКЛЮЧЕН ЕКРАН (Ако наистина няма премиум)
    if (!isPremium) {
        return (
            <div className="page" style={{ textAlign: "center", padding: "50px 20px" }}>
                <h1 className="headline">🔒 Word Game Archive</h1>
                <div style={{ maxWidth: "500px", margin: "0 auto", padding: "30px", border: "1px solid #eee", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
                    <p style={{ fontSize: "1.1rem", color: "#555", marginBottom: "20px" }}>
                        Тази функция е достъпна само за <strong>Premium Абонати</strong>.
                    </p>
                    <p style={{marginBottom: "20px", color: "#888"}}>
                        Текущ план: <strong>{detectedPlan}</strong>
                    </p>
                    <a href="/subscriptions" className="btn primary" style={{ textDecoration: "none", display: "inline-block", padding: "10px 20px", background: "#e63946", color: "white", borderRadius: 5 }}>
                        Upgrade to Premium
                    </a>
                </div>
            </div>
        )
    }

    // 4. ОТКЛЮЧЕН ЕКРАН
    return (
        <div className="page" style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h1 className="headline" style={{ textAlign: "center", marginBottom: "30px" }}>🗄️ Word Game Archive</h1>
            
            {!selectedGame ? (
                // СПИСЪК С ИГРИ
                <div className="stack">
                    {ARCHIVE_GAMES.map(game => (
                        <div key={game.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", marginBottom: "10px", border: "1px solid #eee", borderRadius: 8 }}>
                            <div>
                                <strong>{game.date}</strong> <span style={{ color: "#888", marginLeft: "10px" }}>Game #{game.id}</span>
                            </div>
                            <button onClick={() => setSelectedGame(game)} className="btn outline" style={{border:"1px solid #e63946", color:"#e63946", background:"white", padding:"5px 15px", borderRadius: 4, cursor:"pointer"}}>Play</button>
                        </div>
                    ))}
                </div>
            ) : (
                // ЕКРАН ЗА ИГРА
                <div className="card" style={{ padding: "20px", borderRadius: 8, border: "1px solid #eee", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <ArchiveGameBoard gameData={selectedGame} onBack={() => setSelectedGame(null)} />
                </div>
            )}
        </div>
    )
}   