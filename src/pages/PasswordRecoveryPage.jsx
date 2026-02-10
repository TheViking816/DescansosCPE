import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { isValidChapa, normalizeChapa } from '../lib/authId';

export default function PasswordRecoveryPage() {
  const [chapa, setChapa] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const c = normalizeChapa(chapa);
      if (!isValidChapa(c)) {
        setError('Introduce una chapa valida (5 digitos).');
        setLoading(false);
        return;
      }
      if (!/^[0-9]{6}$/.test(code)) {
        setError('Introduce tu codigo de recuperacion (6 digitos).');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('La contrasena debe tener al menos 6 caracteres.');
        setLoading(false);
        return;
      }
      if (password !== password2) {
        setError('Las contrasenas no coinciden.');
        setLoading(false);
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke('password-reset', {
        body: { chapa: c, code, newPassword: password },
      });

      if (fnErr) {
        setError(fnErr.message);
        setLoading(false);
        return;
      }
      if (!data?.success) {
        setError(data?.error || 'No se pudo recuperar la contrasena.');
        setLoading(false);
        return;
      }

      setInfo('Contrasena actualizada. Ya puedes iniciar sesion.');
      setTimeout(() => navigate('/login'), 650);
      setLoading(false);
    } catch (e2) {
      setError(String(e2?.message || e2 || 'Error'));
      setLoading(false);
    } finally {
      submitLockRef.current = false;
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Recuperar contrasena</h1>
          <p className="login-subtitle">Usa tu codigo de recuperacion (configurable en Perfil)</p>
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
            <label htmlFor="code">Codigo de recuperacion (6 digitos)</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D+/g, '').slice(0, 6))}
              autoComplete="one-time-code"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Nueva contrasena</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>

          <div className="input-group">
            <label htmlFor="password2">Repite contrasena</label>
            <input id="password2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
          </div>

          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-success">{info}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Actualizar contrasena'}
          </button>

          <button type="button" className="btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={() => navigate('/login')}>
            Volver a login
          </button>
        </form>
      </div>
    </div>
  );
}

