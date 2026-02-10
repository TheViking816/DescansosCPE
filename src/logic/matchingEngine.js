import { differenceInDays, eachDayOfInterval, parseISO, getMonth, getYear } from 'date-fns';

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
    const tengoDesde = parseISO(newOffer.tengoDesde);
    const tengoHasta = parseISO(newOffer.tengoHasta);
    const necesitoDesde = parseISO(newOffer.necesitoDesde);
    const necesitoHasta = parseISO(newOffer.necesitoHasta);

    // Validación básica de fechas
    if (tengoDesde > tengoHasta) {
        errors.push('La fecha "Tengo desde" no puede ser posterior a "Tengo hasta".');
    }
    if (necesitoDesde > necesitoHasta) {
        errors.push('La fecha "Necesito desde" no puede ser posterior a "Necesito hasta".');
    }

    // Calcular días de descanso por mes considerando la oferta
    // "Tengo" = días que renuncio a descansar (disponible para trabajar)
    // "Necesito" = días que quiero descansar
    const tengodays = differenceInDays(tengoHasta, tengoDesde) + 1;
    // NOTE: `necesitodays` reserved for future rules.

    // Obtener el mes de referencia (usamos el mes de "necesito")
    const month = getMonth(necesitoDesde);
    const year = getYear(necesitoDesde);

    // Contar los días de descanso existentes del usuario en ese mes
    // filtered existingOffers passed to function
    let restDaysInMonth = 6; // Asumimos 6 días base de descanso por mes

    for (const offer of existingOffers) {
        // Skip checking userId here, assume caller passed only relevant offers or check inside loop
        if (offer.userId !== userId) continue;

        const od = parseISO(offer.tengoDesde);
        const oh = parseISO(offer.tengoHasta);
        const nd = parseISO(offer.necesitoDesde);
        const nh = parseISO(offer.necesitoHasta);

        // Días que cede en ese mes
        const cededDays = eachDayOfInterval({ start: od, end: oh })
            .filter(d => getMonth(d) === month && getYear(d) === year).length;
        // Días que gana en ese mes
        const gainedDays = eachDayOfInterval({ start: nd, end: nh })
            .filter(d => getMonth(d) === month && getYear(d) === year).length;

        restDaysInMonth = restDaysInMonth - cededDays + gainedDays;
    }

    // Aplicar el efecto de la nueva oferta
    const newCeded = eachDayOfInterval({ start: tengoDesde, end: tengoHasta })
        .filter(d => getMonth(d) === month && getYear(d) === year).length;
    const newGained = eachDayOfInterval({ start: necesitoDesde, end: necesitoHasta })
        .filter(d => getMonth(d) === month && getYear(d) === year).length;

    const projectedRestDays = restDaysInMonth - newCeded + newGained;

    if (projectedRestDays < 5) {
        errors.push(`No puedes descansar menos de 5 días al mes. Con este cambio tendrías ${projectedRestDays} días.`);
    }
    if (projectedRestDays > 7) {
        errors.push(`No puedes descansar más de 7 días al mes. Con este cambio tendrías ${projectedRestDays} días.`);
    }

    // Regla de 19 días seguidos en disponibilidad
    // Verificamos que los días cedidos no generen más de 19 días seguidos trabajando
    if (tengodays > 19) {
        errors.push('No puedes ceder más de 19 días de descanso seguidos (máximo 19 días en disponibilidad).');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
