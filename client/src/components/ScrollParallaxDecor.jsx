import { useEffect, useRef, useState } from "react"

/**
 * Subtle scroll-linked background layers (nav ↔ footer).
 * Respects prefers-reduced-motion.
 */
export default function ScrollParallaxDecor() {
  const [disabled, setDisabled] = useState(false)
  const raf = useRef(0)
  const pending = useRef(false)

  useEffect(() => {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisabled(true)
        return
      }
    } catch {
      setDisabled(true)
      return
    }

    const root = document.documentElement

    const apply = () => {
      pending.current = false
      const y = window.scrollY || 0
      /* Opposite directions + different speeds = depth while scrolling */
      root.style.setProperty("--px-a", `${y * -0.052}px`)
      root.style.setProperty("--px-b", `${y * 0.078}px`)
      root.style.setProperty("--px-c", `${y * -0.031}px`)
      root.style.setProperty("--px-d", `${y * 0.055}px`)
      root.style.setProperty("--px-e", `${y * -0.018}deg`)
    }

    const onScroll = () => {
      if (pending.current) return
      pending.current = true
      raf.current = requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      cancelAnimationFrame(raf.current)
      ;["--px-a", "--px-b", "--px-c", "--px-d", "--px-e"].forEach((k) => root.style.removeProperty(k))
    }
  }, [])

  if (disabled) return null

  return (
    <div className="scroll-parallax" aria-hidden="true">
      <div className="scroll-parallax__wash scroll-parallax__wash--1" />
      <div className="scroll-parallax__wash scroll-parallax__wash--2" />
      <div className="scroll-parallax__wash scroll-parallax__wash--3" />
      <div className="scroll-parallax__lines" />
      <div className="scroll-parallax__mesh" />

      {/* Floating outlined clouds */}
      <svg className="sp-cloud sp-cloud--1" viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M 185 72 C 205 72 218 60 218 46 C 218 32 206 22 190 24 C 186 10 172 2 155 2 C 138 2 126 12 122 26 C 116 20 107 17 97 17 C 78 17 64 30 62 47 C 50 46 40 55 40 67 C 40 80 51 90 65 90 L 185 90 C 200 90 212 82 212 72 Z" fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <svg className="sp-cloud sp-cloud--2" viewBox="0 0 160 68" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M 135 55 C 150 55 160 46 160 35 C 160 24 150 16 138 18 C 134 7 122 0 108 0 C 94 0 84 8 80 19 C 75 14 67 11 58 11 C 43 11 31 22 30 35 C 20 35 12 43 12 53 C 12 62 20 68 30 68 L 135 68 C 148 68 158 62 158 55 Z" fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <svg className="sp-cloud sp-cloud--3" viewBox="0 0 180 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M 155 62 C 170 62 180 52 180 40 C 180 28 170 20 156 22 C 152 9 140 2 125 2 C 110 2 99 10 95 23 C 89 17 80 14 70 14 C 54 14 41 25 40 40 C 29 40 20 48 20 58 C 20 68 29 76 40 76 L 155 76 C 168 76 178 70 178 62 Z" fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <svg className="sp-cloud sp-cloud--4" viewBox="0 0 130 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M 108 46 C 120 46 130 38 130 28 C 130 18 121 12 110 14 C 107 5 97 0 85 0 C 73 0 64 7 61 17 C 56 13 49 10 41 10 C 29 10 19 19 18 30 C 10 30 3 37 3 45 C 3 53 10 58 18 58 L 108 58 C 120 58 128 53 128 46 Z" fill="none" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <svg className="sp-cloud sp-cloud--5" viewBox="0 0 100 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M 82 36 C 92 36 100 29 100 21 C 100 13 92 8 83 10 C 80 3 72 0 63 0 C 54 0 46 5 44 13 C 40 10 34 8 28 8 C 18 8 10 15 10 24 C 4 25 0 30 0 36 C 0 41 4 44 10 44 L 82 44 C 91 44 98 40 98 36 Z" fill="none" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  )
}
