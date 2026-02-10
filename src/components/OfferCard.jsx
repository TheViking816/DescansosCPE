import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizePhoneE164 } from '../lib/phone';

function formatDateRange(desde, hasta) {
  const d = parseISO(desde);
  const h = parseISO(hasta);
  const fd = format(d, 'd MMM', { locale: es });
  const fh = format(h, 'd MMM', { locale: es });
  if (fd === fh) return fd;
  return `${fd} -> ${fh}`;
}

function buildWhatsappUrl(rawPhone) {
  const phoneE164 = normalizePhoneE164(rawPhone);
  if (!phoneE164) return null;
  const digits = phoneE164.replace(/\+/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent('Hola! Te escribo por la app Descansos CPE.')}`;
}

export default function OfferCard({ offer, user, matchQuality, showMatch = false, isOwn = false, onDelete }) {
  if (!user) return null;

  const phone = user.telefono || user.phone || '';
  const whatsappUrl = buildWhatsappUrl(phone);

  const especialidad =
    user.especialidad_codigo || user.especialidadCodigo || user.grupoProfesional || user.grupo_profesional || '';

  return (
    <div className={`offer-card ${showMatch ? `match-${matchQuality}` : ''}`}>
      <div className="offer-card-header">
        <div className="user-avatar">
          {user.avatar_url ? (
            <img className="user-avatar-img" src={user.avatar_url} alt={user.nombre} />
          ) : (
            user.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')
          )}
        </div>
        <div className="user-info">
          <h3>
            {user.nombre}{' '}
            <span className="text-muted" style={{ fontSize: '0.9em', fontWeight: 'normal' }}>
              ({user.chapa})
            </span>
          </h3>
          <div className="user-tags">
            <span className={`tag tag-grupo-${(user.grupoDescanso || user.grupo_descanso)?.toLowerCase()}`}>
              Grupo {user.grupoDescanso || user.grupo_descanso}
            </span>
            <span className={`tag tag-semana-${user.semana?.toLowerCase()}`}>{user.semana === 'V' ? 'Verde' : 'Naranja'}</span>
            {!!especialidad && <span className="tag tag-profesion">{especialidad}</span>}
          </div>
        </div>
      </div>

      <div className="offer-card-body">
        <div className="date-block date-tengo">
          <div className="date-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            Ofrezco descanso
          </div>
          <div className="date-value">{formatDateRange(offer.tengoDesde, offer.tengoHasta)}</div>
        </div>
        <div className="date-separator" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
        <div className="date-block date-necesito">
          <div className="date-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            Necesito descanso
          </div>
          <div className="date-value">{formatDateRange(offer.necesitoDesde, offer.necesitoHasta)}</div>
        </div>
      </div>

      <div className="offer-card-footer">
        {isOwn ? (
          <button className="btn-delete" onClick={() => onDelete && onDelete(offer.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Eliminar
          </button>
        ) : whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar por WhatsApp
          </a>
        ) : (
          <button className="btn-secondary" disabled title="Este usuario aun no ha anadido telefono.">
            Sin WhatsApp
          </button>
        )}
      </div>

      <div className="offer-card-time">{format(parseISO(offer.createdAt), 'd MMM yyyy · HH:mm', { locale: es })}</div>
    </div>
  );
}
