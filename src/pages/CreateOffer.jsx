import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createOffersBatch, getOffers } from '../data/offersStore';
import { validateOffer } from '../logic/matchingEngine';

const MAX_BATCH_OFFERS = 30;

function sortUniqueDates(dates) {
  return [...new Set((dates ?? []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function buildSectionRanges(form, section) {
  const modeKey = `${section}Mode`;
  const desdeKey = `${section}Desde`;
  const hastaKey = `${section}Hasta`;
  const diasKey = `${section}Dias`;

  if (form[modeKey] === 'multi') {
    return sortUniqueDates(form[diasKey]).map((date) => ({ desde: date, hasta: date }));
  }

  if (!form[desdeKey] || !form[hastaKey]) return [];
  return [{ desde: form[desdeKey], hasta: form[hastaKey] }];
}

function buildOfferPayloads(form) {
  const tengoRanges = buildSectionRanges(form, 'tengo');
  const necesitoRanges = buildSectionRanges(form, 'necesito');

  if (tengoRanges.length === 0 || necesitoRanges.length === 0) {
    return { payloads: [], errors: ['Selecciona las fechas de "Tengo" y "Quiero".'] };
  }

  const payloads = [];
  const seen = new Set();

  for (const tengo of tengoRanges) {
    for (const necesito of necesitoRanges) {
      const key = `${tengo.desde}|${tengo.hasta}|${necesito.desde}|${necesito.hasta}`;
      if (seen.has(key)) continue;
      seen.add(key);
      payloads.push({
        tengoDesde: tengo.desde,
        tengoHasta: tengo.hasta,
        necesitoDesde: necesito.desde,
        necesitoHasta: necesito.hasta,
      });
    }
  }

  if (payloads.length > MAX_BATCH_OFFERS) {
    return {
      payloads: [],
      errors: [`Demasiadas combinaciones (${payloads.length}). Reduce la seleccion a ${MAX_BATCH_OFFERS} ofertas como maximo.`],
    };
  }

  return { payloads, errors: [] };
}

function DateModeToggle({ section, value, onChange }) {
  return (
    <div className="date-mode-toggle" role="tablist" aria-label={`Modo de fechas para ${section}`}>
      <button
        type="button"
        className={`date-mode-btn ${value === 'range' ? 'active' : ''}`}
        onClick={() => onChange('range')}
        aria-pressed={value === 'range'}
      >
        Rango seguido
      </button>
      <button
        type="button"
        className={`date-mode-btn ${value === 'multi' ? 'active' : ''}`}
        onClick={() => onChange('multi')}
        aria-pressed={value === 'multi'}
      >
        Dias sueltos
      </button>
    </div>
  );
}

function MultiDayPicker({ section, label, inputValue, onInputChange, days, onAddDay, onRemoveDay }) {
  return (
    <div className="multi-day-picker">
      <div className="multi-day-row">
        <div className="input-group">
          <label htmlFor={`${section}DiaInput`}>{label}</label>
          <input
            id={`${section}DiaInput`}
            type="date"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddDay();
              }
            }}
          />
        </div>
        <button type="button" className="btn-secondary multi-day-add-btn" onClick={onAddDay}>
          Anadir
        </button>
      </div>

      <div className="selected-days" aria-live="polite">
        {days.length > 0 ? (
          days.map((day) => (
            <button
              key={day}
              type="button"
              className="selected-day-chip"
              onClick={() => onRemoveDay(day)}
              title="Quitar dia"
            >
              {day}
              <span aria-hidden="true"> x</span>
            </button>
          ))
        ) : (
          <p className="selected-days-empty">Anade uno o varios dias no seguidos.</p>
        )}
      </div>
    </div>
  );
}

export default function CreateOffer() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tengoMode: 'range',
    tengoDesde: '',
    tengoHasta: '',
    tengoDiaInput: '',
    tengoDias: [],
    necesitoMode: 'range',
    necesitoDesde: '',
    necesitoHasta: '',
    necesitoDiaInput: '',
    necesitoDias: [],
  });
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors([]);
  }

  function handleDesdeBlur(section) {
    const modeKey = `${section}Mode`;
    if (form[modeKey] !== 'range') return;

    if (section === 'tengo' && form.tengoDesde && !form.tengoHasta) {
      setForm((prev) => ({ ...prev, tengoHasta: prev.tengoDesde }));
    }
    if (section === 'necesito' && form.necesitoDesde && !form.necesitoHasta) {
      setForm((prev) => ({ ...prev, necesitoHasta: prev.necesitoDesde }));
    }
  }

  function setSectionMode(section, mode) {
    const modeKey = `${section}Mode`;
    setForm((prev) => ({ ...prev, [modeKey]: mode }));
    setErrors([]);
  }

  function setSingleDayInput(section, value) {
    const inputKey = `${section}DiaInput`;
    setForm((prev) => ({ ...prev, [inputKey]: value }));
    setErrors([]);
  }

  function addSingleDay(section) {
    const inputKey = `${section}DiaInput`;
    const daysKey = `${section}Dias`;
    const value = form[inputKey];
    if (!value) return;

    setForm((prev) => ({
      ...prev,
      [daysKey]: sortUniqueDates([...(prev[daysKey] ?? []), value]),
      [inputKey]: '',
    }));
    setErrors([]);
  }

  function removeSingleDay(section, day) {
    const daysKey = `${section}Dias`;
    setForm((prev) => ({
      ...prev,
      [daysKey]: (prev[daysKey] ?? []).filter((d) => d !== day),
    }));
    setErrors([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);

    const { payloads, errors: payloadErrors } = buildOfferPayloads(form);
    if (payloadErrors.length > 0) {
      setErrors(payloadErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const existing = await getOffers();

      for (const payload of payloads) {
        const validation = validateOffer(currentUser.id, payload, existing);
        if (!validation.valid) {
          setErrors(validation.errors);
          return;
        }
      }

      await createOffersBatch(
        payloads.map((payload) => ({
          userId: currentUser.id,
          ...payload,
        }))
      );

      setCreatedCount(payloads.length);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch {
      setErrors(['Error al crear la oferta. Intentalo de nuevo.']);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="page create-page">
        <div className="success-state">
          <div className="success-icon">OK</div>
          <h2>{createdCount > 1 ? 'Ofertas publicadas' : 'Oferta publicada'}</h2>
          <p>
            {createdCount > 1
              ? `Se han creado ${createdCount} ofertas a partir de tu seleccion.`
              : 'Tu cambio de descanso ya esta visible en el tablon.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page create-page">
      <header className="page-header">
        <h1>Publicar Cambio</h1>
        <p className="header-subtitle">Define que dias ofreces y cuales necesitas</p>
      </header>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-section">
          <div className="form-section-header tengo-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <h2>Tengo</h2>
          </div>
          <p className="form-section-desc">Dias que tengo de descanso y estoy dispuesto a trabajar</p>
          <DateModeToggle section="Tengo" value={form.tengoMode} onChange={(mode) => setSectionMode('tengo', mode)} />

          {form.tengoMode === 'range' ? (
            <div className="date-inputs">
              <div className="input-group">
                <label htmlFor="tengoDesde">Desde</label>
                <input
                  id="tengoDesde"
                  type="date"
                  name="tengoDesde"
                  value={form.tengoDesde}
                  onChange={handleChange}
                  onBlur={() => handleDesdeBlur('tengo')}
                />
              </div>
              <div className="input-group">
                <label htmlFor="tengoHasta">Hasta</label>
                <input
                  id="tengoHasta"
                  type="date"
                  name="tengoHasta"
                  value={form.tengoHasta}
                  onChange={handleChange}
                  min={form.tengoDesde || undefined}
                />
              </div>
            </div>
          ) : (
            <MultiDayPicker
              section="tengo"
              label="Dia"
              inputValue={form.tengoDiaInput}
              onInputChange={(value) => setSingleDayInput('tengo', value)}
              days={form.tengoDias}
              onAddDay={() => addSingleDay('tengo')}
              onRemoveDay={(day) => removeSingleDay('tengo', day)}
            />
          )}
        </div>

        <div className="form-swap-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>

        <div className="form-section">
          <div className="form-section-header necesito-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            <h2>Quiero</h2>
          </div>
          <p className="form-section-desc">Dias en los que quiero descansar</p>
          <DateModeToggle
            section="Quiero"
            value={form.necesitoMode}
            onChange={(mode) => setSectionMode('necesito', mode)}
          />

          {form.necesitoMode === 'range' ? (
            <div className="date-inputs">
              <div className="input-group">
                <label htmlFor="necesitoDesde">Desde</label>
                <input
                  id="necesitoDesde"
                  type="date"
                  name="necesitoDesde"
                  value={form.necesitoDesde}
                  onChange={handleChange}
                  onBlur={() => handleDesdeBlur('necesito')}
                />
              </div>
              <div className="input-group">
                <label htmlFor="necesitoHasta">Hasta</label>
                <input
                  id="necesitoHasta"
                  type="date"
                  name="necesitoHasta"
                  value={form.necesitoHasta}
                  onChange={handleChange}
                  min={form.necesitoDesde || undefined}
                />
              </div>
            </div>
          ) : (
            <MultiDayPicker
              section="necesito"
              label="Dia"
              inputValue={form.necesitoDiaInput}
              onInputChange={(value) => setSingleDayInput('necesito', value)}
              days={form.necesitoDias}
              onAddDay={() => addSingleDay('necesito')}
              onRemoveDay={(day) => removeSingleDay('necesito', day)}
            />
          )}
        </div>

        {(form.tengoMode === 'multi' || form.necesitoMode === 'multi') && (
          <div className="form-batch-hint">
            Se publicara una oferta por cada combinacion de fechas seleccionadas ("Tengo" x "Quiero").
          </div>
        )}

        {errors.length > 0 && (
          <div className="validation-errors">
            {errors.map((err, i) => (
              <div key={i} className="error-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {err}
              </div>
            ))}
          </div>
        )}

        <button type="submit" className="btn-primary btn-submit" disabled={isSubmitting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          {isSubmitting ? 'Publicando...' : 'Publicar cambio'}
        </button>

        <div className="form-rules-info">
          <h4>Reglas del convenio</h4>
          <ul>
            <li>Minimo 5 dias de descanso al mes</li>
            <li>Maximo 7 dias de descanso al mes</li>
            <li>Maximo 19 dias seguidos en disponibilidad</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
