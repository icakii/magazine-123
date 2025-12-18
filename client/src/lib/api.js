// client/src/lib/api.js
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

import axios from "axios"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

// --- FIX ЗА SAFARI / MOBILE ---
api.interceptors.request.use((config) => {
  // Проверяваме дали имаме токен в LocalStorage
  const token = localStorage.getItem('auth_token')
  
  // Ако има, го добавяме към хедърите на заявката
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})