import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import CreateOffer from './pages/CreateOffer';
import MyOffers from './pages/MyOffers';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import { upsertUsageActivity } from './data/usageStore';

function ProtectedRoute({ children }) {
  const { authUser, currentUser, loading, profileLoading, profileError, logout, refreshProfile } = useAuth();
  if (loading) return <div className="loading-screen"><span className="spinner large"></span></div>;
  if (!authUser) return <Navigate to="/login" replace />;
  // Authenticated but profile still loading/creating
  if (profileLoading) return <div className="loading-screen"><span className="spinner large"></span></div>;
  if (!currentUser) {
    return (
      <div className="loading-screen" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ marginBottom: 12 }}>Tu perfil no esta disponible todavia.</p>
        <p style={{ marginBottom: 18, opacity: 0.8, fontSize: 14 }}>
          Si acabas de registrarte, asegurate de haber ejecutado el SQL de configuracion en Supabase.
        </p>
        {profileError ? (
          <p style={{ marginBottom: 18, opacity: 0.9, fontSize: 13, color: 'var(--danger)' }}>
            {profileError}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={refreshProfile}>Reintentar</button>
          <button className="btn-secondary" onClick={logout}>Salir</button>
        </div>
      </div>
    );
  }
  return children;
}

function AppRoutes() {
  const { authUser, currentUser } = useAuth();
  const location = useLocation();
  const lastSentRef = useRef({ key: '', ts: 0 });

  useEffect(() => {
    if (!authUser?.id || !currentUser?.chapa) return;

    const send = async () => {
      const seccion = location.pathname || '/';
      const now = Date.now();
      const key = `${currentUser.chapa}|${seccion}`;

      // Evita duplicados muy seguidos (StrictMode en dev / renders cercanos).
      if (lastSentRef.current.key === key && now - lastSentRef.current.ts < 10_000) return;

      lastSentRef.current = { key, ts: now };
      await upsertUsageActivity({
        chapa: currentUser.chapa,
        seccion,
      });
    };

    send();

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      upsertUsageActivity({
        chapa: currentUser.chapa,
        seccion: location.pathname || '/',
      });
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [authUser?.id, currentUser?.chapa, location.pathname]);

  return (
    <div className="app-shell">
      <div className="app-content">
        <Routes>
          <Route path="/login" element={
            authUser ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } />
        <Route path="/register" element={
          authUser ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
          <Route path="/crear" element={
            <ProtectedRoute><CreateOffer /></ProtectedRoute>
          } />
          <Route path="/mis-ofertas" element={
            <ProtectedRoute><MyOffers /></ProtectedRoute>
          } />
          <Route path="/perfil" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
      <Navbar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
