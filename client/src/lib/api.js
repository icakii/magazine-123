import axios from 'axios'

// Adresut na survura. Kogato e v Render, shte polzva env promenlivata.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true // Pozvolyava izprashtaneto na cookies
})