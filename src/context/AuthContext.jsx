/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ensureProfileForAuthUser, getProfileByAuthUserId } from '../data/usersData';
import { normalizePhoneE164 } from '../lib/phone';
import { authEmailFromChapa, isValidChapa, normalizeChapa } from '../lib/authId';

const AuthContext = createContext(null);
const SESSION_TIMEOUT_MS = 10000;
const PROFILE_TIMEOUT_MS = 12000;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

async function loadOrCreateProfile(authUser) {
  const profile = await getProfileByAuthUserId(authUser.id);
  // If the profile row is missing (common if SQL/trigger wasn't installed at signup time),
  // attempt to create it client-side from auth metadata, then re-fetch.
  if (!profile && authUser) {
    const res = await ensureProfileForAuthUser(authUser);
    if (!res.success) return { profile: null, error: res.error || 'No se pudo crear el perfil' };
  }

  const profile2 = profile || (await getProfileByAuthUserId(authUser.id));
  return { profile: profile2, error: '' };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // profile row from `usuarios`
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          'Tiempo de espera agotado al recuperar la sesion',
        );
        if (!mounted) return;
        if (error) {
          setSession(null);
          setAuthUser(null);
          setProfileError(error.message || 'No se pudo recuperar la sesion');
          return;
        }

        setSession(data.session ?? null);
        setAuthUser(data.session?.user ?? null);
      } catch (e) {
        if (!mounted) return;
        setSession(null);
        setAuthUser(null);
        setProfileError('No se pudo iniciar la sesion automaticamente. Revisa tu conexion e intentalo de nuevo.');
      } finally {
        if (mounted) setLoading(false);
      }
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
        setProfileError('');
        return;
      }
      try {
        setProfileLoading(true);
        setProfileError('');

        const { profile, error } = await withTimeout(
          loadOrCreateProfile(authUser),
          PROFILE_TIMEOUT_MS,
          'Tiempo de espera agotado al cargar el perfil',
        );

        if (!cancelled) {
          setCurrentUser(profile);
          if (error) setProfileError(error);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
          setProfileError('No se pudo cargar tu perfil. Comprueba tu conexion y pulsa Reintentar.');
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
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
    setProfileLoading(true);
    setProfileError('');
    try {
      const { profile, error } = await withTimeout(
        loadOrCreateProfile(authUser),
        PROFILE_TIMEOUT_MS,
        'Tiempo de espera agotado al recargar el perfil',
      );
      setCurrentUser(profile);
      if (error) setProfileError(error);
    } catch {
      setCurrentUser(null);
      setProfileError('No se pudo recargar tu perfil. Comprueba tu conexion y vuelve a intentarlo.');
    } finally {
      setProfileLoading(false);
    }
  }

  const value = {
    session,
    authUser,
    currentUser,
    profileLoading,
    profileError,
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
