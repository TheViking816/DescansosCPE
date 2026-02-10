import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getOffers } from '../data/offersStore';
import OfferCard from '../components/OfferCard';
import LegalDisclaimer from '../components/LegalDisclaimer';
import ThemeToggle from '../components/ThemeToggle';
import { getSpecialties } from '../data/specialtiesData';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [offers, setOffers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterEspecialidad, setFilterEspecialidad] = useState('');
  const [filterSemana, setFilterSemana] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [specialties, setSpecialties] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSpecialties() {
      const data = await getSpecialties();
      if (!cancelled) setSpecialties(data);
    }
    loadSpecialties();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadData() {
    try {
      const offersData = await getOffers();
      const { data: usersData, error: usersError } = await supabase.from('usuarios').select('*, especialidades ( nombre )');

      setOffers(offersData || []);

      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else if (usersData) {
        const map = {};
        usersData.forEach((u) => (map[u.id] = u));
        setUsersMap(map);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const displayOffers = useMemo(() => {
    if (loading || !currentUser || !usersMap[currentUser.id]) return [];

    const othersOffers = offers.filter((o) => o.userId !== currentUser.id);
    const myOffers = offers.filter((o) => o.userId === currentUser.id);
    const me = usersMap[currentUser.id];

    return othersOffers
      .filter((o) => {
        const u = usersMap[o.userId];
        if (!u) return false;

        const grupo = u.grupo_descanso || u.grupoDescanso;
        const semana = u.semana;
        const especialidadCodigo = u.especialidad_codigo || u.especialidadCodigo || u.grupo_profesional || u.grupoProfesional;

        if (filterGrupo && grupo !== filterGrupo) return false;
        if (filterSemana && semana !== filterSemana) return false;
        if (filterEspecialidad && especialidadCodigo !== filterEspecialidad) return false;
        if (filterFecha) {
          const ok =
            (o.tengoDesde <= filterFecha && o.tengoHasta >= filterFecha) || (o.necesitoDesde <= filterFecha && o.necesitoHasta >= filterFecha);
          if (!ok) return false;
        }
        return true;
      })
      .map((offer) => {
        const otherUser = usersMap[offer.userId];
        let bestMatch = 'posible';

        if (otherUser) {
          const myGrupo = me.grupo_descanso || me.grupoDescanso;
          const otherGrupo = otherUser.grupo_descanso || otherUser.grupoDescanso;
          const sameGrupo = myGrupo === otherGrupo;

          const sameSemana = me.semana === otherUser.semana;

          const myEsp = me.especialidad_codigo || me.especialidadCodigo || me.grupo_profesional || me.grupoProfesional;
          const otherEsp =
            otherUser.especialidad_codigo || otherUser.especialidadCodigo || otherUser.grupo_profesional || otherUser.grupoProfesional;
          const sameProf = myEsp === otherEsp;

          let quality = 'posible';
          if (sameGrupo && sameSemana && sameProf) quality = 'perfecto';
          else if (sameGrupo && sameSemana) quality = 'parcial';

          for (const myOffer of myOffers) {
            const overlap1 = myOffer.tengoDesde <= offer.necesitoHasta && myOffer.tengoHasta >= offer.necesitoDesde;
            const overlap2 = offer.tengoDesde <= myOffer.necesitoHasta && offer.tengoHasta >= myOffer.necesitoDesde;
            if (overlap1 && overlap2) {
              bestMatch = quality;
              break;
            }
          }

          if (bestMatch === 'posible' && quality !== 'posible') bestMatch = quality;
        }

        return { offer, quality: bestMatch, user: otherUser };
      })
      .sort((a, b) => {
        const order = { perfecto: 0, parcial: 1, posible: 2 };
        return order[a.quality] - order[b.quality];
      });
  }, [offers, usersMap, currentUser, filterGrupo, filterSemana, filterFecha, filterEspecialidad, loading]);

  if (loading) {
    return (
      <div className="page dashboard-page loading-state">
        <p>Cargando ofertas y usuarios...</p>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div className="header-top">
          <h1>Tablon</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="user-badge-mini">
              <span className={`tag tag-grupo-${(currentUser.grupoDescanso || currentUser.grupo_descanso)?.toLowerCase()}`}>
                {(currentUser.grupoDescanso || currentUser.grupo_descanso)}-{currentUser.semana}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
        <p className="header-subtitle">Encuentra tu match de descanso</p>
      </header>

      <div className="filters-bar">
        <div className="filter-group">
          <select value={filterGrupo} onChange={(e) => setFilterGrupo(e.target.value)} className="filter-select">
            <option value="">Todos los grupos</option>
            <option value="A">Grupo A</option>
            <option value="B">Grupo B</option>
            <option value="C">Grupo C</option>
          </select>

          <select value={filterEspecialidad} onChange={(e) => setFilterEspecialidad(e.target.value)} className="filter-select">
            <option value="">Todas las especialidades</option>
            {(specialties || []).map((sp) => (
              <option key={sp.codigo} value={sp.codigo}>
                {sp.codigo} - {sp.nombre}
              </option>
            ))}
          </select>

          <select value={filterSemana} onChange={(e) => setFilterSemana(e.target.value)} className="filter-select">
            <option value="">Todas las semanas</option>
            <option value="V">Verde</option>
            <option value="N">Naranja</option>
          </select>

          <input type="date" value={filterFecha} onChange={(e) => setFilterFecha(e.target.value)} className="filter-date" />
        </div>

        {(filterGrupo || filterSemana || filterFecha || filterEspecialidad) && (
          <button
            className="btn-clear-filters"
            onClick={() => {
              setFilterGrupo('');
              setFilterSemana('');
              setFilterFecha('');
              setFilterEspecialidad('');
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="offers-feed">
        {displayOffers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            {offers.length > 0 ? (
              <>
                <h3>No hay ofertas de otros companeros</h3>
                <p>Actualmente solo hay ofertas tuyas publicadas.</p>
                <p className="text-sm-muted">Ve a "Mis DS" para gestionarlas.</p>
              </>
            ) : (
              <>
                <h3>No hay ofertas disponibles</h3>
                <p>Se el primero en publicar un cambio de descanso</p>
              </>
            )}
          </div>
        ) : (
          displayOffers.map(({ offer, quality }) => (
            <OfferCard key={offer.id} offer={offer} user={usersMap[offer.userId]} matchQuality={quality} showMatch={true} />
          ))
        )}
      </div>

      <LegalDisclaimer />
    </div>
  );
}
