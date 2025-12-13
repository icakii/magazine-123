"use client"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("lang") || "bg")

  useEffect(() => {
    localStorage.setItem("lang", lang)
  }, [lang])

  const value = useMemo(() => ({
    lang,
    setLang: (next) => setLangState(next === "en" ? "en" : "bg"),
    toggleLang: () => setLangState((l) => (l === "bg" ? "en" : "bg")),
  }), [lang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>")
  return ctx
}
