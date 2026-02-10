import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createOffer, getOffers } from '../data/offersStore';
import { validateOffer } from '../logic/matchingEngine';

export default function CreateOffer() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        tengoDesde: '',
        tengoHasta: '',
        necesitoDesde: '',
        necesitoHasta: '',
    });
    const [errors, setErrors] = useState([]);
    const [success, setSuccess] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrors([]);
    }

    // Auto-fill "hasta" when "desde" is selected (if empty)
    function handleDesdeBlur(field) {
        if (field === 'tengo' && form.tengoDesde && !form.tengoHasta) {
            setForm(prev => ({ ...prev, tengoHasta: form.tengoDesde }));
        }
        if (field === 'necesito' && form.necesitoDesde && !form.necesitoHasta) {
            setForm(prev => ({ ...prev, necesitoHasta: form.necesitoDesde }));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.tengoDesde || !form.tengoHasta || !form.necesitoDesde || !form.necesitoHasta) {
            setErrors(['Por favor rellena todas las fechas.']);
            return;
        }

        try {
            const existing = await getOffers(); // Fetch async
            const validation = validateOffer(currentUser.id, form, existing);

            if (!validation.valid) {
                setErrors(validation.errors);
                return;
            }

            await createOffer({
                userId: currentUser.id,
                tengoDesde: form.tengoDesde,
                tengoHasta: form.tengoHasta,
                necesitoDesde: form.necesitoDesde,
                necesitoHasta: form.necesitoHasta,
            });

            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch {
            setErrors(['Error al crear la oferta. Inténtalo de nuevo.']);
        }
    }

    if (success) {
        return (
            <div className="page create-page">
                <div className="success-state">
                    <div className="success-icon">✅</div>
                    <h2>¡Oferta publicada!</h2>
                    <p>Tu cambio de descanso ya está visible en el tablón</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page create-page">
            <header className="page-header">
                <h1>Publicar Cambio</h1>
                <p className="header-subtitle">
                    Define qué días ofreces y cuáles necesitas
                </p>
            </header>

            <form onSubmit={handleSubmit} className="create-form">
                <div className="form-section">
                    <div className="form-section-header tengo-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M12 19V5M5 12l7-7 7 7" />
                        </svg>
                        <h2>Ofrezco descansar</h2>
                    </div>
                    <p className="form-section-desc">Días que tengo de descanso y estoy dispuesto a trabajar</p>
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
                                min={form.tengoDesde}
                            />
                        </div>
                    </div>
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
                        <h2>Necesito descansar</h2>
                    </div>
                    <p className="form-section-desc">Días en los que quiero descansar</p>
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
                                min={form.necesitoDesde}
                            />
                        </div>
                    </div>
                </div>

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

                <button type="submit" className="btn-primary btn-submit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                    Publicar cambio
                </button>

                <div className="form-rules-info">
                    <h4>📋 Reglas del convenio</h4>
                    <ul>
                        <li>Mínimo 5 días de descanso al mes</li>
                        <li>Máximo 7 días de descanso al mes</li>
                        <li>Máximo 19 días seguidos en disponibilidad</li>
                    </ul>
                </div>
            </form>
        </div>
    );
}
