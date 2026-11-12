const STORAGE_KEY = 'shifterpro_v6_data';
const LEGACY_KEYS = ['shifterpro_v5_data', 'shifterpro_v4_data'];

const DEFAULT_SHIFTS = {
    NONE: { id: 'NONE', name: 'Ninguno',    short: '-', color: '#ffffff', textColor: '#1e293b', defaultHours: 0, startTime: '08:00', alarmTime: '06:00', customRate: 0, shiftPlus: 0 },
    M:    { id: 'M',    name: 'Mañana',     short: 'M', color: '#fef08a', textColor: '#713f12', defaultHours: 8, startTime: '08:00', alarmTime: '06:00', customRate: 0, shiftPlus: 0 },
    A:    { id: 'A',    name: 'Tarde',      short: 'A', color: '#fbcfe8', textColor: '#831843', defaultHours: 8, startTime: '15:00', alarmTime: '13:00', customRate: 0, shiftPlus: 0 },
    N:    { id: 'N',    name: 'Noche',      short: 'N', color: '#a5f3fc', textColor: '#164e63', defaultHours: 8, startTime: '22:00', alarmTime: '20:00', customRate: 0, shiftPlus: 0 },
    L:    { id: 'L',    name: 'Libre',      short: 'L', color: '#bbf7d0', textColor: '#14532d', defaultHours: 0, startTime: '00:00', alarmTime: '09:00', customRate: 0, shiftPlus: 0 },
    V:    { id: 'V',    name: 'Vacaciones', short: 'V', color: '#ddd6fe', textColor: '#4c1d95', defaultHours: 0, startTime: '00:00', alarmTime: '09:00', customRate: 0, shiftPlus: 0 }
};

const DEFAULT_EXERCISES = [
    { id: 'EX_1', name: 'Press Banca', weight: 60 },
    { id: 'EX_2', name: 'Sentadilla', weight: 80 },
    { id: 'EX_3', name: 'Peso Muerto', weight: 90 },
    { id: 'EX_4', name: 'Press Militar', weight: 40 },
    { id: 'EX_5', name: 'Jalón al Pecho', weight: 55 }
];

const COLOR_PALETTE = [
    '#fef08a', '#fde047', '#fed7aa', '#fdba74',
    '#fbcfe8', '#f9a8d4', '#fecdd3', '#fca5a5',
    '#a5f3fc', '#7dd3fc', '#bfdbfe', '#c7d2fe',
    '#ddd6fe', '#f5d0fe', '#bbf7d0', '#86efac',
    '#e2e8f0', '#cbd5e1'
];

const STICKERS = ['', '🎂', '🏥', '🎉', '⚠️', '🏋️', '✈️', '🍻', '❤️', '⭐'];

const state = {
    theme: 'light',
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    shifts: JSON.parse(JSON.stringify(DEFAULT_SHIFTS)),
    daysData: {},
    hourlyRate: 10,
    extraRate: 12,
    retentionPercent: 0,
    monthlyGoal: 1200,
    statsPin: null,
    statsUnlocked: false,
    walletMovements: [],
    piggyTitle: 'Ahorro / Viaje',
    piggyGoal: 600,
    piggySaved: 0,
    fixedExpenses: [],
    gymWeeklyGoal: 4,
    exercises: JSON.parse(JSON.stringify(DEFAULT_EXERCISES)),
    weightLogs: [],
    patternSequence: [],
    editingDateKey: null,
    modalSelectedShift: 'NONE',
    modalSelectedSticker: '',
    repeatSelectedDows: [],
    editingShiftId: null
};

let timerInterval = null;
let timerSecondsLeft = 90;

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    applyTheme();
    initStickerSelector();
    initColorPalette();
    initDayQuickPalette();
    initPatternDefaultDate();
    bindEvents();
    renderAll();
});

// 1. PERSISTENCIA Y TEMA
function loadState() {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        for (const k of LEGACY_KEYS) {
            if (localStorage.getItem(k)) {
                raw = localStorage.getItem(k);
                break;
            }
        }
    }

    if (raw) {
        try {
            const p = JSON.parse(raw);
            state.theme = p.theme || 'light';
            state.shifts = p.shifts || JSON.parse(JSON.stringify(DEFAULT_SHIFTS));
            Object.values(state.shifts).forEach(s => {
                s.customRate = s.customRate ?? 0;
                s.shiftPlus = s.shiftPlus ?? 0;
            });
            state.daysData = p.daysData || {};
            state.hourlyRate = p.hourlyRate ?? 10;
            state.extraRate = p.extraRate ?? 12;
            state.retentionPercent = p.retentionPercent ?? 0;
            state.monthlyGoal = p.monthlyGoal ?? 1200;
            state.statsPin = p.statsPin || null;
            state.walletMovements = p.walletMovements || [];
            state.piggyTitle = p.piggyTitle || 'Ahorro / Viaje';
            state.piggyGoal = p.piggyGoal ?? 600;
            state.piggySaved = p.piggySaved ?? 0;
            state.fixedExpenses = p.fixedExpenses || [];
            state.gymWeeklyGoal = p.gymWeeklyGoal ?? 4;
            state.exercises = p.exercises || JSON.parse(JSON.stringify(DEFAULT_EXERCISES));
            state.weightLogs = p.weightLogs || [];
            state.patternSequence = p.patternSequence || [];
        } catch (err) {
            console.error('Error cargando datos:', err);
        }
    }

    document.getElementById('hourlyRateInput').value = state.hourlyRate;
    document.getElementById('extraRateInput').value = state.extraRate;
    document.getElementById('retentionPercentInput').value = state.retentionPercent;
    document.getElementById('monthlyGoalInput').value = state.monthlyGoal;
    document.getElementById('piggyTitleInput').value = state.piggyTitle;
    document.getElementById('piggyGoalInput').value = state.piggyGoal;
    document.getElementById('gymWeeklyGoalInput').value = state.gymWeeklyGoal;
    updatePinUI();
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme: state.theme,
        shifts: state.shifts,
        daysData: state.daysData,
        hourlyRate: state.hourlyRate,
        extraRate: state.extraRate,
        retentionPercent: state.retentionPercent,
        monthlyGoal: state.monthlyGoal,
        statsPin: state.statsPin,
        walletMovements: state.walletMovements,
        piggyTitle: state.piggyTitle,
        piggyGoal: state.piggyGoal,
        piggySaved: state.piggySaved,
        fixedExpenses: state.fixedExpenses,
        gymWeeklyGoal: state.gymWeeklyGoal,
        exercises: state.exercises,
        weightLogs: state.weightLogs,
        patternSequence: state.patternSequence
    }));
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const isDark = state.theme === 'dark';
    document.getElementById('iconMoon').style.display = isDark ? 'none' : 'block';
    document.getElementById('iconSun').style.display = isDark ? 'block' : 'none';
}

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

function initPatternDefaultDate() {
    const now = new Date();
    document.getElementById('patternStartDate').value = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

// 2. RENDERIZADO GENERAL
function renderAll() {
    renderCalendar();
    renderTomorrowBanner();
    renderStats();
    renderGymView();
    renderWallet();
    renderPiggyBank();
    renderFixedExpenses();
    renderShiftsConfigList();
    renderPatternGenerator();
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
        cell.addEventListener('click', () => openDayModal(dateKey, day));
        grid.appendChild(cell);
    }
}

function paintCell(cellEl, dayNumber, info) {
    cellEl.innerHTML = '';
    const shift = (info && state.shifts[info.shiftId]) ? state.shifts[info.shiftId] : state.shifts.NONE;

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

    // 1. FILA SUPERIOR: Sticker arriba a la izquierda + alarma, y número a la derecha
    const top = document.createElement('div');
    top.className = 'day-cell__top';

    const topLeft = document.createElement('div');
    topLeft.className = 'day-cell__top-left';

    if (info && info.sticker) {
        const stickerMini = document.createElement('span');
        stickerMini.className = 'day-cell__sticker-mini';
        stickerMini.textContent = info.sticker;
        topLeft.appendChild(stickerMini);
    }

    if (info && info.alarmEnabled && info.alarmTime) {
        const alarmBadge = document.createElement('span');
        alarmBadge.className = 'day-cell__alarm';
        alarmBadge.textContent = info.alarmTime;
        topLeft.appendChild(alarmBadge);
    }

    top.appendChild(topLeft);

    const dayNumSpan = document.createElement('span');
    dayNumSpan.textContent = dayNumber;
    top.appendChild(dayNumSpan);
    cellEl.appendChild(top);

    // 2. CENTRO: Texto personalizado o letra del turno
    const middle = document.createElement('div');
    middle.className = 'day-cell__middle';

    const hasText = info && info.customText && info.customText.trim() !== '';
    const prioritize = info ? info.prioritizeText : true;
    const hasShiftLetter = shift && shift.id !== 'NONE' && shift.short && shift.short !== '-';

    if (hasText && (prioritize || !hasShiftLetter)) {
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
    }
    cellEl.appendChild(middle);

    // 3. FILA INFERIOR: EXTRA / Gym / Mini letra / Horas
    const bottom = document.createElement('div');
    bottom.className = 'day-cell__bottom';

    if (info && Number(info.extraHours) > 0) {
        const extraTag = document.createElement('span');
        extraTag.className = 'extra-pill';
        extraTag.textContent = 'EXTRA';
        bottom.appendChild(extraTag);
    } else if (info && info.workoutGroup) {
        const gymTag = document.createElement('span');
        gymTag.className = 'gym-pill';
        gymTag.textContent = info.workoutGroup;
        bottom.appendChild(gymTag);
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
    } else if (info && info.creatineTaken) {
        const crSpan = document.createElement('span');
        crSpan.className = 'hours-tag';
        crSpan.textContent = 'CR';
        bottom.appendChild(crSpan);
    }

    cellEl.appendChild(bottom);
}

// 3. MODAL DE JORNADA
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
            document.getElementById('dayHours').value = shift.defaultHours ?? 0;
            document.getElementById('dayStartTime').value = shift.startTime || '08:00';
            document.getElementById('dayAlarmTime').value = shift.alarmTime || '06:00';
            document.getElementById('dayHourlyRate').value = (Number(shift.customRate) > 0) ? shift.customRate : state.hourlyRate;
            document.getElementById('dayShiftPlus').value = Number(shift.shiftPlus) || 0;
            updateAlarmHintText();
            updateGymSuggestionHint();
            renderShiftCardsInModal();
            updateLivePreview();
        });

        container.appendChild(btn);
    });
}

function updateGymSuggestionHint() {
    const start = document.getElementById('dayStartTime').value || '08:00';
    const hour = parseInt(start.split(':')[0], 10);
    const hintEl = document.getElementById('gymTimeSuggestionHint');
    if (state.modalSelectedShift === 'NONE' || state.modalSelectedShift === 'L' || state.modalSelectedShift === 'V') {
        hintEl.textContent = 'Día libre: ideal 11:00 o 18:00';
    } else if (hour < 12) {
        hintEl.textContent = 'Turno mañana: ideal 17:30';
    } else if (hour >= 12 && hour < 19) {
        hintEl.textContent = 'Turno tarde: ideal 10:00';
    } else {
        hintEl.textContent = 'Turno noche: ideal 18:00';
    }
}

function updateAlarmHintText() {
    const shift = state.shifts[state.modalSelectedShift] || state.shifts.NONE;
    const start = document.getElementById('dayStartTime').value || '08:00';
    const hint = document.getElementById('alarmShiftHint');
    hint.textContent = shift.id !== 'NONE'
        ? `Turno ${shift.name}: entras a las ${start}. Elige despertador:`
        : `Entras a las ${start}. Elige despertador:`;
}

function initStickerSelector() {
    const list = document.getElementById('stickerList');
    list.innerHTML = '';
    STICKERS.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sticker-btn';
        btn.textContent = icon === '' ? '—' : icon;
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
        if (buttons[idx]) buttons[idx].classList.toggle('sticker-btn--active', state.modalSelectedSticker === icon);
    });
}

function initDayQuickPalette() {
    const container = document.getElementById('dayQuickPalette');
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

function openDayModal(dateKey, dayNumber) {
    state.editingDateKey = dateKey;
    const saved = state.daysData[dateKey] || {
        shiftId: 'NONE',
        useCustomColor: false,
        customBgColor: '#ffe082',
        workoutGroup: '',
        creatineTaken: false,
        hours: 0,
        extraHours: 0,
        hourlyRate: state.hourlyRate,
        extraRate: state.extraRate,
        shiftPlus: 0,
        tips: 0,
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

    document.getElementById('dayWorkoutGroup').value = saved.workoutGroup || '';
    document.getElementById('dayCreatineTaken').checked = Boolean(saved.creatineTaken);

    document.getElementById('dayHours').value = saved.hours ?? 0;
    document.getElementById('dayExtraHours').value = saved.extraHours ?? 0;
    document.getElementById('dayHourlyRate').value = saved.hourlyRate ?? state.hourlyRate;
    document.getElementById('dayExtraRate').value = saved.extraRate ?? state.extraRate;
    document.getElementById('dayShiftPlus').value = saved.shiftPlus ?? 0;
    document.getElementById('dayTips').value = saved.tips ?? 0;

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
    updateGymSuggestionHint();
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
        workoutGroup: document.getElementById('dayWorkoutGroup').value,
        creatineTaken: document.getElementById('dayCreatineTaken').checked,
        hours: parseFloat(document.getElementById('dayHours').value) || 0,
        extraHours: parseFloat(document.getElementById('dayExtraHours').value) || 0,
        hourlyRate: parseFloat(document.getElementById('dayHourlyRate').value) || 0,
        extraRate: parseFloat(document.getElementById('dayExtraRate').value) || 0,
        shiftPlus: parseFloat(document.getElementById('dayShiftPlus').value) || 0,
        tips: parseFloat(document.getElementById('dayTips').value) || 0,
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
    const dayNum = state.editingDateKey ? parseInt(state.editingDateKey.split('-')[2], 10) : 12;
    const data = collectDayModalData();
    paintCell(previewCell, dayNum, data);

    const shiftPay = (data.hours * data.hourlyRate) + (data.extraHours * data.extraRate) + data.shiftPlus;
    const totalToday = shiftPay + data.tips;
    document.getElementById('modalDayEarnedValue').textContent = data.tips > 0
        ? `${totalToday.toFixed(2)} € (${shiftPay.toFixed(2)}€ + ${data.tips.toFixed(2)}€ bote)`
        : `${totalToday.toFixed(2)} €`;
}

function syncPresetButtons(size) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('preset-btn--active', Number(btn.dataset.size) === Number(size));
    });
}

// 4. EXPORTAR ALARMA INDIVIDUAL AL IPHONE (.ICS CON VALARM)
function triggerIphoneAlarmPrompt(dateKey, data) {
    if (!data.alarmEnabled || !data.alarmTime) return;
    const [y, m, d] = dateKey.split('-');
    const shiftName = state.shifts[data.shiftId] && state.shifts[data.shiftId].id !== 'NONE'
        ? state.shifts[data.shiftId].name
        : 'Turno';

    const ok = confirm(`⏰ Has activado una alarma a las ${data.alarmTime} para el ${d}/${m}/${y} (${shiftName}).\n\n¿Quieres añadir este aviso al calendario de tu iPhone ahora?`);
    if (!ok) return;

    const cleanDate = `${y}${m}${d}`;
    const [ah, am] = data.alarmTime.split(':');
    const dtStart = `${cleanDate}T${ah}${am}00`;
    const endHour = String((parseInt(ah, 10) + 1) % 24).padStart(2, '0');
    const dtEnd = `${cleanDate}T${endHour}${am}00`;
    const notePart = data.customText ? ` - ${data.customText}` : '';

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ShifterPro//Alarma iOS//ES',
        'BEGIN:VEVENT',
        `UID:shifterpro-alarm-${dateKey}-${Date.now()}@shifterpro.app`,
        `SUMMARY:⏰ Alarma ${shiftName}${notePart} (Entrada ${data.startTime})`,
        `DESCRIPTION:Despertador programado desde ShifterPro para tu jornada (${shiftName}).`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT0M',
        'ACTION:DISPLAY',
        `DESCRIPTION:⏰ Alarma ${shiftName} (${data.alarmTime})`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alarma_${dateKey}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 5. GANANCIAS Y NÓMINA REAL
function renderTomorrowBanner() {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const key = formatDateKey(tmr.getFullYear(), tmr.getMonth(), tmr.getDate());
    const info = state.daysData[key];
    const banner = document.getElementById('tomorrowBanner');

    if (info && (info.shiftId !== 'NONE' || info.alarmEnabled || info.workoutGroup)) {
        const shiftName = state.shifts[info.shiftId] ? state.shifts[info.shiftId].name : 'Jornada';
        const alarmTxt = info.alarmEnabled ? ` · Alarma ${info.alarmTime}` : '';
        const gymTxt = info.workoutGroup ? ` · Gym: ${info.workoutGroup}` : '';
        banner.innerHTML = `<strong>Mañana (${shiftName}):</strong> Entrada ${info.startTime}${alarmTxt}${gymTxt}`;
    } else {
        banner.innerHTML = `<span>Mañana sin turno ni alarma programada</span>`;
    }
}

function getMonthPayrollSummary(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    let daysWorked = 0;
    let normalHours = 0;
    let extraHours = 0;
    let grossMoney = 0;
    let totalPlus = 0;
    let totalTips = 0;

    Object.keys(state.daysData).filter(k => k.startsWith(prefix)).sort().forEach(key => {
        const d = state.daysData[key];
        const h = Number(d.hours) || 0;
        const ex = Number(d.extraHours) || 0;
        const plus = Number(d.shiftPlus) || 0;
        const tips = Number(d.tips) || 0;
        const r = d.hourlyRate ?? state.hourlyRate;
        const exR = d.extraRate ?? state.extraRate;

        if (h > 0 || ex > 0 || plus > 0 || tips > 0) {
            daysWorked++;
            normalHours += h;
            extraHours += ex;
            grossMoney += (h * r) + (ex * exR) + plus;
            totalPlus += plus;
            totalTips += tips;
        }
    });

    const retention = (Number(state.retentionPercent) || 0) / 100;
    const netMoney = grossMoney * (1 - retention);
    return { daysWorked, normalHours, extraHours, grossMoney, totalPlus, netMoney, totalTips, realTotal: netMoney + totalTips };
}

function renderStats() {
    const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
    const listEl = document.getElementById('workedDaysList');
    listEl.innerHTML = '';

    const summary = getMonthPayrollSummary(state.currentYear, state.currentMonth);

    Object.keys(state.daysData).filter(k => k.startsWith(prefix)).sort().forEach(key => {
        const d = state.daysData[key];
        const h = Number(d.hours) || 0;
        const ex = Number(d.extraHours) || 0;
        const plus = Number(d.shiftPlus) || 0;
        const tips = Number(d.tips) || 0;
        const r = d.hourlyRate ?? state.hourlyRate;
        const exR = d.extraRate ?? state.extraRate;

        if (h > 0 || ex > 0 || plus > 0 || tips > 0) {
            const dayNum = parseInt(key.split('-')[2], 10);
            const sName = state.shifts[d.shiftId] ? state.shifts[d.shiftId].name : 'Jornada';
            const dayPay = (h * r) + (ex * exR) + plus;
            const plusTxt = plus > 0 ? ` (inc. +${plus}€ plus)` : '';

            const li = document.createElement('li');
            li.className = 'worked-list__item';
            li.innerHTML = `
                <span>Día ${dayNum} · <strong>${sName}</strong> ${d.customText ? '(' + d.customText + ')' : ''}</span>
                <strong>${h + ex}h → ${dayPay.toFixed(2)} €${plusTxt}${tips > 0 ? ' + ' + tips.toFixed(2) + '€ bote' : ''}</strong>
            `;
            listEl.appendChild(li);
        }
    });

    if (summary.daysWorked === 0) {
        listEl.innerHTML = '<li class="worked-list__item">Aún no has registrado horas este mes.</li>';
    }

    document.getElementById('statDaysWorked').textContent = summary.daysWorked;
    document.getElementById('statNormalHours').textContent = `${summary.normalHours} h`;
    document.getElementById('statExtraHours').textContent = `${summary.extraHours} h`;
    document.getElementById('calcTotalHoursInput').value = summary.normalHours;

    recalculateEarnings(summary.extraHours, summary.totalPlus, summary.totalTips);
}

function recalculateEarnings(extraFromMonth = null, plusFromMonth = null, tipsFromMonth = null) {
    const normalH = parseFloat(document.getElementById('calcTotalHoursInput').value) || 0;
    const rate = parseFloat(document.getElementById('hourlyRateInput').value) || 0;
    const exRate = parseFloat(document.getElementById('extraRateInput').value) || 0;
    const retentionPct = parseFloat(document.getElementById('retentionPercentInput').value) || 0;

    const currentSummary = getMonthPayrollSummary(state.currentYear, state.currentMonth);
    const extraH = extraFromMonth !== null ? extraFromMonth : currentSummary.extraHours;
    const plus = plusFromMonth !== null ? plusFromMonth : currentSummary.totalPlus;
    const tips = tipsFromMonth !== null ? tipsFromMonth : currentSummary.totalTips;

    state.hourlyRate = rate;
    state.extraRate = exRate;
    state.retentionPercent = retentionPct;
    saveState();

    // Si hay tarifas propias por turno distintas de la tarifa base, las respetamos al calcular el mes
    const usesCustomRates = normalH === currentSummary.normalHours;
    const gross = usesCustomRates
        ? currentSummary.grossMoney
        : (normalH * rate) + (extraH * exRate) + plus;

    const net = gross * (1 - (retentionPct / 100));
    const totalReal = net + tips;

    document.getElementById('statGrossMoney').textContent = `${gross.toFixed(2)} €`;
    document.getElementById('statNetMoney').textContent = `${net.toFixed(2)} €`;
    document.getElementById('statMonthTips').textContent = `${tips.toFixed(2)} €`;
    document.getElementById('statTotalMoney').textContent = `${totalReal.toFixed(2)} €`;

    const plusLabel = plus > 0 ? ` + ${plus.toFixed(2)}€ pluses` : '';
    document.getElementById('earnedFormulaText').textContent = retentionPct > 0
        ? `Bruto ${gross.toFixed(2)}€ (-${retentionPct}% ret.)${plusLabel}`
        : `${normalH}h base + ${extraH}h extra${plusLabel}`;

    updateGoalAndComparison(totalReal);
}

function updateGoalAndComparison(currentEarned) {
    const goal = Number(state.monthlyGoal) || 0;
    const pct = goal > 0 ? Math.min(100, Math.round((currentEarned / goal) * 100)) : 0;
    const remaining = Math.max(0, goal - currentEarned);

    document.getElementById('goalPercentBadge').textContent = `${pct}%`;
    document.getElementById('goalRemainingText').textContent = remaining === 0 && goal > 0
        ? 'Meta superada'
        : `Faltan ${remaining.toFixed(2)} €`;
    document.getElementById('goalProgressBar').style.width = `${pct}%`;

    let prevM = state.currentMonth - 1;
    let prevY = state.currentYear;
    if (prevM < 0) { prevM = 11; prevY--; }

    const prevTotal = getMonthPayrollSummary(prevY, prevM).realTotal;
    const diff = currentEarned - prevTotal;
    const compareEl = document.getElementById('prevMonthComparison');

    if (prevTotal === 0) {
        compareEl.textContent = 'Mes anterior: 0.00 € registrados';
    } else {
        const sign = diff >= 0 ? '+' : '';
        compareEl.innerHTML = `Mes anterior: <strong>${prevTotal.toFixed(2)} €</strong> (${sign}${diff.toFixed(2)} €)`;
    }
}

// 6. VISTA GYM
function renderGymView() {
    const now = new Date();
    const dow = now.getDay();
    const diffToMonday = (dow === 0) ? -6 : 1 - dow;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

    let weekWorkouts = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
        if (state.daysData[key] && state.daysData[key].workoutGroup) weekWorkouts++;
    }

    const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
    let monthWorkouts = 0;
    let monthCreatine = 0;

    Object.keys(state.daysData).filter(k => k.startsWith(prefix)).forEach(k => {
        if (state.daysData[k].workoutGroup) monthWorkouts++;
        if (state.daysData[k].creatineTaken) monthCreatine++;
    });

    let gymSpend = 0;
    state.walletMovements.forEach(m => {
        if (m.type === 'OUT' && m.category === 'Gym / Suplementos') {
            gymSpend += Number(m.amount) || 0;
        }
    });

    const weeklyGoal = Number(state.gymWeeklyGoal) || 4;
    const pct = Math.min(100, Math.round((weekWorkouts / weeklyGoal) * 100));

    document.getElementById('gymWeekCountText').textContent = `${weekWorkouts} / ${weeklyGoal} esta semana`;
    document.getElementById('gymMonthCountText').textContent = `${monthWorkouts} entrenos este mes`;
    document.getElementById('gymWeekProgressBar').style.width = `${pct}%`;
    document.getElementById('gymCreatineMonthText').textContent = `${monthCreatine} días`;
    document.getElementById('gymFitnessSpendText').textContent = `${gymSpend.toFixed(2)} €`;

    renderWeightLogs();
    renderExercisesList();
}

function startRestTimer(seconds) {
    clearInterval(timerInterval);
    timerSecondsLeft = seconds;
    document.getElementById('timerStatusBadge').textContent = 'En marcha';
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timerSecondsLeft--;
        updateTimerDisplay();
        if (timerSecondsLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timerStatusBadge').textContent = 'Tiempo cumplido';
            playBeepSound();
        }
    }, 1000);
}

function stopRestTimer() {
    clearInterval(timerInterval);
    document.getElementById('timerStatusBadge').textContent = 'Pausado';
}

function updateTimerDisplay() {
    const mins = Math.floor(Math.max(0, timerSecondsLeft) / 60);
    const secs = Math.max(0, timerSecondsLeft) % 60;
    document.getElementById('timerDisplay').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playBeepSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
        console.log('Audio no disponible');
    }
}

function renderWeightLogs() {
    const listEl = document.getElementById('weightHistoryList');
    const diffEl = document.getElementById('weightDiffStat');
    listEl.innerHTML = '';

    if (state.weightLogs.length === 0) {
        diffEl.textContent = 'Sin registros';
        listEl.innerHTML = '<li class="worked-list__item">Registra tu peso para ver tu evolución.</li>';
        return;
    }

    const latest = state.weightLogs[0].weight;
    const initial = state.weightLogs[state.weightLogs.length - 1].weight;
    const diff = latest - initial;
    const sign = diff > 0 ? '+' : '';
    diffEl.textContent = state.weightLogs.length > 1
        ? `Actual: ${latest} kg (${sign}${diff.toFixed(1)} kg)`
        : `Actual: ${latest} kg`;

    state.weightLogs.forEach(item => {
        const li = document.createElement('li');
        li.className = 'worked-list__item';
        li.innerHTML = `
            <span>${item.date}</span>
            <div>
                <strong>${item.weight} kg</strong>
                <button type="button" class="movement-delete-btn">&times;</button>
            </div>
        `;
        li.querySelector('button').addEventListener('click', () => {
            state.weightLogs = state.weightLogs.filter(w => w.id !== item.id);
            saveState();
            renderWeightLogs();
        });
        listEl.appendChild(li);
    });
}

function renderExercisesList() {
    const container = document.getElementById('exercisesList');
    container.innerHTML = '';

    state.exercises.forEach(ex => {
        const row = document.createElement('div');
        row.className = 'exercise-row';
        row.innerHTML = `
            <span class="exercise-row__name">${ex.name}</span>
            <div class="exercise-row__controls">
                <button type="button" class="stepper__btn" data-delta="-2.5">&minus;</button>
                <span class="exercise-row__weight">${ex.weight} kg</span>
                <button type="button" class="stepper__btn" data-delta="2.5">+</button>
                <button type="button" class="movement-delete-btn" title="Eliminar">&times;</button>
            </div>
        `;

        const btns = row.querySelectorAll('.stepper__btn');
        btns[0].addEventListener('click', () => {
            ex.weight = Math.max(0, Number(ex.weight) - 2.5);
            saveState();
            renderExercisesList();
        });
        btns[1].addEventListener('click', () => {
            ex.weight = Number(ex.weight) + 2.5;
            saveState();
            renderExercisesList();
        });
        row.querySelector('.movement-delete-btn').addEventListener('click', () => {
            state.exercises = state.exercises.filter(item => item.id !== ex.id);
            saveState();
            renderExercisesList();
        });

        container.appendChild(row);
    });
}

// 7. MI CAJA, HUCHA Y GASTOS FIJOS
function getWalletBalance() {
    let totalIn = 0;
    let totalOut = 0;
    state.walletMovements.forEach(m => {
        if (m.type === 'IN') totalIn += Number(m.amount);
        else totalOut += Number(m.amount);
    });
    return { totalIn, totalOut, balance: totalIn - totalOut };
}

function addWalletMovement(type, customAmount = null, customConcept = null, customCategory = null) {
    const amountInput = document.getElementById('walletAmountInput');
    const conceptInput = document.getElementById('walletConceptInput');
    const categorySelect = document.getElementById('walletCategorySelect');

    const amount = customAmount !== null ? customAmount : parseFloat(amountInput.value);
    const category = customCategory || categorySelect.value || 'General';

    if (!amount || amount <= 0) {
        alert('Introduce una cantidad mayor que 0 €.');
        return;
    }

    const defaultConcept = type === 'IN' ? 'Ingreso en Caja' : `Gasto (${category})`;
    const concept = customConcept || conceptInput.value.trim() || defaultConcept;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    state.walletMovements.unshift({
        id: 'W_' + Date.now() + Math.random(),
        type,
        amount: Number(amount.toFixed(2)),
        concept,
        category,
        date: dateStr
    });

    if (customAmount === null) {
        amountInput.value = '';
        conceptInput.value = '';
    }
    saveState();
    renderWallet();
    renderGymView();
}

function renderWallet() {
    const listEl = document.getElementById('walletMovementsList');
    listEl.innerHTML = '';

    const { totalIn, totalOut, balance } = getWalletBalance();

    state.walletMovements.forEach(item => {
        const li = document.createElement('li');
        li.className = 'worked-list__item';
        const isIn = item.type === 'IN';
        const catBadge = item.category && item.category !== 'General' ? ` · ${item.category}` : '';
        li.innerHTML = `
            <div>
                <strong>${item.concept}</strong>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${item.date}${catBadge}</div>
            </div>
            <div style="display:flex; align-items:center;">
                <span class="${isIn ? 'movement-amount--in' : 'movement-amount--out'}">${isIn ? '+' : '-'}${Number(item.amount).toFixed(2)} €</span>
                <button type="button" class="movement-delete-btn" title="Borrar">&times;</button>
            </div>
        `;
        li.querySelector('.movement-delete-btn').addEventListener('click', () => {
            state.walletMovements = state.walletMovements.filter(m => m.id !== item.id);
            saveState();
            renderWallet();
            renderGymView();
        });
        listEl.appendChild(li);
    });

    if (state.walletMovements.length === 0) {
        listEl.innerHTML = '<li class="worked-list__item">Aún no hay movimientos en tu caja.</li>';
    }

    document.getElementById('walletCurrentBalance').textContent = `${balance.toFixed(2)} €`;
    document.getElementById('walletTotalIn').textContent = `${totalIn.toFixed(2)} €`;
    document.getElementById('walletTotalOut').textContent = `${totalOut.toFixed(2)} €`;
}

function renderPiggyBank() {
    const goal = Number(state.piggyGoal) || 0;
    const saved = Number(state.piggySaved) || 0;
    const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;

    document.getElementById('piggySavedAmount').textContent = `${saved.toFixed(2)} €`;
    document.getElementById('piggyPercentBadge').textContent = `${pct}%`;
    document.getElementById('piggyProgressBar').style.width = `${pct}%`;
}

function renderFixedExpenses() {
    const listEl = document.getElementById('fixedExpensesList');
    listEl.innerHTML = '';
    let total = 0;

    state.fixedExpenses.forEach(exp => {
        total += Number(exp.amount) || 0;
        const li = document.createElement('li');
        li.className = 'worked-list__item';
        li.innerHTML = `
            <span>${exp.name}</span>
            <div>
                <strong>-${Number(exp.amount).toFixed(2)} €</strong>
                <button type="button" class="movement-delete-btn">&times;</button>
            </div>
        `;
        li.querySelector('button').addEventListener('click', () => {
            state.fixedExpenses = state.fixedExpenses.filter(f => f.id !== exp.id);
            saveState();
            renderFixedExpenses();
        });
        listEl.appendChild(li);
    });

    if (state.fixedExpenses.length === 0) {
        listEl.innerHTML = '<li class="worked-list__item">Sin gastos fijos configurados.</li>';
    }
    document.getElementById('fixedExpensesTotalLabel').textContent = `${total.toFixed(2)} €/mes`;
}

// 8. GESTIÓN DE TURNOS (CON TARIFA PROPIA Y PLUS) Y PATRONES ROTATIVOS
function renderShiftsConfigList() {
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

function renderPatternGenerator() {
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
    renderAll();
    switchTab('calendarView');
}

function initColorPalette() {
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

// 9. REPETIR SEMANA, PIN Y EVENTOS
function initRepeatWeekButtons(currentDow) {
    state.repeatSelectedDows = [];
    document.querySelectorAll('.weekday-check-btn').forEach(btn => {
        const dow = parseInt(btn.dataset.dow, 10);
        btn.classList.remove('weekday-check-btn--selected', 'weekday-check-btn--current');
        if (dow === currentDow) btn.classList.add('weekday-check-btn--current');
    });
}

function applyRepeatToSelectedWeekDays(baseDateKey, dataToCopy) {
    if (!state.repeatSelectedDows || state.repeatSelectedDows.length === 0) return;
    const [y, m, d] = baseDateKey.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);
    const baseDow = baseDate.getDay();
    const diffToMonday = (baseDow === 0) ? -6 : 1 - baseDow;
    const mondayDate = new Date(y, m - 1, d + diffToMonday);

    state.repeatSelectedDows.forEach(targetDow => {
        const offsetFromMonday = (targetDow === 0) ? 6 : targetDow - 1;
        const targetDate = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + offsetFromMonday);
        const targetKey = formatDateKey(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        state.daysData[targetKey] = JSON.parse(JSON.stringify(dataToCopy));
    });
}

function updatePinUI() {
    const statusText = document.getElementById('pinStatusText');
    const btnConfig = document.getElementById('btnConfigPin');
    const btnLock = document.getElementById('btnLockNow');
    if (state.statsPin) {
        statusText.textContent = 'Protegido con PIN';
        btnConfig.textContent = 'PIN';
        btnLock.style.display = state.statsUnlocked ? 'inline-block' : 'none';
    } else {
        statusText.textContent = 'Sin PIN';
        btnConfig.textContent = 'Activar PIN';
        btnLock.style.display = 'none';
    }
}

function switchTab(targetTabId) {
    if ((targetTabId === 'statsView' || targetTabId === 'walletView') && state.statsPin && !state.statsUnlocked) {
        const entered = prompt('Introduce tu PIN de 4 dígitos:');
        if (entered !== state.statsPin) {
            if (entered !== null) alert('PIN incorrecto.');
            return;
        }
        state.statsUnlocked = true;
        updatePinUI();
    }

    document.querySelectorAll('.bottom-nav__item').forEach(b => {
        b.classList.toggle('bottom-nav__item--active', b.dataset.tab === targetTabId);
    });
    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('view--active', v.id === targetTabId);
    });
}

function bindEvents() {
    document.querySelectorAll('.bottom-nav__item').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('btnThemeToggle').addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveState();
    });

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

    document.getElementById('btnClearMonth').addEventListener('click', () => {
        if (!confirm('¿Vaciar todos los días de este mes?')) return;
        const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
        Object.keys(state.daysData).forEach(k => { if (k.startsWith(prefix)) delete state.daysData[k]; });
        saveState();
        renderAll();
    });

    document.getElementById('btnExportBackup').addEventListener('click', () => {
        const blob = new Blob([localStorage.getItem(STORAGE_KEY) || '{}'], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `shifterpro_backup_${state.currentYear}_${state.currentMonth + 1}.json`;
        a.click();
    });

    document.getElementById('btnImportBackup').addEventListener('click', () => document.getElementById('inputImportBackup').click());
    document.getElementById('inputImportBackup').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!parsed.daysData) return alert('Archivo no válido.');
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                loadState();
                applyTheme();
                renderAll();
                alert('Copia restaurada.');
            } catch { alert('Error leyendo archivo.'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.getElementById('btnExportICS').addEventListener('click', () => {
        const keys = Object.keys(state.daysData);
        if (!keys.length) return alert('No hay turnos guardados.');
        let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ShifterPro//ES\r\n';
        keys.forEach(k => {
            const d = state.daysData[k];
            if (!d || (d.shiftId === 'NONE' && !d.customText)) return;
            const sName = state.shifts[d.shiftId] ? state.shifts[d.shiftId].name : 'Turno';
            const cleanDate = k.replace(/-/g, '');
            const timeStr = (d.alarmEnabled && d.alarmTime) ? d.alarmTime : (d.startTime || '08:00');
            const dtStart = `${cleanDate}T${timeStr.replace(':', '')}00`;
            ics += `BEGIN:VEVENT\r\nSUMMARY:${sName} ${d.customText || ''}\r\nDTSTART:${dtStart}\r\nEND:VEVENT\r\n`;
        });
        ics += 'END:VCALENDAR';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
        a.download = 'shifterpro_turnos.ics';
        a.click();
    });

    document.querySelectorAll('.stepper__btn[data-step-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.stepTarget);
            const step = parseFloat(btn.dataset.step);
            input.value = Math.max(0, (parseFloat(input.value) || 0) + step);
            updateLivePreview();
        });
    });

    document.getElementById('dayUseCustomColor').addEventListener('change', updateLivePreview);
    document.getElementById('dayCustomBgColor').addEventListener('input', (e) => {
        document.getElementById('dayUseCustomColor').checked = true;
        document.getElementById('dayColorHexLabel').textContent = e.target.value.toUpperCase();
        updateLivePreview();
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = btn.dataset.size;
            document.getElementById('dayFontSize').value = s;
            document.getElementById('fontSizeBadge').textContent = `${s} px`;
            syncPresetButtons(s);
            updateLivePreview();
        });
    });

    document.getElementById('dayFontSize').addEventListener('input', (e) => {
        const s = e.target.value;
        document.getElementById('fontSizeBadge').textContent = `${s} px`;
        syncPresetButtons(s);
        updateLivePreview();
    });

    ['dayWorkoutGroup', 'dayCreatineTaken', 'dayHours', 'dayExtraHours', 'dayHourlyRate', 'dayExtraRate', 'dayShiftPlus', 'dayTips', 'dayAlarmEnabled', 'dayStartTime', 'dayAlarmTime', 'dayCustomText', 'dayPrioritizeText'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            updateAlarmHintText();
            updateGymSuggestionHint();
            updateLivePreview();
        });
    });

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

    // Guardar Día + Aviso de Alarma en iPhone
    function handleSaveDay(e) {
        if (e) e.preventDefault();
        if (!state.editingDateKey) return;

        const savedDateKey = state.editingDateKey;
        const data = collectDayModalData();
        const isEmpty = data.shiftId === 'NONE' && !data.useCustomColor && !data.workoutGroup &&
                        !data.creatineTaken && data.hours === 0 && data.extraHours === 0 &&
                        data.shiftPlus === 0 && data.tips === 0 && !data.alarmEnabled &&
                        !data.customText && !data.sticker;

        if (isEmpty) {
            delete state.daysData[savedDateKey];
        } else {
            state.daysData[savedDateKey] = data;
            applyRepeatToSelectedWeekDays(savedDateKey, data);
        }

        saveState();
        renderAll();
        closeDayModal();

        if (!isEmpty && data.alarmEnabled) {
            setTimeout(() => {
                triggerIphoneAlarmPrompt(savedDateKey, data);
            }, 120);
        }
    }

    document.getElementById('btnCloseDayModal').addEventListener('click', closeDayModal);
    document.getElementById('dayForm').addEventListener('submit', handleSaveDay);
    document.getElementById('btnSaveDay').addEventListener('click', handleSaveDay);
    document.getElementById('btnClearDay').addEventListener('click', () => {
        if (state.editingDateKey) {
            delete state.daysData[state.editingDateKey];
            saveState();
            renderAll();
            closeDayModal();
        }
    });

    // Ganancias y Meta
    ['calcTotalHoursInput', 'hourlyRateInput', 'extraRateInput', 'retentionPercentInput'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => recalculateEarnings());
    });

    document.getElementById('monthlyGoalInput').addEventListener('input', (e) => {
        state.monthlyGoal = parseFloat(e.target.value) || 0;
        saveState();
        recalculateEarnings();
    });

    // PIN
    document.getElementById('btnConfigPin').addEventListener('click', () => {
        if (state.statsPin) {
            const cur = prompt('PIN actual:');
            if (cur !== state.statsPin) return alert('PIN incorrecto.');
            const next = prompt('Nuevo PIN de 4 dígitos (vacío para quitar):');
            if (next === null) return;
            state.statsPin = next.trim() || null;
            state.statsUnlocked = Boolean(state.statsPin);
        } else {
            const p = prompt('Crea un PIN de 4 números:');
            if (!p || !p.trim()) return;
            state.statsPin = p.trim();
            state.statsUnlocked = true;
        }
        saveState();
        updatePinUI();
    });

    document.getElementById('btnLockNow').addEventListener('click', () => {
        state.statsUnlocked = false;
        updatePinUI();
        switchTab('calendarView');
    });

    // Eventos Gym
    document.getElementById('gymWeeklyGoalInput').addEventListener('input', (e) => {
        state.gymWeeklyGoal = parseInt(e.target.value, 10) || 4;
        saveState();
        renderGymView();
    });

    document.querySelectorAll('.timer-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => startRestTimer(parseInt(btn.dataset.seconds, 10)));
    });
    document.getElementById('btnTimerStop').addEventListener('click', stopRestTimer);

    document.getElementById('btnLogWeight').addEventListener('click', () => {
        const input = document.getElementById('bodyWeightInput');
        const w = parseFloat(input.value);
        if (!w || w <= 0) return alert('Introduce tu peso en kg.');
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        state.weightLogs.unshift({ id: 'KG_' + Date.now(), weight: w, date: dateStr });
        input.value = '';
        saveState();
        renderWeightLogs();
    });

    document.getElementById('btnAddExercise').addEventListener('click', () => {
        const nameEl = document.getElementById('newExerciseName');
        const weightEl = document.getElementById('newExerciseWeight');
        const name = nameEl.value.trim();
        const weight = parseFloat(weightEl.value) || 0;
        if (!name) return alert('Escribe el nombre del ejercicio.');
        state.exercises.push({ id: 'EX_' + Date.now(), name, weight });
        nameEl.value = '';
        weightEl.value = '';
        saveState();
        renderExercisesList();
    });

    // Eventos Mi Caja, Hucha y Gastos Fijos
    document.getElementById('btnWalletAdd').addEventListener('click', () => addWalletMovement('IN'));
    document.getElementById('btnWalletWithdraw').addEventListener('click', () => addWalletMovement('OUT'));

    document.getElementById('btnSyncMonthToWallet').addEventListener('click', () => {
        const summary = getMonthPayrollSummary(state.currentYear, state.currentMonth);
        if (summary.realTotal <= 0) return alert('No hay ganancias acumuladas este mes.');
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        addWalletMovement('IN', summary.realTotal, `Nómina + Bote (${months[state.currentMonth]})`, 'General');
    });

    document.getElementById('btnClearWallet').addEventListener('click', () => {
        if (!confirm('¿Vaciar el historial de Mi Caja?')) return;
        state.walletMovements = [];
        saveState();
        renderWallet();
        renderGymView();
    });

    document.getElementById('piggyTitleInput').addEventListener('input', (e) => {
        state.piggyTitle = e.target.value;
        saveState();
    });

    document.getElementById('piggyGoalInput').addEventListener('input', (e) => {
        state.piggyGoal = parseFloat(e.target.value) || 0;
        saveState();
        renderPiggyBank();
    });

    document.getElementById('btnPiggyDeposit').addEventListener('click', () => {
        const input = document.getElementById('piggyTransferInput');
        const amt = parseFloat(input.value);
        if (!amt || amt <= 0) return alert('Introduce una cantidad para meter en la hucha.');
        state.piggySaved += amt;
        addWalletMovement('OUT', amt, `Apartado a Hucha: ${state.piggyTitle}`, 'General');
        input.value = '';
        saveState();
        renderPiggyBank();
    });

    document.getElementById('btnPiggyWithdraw').addEventListener('click', () => {
        const input = document.getElementById('piggyTransferInput');
        const amt = parseFloat(input.value);
        if (!amt || amt <= 0 || amt > state.piggySaved) return alert('Cantidad no válida.');
        state.piggySaved -= amt;
        addWalletMovement('IN', amt, `Retirado de Hucha: ${state.piggyTitle}`, 'General');
        input.value = '';
        saveState();
        renderPiggyBank();
    });

    document.getElementById('btnAddFixedExpense').addEventListener('click', () => {
        const nameEl = document.getElementById('fixedExpenseName');
        const amtEl = document.getElementById('fixedExpenseAmount');
        const name = nameEl.value.trim();
        const amount = parseFloat(amtEl.value);
        if (!name || !amount || amount <= 0) return alert('Escribe un nombre y cantidad.');
        state.fixedExpenses.push({ id: 'F_' + Date.now(), name, amount });
        nameEl.value = '';
        amtEl.value = '';
        saveState();
        renderFixedExpenses();
    });

    document.getElementById('btnApplyFixedExpenses').addEventListener('click', () => {
        if (state.fixedExpenses.length === 0) return alert('Añade primero algún gasto fijo.');
        if (!confirm('¿Descontar todos los gastos fijos de tu saldo ahora?')) return;
        state.fixedExpenses.forEach(exp => {
            const cat = exp.name.toLowerCase().includes('gym') ? 'Gym / Suplementos' : 'General';
            addWalletMovement('OUT', exp.amount, `Gasto fijo: ${exp.name}`, cat);
        });
    });

    // Configurar Turnos (con Tarifa y Plus propio)
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
        renderAll();
        document.getElementById('shiftConfigModal').classList.remove('modal--open');
    });

    document.getElementById('btnDeleteShiftType').addEventListener('click', () => {
        if (state.editingShiftId && state.editingShiftId !== 'NONE') {
            delete state.shifts[state.editingShiftId];
            state.patternSequence = state.patternSequence.filter(pid => pid !== state.editingShiftId);
            saveState();
            renderAll();
            document.getElementById('shiftConfigModal').classList.remove('modal--open');
        }
    });

    // Generador de Patrones Rotativos
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
