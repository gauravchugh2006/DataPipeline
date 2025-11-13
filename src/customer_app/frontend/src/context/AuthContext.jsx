import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiClient } from "../hooks/useProducts.js";

const AuthContext = createContext();

const STORAGE_KEY = "cafe-commerce-token";
const THEME_KEY = "cafe-theme";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "sunrise");

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const authorizedHeaders = useMemo(() => {
    if (!token) {
      return {};
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [token]);

  const applyProfile = useCallback(
    (nextProfile) => {
      if (nextProfile) {
        setProfile(nextProfile);
        if (nextProfile.theme) {
          setTheme(nextProfile.theme);
        }
      }
    },
    []
  );

  const clearSession = useCallback(() => {
    setProfile(null);
    setToken(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      return null;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get("/auth/me", authorizedHeaders);
      applyProfile(data.profile);
      return data.profile;
    } catch (error) {
      console.error("Unable to refresh profile", error);
      clearSession();
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, authorizedHeaders, applyProfile, clearSession]);

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [token, refreshProfile]);

  const setSession = useCallback(
    (nextToken, nextProfile) => {
      setToken(nextToken);
      if (nextProfile) {
        applyProfile(nextProfile);
      }
    },
    [applyProfile]
  );

  const personalizeTheme = useCallback(
    async (palette) => {
      setTheme(palette);
      if (!token) {
        return;
      }
      try {
        const { data } = await apiClient.put(
          "/auth/profile",
          { theme: palette },
          authorizedHeaders
        );
        applyProfile(data.profile);
      } catch (error) {
        console.error("Unable to persist theme", error);
      }
    },
    [token, authorizedHeaders, applyProfile]
  );

  const updateProfile = useCallback(
    async (updates) => {
      if (!token) {
        throw new Error("Not authenticated");
      }
      const { data } = await apiClient.put("/auth/profile", updates, authorizedHeaders);
      applyProfile(data.profile);
      return data.profile;
    },
    [token, authorizedHeaders, applyProfile]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      token,
      profile,
      theme,
      loading,
      setSession,
      refreshProfile,
      personalizeTheme,
      updateProfile,
      logout,
    }),
    [token, profile, theme, loading, personalizeTheme, updateProfile, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
