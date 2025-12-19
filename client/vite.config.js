import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],

  // ✅ avoids "two Reacts" & weird null hook calls in prod
  resolve: {
    dedupe: ["react", "react-dom"],
  },

  // ✅ makes dev + build dependency scan stable
  optimizeDeps: {
    include: ["react", "react-dom"],
  },

  // ❌ IMPORTANT: do NOT externalize react/react-dom
  // build: {
  //   rollupOptions: { external: ["react", "react-dom"] }
  // }
})
