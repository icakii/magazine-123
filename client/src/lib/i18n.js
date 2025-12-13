// src/lib/i18n.js
const defaultLang =
  (typeof window !== "undefined" && localStorage.getItem("lang")) || "bg"

let currentLang = defaultLang

export const dict = {
  bg: {
    brand: "MIREN",
    home_title: "Добре дошъл в MIREN",
    home_sub: "Тук ще откриеш сигурност, стил и функционалност.",
    start: "Започни",
    gallery: "Галерия",
    about: "За нас",
    contact: "Контакти",
    help: "Помощ",
    profile: "Профил",
    subscriptions: "Абонаменти",
    register: "Регистрация",
    login: "Вход",
    logout: "Изход",
    theme: "Тема",
    language: "Език",
    loading: "Зареждане...",
    footer_copy: "© 2025 MIREN. Всички права запазени.",

    // drawer/nav labels (за да не търсиш home/news/events keys)
    home: "Начало",
    news: "Новини",
    events: "Събития",
    games: "Игри",
    emag: "Е-списание",

    // home page labels
    read_news: "Прочети новини",
    featured: "Подбрани",

    // hero intro
    hero_kicker: "Най-новото издание",
    hero_subtitle: "Скролни надолу за пълния сайт",
    hero_scroll: "↓",
  },

  en: {
    brand: "MIREN",
    home_title: "Welcome to MIREN",
    home_sub: "Here you’ll find security, style and functionality.",
    start: "Get started",
    gallery: "Gallery",
    about: "About",
    contact: "Contacts",
    help: "Help",
    profile: "Profile",
    subscriptions: "Subscriptions",
    register: "Register",
    login: "Login",
    logout: "Logout",
    theme: "Theme",
    language: "Language",
    loading: "Loading...",
    footer_copy: "© 2025 MIREN. All rights reserved.",

    // drawer/nav labels
    home: "Home",
    news: "News",
    events: "Events",
    games: "Games",
    emag: "E-Magazine",

    // home page labels
    read_news: "Read News",
    featured: "Featured",

    // hero intro
    hero_kicker: "Latest issue",
    hero_subtitle: "Swipe down for the full site",
    hero_scroll: "↓",
  },
}

export function t(key) {
  const table = dict[currentLang] || dict.bg
  return table[key] || key
}

export function getLang() {
  return currentLang
}

export function setLang(next) {
  currentLang = next === "en" ? "en" : "bg"
  if (typeof window !== "undefined") {
    localStorage.setItem("lang", currentLang)
    window.dispatchEvent(
      new CustomEvent("lang:change", { detail: { lang: currentLang } })
    )
  }
}
