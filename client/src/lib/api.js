import axios from 'axios'

// Когато си на компютъра (localhost), ползва локалния сървър.
// Когато го качиш в Render, ще ползва URL-а от настройките.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true // Важно за бисквитките
})