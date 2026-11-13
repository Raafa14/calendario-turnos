import {
    state,
    COLOR_PALETTE,
    saveState,
    getContrastText,
    formatDateKey,
    triggerRenderAll,
    triggerSwitchTab
} from './state.js';

// Plantillas predefinidas para crear turnos rápidamente con 1 toque
export const SHIFT_TEMPLATES = [
    { name: 'Mañana 7:00', short: '7AM', color: '#fef08a', hours: 8, start: '07:00', alarm: '05:30' },
    { name: 'Tarde 15:00', short: '15T', color: '#fbcfe8', hours: 8, start: '15:00', alarm: '13:30' },
    { name: 'Noche 23:00', short: '23N', color: '#a5f3fc', hours: 8, start: '23:00', alarm: '21:30' },
    { name: 'Partida',     short: 'PAR', color: '#fed7aa', hours: 8, start: '09:00', alarm: '07:30' },
    { name: 'Guardia 12h', short: 'G12', color: '#fca5a5', hours: 12, start: '08:00', alarm: '06:30' },
    { name: 'Libre',       short: 'LIB', color: '#bbf7d0', hours: 0, start: '00:00', alarm: '09:00' }
];

export function initPatternDefaultDate() {
    const now = new Date();
    const el = document.getElementById('patternStartDate');
    if (el) el.value = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function initColorPalette() {
    const grid = document.getElementById('colorPaletteGrid');
    if (!grid) return;
    grid.innerHTML = '';
    COLOR_PALETTE.forEach(hex => {
        const dot = document.createElement('div');
        dot.className = 'palette-dot';
        dot.style.backgroundColor = hex;
        dot.title = hex;
        dot.addEventListener('click', () => {
            document.getElementById('cfgShiftColor').value = hex;
            updateShiftModalPreview();
        });
        grid.appendChild(dot);
    });
}

export function renderShiftTemplates() {
    const container = document.getElementById('shiftTemplatesRow');
    if (!container) return;
    container.innerHTML = '';

    SHIFT_TEMPLATES.forEach(tpl => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shift-template-pill';
        btn.innerHTML = `
            <span class="shift-template-pill__badge" style="background:${tpl.color}; color:${getContrastText(tpl.color)};">
                ${tpl.short}
            </span>
            <span>${tpl.name}</span>
        `;
        btn.addEventListener('click', () => {
            document.getElementById('cfgShiftName').value = tpl.name;
            document.getElementById('cfgShiftShort').value = tpl.short;
            document.getElementById('cfgShiftColor').value = tpl.color;
            document.getElementById('cfgShiftHours').value = tpl.hours;
            document.getElementById('cfgShiftStart').value = tpl.start;
            document.getElementById('cfgShiftAlarm').value = tpl.alarm;
            updateShiftModalPreview();
        });
        container.appendChild(btn);
    });
}

export function updateShiftModalPreview() {
    const swatch = document.getElementById('shiftPreviewSwatch');
    const nameEl = document.getElementById('shiftPreviewName');
    const detEl = document.getElementById('shiftPreviewDetails');
    if (!swatch || !nameEl || !detEl) return;

    let short = (document.getElementById('cfgShiftShort').value || '7AM').trim().toUpperCase();
    if (short.length > 3) short = short.substring(0, 3);

    const name = document.getElementById('cfgShiftName').value.trim() || 'Nombre del turno';
    const color = document.getElementById('cfgShiftColor').value || '#fde047';
    const hours = parseFloat(document.getElementById('cfgShiftHours').value) || 0;
    const start = document.getElementById('cfgShiftStart').value || '08:00';
    const alarm = document.getElementById('cfgShiftAlarm').value || '06:00';
    const txtColor = getContrastText(color);

    swatch.style.backgroundColor = color;
    swatch.style.color = txtColor;
    swatch.textContent = short;
    if (short.length >= 3) {
        swatch.style.fontSize = '0.86rem';
        swatch.style.letterSpacing = '-0.5px';
    } else {
        swatch.style.fontSize = '1.1rem';
        swatch.style.letterSpacing = 'normal';
    }

    nameEl.textContent = name;
    detEl.textContent = `${hours}h · Entrada ${start} · Alarma ${alarm}`;
}

export function renderShiftsConfigList() {
    const container = document.getElementById('shiftsConfigList');
    if (!container) return;
    container.innerHTML = '';

    Object.values(state.shifts).forEach(shift => {
        if (shift.id === 'NONE') return;

        const hasRate = Number(shift.customRate) > 0;
        const hasPlus = Number(shift.shiftPlus) > 0;
        let econBadge = '';
        if (hasRate || hasPlus) {
            const parts = [];
            if (hasRate) parts.push(`${Number(shift.customRate).toFixed(2)} €/h`);
            if (hasPlus) parts.push(`+${Number(shift.shiftPlus).toFixed(2)} € plus`);
            econBadge = `<div class="shift-rate-badge">${parts.join(' · ')}</div>`;
        }

        const row = document.createElement('div');
        row.className = 'shift-row-item';
        row.innerHTML = `
            <div class="shift-row-item__left">
                <div class="shift-color-swatch" style="background:${shift.color}; color:${shift.textColor || getContrastText(shift.color)};">
                    ${shift.short}
                </div>
                <div>
                    <strong>${shift.name}</strong>
                    <div style="font-size:0.72rem; color:var(--text-secondary);">${shift.defaultHours}h · Entrada ${shift.startTime} · Alarma ${shift.alarmTime}</div>
                    ${econBadge}
                </div>
            </div>
            <button type="button" class="btn btn--sm btn--outline">Editar</button>
        `;
        row.querySelector('button').addEventListener('click', () => openShiftConfigModal(shift.id));
        container.appendChild(row);
    });
}

const POPULAR_CYCLES = {
    '5x2': {
        name: '5x2 Estándar',
        keys: ['M', 'M', 'M', 'M', 'M', 'L', 'L']
    },
    '6x4': {
        name: '6x4 Rotativo',
        keys: ['M', 'M', 'T', 'T', 'N', 'N', 'L', 'L', 'L', 'L']
    },
    'MTNL': {
        name: 'M - T - N - L',
        keys: ['M', 'T', 'N', 'L']
    },
    '4x2': {
        name: '4x2 Rotativo',
        keys: ['M', 'M', 'T', 'T', 'L', 'L']
    },
    '7x7': {
        name: '7x7 Noches',
        keys: ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'L', 'L', 'L', 'L', 'L', 'L', 'L']
    }
};

function resolveShiftIdFromKey(key) {
    const shifts = state.shifts;
    if (shifts[key]) return key;
    const matchByShort = Object.values(shifts).find(s => s.short && s.short.toUpperCase() === key.toUpperCase());
    if (matchByShort) return matchByShort.id;
    if (key === 'M') {
        const found = Object.values(shifts).find(s => s.name.toLowerCase().includes('mañana'));
        if (found) return found.id;
    }
    if (key === 'T' || key === 'A') {
        const found = Object.values(shifts).find(s => s.name.toLowerCase().includes('tarde'));
        if (found) return found.id;
    }
    if (key === 'N') {
        const found = Object.values(shifts).find(s => s.name.toLowerCase().includes('noche'));
        if (found) return found.id;
    }
    if (key === 'L') {
        const found = Object.values(shifts).find(s => s.name.toLowerCase().includes('libre') || s.name.toLowerCase().includes('descanso'));
        if (found) return found.id;
    }
    return 'NONE';
}

function applyPopularCycle(presetKey) {
    const cycle = POPULAR_CYCLES[presetKey];
    if (!cycle) return;
    state.patternSequence = cycle.keys.map(k => resolveShiftIdFromKey(k));
    saveState();
    renderPatternGenerator();
}

function deletePatternDay(index) {
    state.patternSequence.splice(index, 1);
    saveState();
    renderPatternGenerator();
}

function updatePatternSummary() {
    const summaryEl = document.getElementById('patternLiveSummary');
    if (!summaryEl) return;

    if (state.patternSequence.length === 0) {
        summaryEl.className = 'pattern-summary-card';
        summaryEl.innerHTML = `
            <div style="font-size:0.75rem; color:var(--text-secondary); text-align:center; padding:4px 0;">
                Elige una plantilla o añade días a tu ciclo para ver aquí el resumen en tiempo real.
            </div>
        `;
        return;
    }

    const startVal = document.getElementById('patternStartDate')?.value;
    if (!startVal) {
        summaryEl.className = 'pattern-summary-card';
        summaryEl.innerHTML = `<div style="font-size:0.75rem; color:var(--text-secondary);">Selecciona una fecha de inicio arriba.</div>`;
        return;
    }

    const [sy, sm, sd] = startVal.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const durationVal = document.getElementById('patternDurationSelect')?.value || '14';

    let totalDaysToFill = 0;
    if (durationVal === 'month') {
        const lastDayOfMonth = new Date(sy, sm, 0).getDate();
        totalDaysToFill = Math.max(1, (lastDayOfMonth - sd) + 1);
    } else {
        totalDaysToFill = parseInt(durationVal, 10) || 14;
    }

    const endDate = new Date(sy, sm - 1, sd + totalDaysToFill - 1);
    const endStr = `${String(endDate.getDate()).padStart(2, '0')}/${String(endDate.getMonth() + 1).padStart(2, '0')}/${endDate.getFullYear()}`;
    const startStr = `${String(sd).padStart(2, '0')}/${String(sm).padStart(2, '0')}/${sy}`;

    const cycleLen = state.patternSequence.length;
    const repetitions = (totalDaysToFill / cycleLen).toFixed(1).replace('.0', '');

    const shiftCounts = {};
    let totalEstHours = 0;
    let workDaysCount = 0;

    for (let i = 0; i < totalDaysToFill; i++) {
        const shiftId = state.patternSequence[i % cycleLen];
        const s = state.shifts[shiftId] || state.shifts.NONE;
        shiftCounts[s.id] = (shiftCounts[s.id] || 0) + 1;
        const h = Number(s.defaultHours) || 0;
        totalEstHours += h;
        if (h > 0 || ['M', 'A', 'N', 'T'].includes(s.short)) {
            workDaysCount++;
        }
    }

    const pillsHtml = Object.entries(shiftCounts).map(([sId, count]) => {
        const s = state.shifts[sId] || state.shifts.NONE;
        const color = s.id !== 'NONE' ? s.color : 'transparent';
        return `<span class="pattern-sum-pill" style="border-left: 4px solid ${color};">
            <strong>${count}x</strong> ${s.name}
        </span>`;
    }).join('');

    summaryEl.className = 'pattern-summary-card pattern-summary-card--ready';
    summaryEl.innerHTML = `
        <div class="pattern-sum-top">
            <strong style="font-size:0.8rem; color:var(--text-primary);">Resumen de aplicación:</strong>
            <span class="pattern-sum-days-badge">${totalDaysToFill} días</span>
        </div>
        <p class="pattern-sum-desc">
            Se rellenarán desde el <strong>${startStr}</strong> hasta el <strong>${endStr}</strong>.<br>
            Tu ciclo de ${cycleLen} días se repetirá <strong>${repetitions} veces</strong> en bucle.
        </p>
        <div class="pattern-sum-pills-row" style="margin-bottom:6px;">
            ${pillsHtml}
        </div>
        <div style="font-size:0.72rem; color:var(--text-secondary); display:flex; justify-content:space-between; border-top:1px dashed var(--border-color); padding-top:5px; margin-top:5px;">
            <span>💼 <strong>${workDaysCount}</strong> jornadas de trabajo</span>
            <span>⏱️ <strong>${totalEstHours}h</strong> estimadas</span>
        </div>
    `;
}

export function renderPatternGenerator() {
    const btnsContainer = document.getElementById('patternShiftButtons');
    const seqContainer = document.getElementById('patternSequenceDisplay');
    const lenBadge = document.getElementById('patternLengthBadge');
    if (!btnsContainer || !seqContainer || !lenBadge) return;

    btnsContainer.innerHTML = '';
    Object.values(state.shifts).forEach(shift => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pattern-add-btn';
        if (shift.id !== 'NONE') {
            btn.style.backgroundColor = shift.color;
            btn.style.color = shift.textColor || getContrastText(shift.color);
        } else {
            btn.style.backgroundColor = 'var(--bg-card)';
            btn.style.color = 'var(--text-secondary)';
        }
        btn.innerHTML = `<span class="pattern-add-plus">+</span><strong>${shift.short}</strong> <span>${shift.id === 'NONE' ? 'Vacío' : shift.name}</span>`;
        btn.addEventListener('click', () => {
            state.patternSequence.push(shift.id);
            saveState();
            renderPatternGenerator();
        });
        btnsContainer.appendChild(btn);
    });

    lenBadge.textContent = state.patternSequence.length;
    seqContainer.innerHTML = '';

    if (state.patternSequence.length === 0) {
        seqContainer.innerHTML = `
            <div style="text-align:center; width:100%; padding:14px 6px; color:var(--text-secondary); font-size:0.75rem;">
                👉 <strong>Ciclo vacío:</strong> Selecciona una plantilla rápida (ej. <em>5x2</em> o <em>6x4</em>) o pulsa en los turnos de arriba para armar tu ciclo día a día.
            </div>
        `;
        updatePatternSummary();
        return;
    }

    state.patternSequence.forEach((shiftId, idx) => {
        const s = state.shifts[shiftId] || state.shifts.NONE;
        const chip = document.createElement('div');
        chip.className = 'pattern-step-chip';

        const bg = s.id !== 'NONE' ? s.color : 'var(--bg-card)';
        const fg = s.id !== 'NONE' ? (s.textColor || getContrastText(s.color)) : 'var(--text-secondary)';

        chip.innerHTML = `
            <span class="pattern-step-chip__day">Día ${idx + 1}</span>
            <div class="pattern-step-chip__badge" style="background:${bg}; color:${fg};">
                <strong>${s.short}</strong>
                <span>${s.id === 'NONE' ? 'Vacío' : s.name}</span>
            </div>
            <button type="button" class="pattern-step-chip__del" title="Eliminar este día">&times;</button>
        `;

        chip.querySelector('.pattern-step-chip__del').addEventListener('click', (e) => {
            e.stopPropagation();
            deletePatternDay(idx);
        });

        seqContainer.appendChild(chip);

        if (idx < state.patternSequence.length - 1) {
            const arrow = document.createElement('span');
            arrow.className = 'pattern-step-arrow';
            arrow.innerHTML = '➔';
            seqContainer.appendChild(arrow);
        } else {
            const loop = document.createElement('span');
            loop.className = 'pattern-loop-tag';
            loop.innerHTML = '🔁 En bucle';
            seqContainer.appendChild(loop);
        }
    });

    updatePatternSummary();
}

function applyPatternToCalendar() {
    if (state.patternSequence.length === 0) {
        alert('Añade al menos un turno a tu ciclo o selecciona una plantilla rápida.');
        return;
    }

    const startVal = document.getElementById('patternStartDate').value;
    if (!startVal) {
        alert('Por favor selecciona una fecha de inicio.');
        return;
    }

    const [sy, sm, sd] = startVal.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const durationVal = document.getElementById('patternDurationSelect').value;

    let totalDaysToFill = 0;
    if (durationVal === 'month') {
        const lastDayOfMonth = new Date(sy, sm, 0).getDate();
        totalDaysToFill = Math.max(1, (lastDayOfMonth - sd) + 1);
    } else {
        totalDaysToFill = parseInt(durationVal, 10) || 14;
    }

    const cycleLen = state.patternSequence.length;
    const endDate = new Date(sy, sm - 1, sd + totalDaysToFill - 1);
    const startStr = `${String(sd).padStart(2, '0')}/${String(sm).padStart(2, '0')}/${sy}`;
    const endStr = `${String(endDate.getDate()).padStart(2, '0')}/${String(endDate.getMonth() + 1).padStart(2, '0')}/${endDate.getFullYear()}`;

    if (!confirm(`¿Aplicar este ciclo de ${cycleLen} días durante ${totalDaysToFill} jornadas?\n\n📅 Del ${startStr} al ${endStr}\n\nLos turnos de esos días en el calendario se actualizarán automáticamente.`)) {
        return;
    }

    for (let i = 0; i < totalDaysToFill; i++) {
        const targetDate = new Date(sy, sm - 1, sd + i);
        const key = formatDateKey(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const shiftId = state.patternSequence[i % cycleLen];
        const shift = state.shifts[shiftId] || state.shifts.NONE;

        if (shift.id === 'NONE') {
            delete state.daysData[key];
        } else {
            const existing = state.daysData[key] || {};
            state.daysData[key] = {
                shiftId: shift.id,
                useCustomColor: false,
                customBgColor: '#ffe082',
                workoutGroup: existing.workoutGroup || '',
                creatineTaken: existing.creatineTaken || false,
                hours: Number(shift.defaultHours) || 0,
                extraHours: 0,
                hourlyRate: (Number(shift.customRate) > 0) ? Number(shift.customRate) : state.hourlyRate,
                extraRate: state.extraRate,
                shiftPlus: Number(shift.shiftPlus) || 0,
                tips: existing.tips || 0,
                alarmEnabled: false,
                startTime: shift.startTime || '08:00',
                alarmTime: shift.alarmTime || '06:00',
                customText: existing.customText || '',
                fontSize: existing.fontSize || 13,
                prioritizeText: existing.prioritizeText ?? true,
                sticker: existing.sticker || ''
            };
        }
    }

    state.currentYear = startDate.getFullYear();
    state.currentMonth = startDate.getMonth();
    saveState();
    triggerRenderAll();
    triggerSwitchTab('calendarView');
}

export function openShiftConfigModal(shiftId = null) {
    state.editingShiftId = shiftId;
    const isNew = !shiftId;
    const s = isNew
        ? { name: '', short: '', color: '#fde047', defaultHours: 8, startTime: '08:00', alarmTime: '06:00', customRate: 0, shiftPlus: 0 }
        : state.shifts[shiftId];

    document.getElementById('shiftModalTitle').textContent = isNew ? 'Crear Nuevo Turno' : `Editar (${s.name})`;
    document.getElementById('cfgShiftName').value = s.name;
    document.getElementById('cfgShiftShort').value = s.short;
    document.getElementById('cfgShiftColor').value = s.color;
    document.getElementById('cfgShiftHours').value = s.defaultHours;
    document.getElementById('cfgShiftStart').value = s.startTime;
    document.getElementById('cfgShiftRate').value = Number(s.customRate) > 0 ? s.customRate : '';
    document.getElementById('cfgShiftPlus').value = Number(s.shiftPlus) || 0;
    document.getElementById('cfgShiftAlarm').value = s.alarmTime;
    document.getElementById('btnDeleteShiftType').style.display = isNew ? 'none' : 'block';

    renderShiftTemplates();
    updateShiftModalPreview();
    document.getElementById('shiftConfigModal').classList.add('modal--open');
}

export function bindShiftEvents() {
    document.getElementById('btnNewShift').addEventListener('click', () => openShiftConfigModal(null));
    document.getElementById('btnCloseShiftModal').addEventListener('click', () => {
        document.getElementById('shiftConfigModal').classList.remove('modal--open');
    });

    // Actualización en tiempo real de la vista previa del modal
    ['cfgShiftName', 'cfgShiftShort', 'cfgShiftColor', 'cfgShiftHours', 'cfgShiftStart', 'cfgShiftAlarm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateShiftModalPreview);
            el.addEventListener('change', updateShiftModalPreview);
        }
    });

    document.getElementById('shiftConfigForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = state.editingShiftId || ('S_' + Date.now());
        const color = document.getElementById('cfgShiftColor').value;
        let short = document.getElementById('cfgShiftShort').value.trim().toUpperCase();
        if (short.length > 3) short = short.substring(0, 3);

        state.shifts[id] = {
            id,
            name: document.getElementById('cfgShiftName').value.trim(),
            short,
            color,
            textColor: getContrastText(color),
            defaultHours: parseFloat(document.getElementById('cfgShiftHours').value) || 0,
            startTime: document.getElementById('cfgShiftStart').value || '08:00',
            customRate: parseFloat(document.getElementById('cfgShiftRate').value) || 0,
            shiftPlus: parseFloat(document.getElementById('cfgShiftPlus').value) || 0,
            alarmTime: document.getElementById('cfgShiftAlarm').value || '06:00'
        };
        saveState();
        triggerRenderAll();
        document.getElementById('shiftConfigModal').classList.remove('modal--open');
    });

    document.getElementById('btnDeleteShiftType').addEventListener('click', () => {
        if (state.editingShiftId && state.editingShiftId !== 'NONE') {
            if (!confirm(`¿Eliminar el turno "${state.shifts[state.editingShiftId]?.name}"?`)) return;
            delete state.shifts[state.editingShiftId];
            state.patternSequence = state.patternSequence.filter(pid => pid !== state.editingShiftId);
            saveState();
            triggerRenderAll();
            document.getElementById('shiftConfigModal').classList.remove('modal--open');
        }
    });

    document.getElementById('btnPatternUndo').addEventListener('click', () => {
        state.patternSequence.pop();
        saveState();
        renderPatternGenerator();
    });

    document.getElementById('btnPatternClear').addEventListener('click', () => {
        state.patternSequence = [];
        saveState();
        renderPatternGenerator();
    });

    document.getElementById('btnApplyPattern').addEventListener('click', applyPatternToCalendar);

    // Eventos del generador intuitivo de patrones
    document.querySelectorAll('[data-pattern-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            applyPopularCycle(btn.dataset.patternPreset);
        });
    });

    const btnToday = document.getElementById('btnPatternToday');
    if (btnToday) {
        btnToday.addEventListener('click', () => {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const dateInput = document.getElementById('patternStartDate');
            if (dateInput) {
                dateInput.value = `${y}-${m}-${d}`;
                updatePatternSummary();
            }
        });
    }

    const dateInput = document.getElementById('patternStartDate');
    if (dateInput) {
        dateInput.addEventListener('change', updatePatternSummary);
        dateInput.addEventListener('input', updatePatternSummary);
    }

    const durSelect = document.getElementById('patternDurationSelect');
    if (durSelect) {
        durSelect.addEventListener('change', updatePatternSummary);
    }
}
