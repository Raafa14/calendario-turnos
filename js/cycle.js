import {
    state,
    saveState,
    formatDateKey,
    triggerRenderAll
} from './state.js';

// Nombres y detalles de las 4 fases
export const CYCLE_PHASES = {
    PERIOD: {
        id: 'PERIOD',
        name: 'Menstruación',
        emoji: '🩸',
        color: '#f43f5e',
        badgeBg: 'rgba(244, 63, 94, 0.16)',
        desc: 'Fase de sangrado menstrual. Tu cuerpo se renueva. Prioriza descanso y buena hidratación.'
    },
    FOLLICULAR: {
        id: 'FOLLICULAR',
        name: 'Fase Folicular',
        emoji: '🌿',
        color: '#10b981',
        badgeBg: 'rgba(16, 185, 129, 0.16)',
        desc: 'Los estrógenos suben. Aumenta tu energía, fuerza física y claridad mental. Momento ideal para turnos exigentes y entrenamientos.'
    },
    OVULATION: {
        id: 'OVULATION',
        name: 'Ventana Fértil / Ovulación',
        emoji: '✨',
        color: '#ec4899',
        badgeBg: 'rgba(236, 72, 153, 0.18)',
        desc: 'Máxima fertilidad y pico hormonal. Excelente ánimo y sociabilidad. Ovulación estimada en el día central.'
    },
    LUTEAL: {
        id: 'LUTEAL',
        name: 'Fase Lútea',
        emoji: '🌙',
        color: '#8b5cf6',
        badgeBg: 'rgba(139, 92, 246, 0.16)',
        desc: 'Sube la progesterona. Puede aparecer cansancio, retención de líquidos o SPM. Buen momento para escuchar a tu cuerpo.'
    }
};

export const SYMPTOMS_LIST = [
    { id: 'cramps', label: 'Cólicos', icon: '⚡' },
    { id: 'fatigue', label: 'Fatiga', icon: '😴' },
    { id: 'headache', label: 'Cefalea', icon: '🤕' },
    { id: 'bloating', label: 'Hinchazón', icon: '🎈' },
    { id: 'backpain', label: 'Lumbar', icon: '😖' },
    { id: 'breast', label: 'Sensibilidad', icon: '🌸' }
];

export const MOODS_LIST = [
    { id: 'happy', label: 'Feliz', icon: '😊' },
    { id: 'calm', label: 'Tranquila', icon: '😌' },
    { id: 'irritated', label: 'Irritable', icon: '😤' },
    { id: 'sensitive', label: 'Sensible', icon: '🥺' },
    { id: 'exhausted', label: 'Agotada', icon: '🛌' }
];

export const FLOW_OPTIONS = [
    { id: 'none', label: 'Ninguno' },
    { id: 'spotting', label: 'Manchado' },
    { id: 'light', label: 'Ligero' },
    { id: 'medium', label: 'Medio' },
    { id: 'heavy', label: 'Abundante' }
];

// Obtiene la fecha base del último periodo (configurada o calculada)
export function getLatestPeriodStartDate() {
    if (state.cycle.lastPeriodDate) {
        const [y, m, d] = state.cycle.lastPeriodDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    // Si hay registros en logs con isPeriod = true, buscar el más reciente
    const periodKeys = Object.keys(state.cycle.logs || {})
        .filter(k => state.cycle.logs[k].isPeriod)
        .sort();

    if (periodKeys.length > 0) {
        const latestKey = periodKeys[periodKeys.length - 1];
        const [y, m, d] = latestKey.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    // Valor predeterminado de ejemplo: hace 12 días
    const def = new Date();
    def.setDate(def.getDate() - 12);
    return def;
}

// Devuelve información completa del ciclo actual
export function calculateCycleInfo(targetDate = new Date()) {
    const cycleLength = Math.max(20, Math.min(45, Number(state.cycle.cycleLength) || 28));
    const periodLength = Math.max(2, Math.min(10, Number(state.cycle.periodLength) || 5));
    const lastStart = getLatestPeriodStartDate();

    // Normalizar a medianoche
    const tYear = targetDate.getFullYear();
    const tMonth = targetDate.getMonth();
    const tDay = targetDate.getDate();
    const normTarget = new Date(tYear, tMonth, tDay);

    const normLastStart = new Date(lastStart.getFullYear(), lastStart.getMonth(), lastStart.getDate());
    const diffMs = normTarget - normLastStart;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Día dentro del ciclo (1 a cycleLength)
    let cycleDay = (diffDays % cycleLength);
    if (cycleDay < 0) cycleDay += cycleLength;
    cycleDay += 1; // 1-indexed

    // Determinar la fase actual
    let phase = CYCLE_PHASES.FOLLICULAR;
    let pregnancyChance = 'Baja';

    const fertileStart = Math.max(periodLength + 1, cycleLength - 16);
    const fertileEnd = cycleLength - 11;
    const ovulationDay = cycleLength - 14;

    if (cycleDay <= periodLength) {
        phase = CYCLE_PHASES.PERIOD;
        pregnancyChance = 'Muy baja';
    } else if (cycleDay < fertileStart) {
        phase = CYCLE_PHASES.FOLLICULAR;
        pregnancyChance = 'Baja';
    } else if (cycleDay <= fertileEnd) {
        phase = CYCLE_PHASES.OVULATION;
        pregnancyChance = (cycleDay === ovulationDay) ? 'Máxima (Día de ovulación)' : 'Alta (Ventana fértil)';
    } else {
        phase = CYCLE_PHASES.LUTEAL;
        pregnancyChance = 'Baja';
    }

    // Próximo periodo
    let daysUntilNext = cycleLength - cycleDay + 1;
    if (cycleDay <= periodLength) {
        daysUntilNext = (cycleLength - cycleDay + 1);
    }

    const nextStartDate = new Date(normTarget);
    nextStartDate.setDate(nextStartDate.getDate() + daysUntilNext);

    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setDate(nextEndDate.getDate() + periodLength - 1);

    return {
        cycleLength,
        periodLength,
        cycleDay,
        phase,
        pregnancyChance,
        daysUntilNext,
        nextStartDate,
        nextEndDate,
        ovulationDay
    };
}

// Detecta si una fecha coincide con periodo registrado o previsto
export function getDayCycleStatus(dateKey) {
    if (!state.cycle || !state.cycle.enabled) return null;

    // 1. ¿Está registrado manualmente en los logs?
    const log = state.cycle.logs && state.cycle.logs[dateKey];
    if (log && log.isPeriod) {
        return { isRecordedPeriod: true, flow: log.flow || 'medium' };
    }

    // 2. ¿Coincide con un periodo previsto por el ciclo?
    const [y, m, d] = dateKey.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const lastStart = getLatestPeriodStartDate();
    const normLast = new Date(lastStart.getFullYear(), lastStart.getMonth(), lastStart.getDate());

    const diffDays = Math.floor((targetDate - normLast) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
        const cycleLen = Number(state.cycle.cycleLength) || 28;
        const periodLen = Number(state.cycle.periodLength) || 5;
        const modDay = (diffDays % cycleLen) + 1;

        if (modDay <= periodLen) {
            return { isPredictedPeriod: true };
        }
        if (modDay >= (cycleLen - 16) && modDay <= (cycleLen - 12)) {
            return { isFertile: true, isOvulation: (modDay === cycleLen - 14) };
        }
    }

    return null;
}

// Analiza choques entre el próximo periodo previsto y turnos asignados
export function getUpcomingShiftClashes() {
    const cycle = calculateCycleInfo(new Date());
    const clashes = [];

    const cursor = new Date(cycle.nextStartDate);
    while (cursor <= cycle.nextEndDate) {
        const key = formatDateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        const dayData = state.daysData[key];

        if (dayData && dayData.shiftId && dayData.shiftId !== 'NONE') {
            const shift = state.shifts[dayData.shiftId] || { name: 'Turno', color: '#fde047', short: 'T' };
            clashes.push({
                dateKey: key,
                dateObj: new Date(cursor),
                dayNum: cursor.getDate(),
                shift,
                hours: dayData.hours || shift.defaultHours || 8,
                startTime: dayData.startTime || shift.startTime || '08:00'
            });
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return {
        clashes,
        cycle
    };
}

// RENDERIZADO DE LA PANTALLA COMPLETA DE CICLO
export function renderCycleView() {
    const cycle = calculateCycleInfo(new Date());

    // 1. Tarjeta dial principal
    const dialCard = document.getElementById('cycleDialCard');
    const phase = cycle.phase;
    const isTodayPeriod = getDayCycleStatus(formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))?.isRecordedPeriod;

    if (dialCard) {
        dialCard.style.borderColor = `${phase.color}40`;
        dialCard.innerHTML = `
            <div class="cycle-dial-header">
                <span class="cycle-phase-tag" style="background:${phase.badgeBg}; color:${phase.color}; border: 1px solid ${phase.color}50;">
                    ${phase.emoji} ${phase.name}
                </span>
                <span class="cycle-fertility-badge">Fertilidad: <strong>${cycle.pregnancyChance}</strong></span>
            </div>

            <div class="cycle-circle-dial" style="border-color:${phase.color};">
                <span class="cycle-circle-dial__day">Día ${cycle.cycleDay}</span>
                <span class="cycle-circle-dial__lbl">del ciclo</span>
            </div>

            <div class="cycle-countdown-box">
                <strong style="color:${phase.color}; font-size:1.05rem;">
                    ${cycle.daysUntilNext === 1 ? 'Tu próximo periodo llega mañana' : `Tu próximo periodo llegará en ${cycle.daysUntilNext} días`}
                </strong>
                <p class="panel-card__desc" style="margin-top:3px;">
                    Estimado: <strong>${cycle.nextStartDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</strong>
                </p>
                <p class="cycle-phase-desc">${phase.desc}</p>
            </div>

            <button type="button" id="btnToggleTodayPeriod" class="btn ${isTodayPeriod ? 'btn--primary' : 'btn--outline'}" style="width:100%; margin-top:12px; font-weight:800;">
                ${isTodayPeriod ? '🩸 Periodo registrado hoy (Toca para quitar)' : '+ Registrar inicio de periodo hoy'}
            </button>
        `;

        document.getElementById('btnToggleTodayPeriod').addEventListener('click', toggleTodayPeriod);
    }

    // 2. Alerta de Coincidencia de Turnos Laborales
    const clashContainer = document.getElementById('cycleShiftClashCard');
    if (clashContainer) {
        const { clashes } = getUpcomingShiftClashes();
        if (clashes.length > 0) {
            const nightCount = clashes.filter(c => c.shift.name.toLowerCase().includes('noche') || c.shift.short === 'N').length;
            const nightWarning = nightCount > 0 ? ` (⚠️ incluye <strong>${nightCount} turno(s) de noche</strong>)` : '';

            clashContainer.className = 'panel-card cycle-clash-card cycle-clash-card--alert';
            clashContainer.innerHTML = `
                <div class="cycle-clash-header">
                    <span style="font-size:1.2rem;">⚠️</span>
                    <div>
                        <strong style="color:#f59e0b; font-size:0.88rem;">¡Alerta de coincidencia con turnos!</strong>
                        <p class="panel-card__desc" style="margin:2px 0 0 0;">
                            Tu próximo periodo coincidirá con <strong>${clashes.length} día(s) de trabajo</strong>${nightWarning}.
                        </p>
                    </div>
                </div>
                <div class="cycle-clashes-list">
                    ${clashes.map(c => `
                        <div class="cycle-clash-item">
                            <span class="cycle-clash-date">${c.dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            <span class="shift-color-swatch" style="background:${c.shift.color}; color:${c.shift.textColor || '#000'}; width:28px; height:28px; font-size:0.75rem;">${c.shift.short}</span>
                            <span class="cycle-clash-info"><strong>${c.shift.name}</strong> (${c.hours}h · ${c.startTime})</span>
                        </div>
                    `).join('')}
                </div>
                <p class="cycle-clash-tip">
                    💡 Consejo: Valora solicitar un cambio de turno con antelación o preparar descanso adecuado para esas jornadas.
                </p>
            `;
        } else {
            clashContainer.className = 'panel-card cycle-clash-card cycle-clash-card--ok';
            clashContainer.innerHTML = `
                <div class="cycle-clash-header">
                    <span style="font-size:1.15rem;">✅</span>
                    <div>
                        <strong style="color:#10b981; font-size:0.88rem;">Sin turnos conflictivos</strong>
                        <p class="panel-card__desc" style="margin:2px 0 0 0;">
                            Tu próxima regla estimada (${cycle.nextStartDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al ${cycle.nextEndDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}) coincide con días libres o sin turnos programados.
                        </p>
                    </div>
                </div>
            `;
        }
    }

    // 3. Registro Diario de Síntomas
    renderDailySymptomsTracker();

    // 4. Previsión de los próximos 3 ciclos
    renderForecastCards(cycle);

    // 5. Ajustes de configuración
    renderCycleSettings();
}

function renderDailySymptomsTracker() {
    const container = document.getElementById('cycleSymptomsBox');
    if (!container) return;

    if (!state.cycle.selectedDate) {
        const now = new Date();
        state.cycle.selectedDate = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const selDateKey = state.cycle.selectedDate;
    const [sy, sm, sd] = selDateKey.split('-').map(Number);
    const selDateObj = new Date(sy, sm - 1, sd);
    const log = (state.cycle.logs && state.cycle.logs[selDateKey]) || {
        isPeriod: false,
        flow: 'none',
        symptoms: [],
        mood: ''
    };

    const isToday = selDateKey === formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const dateLabel = isToday
        ? `Hoy (${selDateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})`
        : selDateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

    container.innerHTML = `
        <div class="cycle-sym-topbar">
            <button type="button" id="btnPrevCycleDay" class="icon-btn" title="Día anterior">‹</button>
            <span class="cycle-sym-current-date"><strong>${dateLabel}</strong></span>
            <button type="button" id="btnNextCycleDay" class="icon-btn" title="Día siguiente">›</button>
        </div>

        <div class="cycle-log-group">
            <span class="cycle-log-lbl">Flujo menstrual:</span>
            <div class="flow-pill-row">
                ${FLOW_OPTIONS.map(f => `
                    <button type="button" class="cycle-pill-btn ${(log.flow === f.id || (f.id === 'none' && !log.flow)) ? 'cycle-pill-btn--active' : ''}" data-flow="${f.id}">
                        ${f.label}
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="cycle-log-group" style="margin-top:12px;">
            <span class="cycle-log-lbl">Síntomas físicos:</span>
            <div class="symptom-chips-row">
                ${SYMPTOMS_LIST.map(s => {
                    const active = Array.isArray(log.symptoms) && log.symptoms.includes(s.id);
                    return `
                        <button type="button" class="symptom-chip ${active ? 'symptom-chip--active' : ''}" data-symptom="${s.id}">
                            <span>${s.icon}</span> <span>${s.label}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="cycle-log-group" style="margin-top:12px;">
            <span class="cycle-log-lbl">Estado de ánimo:</span>
            <div class="symptom-chips-row">
                ${MOODS_LIST.map(m => {
                    const active = log.mood === m.id;
                    return `
                        <button type="button" class="symptom-chip ${active ? 'symptom-chip--active' : ''}" data-mood="${m.id}">
                            <span>${m.icon}</span> <span>${m.label}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // Eventos de fecha
    document.getElementById('btnPrevCycleDay').addEventListener('click', () => {
        selDateObj.setDate(selDateObj.getDate() - 1);
        state.cycle.selectedDate = formatDateKey(selDateObj.getFullYear(), selDateObj.getMonth(), selDateObj.getDate());
        renderDailySymptomsTracker();
    });

    document.getElementById('btnNextCycleDay').addEventListener('click', () => {
        selDateObj.setDate(selDateObj.getDate() + 1);
        state.cycle.selectedDate = formatDateKey(selDateObj.getFullYear(), selDateObj.getMonth(), selDateObj.getDate());
        renderDailySymptomsTracker();
    });

    // Eventos de flujo
    container.querySelectorAll('[data-flow]').forEach(btn => {
        btn.addEventListener('click', () => {
            const flow = btn.dataset.flow;
            if (!state.cycle.logs) state.cycle.logs = {};
            if (!state.cycle.logs[selDateKey]) {
                state.cycle.logs[selDateKey] = { isPeriod: false, flow: 'none', symptoms: [], mood: '' };
            }
            state.cycle.logs[selDateKey].flow = flow;
            state.cycle.logs[selDateKey].isPeriod = (flow !== 'none');
            if (state.cycle.logs[selDateKey].isPeriod && !state.cycle.lastPeriodDate) {
                state.cycle.lastPeriodDate = selDateKey;
            }
            saveState();
            triggerRenderAll();
        });
    });

    // Eventos de síntomas
    container.querySelectorAll('[data-symptom]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sym = btn.dataset.symptom;
            if (!state.cycle.logs) state.cycle.logs = {};
            if (!state.cycle.logs[selDateKey]) {
                state.cycle.logs[selDateKey] = { isPeriod: false, flow: 'none', symptoms: [], mood: '' };
            }
            const arr = state.cycle.logs[selDateKey].symptoms || [];
            if (arr.includes(sym)) {
                state.cycle.logs[selDateKey].symptoms = arr.filter(x => x !== sym);
            } else {
                arr.push(sym);
                state.cycle.logs[selDateKey].symptoms = arr;
            }
            saveState();
            renderDailySymptomsTracker();
        });
    });

    // Eventos de estado de ánimo
    container.querySelectorAll('[data-mood]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = btn.dataset.mood;
            if (!state.cycle.logs) state.cycle.logs = {};
            if (!state.cycle.logs[selDateKey]) {
                state.cycle.logs[selDateKey] = { isPeriod: false, flow: 'none', symptoms: [], mood: '' };
            }
            state.cycle.logs[selDateKey].mood = (state.cycle.logs[selDateKey].mood === mood) ? '' : mood;
            saveState();
            renderDailySymptomsTracker();
        });
    });
}

function renderForecastCards(currentCycle) {
    const container = document.getElementById('cycleForecastRow');
    if (!container) return;

    const cards = [];
    const len = currentCycle.cycleLength;
    const pLen = currentCycle.periodLength;

    for (let i = 1; i <= 3; i++) {
        const start = new Date(currentCycle.nextStartDate);
        start.setDate(start.getDate() + (i - 1) * len);

        const end = new Date(start);
        end.setDate(end.getDate() + pLen - 1);

        const ovDate = new Date(start);
        ovDate.setDate(ovDate.getDate() + (len - 14));

        cards.push(`
            <div class="cycle-forecast-card">
                <span class="cycle-forecast-card__title">Ciclo +${i}</span>
                <strong class="cycle-forecast-card__dates">
                    ${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </strong>
                <span class="cycle-forecast-card__sub">Ovulación: ~${ovDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            </div>
        `);
    }

    container.innerHTML = cards.join('');
}

function renderCycleSettings() {
    const cycleLenInput = document.getElementById('cfgCycleLength');
    const periodLenInput = document.getElementById('cfgPeriodLength');
    const lastDateInput = document.getElementById('cfgLastPeriodDate');
    const showCalCheck = document.getElementById('cfgShowCycleCalendar');
    const discreetCheck = document.getElementById('cfgDiscreetCycle');

    if (cycleLenInput) cycleLenInput.value = state.cycle.cycleLength || 28;
    if (periodLenInput) periodLenInput.value = state.cycle.periodLength || 5;
    if (lastDateInput) lastDateInput.value = state.cycle.lastPeriodDate || '';
    if (showCalCheck) showCalCheck.checked = state.cycle.showOnCalendar ?? true;
    if (discreetCheck) discreetCheck.checked = Boolean(state.cycle.discreetMode);
}

function toggleTodayPeriod() {
    const now = new Date();
    const todayKey = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());

    if (!state.cycle.logs) state.cycle.logs = {};
    const existing = state.cycle.logs[todayKey] || { flow: 'none', symptoms: [], mood: '' };

    const newPeriodState = !existing.isPeriod;
    state.cycle.logs[todayKey] = {
        ...existing,
        isPeriod: newPeriodState,
        flow: newPeriodState ? 'medium' : 'none'
    };

    if (newPeriodState) {
        state.cycle.lastPeriodDate = todayKey;
    }

    saveState();
    triggerRenderAll();
}

export function bindCycleEvents() {
    const saveSettings = () => {
        state.cycle.cycleLength = parseInt(document.getElementById('cfgCycleLength').value, 10) || 28;
        state.cycle.periodLength = parseInt(document.getElementById('cfgPeriodLength').value, 10) || 5;
        state.cycle.lastPeriodDate = document.getElementById('cfgLastPeriodDate').value;
        state.cycle.showOnCalendar = document.getElementById('cfgShowCycleCalendar').checked;
        state.cycle.discreetMode = document.getElementById('cfgDiscreetCycle').checked;
        saveState();
        triggerRenderAll();
    };

    ['cfgCycleLength', 'cfgPeriodLength', 'cfgLastPeriodDate', 'cfgShowCycleCalendar', 'cfgDiscreetCycle'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveSettings);
    });
}
