import { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInCalendarDays, isValid, parseISO, startOfDay } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getOffers } from '../data/offersStore';
import OfferCard from '../components/OfferCard';
import LegalDisclaimer from '../components/LegalDisclaimer';
import ThemeToggle from '../components/ThemeToggle';
import { getSpecialties } from '../data/specialtiesData';

const MATCH_ORDER = { perfecto: 0, parcial: 1, posible: 2 };

function parseDateValue(value) {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : null;
}

function getOfferCompleteness(offer) {
  let score = 0;
  if (offer.tengoDesde) score += 1;
  if (offer.tengoHasta) score += 1;
  if (offer.necesitoDesde) score += 1;
  if (offer.necesitoHasta) score += 1;
  return score;
}

function getUrgencyData(offer, today) {
  const tengoDesde = parseDateValue(offer.tengoDesde);
  const tengoHasta = parseDateValue(offer.tengoHasta);
  const necesitoDesde = parseDateValue(offer.necesitoDesde);
  const necesitoHasta = parseDateValue(offer.necesitoHasta);

  const upcomingStarts = [tengoDesde, necesitoDesde].filter((d) => d && d >= today);
  // A swap is no longer usable once either side of the offer has completely passed.
  const isExpired = Boolean((tengoHasta && tengoHasta < today) || (necesitoHasta && necesitoHasta < today));

  const activeNow = [
    { desde: tengoDesde, hasta: tengoHasta },
    { desde: necesitoDesde, hasta: necesitoHasta },
  ].some((range) => range.desde && range.hasta && range.desde <= today && range.hasta >= today);

  let relevantDate = null;
  if (upcomingStarts.length > 0) {
    relevantDate = new Date(Math.min(...upcomingStarts.map((d) => d.getTime())));
  } else if (!isExpired && activeNow) {
    relevantDate = today;
  }

  return {
    isExpired,
    relevantDate,
    urgencyDays: relevantDate ? differenceInCalendarDays(relevantDate, today) : null,
  };
}

function getStableIdValue(offerId) {
  const n = Number(offerId);
  if (!Number.isNaN(n)) return n;
  return String(offerId || '');
}

function getBestQuality(a, b) {
  return MATCH_ORDER[a] <= MATCH_ORDER[b] ? a : b;
}

function groupDisplayOffers(items) {
  const groups = [];
  const byKey = new Map();

  for (const item of items) {
    const key = `${item.offer.userId}|${item.offer.createdAt}|${item.isExpired ? 'expired' : 'active'}`;
    const existing = byKey.get(key);

    if (!existing) {
      const group = {
        ...item,
        groupedOffers: [item.offer],
      };
      byKey.set(key, group);
      groups.push(group);
      continue;
    }

    existing.groupedOffers.push(item.offer);
    existing.quality = getBestQuality(existing.quality, item.quality);

    const urgencies = [existing.urgencyDays, item.urgencyDays].filter((v) => v !== null);
    existing.urgencyDays = urgencies.length > 0 ? Math.min(...urgencies) : null;

    if (item.relevantDate && (!existing.relevantDate || item.relevantDate < existing.relevantDate)) {
      existing.relevantDate = item.relevantDate;
    }

    if (item.completeness > existing.completeness) existing.completeness = item.completeness;
    if (item.createdAtDate > existing.createdAtDate) existing.createdAtDate = item.createdAtDate;
  }

  return groups;
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [offers, setOffers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterEspecialidad, setFilterEspecialidad] = useState('');
  const [filterSemana, setFilterSemana] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [specialties, setSpecialties] = useState(null);
  const specialtiesMapRef = useRef({});
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

  useEffect(() => {
    const map = {};
    for (const sp of specialties || []) map[String(sp.codigo)] = sp.nombre;
    specialtiesMapRef.current = map;
  }, [specialties]);

  async function loadData() {
    try {
      const offersData = await getOffers();
      const { data: usersData, error: usersError } = await supabase.from('usuarios').select('*');

      setOffers(offersData || []);

      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else if (usersData) {
        const spMap = specialtiesMapRef.current || {};
        const map = {};
        usersData.forEach((u) => {
          const codigo = String(u.especialidad_codigo || '');
          map[u.id] = { ...u, especialidad_nombre: spMap[codigo] || '' };
        });
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

    const today = startOfDay(new Date());
    const currentUserId = String(currentUser.id);
    const myOffers = offers.filter((o) => String(o.userId) === currentUserId);
    const me = usersMap[currentUser.id];

    return offers
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
        const isOwn = String(offer.userId) === currentUserId;
        const otherUser = usersMap[offer.userId];
        let bestMatch = 'posible';

        if (otherUser && !isOwn) {
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

        const urgency = getUrgencyData(offer, today);
        const createdAtDate = parseDateValue(offer.createdAt) || new Date(0);
        return {
          offer,
          isOwn,
          quality: bestMatch,
          user: otherUser,
          ...urgency,
          completeness: getOfferCompleteness(offer),
          createdAtDate,
          stableId: getStableIdValue(offer.id),
        };
      })
      .sort((a, b) => {
        if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1;
        if (a.relevantDate && b.relevantDate) {
          const byRelevantDate = a.relevantDate.getTime() - b.relevantDate.getTime();
          if (byRelevantDate !== 0) return byRelevantDate;
        } else if (a.relevantDate !== b.relevantDate) {
          return a.relevantDate ? -1 : 1;
        }

        const byQuality = MATCH_ORDER[a.quality] - MATCH_ORDER[b.quality];
        if (byQuality !== 0) return byQuality;

        const byCompleteness = b.completeness - a.completeness;
        if (byCompleteness !== 0) return byCompleteness;

        const byNewest = b.createdAtDate.getTime() - a.createdAtDate.getTime();
        if (byNewest !== 0) return byNewest;

        if (typeof a.stableId === 'number' && typeof b.stableId === 'number') {
          return b.stableId - a.stableId;
        }
        return String(b.stableId).localeCompare(String(a.stableId));
      });
  }, [offers, usersMap, currentUser, filterGrupo, filterSemana, filterFecha, filterEspecialidad, loading]);

  const groupedDisplayOffers = useMemo(() => groupDisplayOffers(displayOffers), [displayOffers]);
  const activeOffers = groupedDisplayOffers.filter((item) => !item.isExpired);
  const expiredOffers = groupedDisplayOffers.filter((item) => item.isExpired);

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

          <div className="filter-date-wrap">
            <input
              type="date"
              value={filterFecha}
              onChange={(e) => setFilterFecha(e.target.value)}
              className="filter-date"
              aria-label="Filtrar por fecha"
            />
            {!filterFecha ? <span className="filter-date-placeholder">Filtrar por fecha</span> : null}
          </div>
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
            <h3>No hay ofertas disponibles</h3>
            <p>No hay ofertas que cumplan los filtros actuales.</p>
          </div>
        ) : (
          <>
            <section className="offers-section">
              <h2 className="offers-section-title">Ofertas activas ({activeOffers.length})</h2>
              {activeOffers.length === 0 ? (
                <p className="section-empty-copy">No hay ofertas activas ahora mismo.</p>
              ) : (
                activeOffers.map(({ offer, quality, urgencyDays, isOwn, groupedOffers }) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    user={usersMap[offer.userId]}
                    matchQuality={quality}
                    showMatch={!isOwn}
                    isOwn={isOwn}
                    showOwnBadge={isOwn}
                    showDeleteForOwn={false}
                    isExpired={false}
                    urgencyDays={urgencyDays}
                    showUrgency={true}
                    groupedOffers={groupedOffers}
                  />
                ))
              )}
            </section>

            {expiredOffers.length > 0 ? (
              <section className="offers-section offers-section-expired">
                <h2 className="offers-section-title">Ofertas finalizadas ({expiredOffers.length})</h2>
                {expiredOffers.map(({ offer, quality, urgencyDays, isOwn, groupedOffers }) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    user={usersMap[offer.userId]}
                    matchQuality={quality}
                    showMatch={!isOwn}
                    isOwn={isOwn}
                    showOwnBadge={isOwn}
                    showDeleteForOwn={false}
                    isExpired={true}
                    urgencyDays={urgencyDays}
                    showUrgency={true}
                    groupedOffers={groupedOffers}
                  />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>

      <LegalDisclaimer />
      <footer className="contact-footer">
        <p>
          Contacto para preguntas y sugerencias:{' '}
          <a href="mailto:portalestibavlc@gmail.com">portalestibavlc@gmail.com</a>
        </p>
      </footer>
    </div>
  );
}
