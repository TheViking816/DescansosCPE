/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getProfileByAuthUserId } from '../data/usersData';
import { normalizePhoneE164 } from '../lib/phone';
import { authEmailFromChapa, isValidChapa, normalizeChapa } from '../lib/authId';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // profile row from `usuarios`
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setAuthUser(data.session?.user ?? null);
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setAuthUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!authUser?.id) {
        setCurrentUser(null);
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      const profile = await getProfileByAuthUserId(authUser.id);
      if (!cancelled) {
        setCurrentUser(profile);
        setProfileLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  async function login(chapa, password) {
    const c = normalizeChapa(chapa);
    if (!isValidChapa(c)) return { success: false, error: 'La chapa debe tener 5 digitos.' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmailFromChapa(c),
      password,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, session: data.session };
  }

  async function register({ nombre, chapa, telefono, password, grupoDescanso, semana, especialidadCodigo }) {
    const c = normalizeChapa(chapa);
    if (!isValidChapa(c)) return { success: false, error: 'La chapa debe tener 5 digitos.' };

    // WhatsApp contact in profile only (optional).
    const contactoE164 = telefono ? normalizePhoneE164(telefono) : '';

    const { data, error } = await supabase.auth.signUp({
      email: authEmailFromChapa(c),
      password,
      options: {
        data: {
          nombre,
          chapa: c,
          telefono: contactoE164,
          grupo_descanso: grupoDescanso,
          semana,
          especialidad_codigo: especialidadCodigo,
        },
      },
    });

    if (error) {
      const status = error.status ?? (error.__isAuthError ? error.status : undefined);
      if (status === 429 || String(error.message || '').toLowerCase().includes('too many requests')) {
        return { success: false, error: 'Demasiados intentos de registro. Espera 1-2 minutos e intentalo de nuevo.' };
      }
      if (String(error.message || '').toLowerCase().includes('email') && String(error.message || '').toLowerCase().includes('disabled')) {
        return { success: false, error: 'En Supabase estan desactivados los registros por email. Activa Email en Authentication > Providers.' };
      }
      return { success: false, error: error.message };
    }

    // If confirmations are enabled, session may be null until verified.
    const needsConfirmation = !data.session;
    return { success: true, needsConfirmation };
  }

  async function logout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
  }

  async function refreshProfile() {
    if (!authUser?.id) return;
    const profile = await getProfileByAuthUserId(authUser.id);
    setCurrentUser(profile);
  }

  const value = {
    session,
    authUser,
    currentUser,
    profileLoading,
    loading,
    login,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
