import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGroups } from '../data/groupsData';
import { getSpecialties } from '../data/specialtiesData';
import { updateUserProfile, uploadUserAvatar } from '../data/usersData';
import { isValidChapa, normalizeChapa } from '../lib/authId';

function titleCaseWords(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .split(/\s+/g)
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function Profile() {
  const { currentUser, refreshProfile, logout } = useAuth();
  const fileRef = useRef(null);

  const [groups, setGroups] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [form, setForm] = useState({
    nombre: currentUser.nombre || '',
    chapa: currentUser.chapa || '',
    telefono: currentUser.telefono || '',
    grupo_descanso: currentUser.grupo_descanso || '',
    semana: currentUser.semana || '',
    especialidad_codigo: currentUser.especialidad_codigo || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      setLoadingMeta(true);
      const [g, s] = await Promise.all([getGroups(), getSpecialties()]);
      if (cancelled) return;
      setGroups(g || []);
      setSpecialties(s || []);
      setLoadingMeta(false);
    }
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      nombre: currentUser.nombre || '',
      chapa: currentUser.chapa || '',
      telefono: currentUser.telefono || '',
      grupo_descanso: currentUser.grupo_descanso || '',
      semana: currentUser.semana || '',
      especialidad_codigo: currentUser.especialidad_codigo || '',
    });
  }, [currentUser]);

  const groupOptions = useMemo(() => groups.map((g) => ({ value: g.codigo, label: g.nombre })), [groups]);
  const specialtyOptions = useMemo(
    () => specialties.map((sp) => ({ value: sp.codigo, label: `${sp.codigo} - ${sp.nombre}` })),
    [specialties]
  );

  const currentEspecialidadLabel = useMemo(() => {
    const code = currentUser.especialidad_codigo || '';
    const sp = specialties.find((x) => String(x.codigo) === String(code));
    if (sp) return `${sp.codigo} ${titleCaseWords(sp.nombre)}`;
    return code ? String(code) : '';
  }, [currentUser.especialidad_codigo, specialties]);

  function updateField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
    setError('');
    setInfo('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    const chapa = normalizeChapa(form.chapa);
    if (!isValidChapa(chapa)) {
      setError('La chapa debe tener 5 digitos.');
      return;
    }
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!form.grupo_descanso) {
      setError('Selecciona un grupo.');
      return;
    }
    if (!form.especialidad_codigo) {
      setError('Selecciona una especialidad.');
      return;
    }
    if (!form.semana) {
      setError('Selecciona una semana.');
      return;
    }

    setSaving(true);
    const ok = await updateUserProfile(currentUser.id, {
      nombre: form.nombre.trim(),
      chapa,
      telefono: form.telefono ? String(form.telefono).trim() : null,
      grupo_descanso: form.grupo_descanso,
      semana: form.semana,
      especialidad_codigo: form.especialidad_codigo,
    });
    if (!ok.success) {
      setError(ok.error || 'No se pudo guardar');
      setSaving(false);
      return;
    }
    await refreshProfile();
    setInfo('Guardado');
    setSaving(false);
  }

  async function handlePickAvatar() {
    fileRef.current?.click();
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setInfo('');
    const res = await uploadUserAvatar(currentUser.id, file);
    if (!res.success) {
      setError(res.error || 'No se pudo subir la foto');
      setUploading(false);
      return;
    }
    await refreshProfile();
    setInfo('Foto actualizada');
    setUploading(false);
  }

  return (
    <div className="page profile-page">
      <header className="page-header">
        <div className="header-top">
          <h1>Perfil</h1>
        </div>
        <p className="header-subtitle">Tus datos se muestran en las ofertas</p>
      </header>

      <div className="user-profile-card">
        <div className="user-avatar large" onClick={handlePickAvatar} role="button" tabIndex={0} title="Cambiar foto">
          {currentUser.avatar_url ? (
            <img className="user-avatar-img" src={currentUser.avatar_url} alt={currentUser.nombre} />
          ) : (
            currentUser.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')
          )}
        </div>
        <div className="user-profile-info">
          <h2>{currentUser.nombre}</h2>
          <div className="user-tags">
            <span className={`tag tag-grupo-${(currentUser.grupo_descanso || '').toLowerCase()}`}>Grupo {currentUser.grupo_descanso}</span>
            <span className={`tag tag-semana-${(currentUser.semana || '').toLowerCase()}`}>{currentUser.semana === 'V' ? 'Verde' : 'Naranja'}</span>
            <span className="tag tag-profesion">{currentEspecialidadLabel}</span>
          </div>
          <p className="text-sm-muted" style={{ marginTop: 8 }}>
            Pulsa el avatar para subir una foto.
          </p>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          {uploading && <p className="text-sm-muted">Subiendo foto...</p>}
        </div>
      </div>

      <form onSubmit={handleSave} className="login-form">
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
          <p className="text-sm-muted" style={{ marginTop: 6 }}>
            Nota: si cambias la chapa, tambien cambiara tu usuario de acceso.
          </p>
        </div>

        <div className="input-group">
          <label htmlFor="telefono">Movil (WhatsApp)</label>
          <input id="telefono" type="tel" value={form.telefono || ''} onChange={(e) => updateField('telefono', e.target.value)} autoComplete="tel" />
        </div>

        <div className="input-group">
          <label htmlFor="grupo">Grupo de descanso</label>
          <select
            id="grupo"
            value={form.grupo_descanso}
            onChange={(e) => updateField('grupo_descanso', e.target.value)}
            className="filter-select"
            disabled={loadingMeta}
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
          <label htmlFor="esp">Especialidad</label>
          <select
            id="esp"
            value={form.especialidad_codigo}
            onChange={(e) => updateField('especialidad_codigo', e.target.value)}
            className="filter-select"
            disabled={loadingMeta}
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

        {error && <div className="login-error">{error}</div>}
        {info && <div className="login-success">{info}</div>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <span className="spinner"></span> : 'Guardar cambios'}
        </button>

        <button type="button" className="btn-secondary" onClick={logout} style={{ width: '100%', marginTop: 10 }}>
          Salir
        </button>
      </form>
    </div>
  );
}
