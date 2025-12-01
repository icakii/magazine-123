// src/lib/i18n.js
const defaultLang = (typeof window !== 'undefined' && localStorage.getItem('lang')) || 'bg'

let currentLang = defaultLang

const dict = {
  bg: {
    brand: 'MIREN',
    home_title: 'Добре дошъл в MIREN',
    home_sub: 'Тук ще откриеш сигурност, стил и функционалност.',
    start: 'Започни',
    gallery: 'Галерия',
    about: 'За нас',
    contact: 'Контакти',
    help: 'Помощ',
    profile: 'Профил',
    subscriptions: 'Абонаменти',
    register: 'Регистрация',
    login: 'Вход',
    logout: 'Изход',
    theme: 'Тема',
    language: 'Език',
    confirm_email_title: 'Потвърждение на имейл',
    confirm_email_progress: 'Потвърждаваме...',
    email: 'Имейл',
    password: 'Парола',
    displayName: 'Потребителско име',
    create_account: 'Създай акаунт',
    not_logged_in: 'Не си влязъл.',
    go_login: 'Влез',
    loading: 'Зареждане...',
    footer_copy: '© 2025 MIREN. Всички права запазени.',
  },
  en: {
    brand: 'MIREN',
    home_title: 'Welcome to MIREN',
    home_sub: 'Here you’ll find security, style and functionality.',
    start: 'Get started',
    gallery: 'Gallery',
    about: 'About',
    contact: 'Contacts',
    help: 'Help',
    profile: 'Profile',
    subscriptions: 'Subscriptions',
    register: 'Register',
    login: 'Login',
    logout: 'Logout',
    theme: 'Theme',
    language: 'Language',
    confirm_email_title: 'Email confirmation',
    confirm_email_progress: 'Confirming...',
    email: 'Email',
    password: 'Password',
    displayName: 'Display name',
    create_account: 'Create account',
    not_logged_in: 'You are not logged in.',
    go_login: 'Login',
    loading: 'Loading...',
    footer_copy: '© 2025 MIREN. All rights reserved.',
  }
}

export function t(key) {
  const table = dict[currentLang] || dict.bg
  return table[key] || key
}

export function getLang() {
  return currentLang
}

export function setLang(next) {
  currentLang = next === 'en' ? 'en' : 'bg'
  if (typeof window !== 'undefined') {
    localStorage.setItem('lang', currentLang)
    // trigger rerender by dispatching event
    window.dispatchEvent(new CustomEvent('lang:change', { detail: { lang: currentLang } }))
  }
}
