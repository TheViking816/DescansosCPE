import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroups } from '../data/groupsData';
import { getSpecialties } from '../data/specialtiesData';
import { isValidChapa, normalizeChapa } from '../lib/authId';

function normalizePhoneInput(input) {
  return String(input ?? '').trim().replace(/\s+/g, '');
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const submitLockRef = useRef(false);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groups, setGroups] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [specialties, setSpecialties] = useState([]);

  const [form, setForm] = useState({
    nombre: '',
    chapa: '',
    telefono: '', // optional WhatsApp contact
    grupoDescanso: '',
    semana: '',
    especialidadCodigo: '',
    password: '',
    password2: '',
  });

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingGroups(true);
      const g = await getGroups();
      if (cancelled) return;
      setGroups(g || []);
      setLoadingGroups(false);

      setLoadingSpecialties(true);
      const s = await getSpecialties();
      if (cancelled) return;
      setSpecialties(s || []);
      setLoadingSpecialties(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupOptions = useMemo(() => {
    if (groups?.length) return groups.map((g) => ({ value: g.codigo, label: g.nombre || `Grupo ${g.codigo}` }));
    return [
      { value: 'A', label: 'Grupo A' },
      { value: 'B', label: 'Grupo B' },
      { value: 'C', label: 'Grupo C' },
    ];
  }, [groups]);

  const specialtyOptions = useMemo(() => {
    if (specialties?.length) return specialties.map((sp) => ({ value: sp.codigo, label: `${sp.codigo} - ${sp.nombre}` }));
    return [
      { value: '01', label: '01 - CAPATAZ' },
      { value: '02', label: '02 - CLASIFICADOR' },
      { value: '03', label: '03 - ESPECIALISTA' },
      { value: '11', label: '11 - CONDUCTOR 1a' },
      { value: '12', label: '12 - CONDUCTOR 2a' },
      { value: '15', label: '15 - MAFIS' },
      { value: '18', label: '18 - GRUAS' },
      { value: '19', label: '19 - CONTAINERa' },
      { value: '20', label: '20 - ELEVADORAS' },
      { value: '22', label: '22 - TRASTAINERS' },
      { value: '23', label: '23 - SOBORDISTA' },
      { value: '27', label: '27 - GRUA MOVIL' },
      { value: '30', label: '30 - FURGONETERO' },
      { value: '40', label: '40 - APOYO VEHICULOS' },
    ];
  }, [specialties]);

  function updateField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
    setError('');
    setInfo('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      const chapa = normalizeChapa(form.chapa);
      if (!isValidChapa(chapa)) {
        setError('La chapa debe tener 5 digitos.');
        setIsLoading(false);
        return;
      }

      const telefono = normalizePhoneInput(form.telefono);

      if (!form.nombre.trim()) {
        setError('El nombre es obligatorio.');
        setIsLoading(false);
        return;
      }
      if (!form.grupoDescanso) {
        setError('Selecciona un grupo.');
        setIsLoading(false);
        return;
      }
      if (!form.especialidadCodigo) {
        setError('Selecciona una especialidad.');
        setIsLoading(false);
        return;
      }
      if (!form.semana) {
        setError('Selecciona una semana.');
        setIsLoading(false);
        return;
      }
      if (form.password.length < 6) {
        setError('La contrasena debe tener al menos 6 caracteres.');
        setIsLoading(false);
        return;
      }
      if (form.password !== form.password2) {
        setError('Las contrasenas no coinciden.');
        setIsLoading(false);
        return;
      }

      const res = await register({
        nombre: form.nombre.trim(),
        chapa,
        telefono, // optional WhatsApp contact stored in profile
        password: form.password,
        grupoDescanso: form.grupoDescanso,
        semana: form.semana,
        especialidadCodigo: form.especialidadCodigo,
      });

      if (!res.success) {
        setError(res.error || 'No se pudo registrar');
        if (String(res.error || '').toLowerCase().includes('demasiados intentos')) {
          setCooldownUntil(Date.now() + 90_000);
        }
        setIsLoading(false);
        return;
      }

      if (res.needsConfirmation) {
        setInfo('Cuenta creada. Inicia sesion con tu chapa y contrasena.');
      } else {
        navigate('/dashboard');
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
          <h1>Crear cuenta</h1>
          <p className="login-subtitle">Registro con contrasena</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} autoComplete="name" />
          </div>

          <div className="input-group">
            <label htmlFor="chapa">Chapa (5 digitos)</label>
            <input
              id="chapa"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={form.chapa}
              onChange={(e) => updateField('chapa', e.target.value.replace(/\D+/g, '').slice(0, 5))}
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label htmlFor="telefono">Movil (WhatsApp, opcional)</label>
            <input
              id="telefono"
              type="tel"
              value={form.telefono}
              onChange={(e) => updateField('telefono', e.target.value)}
              autoComplete="tel"
            />
          </div>

          <div className="input-group">
            <label htmlFor="grupoDescanso">Grupo de descanso</label>
            <select
              id="grupoDescanso"
              value={form.grupoDescanso}
              onChange={(e) => updateField('grupoDescanso', e.target.value)}
              disabled={loadingGroups}
              className="filter-select"
            >
              <option value="">Selecciona...</option>
              {groupOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="especialidadCodigo">Especialidad</label>
            <select
              id="especialidadCodigo"
              value={form.especialidadCodigo}
              onChange={(e) => updateField('especialidadCodigo', e.target.value)}
              disabled={loadingSpecialties}
              className="filter-select"
            >
              <option value="">Selecciona...</option>
              {specialtyOptions.map((sp) => (
                <option key={sp.value} value={sp.value}>
                  {sp.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="semana">Semana</label>
            <select id="semana" value={form.semana} onChange={(e) => updateField('semana', e.target.value)} className="filter-select">
              <option value="">Selecciona...</option>
              <option value="V">Verde</option>
              <option value="N">Naranja</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password2">Repite contrasena</label>
            <input
              id="password2"
              type="password"
              value={form.password2}
              onChange={(e) => updateField('password2', e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-success">{info}</div>}

          <button type="submit" className="btn-primary" disabled={isLoading || cooldownLeftSec > 0}>
            {isLoading ? <span className="spinner"></span> : cooldownLeftSec ? `Espera ${cooldownLeftSec}s` : 'Crear cuenta'}
          </button>
        </form>

        <div className="login-footer">
          <p className="text-sm-muted" style={{ marginTop: 12 }}>
            ¿Ya tienes cuenta? <a href="/login">Iniciar sesion</a>
          </p>
        </div>
      </div>
    </div>
  );
}
