import axios from 'axios'

// KOGATO E LOCALHOST: polzva http://localhost:8080/api
// KOGATO E V RENDER: polzva URL-a, koito shte zadadem v nastroikite (Environment Variables)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true // Mnogo vajno za biskvitkite (cookies)
})