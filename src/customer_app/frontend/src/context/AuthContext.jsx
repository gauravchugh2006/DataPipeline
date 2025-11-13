import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import jwtDecode from "jwt-decode";

const AuthContext = createContext();

const STORAGE_KEY = "cafe-commerce-token";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [theme, setTheme] = useState(() => localStorage.getItem("cafe-theme") || "sunrise");

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem("cafe-theme", theme);
  }, [theme]);

  const value = useMemo(() => {
    let user = null;
    if (token) {
      try {
        user = jwtDecode(token);
      } catch (error) {
        console.warn("Invalid token", error);
        setToken(null);
      }
    }

    const personalizeTheme = (palette) => {
      setTheme(palette);
      document.body.dataset.theme = palette;
    };

    return {
      token,
      setToken,
      user,
      theme,
      personalizeTheme,
      logout: () => setToken(null),
    };
  }, [token, theme]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
