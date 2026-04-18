import { useEffect, useRef, useState } from "react"

const SLIDE_PALETTES = [
  { I: "#ef233c", O: "#c46a4a", Z: "#9c2a2a", L: "#e63946" },
  { I: "#ff4d6d", O: "#ef233c", Z: "#c9184a", L: "#ff6b81" },
  { I: "#5865f2", O: "#7289da", Z: "#4361ee", L: "#a855f7" },
  { I: "#2d6a4f", O: "#52b788", Z: "#1b4332", L: "#40916c" },
  { I: "#f77f00", O: "#e36414", Z: "#d62828", L: "#fb8500" },
]

const DARK_PALETTES = [
  { I: "#ff6b6b", O: "#ffa07a", Z: "#ff4757", L: "#ff6348" },
  { I: "#ff8fab", O: "#ff4d6d", Z: "#ff6b81", L: "#c9184a" },
  { I: "#818cf8", O: "#a5b4fc", Z: "#6366f1", L: "#c084fc" },
  { I: "#6ee7b7", O: "#34d399", Z: "#10b981", L: "#a7f3d0" },
  { I: "#fbbf24", O: "#f59e0b", Z: "#fb923c", L: "#fcd34d" },
]

const CLUSTERS = [
  { x: "3%",  type: "I", dur: 3.2, delay: 0 },
  { x: "9%",  type: "O", dur: 2.7, delay: -1.3 },
  { x: "17%", type: "Z", dur: 3.6, delay: -0.7 },
  { x: "24%", type: "L", dur: 2.4, delay: -2.1 },
  { x: "33%", type: "I", dur: 3.0, delay: -1.5 },
  { x: "43%", type: "O", dur: 2.8, delay: -0.4 },
  { x: "52%", type: "Z", dur: 3.4, delay: -1.8 },
  { x: "61%", type: "L", dur: 2.6, delay: -0.9 },
  { x: "70%", type: "I", dur: 3.1, delay: -2.3 },
  { x: "79%", type: "O", dur: 2.9, delay: -1.1 },
  { x: "87%", type: "Z", dur: 3.3, delay: -0.5 },
  { x: "94%", type: "L", dur: 2.5, delay: -1.7 },
]

const SQUARES = {
  I: [1, 2, 3, 4],
  O: [1, 2, 3, 4],
  Z: [1, 2, 3, 4],
  L: [1, 2, 3, 4],
}

export default function TetrisBackground() {
  const [scrolling, setScrolling] = useState(false)
  const [slideIdx, setSlideIdx] = useState(0)
  const [dark, setDark] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const checkTheme = () =>
      setDark(document.documentElement.getAttribute("data-theme") === "dark")
    checkTheme()
    const mo = new MutationObserver(checkTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const idx = Math.min(SLIDE_PALETTES.length - 1, Math.floor(window.scrollY / window.innerHeight))
      setSlideIdx(idx)
      setScrolling(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setScrolling(false), 700)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      clearTimeout(timerRef.current)
    }
  }, [])

  const palette = (dark ? DARK_PALETTES : SLIDE_PALETTES)[slideIdx] || SLIDE_PALETTES[0]

  return (
    <div className={`tetris-bg${scrolling ? " tetris-bg--active" : ""}`} aria-hidden="true">
      {CLUSTERS.map((c, i) => {
        const color = palette[c.type]
        return (
          <div
            key={i}
            className={`tb-cluster tb-cluster-${c.type.toLowerCase()}`}
            style={{
              left: c.x,
              color,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
              filter: `drop-shadow(0 0 5px ${color}66)`,
            }}
          >
            {SQUARES[c.type].map((_, j) => (
              <div key={j} className="tb-sq" />
            ))}
          </div>
        )
      })}
    </div>
  )
}
