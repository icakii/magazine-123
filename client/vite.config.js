import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  base: "/", // ✅ IMPORTANT: абсолютен base за Render (deep routes като /store)
})
