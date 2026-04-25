import { useEffect, useRef, useState } from "react"

/**
 * Subtle scroll-linked background layers (nav ↔ footer).
 * Respects prefers-reduced-motion.
 */
function isLowEndDevice() {
  try {
    const cores = navigator.hardwareConcurrency || 4
    const mem = navigator.deviceMemory || 4
    return cores <= 2 || mem <= 2
  } catch {
    return false
  }
}

export default function ScrollParallaxDecor() {
  const [disabled, setDisabled] = useState(false)
  const raf = useRef(0)
  const pending = useRef(false)

  useEffect(() => {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || isLowEndDevice()) {
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
    </div>
  )
}
