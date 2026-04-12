import { useEffect } from "react"
import { useLocation } from "react-router-dom"

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

function collectRevealElements() {
  const list = []
  const main = document.querySelector("main.app-main")
  if (!main) return list

  const homeMain = document.getElementById("home-main-content")
  if (homeMain) {
    for (const el of homeMain.children) {
      list.push(el)
    }
  } else {
    main.querySelectorAll("section:not(.hero-intro)").forEach((el) => {
      if (!el.closest(".hero-intro")) list.push(el)
    })

    main.querySelectorAll(".page").forEach((page) => {
      if (page.id === "home-main-content") return
      const direct = page.querySelectorAll(":scope > *")
      if (direct.length === 0) {
        list.push(page)
        return
      }
      direct.forEach((el) => list.push(el))
    })
  }

  return [...new Set(list)]
}

export default function ScrollReveal() {
  const location = useLocation()

  useEffect(() => {
    if (prefersReducedMotion()) return

    const nodes = collectRevealElements().filter((el) => {
      if (!el || el.closest(".hero-intro")) return false
      if (el.closest(".modal-backdrop")) return false
      return true
    })

    nodes.forEach((el, i) => {
      el.classList.add("scroll-reveal-target")
      el.style.setProperty("--sr-i", String(i))
    })

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target
          if (entry.isIntersecting) {
            el.classList.add("scroll-reveal-visible")
          } else {
            el.classList.remove("scroll-reveal-visible")
          }
        }
      },
      { root: null, rootMargin: "0px 0px -6% 0px", threshold: [0, 0.08, 0.15] }
    )

    nodes.forEach((el) => {
      io.observe(el)
    })

    return () => {
      io.disconnect()
      nodes.forEach((el) => {
        el.classList.remove("scroll-reveal-target", "scroll-reveal-visible")
        el.style.removeProperty("--sr-i")
      })
    }
  }, [location.pathname, location.search])

  return null
}
