import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteOffer, getOffersByUser } from '../data/offersStore';
import { updateUserPhone } from '../data/usersData';
import OfferCard from '../components/OfferCard';

export default function MyOffers() {
  const { currentUser, refreshProfile } = useAuth();
  const [offers, setOffers] = useState([]);
  const [phone, setPhone] = useState(currentUser.telefono || '');
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    setPhone(currentUser.telefono || '');
  }, [currentUser.telefono]);

  useEffect(() => {
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOffers() {
    const data = await getOffersByUser(currentUser.id);
    setOffers(data || []);
  }

  async function handleDelete(offerId) {
    if (window.confirm('Seguro que quieres eliminar esta oferta?')) {
      await deleteOffer(offerId);
      loadOffers();
    }
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

      <div className="offers-feed">
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
          offers.map((offer) => <OfferCard key={offer.id} offer={offer} user={currentUser} isOwn={true} onDelete={handleDelete} />)
        )}
      </div>
    </div>
  );
}
