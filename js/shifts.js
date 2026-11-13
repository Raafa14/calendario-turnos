import {
    state,
    COLOR_PALETTE,
    saveState,
    getContrastText,
    formatDateKey,
    triggerRenderAll,
    triggerSwitchTab
} from './state.js';

export function initPatternDefaultDate() {
    const now = new Date();
    document.getElementById('patternStartDate').value = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function initColorPalette() {
    const grid = document.getElementById('colorPaletteGrid');
    grid.innerHTML = '';
    COLOR_PALETTE.forEach(hex => {
        const dot = document.createElement('div');
        dot.className = 'palette-dot';
        dot.style.backgroundColor = hex;
        dot.addEventListener('click', () => { document.getElementById('cfgShiftColor').value = hex; });
        grid.appendChild(dot);
    });
}

export function renderShiftsConfigList() {
    const container = document.getElementById('shiftsConfigList');
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
                <div class="shift-color-swatch" style="background:${shift.color}; color:${shift.textColor}">${shift.short}</div>
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

export function renderPatternGenerator() {
    const btnsContainer = document.getElementById('patternShiftButtons');
    const seqContainer = document.getElementById('patternSequenceDisplay');
    const lenBadge = document.getElementById('patternLengthBadge');

    btnsContainer.innerHTML = '';
    Object.values(state.shifts).forEach(shift => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pattern-add-btn';
        if (shift.id !== 'NONE') {
            btn.style.backgroundColor = shift.color;
            btn.style.color = shift.textColor || getContrastText(shift.color);
            btn.style.borderColor = 'rgba(0,0,0,0.12)';
        }
        btn.innerHTML = `<strong>${shift.short}</strong> <span>${shift.id === 'NONE' ? 'Vacío' : shift.name}</span>`;
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
        seqContainer.innerHTML = '<span class="pattern-empty-hint">Pulsa los turnos de arriba para crear tu ciclo...</span>';
        return;
    }

    state.patternSequence.forEach((shiftId, idx) => {
        const s = state.shifts[shiftId] || state.shifts.NONE;
        const chip = document.createElement('span');
        chip.className = 'pattern-chip';
        chip.textContent = s.short;
        if (s.id !== 'NONE') {
            chip.style.backgroundColor = s.color;
            chip.style.color = s.textColor || getContrastText(s.color);
        } else {
            chip.style.backgroundColor = 'var(--bg-card)';
            chip.style.color = 'var(--text-secondary)';
        }
        chip.title = `Día ${idx + 1}: ${s.name}`;
        seqContainer.appendChild(chip);
    });
}

function applyPatternToCalendar() {
    if (state.patternSequence.length === 0) {
        alert('Añade al menos un turno a la secuencia pulsando los botones de arriba.');
        return;
    }

    const startVal = document.getElementById('patternStartDate').value;
    if (!startVal) {
        alert('Selecciona una fecha de inicio.');
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

    if (!confirm(`Se aplicará tu ciclo de ${state.patternSequence.length} días durante ${totalDaysToFill} jornadas a partir del ${sd}/${sm}/${sy}. ¿Continuar?`)) {
        return;
    }

    for (let i = 0; i < totalDaysToFill; i++) {
        const targetDate = new Date(sy, sm - 1, sd + i);
        const key = formatDateKey(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const shiftId = state.patternSequence[i % state.patternSequence.length];
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

function openShiftConfigModal(shiftId = null) {
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
    document.getElementById('shiftConfigModal').classList.add('modal--open');
}

export function bindShiftEvents() {
    document.getElementById('btnNewShift').addEventListener('click', () => openShiftConfigModal(null));
    document.getElementById('btnCloseShiftModal').addEventListener('click', () => {
        document.getElementById('shiftConfigModal').classList.remove('modal--open');
    });

    document.getElementById('shiftConfigForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = state.editingShiftId || ('S_' + Date.now());
        const color = document.getElementById('cfgShiftColor').value;
        state.shifts[id] = {
            id,
            name: document.getElementById('cfgShiftName').value.trim(),
            short: document.getElementById('cfgShiftShort').value.trim().toUpperCase(),
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
}