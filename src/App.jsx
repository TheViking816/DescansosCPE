import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import CreateOffer from './pages/CreateOffer';
import MyOffers from './pages/MyOffers';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';

function ProtectedRoute({ children }) {
  const { authUser, currentUser, loading, profileLoading, logout, refreshProfile } = useAuth();
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
  const { authUser } = useAuth();

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
