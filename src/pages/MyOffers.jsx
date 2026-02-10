import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteOffer, getOffers, getOffersByUser, updateOffer } from '../data/offersStore';
import { getSpecialties } from '../data/specialtiesData';
import { updateUserPhone } from '../data/usersData';
import OfferCard from '../components/OfferCard';
import { validateOffer } from '../logic/matchingEngine';

function titleCaseWords(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .split(/\s+/g)
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function MyOffers() {
  const { currentUser, refreshProfile } = useAuth();
  const [offers, setOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [phone, setPhone] = useState(currentUser.telefono || '');
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [showCalendar, setShowCalendar] = useState(true);

  useEffect(() => {
    setPhone(currentUser.telefono || '');
  }, [currentUser.telefono]);

  useEffect(() => {
    loadOffers();
    loadSpecialties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOffers() {
    const data = await getOffersByUser(currentUser.id);
    setOffers(data || []);
  }

  async function loadSpecialties() {
    const s = await getSpecialties();
    setSpecialties(s || []);
  }

  const currentEspecialidadLabel = useMemo(() => {
    const code = currentUser.especialidad_codigo || currentUser.especialidadCodigo || '';
    const sp = specialties.find((x) => String(x.codigo) === String(code));
    if (sp) return titleCaseWords(sp.nombre);
    return '';
  }, [currentUser.especialidad_codigo, currentUser.especialidadCodigo, specialties]);

  const calendarPdfUrl = useMemo(() => new URL('../../assets/descansos.pdf', import.meta.url).href, []);
  const calendarImgUrl = useMemo(() => new URL('../../assets/descansos.jpg', import.meta.url).href, []);

  async function handleDelete(offerId) {
    if (window.confirm('Seguro que quieres eliminar esta oferta?')) {
      await deleteOffer(offerId);
      loadOffers();
    }
  }

  async function handleSaveOffer(e) {
    e.preventDefault();
    if (!editingOffer) return;
    setOfferError('');
    setSavingOffer(true);

    const all = await getOffers();
    const validation = validateOffer(currentUser.id, editingOffer, all);
    if (!validation.valid) {
      setOfferError(validation.errors.join(' '));
      setSavingOffer(false);
      return;
    }

    const ok = await updateOffer(editingOffer.id, {
      tengoDesde: editingOffer.tengoDesde,
      tengoHasta: editingOffer.tengoHasta,
      necesitoDesde: editingOffer.necesitoDesde,
      necesitoHasta: editingOffer.necesitoHasta,
    });

    if (!ok) {
      setOfferError('No se pudo guardar la oferta.');
      setSavingOffer(false);
      return;
    }

    setSavingOffer(false);
    setEditingOffer(null);
    loadOffers();
  }

  async function handleSavePhone() {
    setSavingPhone(true);
    const success = await updateUserPhone(currentUser.id, phone);
    if (success) {
      await refreshProfile();
      setEditingPhone(false);
    } else {
      alert('Error al guardar el telefono');
    }
    setSavingPhone(false);
  }

  return (
    <div className="page my-offers-page">
      <header className="page-header">
        <h1>Mis Ofertas</h1>
        <p className="header-subtitle">Gestiona tus publicaciones de cambio de DS</p>
      </header>

      <div className="user-profile-card">
        <div className="user-avatar large">
          {currentUser.avatar_url ? (
            <img className="user-avatar-img" src={currentUser.avatar_url} alt={currentUser.nombre} />
          ) : (
            currentUser.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')
          )}
        </div>
        <div className="user-profile-info">
          <h2>{currentUser.nombre}</h2>
          <div className="user-tags">
            <span className={`tag tag-grupo-${(currentUser.grupo_descanso || currentUser.grupoDescanso)?.toLowerCase()}`}>
              Grupo {currentUser.grupo_descanso || currentUser.grupoDescanso}
            </span>
            <span className={`tag tag-semana-${currentUser.semana?.toLowerCase()}`}>{currentUser.semana === 'V' ? 'Verde' : 'Naranja'}</span>
            {currentEspecialidadLabel ? <span className="tag tag-profesion">{currentEspecialidadLabel}</span> : null}
          </div>

          <div className="phone-editor">
            {editingPhone ? (
              <div className="phone-input-group">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder=""
                  className="phone-input"
                  autoComplete="tel"
                />
                <button onClick={handleSavePhone} disabled={savingPhone} className="btn-small save">
                  {savingPhone ? '...' : 'Guardar'}
                </button>
              </div>
            ) : (
              <div className="phone-display" onClick={() => setEditingPhone(true)} role="button" tabIndex={0}>
                <span>{currentUser.telefono ? `WhatsApp: ${currentUser.telefono}` : 'Anadir telefono WhatsApp'}</span>
                <span className="edit-icon">Editar</span>
              </div>
            )}
          </div>

          <p className="chapa-label">Chapa: {currentUser.chapa}</p>
        </div>
      </div>

      <div className="form-section calendar-section" style={{ marginBottom: 16 }}>
        <div className="form-section-header">
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Calendario de descansos</h2>
        </div>
        <p className="form-section-desc">
          Vista rapida del calendario. Si necesitas mas detalle, abre el PDF.
        </p>
        <div className="calendar-actions">
          <a className="btn-secondary" href={calendarPdfUrl} target="_blank" rel="noreferrer">
            Abrir PDF
          </a>
          <button type="button" className="btn-secondary" onClick={() => setShowCalendar((v) => !v)}>
            {showCalendar ? 'Ocultar aqui' : 'Ver aqui'}
          </button>
        </div>
        {showCalendar ? (
          <div className="calendar-image-viewer">
            <a href={calendarImgUrl} target="_blank" rel="noreferrer" className="calendar-image-link">
              <img src={calendarImgUrl} alt="Calendario laboral 2026" loading="lazy" />
            </a>
          </div>
        ) : null}
      </div>

      <div className="offers-feed">
        {editingOffer && (
          <div className="form-section" style={{ marginBottom: 16 }}>
            <div className="form-section-header">
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Editar oferta</h2>
            </div>
            <form onSubmit={handleSaveOffer} className="create-form">
              <div className="date-inputs">
                <div className="input-group">
                  <label>Ofrezco desde</label>
                  <input
                    type="date"
                    value={editingOffer.tengoDesde}
                    onChange={(e) => setEditingOffer((p) => ({ ...p, tengoDesde: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label>Ofrezco hasta</label>
                  <input
                    type="date"
                    value={editingOffer.tengoHasta}
                    min={editingOffer.tengoDesde}
                    onChange={(e) => setEditingOffer((p) => ({ ...p, tengoHasta: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label>Necesito desde</label>
                  <input
                    type="date"
                    value={editingOffer.necesitoDesde}
                    onChange={(e) => setEditingOffer((p) => ({ ...p, necesitoDesde: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label>Necesito hasta</label>
                  <input
                    type="date"
                    value={editingOffer.necesitoHasta}
                    min={editingOffer.necesitoDesde}
                    onChange={(e) => setEditingOffer((p) => ({ ...p, necesitoHasta: e.target.value }))}
                  />
                </div>
              </div>

              {offerError && <div className="login-error" style={{ marginTop: 12 }}>{offerError}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="submit" className="btn-primary" disabled={savingOffer} style={{ flex: 1 }}>
                  {savingOffer ? <span className="spinner"></span> : 'Guardar'}
                </button>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingOffer(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {offers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3>No tienes ofertas activas</h3>
            <p>Publica tu primer cambio de descanso</p>
          </div>
        ) : (
          offers.map((offer) => (
            <div key={offer.id}>
              <OfferCard offer={offer} user={currentUser} isOwn={true} onDelete={handleDelete} />
              <div style={{ display: 'flex', gap: 10, margin: '-6px 0 16px 0' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingOffer(offer)}>
                  Editar oferta
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
