import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { getCurrentSession, onAuthStateChange } from '../services/authService';

const AuthContext = createContext(null);

const hasOAuthParamsInUrl = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.has('code') ||
    params.has('access_token') ||
    params.has('refresh_token') ||
    params.has('provider_token') ||
    params.has('provider_refresh_token')
  );
};

const extractRole = (user) =>
  user?.app_metadata?.role || user?.user_metadata?.role || 'user';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let authEventHandled = false;

    const { data } = onAuthStateChange((_event, nextSession) => {
      if (!mountedRef.current) return;
      authEventHandled = true;
      setSession(nextSession ?? null);
      setLoading(false);
    });

    const loadSession = async () => {
      const { data: initialData } = await getCurrentSession();
      if (!mountedRef.current) return;

      if (initialData?.session) {
        setSession(initialData.session);
        setLoading(false);
        return;
      }

      if (hasOAuthParamsInUrl()) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          if (!mountedRef.current || authEventHandled) return;
          await new Promise((resolve) => setTimeout(resolve, 180));
          const { data: retryData } = await getCurrentSession();
          if (!mountedRef.current) return;
          if (retryData?.session) {
            setSession(retryData.session);
            setLoading(false);
            return;
          }
        }
      }

      if (!authEventHandled) {
        setSession(null);
        setLoading(false);
      }
    };

    loadSession();

    return () => {
      mountedRef.current = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    const user = data?.user ?? null;
    setSession((prev) => (prev ? { ...prev, user } : prev));
    return user;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) setSession(null);
    return { error };
  }, []);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const role = extractRole(user);
    return {
      session,
      user,
      role,
      token: session?.access_token ?? null,
      isAdmin: role === 'admin',
      isAuthenticated: Boolean(session),
      loading,
      refreshUser,
      signOut,
    };
  }, [session, loading, refreshUser, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return ctx;
};
