// src/lib/i18n.js

const STORAGE_KEY = "lang"

const defaultLang =
  (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) || "bg"

let currentLang = defaultLang === "en" ? "en" : "bg"

export const dict = {
  bg: {
    brand: "MIREN",

    home_title: "Добре дошъл в MIREN",
    home_sub: "Тук ще откриеш сигурност, стил и функционалност.",
    start: "Започни",
    read_news: "Прочети новини",
    featured: "Подбрани",

    // Drawer / Nav
    home: "Начало",
    news: "Новини",
    events: "Събития",
    gallery: "Галерия",
    games: "Игри",
    emag: "Е-списание", // важно: кирилица

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

    // Newsletter
    newsletter_title: "📩 Абонирай се за новини!",
    newsletter_text:
      "Бъди запознат с най-новото в света на Мирен. Получавай известия за нови статии и събития.",
    newsletter_placeholder: "Твоят имейл",
    newsletter_btn: "Абонирай се",
    newsletter_success: "Успешно се абонира! ✅",

    // Hero Intro
    hero_kicker: "Ново издание",
    hero_subtitle: "Плъзни надолу, за да влезеш в сайта",
    hero_scroll_label: "Плъзни надолу",
  },

  en: {
    brand: "MIREN",

    home_title: "Welcome to MIREN",
    home_sub: "Here you’ll find security, style and functionality.",
    start: "Get started",
    read_news: "Read News",
    featured: "Featured",

    // Drawer / Nav
    home: "Home",
    news: "News",
    events: "Events",
    gallery: "Gallery",
    games: "Games",
    emag: "E-Magazine",

    about: "About",
    contact: "Contact",
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

    // Newsletter
    newsletter_title: "📩 Subscribe to news!",
    newsletter_text:
      "Stay up to date with the latest from MIREN. Get notified about new articles and events.",
    newsletter_placeholder: "Your best email",
    newsletter_btn: "Subscribe",
    newsletter_success: "Successfully subscribed! ✅",

    // Hero Intro
    hero_kicker: "New issue",
    hero_subtitle: "Swipe down to enter the full site",
    hero_scroll_label: "Swipe down",
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
    localStorage.setItem(STORAGE_KEY, currentLang)
    window.dispatchEvent(
      new CustomEvent("lang:change", { detail: { lang: currentLang } })
    )
  }
}

// ако някъде още ползваш това – оставям го
export function tWithLang(lang, key) {
  const table = dict[lang] || dict.bg
  return table[key] || key
}
