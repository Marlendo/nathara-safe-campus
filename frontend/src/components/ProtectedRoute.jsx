import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

/**
 * Guards dashboard routes — unauthenticated visitors are sent to the login page.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/dashboard/login" replace state={{ from: location }} />;
  }
  return children;
}