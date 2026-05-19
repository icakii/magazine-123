"use client"

import { useState, useEffect, useRef } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import Loader from "../components/Loader"

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

  // Curated list of common, well-known 5-letter words used as daily answers
  const EASY_WORDS = [
    "ABOUT","ABOVE","ABUSE","ACTOR","ACUTE","ADMIT","ADOPT","ADULT","AFTER","AGAIN",
    "AGENT","AGREE","AHEAD","ALARM","ALBUM","ALERT","ALIVE","ALLOW","ALONE","ALONG",
    "ALPHA","ALTER","ANGEL","ANGER","ANGLE","ANGRY","ANKLE","APART","APPLE","APPLY",
    "ARENA","ARGUE","ARISE","ARROW","ASIDE","ATLAS","AUDIO","AVOID","AWAKE","AWARD",
    "AWARE","AWFUL","BAKER","BASIC","BASIN","BATCH","BEACH","BEARD","BEAST","BEGAN",
    "BEGIN","BEING","BELLY","BELOW","BENCH","BLACK","BLADE","BLAME","BLANK","BLAST",
    "BLAZE","BLEED","BLEND","BLESS","BLIND","BLOCK","BLOOD","BLOWN","BOARD","BONUS",
    "BOOTH","BOUND","BOXER","BRAIN","BRAND","BRAVE","BREAD","BREAK","BREED","BRIDE",
    "BRIEF","BRING","BROKE","BROOK","BRUSH","BUDDY","BUILD","BUILT","BURST","BUYER",
    "CABIN","CABLE","CANDY","CARRY","CATCH","CAUSE","CHAIN","CHAIR","CHAOS","CHARM",
    "CHART","CHASE","CHEAP","CHECK","CHEEK","CHEER","CHEST","CHIEF","CHILD","CHOIR",
    "CLAIM","CLASH","CLASS","CLEAN","CLEAR","CLERK","CLICK","CLIFF","CLIMB","CLING",
    "CLOCK","CLOSE","CLOUD","COACH","COAST","COLOR","COUNT","COURT","COVER","CRACK",
    "CRAFT","CRANE","CRASH","CRAZY","CREAM","CREEK","CRISP","CROSS","CROWD","CROWN",
    "CRUEL","CRUSH","CURVE","CYCLE","DAILY","DANCE","DEATH","DEBUT","DELAY","DELTA",
    "DEMON","DENSE","DEPOT","DEPTH","DIRTY","DISCO","DODGE","DOUBT","DOUGH","DRAFT",
    "DRAIN","DRAMA","DRAWN","DREAM","DRESS","DRIED","DRIFT","DRINK","DRIVE","DROVE",
    "DRUMS","EAGLE","EARLY","EARTH","EIGHT","ELITE","EMPTY","ENEMY","ENJOY","ENTER",
    "EQUAL","ERROR","ESSAY","EVENT","EVERY","EXACT","EXCEL","EXTRA","FAINT","FAITH",
    "FALSE","FANCY","FATAL","FAULT","FEAST","FETCH","FEVER","FIELD","FIFTH","FIFTY",
    "FIGHT","FINAL","FIRST","FIXED","FLAME","FLASH","FLASK","FLEET","FLESH","FLOAT",
    "FLOUR","FLUID","FLUSH","FLUTE","FOCUS","FORCE","FORGE","FORTH","FORUM","FOUND",
    "FRAME","FRANK","FRESH","FRONT","FROST","FROZE","FRUIT","FUNNY","GIVEN","GLASS",
    "GLOBE","GLORY","GLOSS","GLOVE","GOING","GRACE","GRADE","GRAIN","GRAND","GRANT",
    "GRAPE","GRASP","GREET","GRIEF","GRIND","GROAN","GROSS","GROUP","GROVE","GROWN",
    "GUARD","GUESS","GUEST","GUIDE","HABIT","HAPPY","HARSH","HASTE","HAUNT","HEART",
    "HEAVY","HEDGE","HENCE","HONEY","HONOR","HORSE","HOTEL","HOUSE","HUMAN","HUMOR",
    "HURRY","IDEAL","IMAGE","IMPLY","INNER","INPUT","IVORY","JEWEL","JOKER","JOINT",
    "JUDGE","JUICE","JUICY","JUMPY","KNIFE","KNOCK","KNOWN","LABEL","LANCE","LARGE",
    "LASER","LATER","LAUGH","LAYER","LEARN","LEASE","LEGAL","LEMON","LEVEL","LIGHT",
    "LIMIT","LINEN","LIVER","LOCAL","LODGE","LOGIC","LOOSE","LOVER","LOWER","LUCKY",
    "LUNCH","MAGIC","MAJOR","MAKER","MANOR","MAPLE","MARCH","MARRY","MATCH","MAYOR",
    "MEDIA","MERCY","MERIT","METAL","MIGHT","MINOR","MINUS","MIXED","MODEL","MONEY",
    "MONTH","MORAL","MOTOR","MOTTO","MOUNT","MOUSE","MOUTH","MOVIE","MUSIC","NAIVE",
    "NERVE","NEVER","NIGHT","NOBLE","NOISE","NORTH","NOTED","NURSE","OCEAN","OFTEN",
    "ONSET","OPERA","ORBIT","ORDER","OTHER","OUTER","PAINT","PATIO","PEACE","PEACH",
    "PEARL","PENNY","PHASE","PHONE","PILOT","PINCH","PIXEL","PIZZA","PLAIN","PLANE",
    "PLANT","PLATE","PLAZA","POINT","POLAR","POKER","POWER","PRICE","PRIDE","PRIME",
    "PRINT","PROSE","PROVE","PROUD","PULSE","PUNCH","QUEEN","QUICK","QUIET","QUILT",
    "QUOTA","QUOTE","RADIO","RAISE","RANGE","RAPID","RATIO","REACH","READY","REALM",
    "REBEL","REFER","RELAY","RIDER","RIGHT","RIGID","RISEN","RISKY","ROBOT","ROCKY",
    "ROUGH","ROUND","ROUTE","ROYAL","RULER","SADLY","SAINT","SALAD","SAUCE","SCALE",
    "SCENE","SCORE","SCOUT","SENSE","SERUM","SEVEN","SHADE","SHAFT","SHAKE","SHALL",
    "SHAME","SHAPE","SHARE","SHARP","SHELF","SHIFT","SHINE","SHIRT","SHORT","SHOUT",
    "SIGHT","SINCE","SIXTH","SIXTY","SKILL","SLEEP","SLIDE","SLOPE","SMART","SMASH",
    "SMELL","SMILE","SMOKE","SNAKE","SOLAR","SOLID","SOLVE","SORRY","SOUTH","SPACE",
    "SPARK","SPEAK","SPEED","SPELL","SPEND","SPINE","SPORT","STAGE","STAKE","STAND",
    "START","STATE","STEAM","STEEL","STEEP","STEER","STICK","STIFF","STILL","STOCK",
    "STONE","STORM","STORY","STOVE","STRAP","STRAW","STYLE","SUGAR","SUITE","SUNNY",
    "SUPER","SURGE","SWEET","SWEPT","SWIFT","SWING","SWORD","TABLE","TASTE","TEACH",
    "TEETH","THANK","THEME","THICK","THING","THINK","THIRD","THORN","THOSE","THREE",
    "THROW","TIGER","TIGHT","TIRED","TITLE","TODAY","TOKEN","TORCH","TOTAL","TOUCH",
    "TOUGH","TOWER","TOXIC","TRACE","TRACK","TRADE","TRAIL","TRAIN","TREAT","TREND",
    "TRIAL","TRIBE","TRICK","TRIED","TRUCK","TRUNK","TRUTH","TWICE","TWIST","ULTRA",
    "UNDER","UNION","UNITY","UNTIL","UPPER","UPSET","USUAL","UTTER","VALID","VALUE",
    "VAULT","VERSE","VIDEO","VIRAL","VISIT","VITAL","VIVID","VOICE","WATCH","WATER",
    "WEARY","WEDGE","WEIRD","WHALE","WHEEL","WHILE","WHITE","WHOLE","WITTY","WOMAN",
    "WORLD","WORTH","WRATH","WRITE","WRONG","YACHT","YIELD","YOUNG","YOURS","ZIPPY",
    "BLOOM","BROOM","BROTH","CHUNK","CLOWN","CRUST","DAISY","DELVE",
    "DIVER","DUSTY","DWELL","ELBOW","ENDOW","FERRY","FLAIR","FLANK",
    "FLOCK","FROWN","GLARE","GLEAM","GLINT","GLOAT","GLOOM",
    "GREED","GRILL","GRIPE","GROWL","GRUFF","GUAVA","GULCH",
    "INLET","INSET","INTER","INTRO","ISLET","JELLY","JERKY","JOLLY","JOUST",
    "KARMA","KAYAK","KNACK","KNEEL","KNELT","LATCH","LATTE","LEAFY","LEAPT",
    "LILAC","LINER","LITHE","LOFTY","LORRY","LOTUS","LOWLY","LUSTY","LYRIC",
    "MANLY","MARSH","MATTE","MESSY","MIDST","MIRTH","MISTY","MOODY","MURKY","MUSTY",
    "NIFTY","NOOKS","NYMPH","OAKEN","OASIS","OWING","OXIDE","OZONE","PADDY","PALMS",

    "PANSY","PERKY","PERCH","PICKY","PINEY","PLAID","PLUMP","PLUSH","POLKA","POPPY",
    "POUTY","PREEN","PRIMP","PRISM","PRUDE","PRUNE","PSALM","PUFFY","PYGMY","QUIRK",
    "RAINY","RALLY","REGAL","REMIT","REPAY","RESIN","RIVET","ROBIN","RODEO","ROUGE",
    "ROWDY","RUGBY","RUSTY","SALVE","SANDY","SASSY","SAVVY","SCONE","SCOOP","SCOPE",

    "SCRUB","SEEDY","SEVER","SHADY","SHAWL","SHEEN","SHEIK","SLANG","SLANT",
    "SLAPS","SLASH","SLEEK","SLEET","SLICK","SLIMY","SLING","SLINK","SLOTH","SLUMP",
    "SLUNG","SLUNK","SMEAR","SMOCK","SNACK","SNAIL","SNAKY","SNARE","SNEAK","SNIFF",
    "SNORE","SNORT","SNOWY","SOAPY","SOGGY","SOUPY","SPADE","SPANK","SPARE","SPAWN",
    "SPEAR","SPECK","SPICY","SPILL","SPIRE","SPUNK","SQUAT","SQUAW","SQUID","STACK",
    "STAIN","STALE","STALL","STAMP","STASH","STAVE","STEAD","STEAL","STEAK",
    "STERN","STOMP","STOOL","STOOP","STORE","STOUT","STRAY","STRIP","STRUT",
  ]

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
        // Use easy curated words as possible answers, full dictionary for guess validation
        setPossibleAnswers(EASY_WORDS)
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
            .catch((err) => {
              if (err?.response?.status === 409) {
                setStreak(0)
                localStorage.setItem(getStorageKey("_streak"), "0")
                const lockedLoss = err?.response?.data?.lockedAfterLoss
                setMessage(
                  lockedLoss
                    ? "Today's result is already recorded (loss). Streak stays at 0."
                    : "Solved, but today's streak is locked after an earlier failed run."
                )
              }
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
          <Loader />
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

<div style={{ display: "grid", gap: 8, margin: "24px 0", width: "100%", maxWidth: "min(100%, 360px)" }}>        {guesses.map((guess, rowIdx) => (
           <div key={rowIdx} style={{ display: "flex", gap: "clamp(4px, 1.6vw, 8px)", justifyContent: "center" }}>
            {guess.split("").map((letter, colIdx) => (
              <div
                key={colIdx}
                style={{
                                    width: "clamp(48px, 14vw, 60px)",
                  height: "clamp(48px, 14vw, 60px)",
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
         <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginTop: 24, width: "100%", maxWidth: "min(100%, 560px)" }}>
          {[["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"], ["A", "S", "D", "F", "G", "H", "J", "K", "L"], ["Z", "X", "C", "V", "B", "N", "M"]].map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: "flex", gap: "clamp(3px, 1.2vw, 6px)", justifyContent: "center", width: "100%" }}>
              {rowIdx === 2 && (
                <button
                  onClick={handleBackspace}
                  style={{ width: "clamp(34px, 12vw, 52px)", height: "clamp(36px, 11vw, 44px)", borderRadius: 6, border: "none", background: "#999", color: "white", fontWeight: 700, cursor: "pointer", flex: "0 0 auto" }}
                >
                  ←
                </button>
              )}

              {row.map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleKeyClick(letter)}
                  style={{
                    width: "clamp(24px, 7.2vw, 38px)",
                    height: "clamp(36px, 10vw, 42px)",
                    borderRadius: 6,
                    border: "none",
                    background: getKeyboardButtonStyle(letter),
                    color: usedLetters.has(letter) ? "white" : "black",
                    fontWeight: 600,
                    cursor: "pointer",
                    flex: "1 1 0",
                    minWidth: 0,
                  }}
                >
                  {letter}
                </button>
              ))}

              {rowIdx === 2 && (
                <button
                  onClick={handleSubmit}
 style={{ width: "clamp(34px, 12vw, 52px)", height: "clamp(36px, 11vw, 44px)", borderRadius: 6, border: "none", background: "var(--oxide-red)", color: "white", fontWeight: 700, cursor: "pointer", flex: "0 0 auto" }}                >
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
