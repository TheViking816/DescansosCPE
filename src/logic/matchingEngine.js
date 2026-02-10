import { parseISO, isValid } from 'date-fns';

/**
 * Calcula la calidad del match entre dos usuarios
 * @returns 'perfecto' | 'parcial' | 'posible'
 */
export function getMatchQuality(userA, userB) {
    const sameGrupoDescanso = userA.grupoDescanso === userB.grupoDescanso;
    const sameSemana = userA.semana === userB.semana;
    const sameGrupoProfesional = userA.grupoProfesional === userB.grupoProfesional;

    if (sameGrupoDescanso && sameSemana && sameGrupoProfesional) {
        return 'perfecto';
    }
    if (sameGrupoDescanso && sameSemana) {
        return 'parcial';
    }
    return 'posible';
}

/**
 * Verifica si dos rangos de fechas se solapan
 */
function datesOverlap(startA, endA, startB, endB) {
    const a1 = parseISO(startA);
    const a2 = parseISO(endA);
    const b1 = parseISO(startB);
    const b2 = parseISO(endB);
    return a1 <= b2 && b1 <= a2;
}

/**
 * Encuentra matches para una oferta dada
 * Un match ocurre cuando el "tengo" de A coincide con el "necesito" de B y viceversa
 */
export function findMatches(offer, allOffers) {
    const matches = [];

    for (const other of allOffers) {
        if (other.userId === offer.userId) continue;
        if (other.id === offer.id) continue;

        // Match: mi "tengo" coincide con su "necesito" Y su "tengo" coincide con mi "necesito"
        const myTengoMatchesTheirNecesito = datesOverlap(
            offer.tengoDesde, offer.tengoHasta,
            other.necesitoDesde, other.necesitoHasta
        );
        const theirTengoMatchesMyNecesito = datesOverlap(
            other.tengoDesde, other.tengoHasta,
            offer.necesitoDesde, offer.necesitoHasta
        );

        if (myTengoMatchesTheirNecesito && theirTengoMatchesMyNecesito) {
            // If needed in the future, fetch profiles by user id and compute quality.
            // For now, keep "posible" to avoid async work inside a sync loop.
            matches.push({ offer: other, quality: 'posible' });
        }
    }

    // Ordenar: perfecto primero, luego parcial, luego posible
    const order = { perfecto: 0, parcial: 1, posible: 2 };
    matches.sort((a, b) => order[a.quality] - order[b.quality]);

    return matches;
}

/**
 * Valida una nueva oferta contra las reglas del convenio
 * @returns { valid: boolean, errors: string[] }
 */
export function validateOffer(userId, newOffer, existingOffers) {
    const errors = [];

    // Validation is intentionally minimal: the official rule checks happen in the CPE portal.
    // Here we only prevent broken/invalid date inputs that would break UI logic.
    if (!newOffer?.tengoDesde || !newOffer?.tengoHasta || !newOffer?.necesitoDesde || !newOffer?.necesitoHasta) {
        return { valid: false, errors: ['Selecciona todas las fechas.'] };
    }

    const tengoDesde = parseISO(newOffer.tengoDesde);
    const tengoHasta = parseISO(newOffer.tengoHasta);
    const necesitoDesde = parseISO(newOffer.necesitoDesde);
    const necesitoHasta = parseISO(newOffer.necesitoHasta);

    if (!isValid(tengoDesde) || !isValid(tengoHasta) || !isValid(necesitoDesde) || !isValid(necesitoHasta)) {
        return { valid: false, errors: ['Formato de fecha invalido.'] };
    }

    if (tengoDesde > tengoHasta) {
        errors.push('La fecha "Tengo desde" no puede ser posterior a "Tengo hasta".');
    }
    if (necesitoDesde > necesitoHasta) {
        errors.push('La fecha "Necesito desde" no puede ser posterior a "Necesito hasta".');
    }

    return { valid: errors.length === 0, errors };
}
