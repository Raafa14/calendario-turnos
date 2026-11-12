const STORAGE_KEY = 'calendario_turnos_pro_v3';

// TURNOS POR DEFECTO (Totalmente editables en color, letra y horario desde "Mis Turnos")
const DEFAULT_SHIFTS = {
    NONE: { id: 'NONE', name: 'Ninguno',    short: '-', color: '#ffffff', textColor: '#1e293b', defaultHours: 0, startTime: '08:00', alarmTime: '06:00' },
    M:    { id: 'M',    name: 'Mañana',     short: 'M', color: '#fef08a', textColor: '#713f12', defaultHours: 8, startTime: '08:00', alarmTime: '06:00' },
    A:    { id: 'A',    name: 'Tarde',      short: 'A', color: '#fbcfe8', textColor: '#831843', defaultHours: 8, startTime: '15:00', alarmTime: '13:00' },
    N:    { id: 'N',    name: 'Noche',      short: 'N', color: '#a5f3fc', textColor: '#164e63', defaultHours: 8, startTime: '22:00', alarmTime: '20:00' },
    L:    { id: 'L',    name: 'Libre',      short: 'L', color: '#bbf7d0', textColor: '#14532d', defaultHours: 0, startTime: '00:00', alarmTime: '09:00' },
    V:    { id: 'V',    name: 'Vacaciones', short: 'V', color: '#ddd6fe', textColor: '#4c1d95', defaultHours: 0, startTime: '00:00', alarmTime: '09:00' }
};

const COLOR_PALETTE = [
    '#fef08a', '#fde047', '#fed7aa', '#fdba74',
    '#fbcfe8', '#f9a8d4', '#fecdd3', '#fca5a5',
    '#a5f3fc', '#7dd3fc', '#bfdbfe', '#c7d2fe',
    '#ddd6fe', '#f5d0fe', '#bbf7d0', '#86efac',
    '#e2e8f0', '#cbd5e1'
];

const STICKERS = ['', '🎂', '🏥', '🎉', '⚠️', '🏋️', '✈️', '🍻', '❤️', '⭐'];

const state = {
    monthlyGoal: 1200,
    statsPin: null,
    statsUnlocked: false,
    repeatSelectedDows: [],
    theme: 'light',
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    shifts: JSON.parse(JSON.stringify(DEFAULT_SHIFTS)),
    daysData: {}, // Calendario 100% vacío de fábrica
    hourlyRate: 10,
    extraRate: 12,
    // Estado temporal del modal de Día
    editingDateKey: null,
    modalSelectedShift: 'NONE',
    modalSelectedSticker: '',
    // Estado temporal del modal de Turno
    editingShiftId: null
};

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    applyTheme();
    initStickerSelector();
    initColorPalette();
    initDayQuickPalette();
    bindEvents();
    renderAll();
});

// 1. PERSISTENCIA Y TEMA
function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        state.theme = parsed.theme || 'light';
        state.shifts = parsed.shifts || JSON.parse(JSON.stringify(DEFAULT_SHIFTS));
        state.daysData = parsed.daysData || {};
        state.hourlyRate = parsed.hourlyRate ?? 10;
        state.extraRate = parsed.extraRate ?? 12;
        state.monthlyGoal = parsed.monthlyGoal ?? 1200;
        state.statsPin = parsed.statsPin || null;
    } catch (err) {
        console.error('Error leyendo localStorage:', err);
    }
    const goalInput = document.getElementById('monthlyGoalInput');
    if (goalInput) goalInput.value = state.monthlyGoal;
    updatePinUI();
    document.getElementById('hourlyRateInput').value = state.hourlyRate;
    document.getElementById('extraRateInput').value = state.extraRate;
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme: state.theme,
        shifts: state.shifts,
        daysData: state.daysData,
        hourlyRate: state.hourlyRate,
        extraRate: state.extraRate,
        monthlyGoal: state.monthlyGoal,
        statsPin: state.statsPin
    }));
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const btn = document.getElementById('btnThemeToggle');
    btn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

// Calcula contraste oscuro/claro para texto sobre cualquier color hex
function getContrastText(hexColor) {
    if (!hexColor || hexColor === '#ffffff') return '#1e293b';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 255;
    const g = parseInt(hex.substring(2, 4), 16) || 255;
    const b = parseInt(hex.substring(4, 6), 16) || 255;
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 145 ? '#1e293b' : '#ffffff';
}

function formatDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 2. RENDERIZADO GENERAL
function renderAll() {
    renderCalendar();
    renderTomorrowBanner();
    renderStats();
    renderShiftsConfigList();
}

function renderCalendar() {
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    document.getElementById('currentMonthLabel').textContent = `${months[state.currentMonth]} ${state.currentYear}`;

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const firstDay = new Date(state.currentYear, state.currentMonth, 1).getDay();
    const offset = (firstDay === 0) ? 6 : firstDay - 1;
    const totalDays = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();

    const now = new Date();
    const todayKey = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell day-cell--empty';
        grid.appendChild(empty);
    }

    for (let day = 1; day <= totalDays; day++) {
        const dateKey = formatDateKey(state.currentYear, state.currentMonth, day);
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (dateKey === todayKey) cell.classList.add('day-cell--today');

        paintCell(cell, day, state.daysData[dateKey]);

        // Al pulsar una casilla se abre directamente el modal de edición
        cell.addEventListener('click', () => openDayModal(dateKey, day));
        grid.appendChild(cell);
    }
}

function initDayQuickPalette() {
    const container = document.getElementById('dayQuickPalette');
    if (!container) return;
    container.innerHTML = '';
    COLOR_PALETTE.forEach(hex => {
        const dot = document.createElement('div');
        dot.className = 'day-Quick-dot';
        dot.style.backgroundColor = hex;
        dot.addEventListener('click', () => {
            document.getElementById('dayUseCustomColor').checked = true;
            document.getElementById('dayCustomBgColor').value = hex;
            document.getElementById('dayColorHexLabel').textContent = hex.toUpperCase();
            updateLivePreview();
        });
        container.appendChild(dot);
    });
}

function paintCell(cellEl, dayNumber, info) {
    cellEl.innerHTML = '';
    const shift = (info && state.shifts[info.shiftId]) ? state.shifts[info.shiftId] : state.shifts.NONE;

    // Color de fondo: Color personalizado del día o color del turno
    let bgColor = '';
    let txtColor = '';
    if (info && info.useCustomColor && info.customBgColor) {
        bgColor = info.customBgColor;
        txtColor = getContrastText(bgColor);
    } else if (shift && shift.id !== 'NONE') {
        bgColor = shift.color;
        txtColor = shift.textColor || getContrastText(shift.color);
    }

    cellEl.style.backgroundColor = bgColor;
    cellEl.style.color = txtColor;

    // Fila Superior: Alarma a la izquierda y número de día a la derecha (como en tu foto 1)
    const top = document.createElement('div');
    top.className = 'day-cell__top';

    const alarmBadge = document.createElement('span');
    if (info && info.alarmEnabled && info.alarmTime) {
        alarmBadge.className = 'day-cell__alarm';
        alarmBadge.textContent = `⏰${info.alarmTime}`;
    }
    top.appendChild(alarmBadge);

    const dayNumSpan = document.createElement('span');
    dayNumSpan.textContent = dayNumber;
    top.appendChild(dayNumSpan);
    cellEl.appendChild(top);

    // Centro de la casilla
    const middle = document.createElement('div');
    middle.className = 'day-cell__middle';

    const hasText = info && info.customText && info.customText.trim() !== '';
    const prioritize = info ? info.prioritizeText : true;
    const hasShiftLetter = shift && shift.id !== 'NONE' && shift.short && shift.short !== '-';

    if (hasText && prioritize) {
        const noteSpan = document.createElement('span');
        noteSpan.className = 'day-cell__note';
        noteSpan.style.fontSize = `${info.fontSize || 13}px`;
        noteSpan.textContent = info.customText;
        middle.appendChild(noteSpan);
    } else if (hasShiftLetter) {
        const letterSpan = document.createElement('span');
        letterSpan.className = 'day-cell__letter';
        letterSpan.textContent = shift.short;
        middle.appendChild(letterSpan);
        if (hasText) {
            const subNote = document.createElement('span');
            subNote.className = 'day-cell__note';
            subNote.style.fontSize = `${info.fontSize || 11}px`;
            subNote.textContent = info.customText;
            middle.appendChild(subNote);
        }
    } else if (hasText) {
        const noteSpan = document.createElement('span');
        noteSpan.className = 'day-cell__note';
        noteSpan.style.fontSize = `${info.fontSize || 13}px`;
        noteSpan.textContent = info.customText;
        middle.appendChild(noteSpan);
    }

    if (info && info.sticker) {
        const st = document.createElement('span');
        st.className = 'day-cell__sticker';
        st.textContent = info.sticker;
        middle.appendChild(st);
    }
    cellEl.appendChild(middle);

    // Fila Inferior: Etiqueta EXTRA, letra achicada si hay texto grande, y horas
    const bottom = document.createElement('div');
    bottom.className = 'day-cell__bottom';

    if (info && Number(info.extraHours) > 0) {
        const extraTag = document.createElement('span');
        extraTag.className = 'extra-pill';
        extraTag.textContent = 'EXTRA';
        bottom.appendChild(extraTag);
    } else if (hasText && prioritize && hasShiftLetter) {
        const miniShift = document.createElement('span');
        miniShift.className = 'mini-shift-tag';
        miniShift.textContent = shift.short;
        bottom.appendChild(miniShift);
    }

    const totalH = (info ? (Number(info.hours) || 0) + (Number(info.extraHours) || 0) : 0);
    if (totalH > 0) {
        const hSpan = document.createElement('span');
        hSpan.className = 'hours-tag';
        hSpan.textContent = `${totalH}h`;
        bottom.appendChild(hSpan);
    }

    cellEl.appendChild(bottom);
}

// 3. MODAL DETALLE DE JORNADA (FOTO 1)
function renderShiftCardsInModal() {
    const container = document.getElementById('modalShiftSelector');
    container.innerHTML = '';

    Object.values(state.shifts).forEach(shift => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shift-card-btn';
        if (state.modalSelectedShift === shift.id) btn.classList.add('shift-card-btn--active');

        if (shift.id !== 'NONE') {
            btn.style.backgroundColor = shift.color;
            btn.style.color = shift.textColor || getContrastText(shift.color);
        }

        btn.innerHTML = `
            <span class="shift-card-btn__short">${shift.short}</span>
            <span class="shift-card-btn__name">${shift.name}</span>
        `;

        btn.addEventListener('click', () => {
            state.modalSelectedShift = shift.id;
            // Autocompletar horas, hora de entrada y alarma sugerida del turno
            document.getElementById('dayHours').value = shift.defaultHours ?? 0;
            document.getElementById('dayStartTime').value = shift.startTime || '08:00';
            document.getElementById('dayAlarmTime').value = shift.alarmTime || '06:00';
            updateAlarmHintText();
            renderShiftCardsInModal();
            updateLivePreview();
        });

        container.appendChild(btn);
    });
}

function updateAlarmHintText() {
    const shift = state.shifts[state.modalSelectedShift] || state.shifts.NONE;
    const start = document.getElementById('dayStartTime').value || '08:00';
    const hint = document.getElementById('alarmShiftHint');
    if (shift.id !== 'NONE') {
        hint.textContent = `Turno ${shift.name}: entras a las ${start}. Elige a qué hora quieres el despertador:`;
    } else {
        hint.textContent = `Entras a las ${start}. Elige a qué hora quieres el despertador:`;
    }
}

function initStickerSelector() {
    const list = document.getElementById('stickerList');
    list.innerHTML = '';
    STICKERS.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sticker-btn';
        btn.textContent = icon === '' ? '🚫' : icon;
        btn.addEventListener('click', () => {
            state.modalSelectedSticker = icon;
            highlightSelectedSticker();
            updateLivePreview();
        });
        list.appendChild(btn);
    });
}

function highlightSelectedSticker() {
    const buttons = document.querySelectorAll('#stickerList .sticker-btn');
    STICKERS.forEach((icon, idx) => {
        if (buttons[idx]) {
            buttons[idx].classList.toggle('sticker-btn--active', state.modalSelectedSticker === icon);
        }
    });
}

function openDayModal(dateKey, dayNumber) {
    state.editingDateKey = dateKey;
    const saved = state.daysData[dateKey] || {
        shiftId: 'NONE',
        useCustomColor: false,
        customBgColor: '#ffe082',
        hours: 0,
        extraHours: 0,
        hourlyRate: state.hourlyRate,
        extraRate: state.extraRate,
        alarmEnabled: false,
        startTime: '08:00',
        alarmTime: '06:00',
        customText: '',
        fontSize: 13,
        prioritizeText: true,
        sticker: ''
    };

    const dateObj = new Date(state.currentYear, state.currentMonth, dayNumber);
    const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('modalFullDateTitle').textContent = `${weekdayNames[dateObj.getDay()]}, ${dayNumber} de ${monthNames[state.currentMonth]}`;

    state.modalSelectedShift = state.shifts[saved.shiftId] ? saved.shiftId : 'NONE';
    state.modalSelectedSticker = saved.sticker || '';

    const bgHex = saved.customBgColor || '#ffe082';
    document.getElementById('dayUseCustomColor').checked = Boolean(saved.useCustomColor);
    document.getElementById('dayCustomBgColor').value = bgHex;
    document.getElementById('dayColorHexLabel').textContent = bgHex.toUpperCase();

    document.getElementById('dayHours').value = saved.hours ?? 0;
    document.getElementById('dayExtraHours').value = saved.extraHours ?? 0;
    document.getElementById('dayHourlyRate').value = saved.hourlyRate ?? state.hourlyRate;
    document.getElementById('dayExtraRate').value = saved.extraRate ?? state.extraRate;

    document.getElementById('dayAlarmEnabled').checked = Boolean(saved.alarmEnabled);
    document.getElementById('dayStartTime').value = saved.startTime || '08:00';
    document.getElementById('dayAlarmTime').value = saved.alarmTime || '06:00';

    document.getElementById('dayCustomText').value = saved.customText || '';
    const fSize = saved.fontSize || 13;
    document.getElementById('dayFontSize').value = fSize;
    document.getElementById('fontSizeBadge').textContent = `${fSize} px`;
    document.getElementById('dayPrioritizeText').checked = saved.prioritizeText ?? true;

    syncPresetButtons(fSize);
    renderShiftCardsInModal();
    highlightSelectedSticker();
    updateAlarmHintText();
    updateLivePreview();

    initRepeatWeekButtons(dateObj.getDay());
    document.getElementById('dayModal').classList.add('modal--open');
}

function closeDayModal() {
    document.getElementById('dayModal').classList.remove('modal--open');
    state.editingDateKey = null;
}

function collectDayModalData() {
    return {
        shiftId: state.modalSelectedShift,
        useCustomColor: document.getElementById('dayUseCustomColor').checked,
        customBgColor: document.getElementById('dayCustomBgColor').value,
        hours: parseFloat(document.getElementById('dayHours').value) || 0,
        extraHours: parseFloat(document.getElementById('dayExtraHours').value) || 0,
        hourlyRate: parseFloat(document.getElementById('dayHourlyRate').value) || 0,
        extraRate: parseFloat(document.getElementById('dayExtraRate').value) || 0,
        alarmEnabled: document.getElementById('dayAlarmEnabled').checked,
        startTime: document.getElementById('dayStartTime').value,
        alarmTime: document.getElementById('dayAlarmTime').value,
        customText: document.getElementById('dayCustomText').value.trim(),
        fontSize: parseInt(document.getElementById('dayFontSize').value, 10) || 13,
        prioritizeText: document.getElementById('dayPrioritizeText').checked,
        sticker: state.modalSelectedSticker
    };
}

function updateLivePreview() {
    const previewCell = document.getElementById('cellPreview');
    const dayNum = state.editingDateKey ? parseInt(state.editingDateKey.split('-')[2], 10) : 18;
    const data = collectDayModalData();
    paintCell(previewCell, dayNum, data);

    // Calcular en vivo cuánto ganas ese día según las horas y el precio/hora puesto en el modal
    const earnedToday = (data.hours * data.hourlyRate) + (data.extraHours * data.extraRate);
    const earnedEl = document.getElementById('modalDayEarnedValue');
    if (earnedEl) {
        earnedEl.textContent = `${earnedToday.toFixed(2)} €`;
    }
}

function syncPresetButtons(size) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('preset-btn--active', Number(btn.dataset.size) === Number(size));
    });
}

// 4. CONTROL DE GANANCIAS Y BANNER DE MAÑANA
function renderTomorrowBanner() {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const key = formatDateKey(tmr.getFullYear(), tmr.getMonth(), tmr.getDate());
    const info = state.daysData[key];
    const banner = document.getElementById('tomorrowBanner');

    if (info && (info.shiftId !== 'NONE' || info.alarmEnabled)) {
        const shiftName = state.shifts[info.shiftId] ? state.shifts[info.shiftId].name : 'Jornada';
        const alarmTxt = info.alarmEnabled ? ` · 🔔 Alarma a las <strong>${info.alarmTime}</strong>` : '';
        banner.innerHTML = `📅 <strong>Mañana (${shiftName}):</strong> Entrada ${info.startTime}${alarmTxt}`;
    } else {
        banner.innerHTML = `<span>🌙 Mañana sin turno ni alarma programada</span>`;
    }
}

function renderStats() {
    const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
    let daysWorked = 0;
    let normalHours = 0;
    let extraHours = 0;

    const listEl = document.getElementById('workedDaysList');
    listEl.innerHTML = '';

    Object.keys(state.daysData).filter(k => k.startsWith(prefix)).sort().forEach(key => {
        const d = state.daysData[key];
        const h = Number(d.hours) || 0;
        const ex = Number(d.extraHours) || 0;

        if (h > 0 || ex > 0) {
            daysWorked++;
            normalHours += h;
            extraHours += ex;

            const dayNum = parseInt(key.split('-')[2], 10);
            const sName = state.shifts[d.shiftId] ? state.shifts[d.shiftId].name : 'Día';
            const dayMoney = (h * state.hourlyRate + ex * state.extraRate).toFixed(2);

            const li = document.createElement('li');
            li.className = 'worked-list__item';
            li.innerHTML = `
                <span>Día ${dayNum} · <strong>${sName}</strong> ${d.customText ? '(' + d.customText + ')' : ''}</span>
                <strong>${h}h ${ex > 0 ? '+ ' + ex + 'h extra' : ''} → ${dayMoney} €</strong>
            `;
            listEl.appendChild(li);
        }
    });

    if (daysWorked === 0) {
        listEl.innerHTML = '<li class="worked-list__item">Aún no has registrado horas este mes.</li>';
    }

    document.getElementById('statDaysWorked').textContent = daysWorked;
    document.getElementById('statNormalHours').textContent = `${normalHours} h`;
    document.getElementById('statExtraHours').textContent = `${extraHours} h`;
    document.getElementById('calcTotalHoursInput').value = normalHours;

    recalculateEarnings(extraHours);
}

function recalculateEarnings(extraFromMonth = null) {
    const normalH = parseFloat(document.getElementById('calcTotalHoursInput').value) || 0;
    const rate = parseFloat(document.getElementById('hourlyRateInput').value) || 0;
    const exRate = parseFloat(document.getElementById('extraRateInput').value) || 0;

    const extraText = document.getElementById('statExtraHours').textContent;
    const extraH = extraFromMonth !== null ? extraFromMonth : (parseFloat(extraText) || 0);

    state.hourlyRate = rate;
    state.extraRate = exRate;
    saveState();

    const total = (normalH * rate) + (extraH * exRate);
    document.getElementById('statTotalMoney').textContent = `${total.toFixed(2)} €`;
    document.getElementById('earnedFormulaText').textContent =
    extraH > 0 ? `${normalH}h × ${rate}€ + ${extraH}h extra × ${exRate}€` : `${normalH}h × ${rate}€/h`;
    updateGoalAndComparison(total);
}

// 5. GESTIÓN DE TURNOS Y COLORES ("🎨 MIS TURNOS")
function renderShiftsConfigList() {
    const container = document.getElementById('shiftsConfigList');
    container.innerHTML = '';

    Object.values(state.shifts).forEach(shift => {
        if (shift.id === 'NONE') return;
        const row = document.createElement('div');
        row.className = 'shift-row-item';

        row.innerHTML = `
            <div class="shift-row-item__left">
                <div class="shift-color-swatch" style="background:${shift.color}; color:${shift.textColor}">
                    ${shift.short}
                </div>
                <div>
                    <strong>${shift.name}</strong>
                    <div style="font-size:0.74rem; color:var(--text-secondary);">
                        ${shift.defaultHours}h · Entrada ${shift.startTime} · Alarma ${shift.alarmTime}
                    </div>
                </div>
            </div>
            <button type="button" class="btn btn--sm" style="background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary);">
                ✏️ Editar Color / Hora
            </button>
        `;

        row.querySelector('button').addEventListener('click', () => openShiftConfigModal(shift.id));
        container.appendChild(row);
    });
}

function initColorPalette() {
    const grid = document.getElementById('colorPaletteGrid');
    grid.innerHTML = '';
    COLOR_PALETTE.forEach(hex => {
        const dot = document.createElement('div');
        dot.className = 'palette-dot';
        dot.style.backgroundColor = hex;
        dot.addEventListener('click', () => {
            document.getElementById('cfgShiftColor').value = hex;
        });
        grid.appendChild(dot);
    });
}

function openShiftConfigModal(shiftId = null) {
    state.editingShiftId = shiftId;
    const isNew = !shiftId;
    const s = isNew
        ? { name: '', short: '', color: '#fde047', defaultHours: 8, startTime: '08:00', alarmTime: '06:00' }
        : state.shifts[shiftId];

    document.getElementById('shiftModalTitle').textContent = isNew ? 'Crear Nuevo Turno' : `Editar Turno (${s.name})`;
    document.getElementById('cfgShiftName').value = s.name;
    document.getElementById('cfgShiftShort').value = s.short;
    document.getElementById('cfgShiftColor').value = s.color;
    document.getElementById('cfgShiftHours').value = s.defaultHours;
    document.getElementById('cfgShiftStart').value = s.startTime;
    document.getElementById('cfgShiftAlarm').value = s.alarmTime;

    document.getElementById('btnDeleteShiftType').style.display = isNew ? 'none' : 'block';
    document.getElementById('shiftConfigModal').classList.add('modal--open');
}

// 6. EVENTOS DE INTERFAZ
function bindEvents() {
    // Botón Modo Claro / Modo Oscuro
    document.getElementById('btnThemeToggle').addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveState();
    });

    // Navegación de meses
    document.getElementById('btnPrevMonth').addEventListener('click', () => {
        state.currentMonth--;
        if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
        renderAll();
    });

    document.getElementById('btnNextMonth').addEventListener('click', () => {
        state.currentMonth++;
        if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
        renderAll();
    });

    // Pestañas (Con protección de PIN para Control Ganancias)
    document.querySelectorAll('.tabs__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab === 'statsView' && state.statsPin && !state.statsUnlocked) {
                const entered = prompt('🔒 Introduce tu PIN de 4 dígitos para ver Control de Ganancias:');
                if (entered !== state.statsPin) {
                    if (entered !== null) alert('❌ PIN incorrecto. Acceso denegado.');
                    return;
                }
                state.statsUnlocked = true;
                updatePinUI();
            }

            document.querySelectorAll('.tabs__btn').forEach(b => b.classList.remove('tabs__btn--active'));
            document.querySelectorAll('.view').forEach(v => v.classList.remove('view--active'));
            btn.classList.add('tabs__btn--active');
            document.getElementById(btn.dataset.tab).classList.add('view--active');
        });
    });

    // Vaciar mes
    document.getElementById('btnClearMonth').addEventListener('click', () => {
        if (!confirm('¿Quieres vaciar todos los días de este mes?')) return;
        const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
        Object.keys(state.daysData).forEach(k => { if (k.startsWith(prefix)) delete state.daysData[k]; });
        saveState();
        renderAll();
    });

    // Exportar alarmas .ics al móvil
    document.getElementById('btnExportICS').addEventListener('click', exportAlarmsToICS);

    // Botones + y - de horas trabajadas y horas extra
    document.querySelectorAll('.stepper__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.stepTarget);
            const step = parseFloat(btn.dataset.step);
            const current = parseFloat(input.value) || 0;
            input.value = Math.max(0, Math.min(24, current + step));
            updateLivePreview();
        });
    });

    // Color libre del día
    document.getElementById('dayUseCustomColor').addEventListener('change', (e) => {
        document.getElementById('dayCustomBgColor').disabled = !e.target.checked;
        updateLivePreview();
    });
    document.getElementById('dayCustomBgColor').addEventListener('input', updateLivePreview);

    // Tamaño del texto (Presets + Slider)
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const size = btn.dataset.size;
            document.getElementById('dayFontSize').value = size;
            document.getElementById('fontSizeBadge').textContent = `${size} px`;
            syncPresetButtons(size);
            updateLivePreview();
        });
    });

    document.getElementById('dayFontSize').addEventListener('input', (e) => {
        const size = e.target.value;
        document.getElementById('fontSizeBadge').textContent = `${size} px`;
        syncPresetButtons(size);
        updateLivePreview();
    });

    ['dayHours', 'dayExtraHours', 'dayAlarmEnabled', 'dayStartTime', 'dayAlarmTime', 'dayCustomText', 'dayPrioritizeText'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            updateAlarmHintText();
            updateLivePreview();
        });
    });

    // Cerrar y Guardar Modal de Día
    document.getElementById('btnCloseDayModal').addEventListener('click', closeDayModal);

    document.getElementById('dayForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!state.editingDateKey) return;

        const data = collectDayModalData();
        const isEmpty = data.shiftId === 'NONE' && !data.useCustomColor && data.hours === 0 &&
                        data.extraHours === 0 && !data.alarmEnabled && !data.customText && !data.sticker;

        if (isEmpty) {
            delete state.daysData[state.editingDateKey];
        } else {
            state.daysData[state.editingDateKey] = data;
            applyRepeatToSelectedWeekDays(state.editingDateKey, data); // <-- CLONA A LOS DÍAS ELEGIDOS
        }

        saveState();
        renderAll();
        closeDayModal();
    });

    document.getElementById('btnClearDay').addEventListener('click', () => {
        if (state.editingDateKey) {
            delete state.daysData[state.editingDateKey];
            saveState();
            renderAll();
            closeDayModal();
        }
    });

    // Calculadora de ganancias en vivo
    ['calcTotalHoursInput', 'hourlyRateInput', 'extraRateInput'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            recalculateEarnings();
            renderStats();
        });
    });

    // Modal de Crear / Editar Turno y Color
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
            alarmTime: document.getElementById('cfgShiftAlarm').value || '06:00'
        };

        saveState();
        renderAll();
        document.getElementById('shiftConfigModal').classList.remove('modal--open');
    });

    document.getElementById('btnDeleteShiftType').addEventListener('click', () => {
        if (state.editingShiftId && state.editingShiftId !== 'NONE') {
            delete state.shifts[state.editingShiftId];
            saveState();
            renderAll();
            document.getElementById('shiftConfigModal').classList.remove('modal--open');
        }
    });

    // FUNCIÓN 1: Botones L M X J V S D para repetir en la semana
    document.querySelectorAll('.weekday-check-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('weekday-check-btn--current')) return;
            const dow = parseInt(btn.dataset.dow, 10);
            const idx = state.repeatSelectedDows.indexOf(dow);
            if (idx >= 0) {
                state.repeatSelectedDows.splice(idx, 1);
                btn.classList.remove('weekday-check-btn--selected');
            } else {
                state.repeatSelectedDows.push(dow);
                btn.classList.add('weekday-check-btn--selected');
            }
        });
    });

    // FUNCIÓN 4: Exportar e Importar Copia de Seguridad (.json)
    document.getElementById('btnExportBackup').addEventListener('click', exportBackupJSON);
    document.getElementById('btnImportBackup').addEventListener('click', () => {
        document.getElementById('inputImportBackup').click();
    });
    document.getElementById('inputImportBackup').addEventListener('change', importBackupJSON);

    // FUNCIÓN 5: Cambio en la Meta Mensual
    document.getElementById('monthlyGoalInput').addEventListener('input', (e) => {
        state.monthlyGoal = parseFloat(e.target.value) || 0;
        saveState();
        recalculateEarnings();
    });

    // FUNCIÓN 6: Configurar o quitar PIN y botón de bloqueo inmediato
    document.getElementById('btnConfigPin').addEventListener('click', configureStatsPin);
    document.getElementById('btnLockNow').addEventListener('click', () => {
        state.statsUnlocked = false;
        updatePinUI();
        // Volver automáticamente a la pestaña de calendario al bloquear
        document.querySelector('.tabs__btn[data-tab="calendarView"]').click();
    });
}

// Exporta los turnos y alarmas del mes a Google Calendar / Apple Calendar (.ics)
function exportAlarmsToICS() {
    const keys = Object.keys(state.daysData);
    if (keys.length === 0) {
        alert('Aún no tienes turnos ni alarmas guardadas para exportar.');
        return;
    }

    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MiCalendarioTurnos//ES\n';
    keys.forEach(dateKey => {
        const d = state.daysData[dateKey];
        if (!d || (d.shiftId === 'NONE' && !d.customText)) return;
        const shiftName = state.shifts[d.shiftId] ? state.shifts[d.shiftId].name : 'Turno';
        const cleanDate = dateKey.replace(/-/g, '');
        const startH = (d.startTime || '08:00').replace(':', '') + '00';

        ics += 'BEGIN:VEVENT\n';
        ics += `SUMMARY:${shiftName} ${d.customText ? '- ' + d.customText : ''}\n`;
        ics += `DTSTART:${cleanDate}T${startH}\n`;
        if (d.alarmEnabled) {
            ics += 'BEGIN:VALARM\nTRIGGER:-PT2H\nACTION:DISPLAY\nDESCRIPTION:Alarma de turno\nEND:VALARM\n';
        }
        ics += 'END:VEVENT\n';
    });
    ics += 'END:VCALENDAR';

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mis_turnos.ics';
    link.click();
}

// ==================== FUNCIÓN 1: COPIAR DÍA A LA MISMA SEMANA ====================
function initRepeatWeekButtons(currentDayOfWeek) {
    state.repeatSelectedDows = [];
    document.querySelectorAll('.weekday-check-btn').forEach(btn => {
        const dow = parseInt(btn.dataset.dow, 10);
        btn.classList.remove('weekday-check-btn--selected', 'weekday-check-btn--current');
        if (dow === currentDayOfWeek) {
            btn.classList.add('weekday-check-btn--current');
        }
    });
}

function applyRepeatToSelectedWeekDays(baseDateKey, dataToCopy) {
    if (!state.repeatSelectedDows || state.repeatSelectedDows.length === 0) return;

    const [y, m, d] = baseDateKey.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);
    const baseDow = baseDate.getDay();
    // Calcular el Lunes de esa misma semana
    const diffToMonday = (baseDow === 0) ? -6 : 1 - baseDow;
    const mondayDate = new Date(y, m - 1, d + diffToMonday);

    state.repeatSelectedDows.forEach(targetDow => {
        const offsetFromMonday = (targetDow === 0) ? 6 : targetDow - 1;
        const targetDate = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + offsetFromMonday);
        const targetKey = formatDateKey(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        state.daysData[targetKey] = JSON.parse(JSON.stringify(dataToCopy));
    });
}

// ==================== FUNCIÓN 4: COPIA DE SEGURIDAD (JSON) ====================
function exportBackupJSON() {
    const backup = {
        version: 3,
        exportedAt: new Date().toISOString(),
        theme: state.theme,
        shifts: state.shifts,
        daysData: state.daysData,
        hourlyRate: state.hourlyRate,
        extraRate: state.extraRate,
        monthlyGoal: state.monthlyGoal,
        statsPin: state.statsPin
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `copia_calendario_${state.currentYear}_${state.currentMonth + 1}.json`;
    link.click();
}

function importBackupJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target.result);
            if (!parsed.daysData || !parsed.shifts) {
                alert('❌ El archivo no parece una copia válida del calendario.');
                return;
            }
            state.theme = parsed.theme || 'light';
            state.shifts = parsed.shifts;
            state.daysData = parsed.daysData;
            state.hourlyRate = parsed.hourlyRate ?? 10;
            state.extraRate = parsed.extraRate ?? 12;
            state.monthlyGoal = parsed.monthlyGoal ?? 1200;
            state.statsPin = parsed.statsPin || null;

            saveState();
            applyTheme();
            renderAll();
            alert('✅ Copia de seguridad restaurada correctamente.');
        } catch (err) {
            alert('❌ Error al leer el archivo de copia de seguridad.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ==================== FUNCIÓN 5: META MENSUAL Y COMPARATIVA ====================
function getMonthTotalMoney(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    let total = 0;
    Object.keys(state.daysData).filter(k => k.startsWith(prefix)).forEach(k => {
        const d = state.daysData[k];
        const h = Number(d.hours) || 0;
        const ex = Number(d.extraHours) || 0;
        const r = d.hourlyRate ?? state.hourlyRate;
        const exR = d.extraRate ?? state.extraRate;
        total += (h * r) + (ex * exR);
    });
    return total;
}

function updateGoalAndComparison(currentEarned) {
    const goal = Number(state.monthlyGoal) || 0;
    const pct = goal > 0 ? Math.min(100, Math.round((currentEarned / goal) * 100)) : 0;
    const remaining = Math.max(0, goal - currentEarned);

    const badge = document.getElementById('goalPercentBadge');
    const remText = document.getElementById('goalRemainingText');
    const bar = document.getElementById('goalProgressBar');

    if (badge && remText && bar) {
        badge.textContent = `${pct}%`;
        remText.textContent = remaining === 0 && goal > 0 ? '🎉 ¡Meta superada!' : `Faltan ${remaining.toFixed(2)} €`;
        bar.style.width = `${pct}%`;
    }

    // Calcular mes anterior
    let prevM = state.currentMonth - 1;
    let prevY = state.currentYear;
    if (prevM < 0) { prevM = 11; prevY--; }

    const prevTotal = getMonthTotalMoney(prevY, prevM);
    const diff = currentEarned - prevTotal;
    const compareEl = document.getElementById('prevMonthComparison');

    if (compareEl) {
        if (prevTotal === 0) {
            compareEl.textContent = `📊 Mes anterior: 0.00 € registrados`;
        } else {
            const sign = diff >= 0 ? '+' : '';
            const emoji = diff >= 0 ? '📈' : '📉';
            compareEl.innerHTML = `${emoji} Mes anterior: <strong>${prevTotal.toFixed(2)} €</strong> (${sign}${diff.toFixed(2)} € este mes)`;
        }
    }
}

// ==================== FUNCIÓN 6: BLOQUEO CON PIN ====================
function updatePinUI() {
    const statusText = document.getElementById('pinStatusText');
    const btnConfig = document.getElementById('btnConfigPin');
    const btnLock = document.getElementById('btnLockNow');
    if (!statusText || !btnConfig || !btnLock) return;

    if (state.statsPin) {
        statusText.textContent = '🔐 Protegido con PIN';
        btnConfig.textContent = '⚙️ Cambiar/Quitar PIN';
        btnLock.style.display = state.statsUnlocked ? 'inline-block' : 'none';
    } else {
        statusText.textContent = '🔓 Pestaña sin PIN de bloqueo';
        btnConfig.textContent = '🔒 Activar PIN';
        btnLock.style.display = 'none';
    }
}

function configureStatsPin() {
    if (state.statsPin) {
        const current = prompt('Introduce tu PIN actual para modificarlo (o déjalo en blanco para cancelar):');
        if (current === null || current === '') return;
        if (current !== state.statsPin) {
            alert('❌ PIN actual incorrecto.');
            return;
        }
        const nextPin = prompt('Escribe un nuevo PIN de 4 dígitos, o déjalo vacío para ELIMINAR el bloqueo por PIN:');
        if (nextPin === null) return;
        if (nextPin.trim() === '') {
            state.statsPin = null;
            state.statsUnlocked = false;
            alert('🔓 Bloqueo con PIN desactivado.');
        } else {
            state.statsPin = nextPin.trim();
            state.statsUnlocked = true;
            alert('✅ Nuevo PIN guardado.');
        }
    } else {
        const newPin = prompt('🔒 Crea un PIN de 4 números para proteger tu pestaña de Control de Ganancias:');
        if (!newPin || newPin.trim() === '') return;
        state.statsPin = newPin.trim();
        state.statsUnlocked = true;
        alert('✅ PIN activado. Cuando cierres la app o pulses "Bloquear", pedirá el PIN.');
    }
    saveState();
    updatePinUI();
}

// Bloqueo total de doble toque (zoom lupa) y pellizco en iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
});
