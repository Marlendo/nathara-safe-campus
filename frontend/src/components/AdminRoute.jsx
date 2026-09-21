import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

/**
 * Guards admin-only routes. Responders (non-admins) are sent back to the
 * dashboard overview.
 */
export default function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/dashboard/login" replace state={{ from: location }} />;
  }
  if (user?.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}