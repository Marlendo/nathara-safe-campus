import { createContext, useContext, useMemo, useState } from "react";
import api from "../../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("safepath_token") || null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("safepath_user") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      // Auth token only — report data is never written to browser storage.
      sessionStorage.setItem("safepath_token", data.token);
      sessionStorage.setItem("safepath_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("safepath_token");
    sessionStorage.removeItem("safepath_user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, login, logout, loading, isAuthenticated: Boolean(token) }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}