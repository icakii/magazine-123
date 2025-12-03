// client/src/components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page"><p>Loading user...</p></div>;
  }

  if (!user) {
    // Ако не е логнат, пренасочваме към Login
    return <Navigate to="/login" replace />;
  }

  // Ако е логнат, показваме страницата
  return children;
}