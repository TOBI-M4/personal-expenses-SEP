import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured);

  const refreshAuth = async () => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (!configured) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      const currentSession = await authService.getSession();
      setUser(currentUser);
      setSession(currentSession);
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const subscription = authService.onAuthStateChange((event, newUser, newSession) => {
      setUser(newUser);
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const res = await authService.signIn(email, password);
      setUser(res.user);
      setSession(res.session);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password) => {
    setLoading(true);
    try {
      const res = await authService.signUp(email, password);
      setUser(res.user);
      setSession(res.session);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    isConfigured,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signOut,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
