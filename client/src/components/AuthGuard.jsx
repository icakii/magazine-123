import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()

  if (loading) return null // или spinner

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

  return children
}
