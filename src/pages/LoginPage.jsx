import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isValidChapa, normalizeChapa } from '../lib/authId';

export default function LoginPage() {
  const [chapa, setChapa] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const submitLockRef = useRef(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError('');
    setIsLoading(true);

    try {
      const c = normalizeChapa(chapa);
      if (!isValidChapa(c)) {
        setError('Introduce una chapa valida (5 digitos).');
        setIsLoading(false);
        return;
      }

      const result = await login(c, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'No se pudo iniciar sesion');
      }
    } catch {
      setError('Error al conectar');
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-icon">
            <img className="login-logo" src="/brand/icon.png" alt="Descansos CPE" />
          </div>
          <h1>Descansos CPE</h1>
          <p className="login-subtitle">Puerto de Valencia · Intercambio de DS</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="chapa">Chapa (5 digitos)</label>
            <input
              id="chapa"
              type="text"
              inputMode="numeric"
              value={chapa}
              onChange={(e) => setChapa(e.target.value.replace(/\D+/g, '').slice(0, 5))}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={!normalizeChapa(chapa) || !password || isLoading}>
            {isLoading ? <span className="spinner"></span> : 'Acceder'}
          </button>
        </form>

        <div className="login-footer">
          <p className="legal-note">
            Este sistema es solo informativo. Todo cambio debe ser validado en el{' '}
            <a href="https://portal.cpevalencia.com/" target="_blank" rel="noopener noreferrer">
              <strong>Portal oficial del CPE Valencia</strong>
            </a>
            .
          </p>
          <p className="text-sm-muted" style={{ marginTop: 12 }}>
            ¿No tienes cuenta? <a href="/register">Crear cuenta</a>
          </p>
          <p className="text-sm-muted" style={{ marginTop: 8 }}>
            ¿Has olvidado la contrasena? <a href="/recuperar">Recuperar</a>
          </p>
        </div>
      </div>
    </div>
  );
}
