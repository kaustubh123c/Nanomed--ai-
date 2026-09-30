import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("nanomed_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        setToken(null);
        localStorage.removeItem("nanomed_token");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("nanomed_token", res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post("/auth/google", { credential });
    localStorage.setItem("nanomed_token", res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    localStorage.setItem("nanomed_token", res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("nanomed_token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await api.get("/auth/me");
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{ token, user, loading, login, loginWithGoogle, register, logout, refreshUser, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
