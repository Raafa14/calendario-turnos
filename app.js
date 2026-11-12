const STORAGE_KEY = 'shifterpro_v4_data';

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
    editingDateKey: null,
    modalSelectedShift: 'NONE',
    modalSelectedSticker: '',
    repeatSelectedDows: [],
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
    if (raw) {
        try {
            const p = JSON.parse(raw);
            state.theme = p.theme || 'light';
            state.shifts = p.shifts || JSON.parse(JSON.stringify(DEFAULT_SHIFTS));
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
        fixedExpenses: state.fixedExpenses
    }));
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.getElementById('btnThemeToggle').textContent = state.theme === 'dark' ? '☀️' : '🌙';
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

// 2. RENDERIZADO GENERAL
function renderAll() {
    renderCalendar();
    renderTomorrowBanner();
    renderStats();
    renderShiftsConfigList();
    renderWallet();
    renderPiggyBank();
    renderFixedExpenses();
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

// PINTA LA CASILLA CON EL ICONO PEQUEÑO ARRIBA A LA IZQUIERDA Y EL TEXTO LIMPIO EN EL CENTRO
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

    // 1. FILA SUPERIOR: Icono arriba a la izquierda + alarma, y número a la derecha
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
        alarmBadge.textContent = `⏰${info.alarmTime}`;
        topLeft.appendChild(alarmBadge);
    }

    top.appendChild(topLeft);

    const dayNumSpan = document.createElement('span');
    dayNumSpan.textContent = dayNumber;
    top.appendChild(dayNumSpan);
    cellEl.appendChild(top);

    // 2. CENTRO: Solo texto o letra del turno (sin icono debajo)
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

    // 3. FILA INFERIOR: EXTRA / Mini letra / Bote / Horas
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
    } else if (info && Number(info.tips) > 0) {
        const tipIcon = document.createElement('span');
        tipIcon.style.fontSize = '0.56rem';
        tipIcon.textContent = '🪙';
        bottom.appendChild(tipIcon);
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
        hours: 0,
        extraHours: 0,
        hourlyRate: state.hourlyRate,
        extraRate: state.extraRate,
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

    document.getElementById('dayHours').value = saved.hours ?? 0;
    document.getElementById('dayExtraHours').value = saved.extraHours ?? 0;
    document.getElementById('dayHourlyRate').value = saved.hourlyRate ?? state.hourlyRate;
    document.getElementById('dayExtraRate').value = saved.extraRate ?? state.extraRate;
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

    const shiftPay = (data.hours * data.hourlyRate) + (data.extraHours * data.extraRate);
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

// 4. GANANCIAS Y NÓMINA REAL (BRUTO / NETO / BOTE)
function renderTomorrowBanner() {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const key = formatDateKey(tmr.getFullYear(), tmr.getMonth(), tmr.getDate());
    const info = state.daysData[key];
    const banner = document.getElementById('tomorrowBanner');

    if (info && (info.shiftId !== 'NONE' || info.alarmEnabled)) {
        const shiftName = state.shifts[info.shiftId] ? state.shifts[info.shiftId].name : 'Jornada';
        const alarmTxt = info.alarmEnabled ? ` · 🔔 Alarma ${info.alarmTime}` : '';
        banner.innerHTML = `📅 <strong>Mañana (${shiftName}):</strong> Entrada ${info.startTime}${alarmTxt}`;
    } else {
        banner.innerHTML = `<span>🌙 Mañana sin turno ni alarma programada</span>`;
    }
}

function getMonthPayrollSummary(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    let daysWorked = 0;
    let normalHours = 0;
    let extraHours = 0;
    let grossMoney = 0;
    let totalTips = 0;

    Object.keys(state.daysData).filter(k => k.startsWith(prefix)).sort().forEach(key => {
        const d = state.daysData[key];
        const h = Number(d.hours) || 0;
        const ex = Number(d.extraHours) || 0;
        const tips = Number(d.tips) || 0;
        const r = d.hourlyRate ?? state.hourlyRate;
        const exR = d.extraRate ?? state.extraRate;

        if (h > 0 || ex > 0 || tips > 0) {
            daysWorked++;
            normalHours += h;
            extraHours += ex;
            grossMoney += (h * r) + (ex * exR);
            totalTips += tips;
        }
    });

    const retention = (Number(state.retentionPercent) || 0) / 100;
    const netMoney = grossMoney * (1 - retention);
    return { daysWorked, normalHours, extraHours, grossMoney, netMoney, totalTips, realTotal: netMoney + totalTips };
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
        const tips = Number(d.tips) || 0;
        const r = d.hourlyRate ?? state.hourlyRate;
        const exR = d.extraRate ?? state.extraRate;

        if (h > 0 || ex > 0 || tips > 0) {
            const dayNum = parseInt(key.split('-')[2], 10);
            const sName = state.shifts[d.shiftId] ? state.shifts[d.shiftId].name : 'Jornada';
            const dayPay = (h * r) + (ex * exR);

            const li = document.createElement('li');
            li.className = 'worked-list__item';
            li.innerHTML = `
                <span>Día ${dayNum} · <strong>${sName}</strong> ${d.customText ? '(' + d.customText + ')' : ''}</span>
                <strong>${h + ex}h → ${dayPay.toFixed(2)} € ${tips > 0 ? '+ 🪙' + tips.toFixed(2) + '€' : ''}</strong>
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

    recalculateEarnings(summary.extraHours, summary.totalTips);
}

function recalculateEarnings(extraFromMonth = null, tipsFromMonth = null) {
    const normalH = parseFloat(document.getElementById('calcTotalHoursInput').value) || 0;
    const rate = parseFloat(document.getElementById('hourlyRateInput').value) || 0;
    const exRate = parseFloat(document.getElementById('extraRateInput').value) || 0;
    const retentionPct = parseFloat(document.getElementById('retentionPercentInput').value) || 0;

    const currentSummary = getMonthPayrollSummary(state.currentYear, state.currentMonth);
    const extraH = extraFromMonth !== null ? extraFromMonth : currentSummary.extraHours;
    const tips = tipsFromMonth !== null ? tipsFromMonth : currentSummary.totalTips;

    state.hourlyRate = rate;
    state.extraRate = exRate;
    state.retentionPercent = retentionPct;
    saveState();

    const gross = (normalH * rate) + (extraH * exRate);
    const net = gross * (1 - (retentionPct / 100));
    const totalReal = net + tips;

    document.getElementById('statGrossMoney').textContent = `${gross.toFixed(2)} €`;
    document.getElementById('statNetMoney').textContent = `${net.toFixed(2)} €`;
    document.getElementById('statMonthTips').textContent = `${tips.toFixed(2)} €`;
    document.getElementById('statTotalMoney').textContent = `${totalReal.toFixed(2)} €`;
    document.getElementById('earnedFormulaText').textContent = retentionPct > 0
        ? `Bruto ${gross.toFixed(2)}€ (-${retentionPct}% ret.) + ${tips.toFixed(2)}€ bote`
        : `${normalH}h × ${rate}€ + ${extraH}h extra × ${exRate}€`;

    updateGoalAndComparison(totalReal);
}

function updateGoalAndComparison(currentEarned) {
    const goal = Number(state.monthlyGoal) || 0;
    const pct = goal > 0 ? Math.min(100, Math.round((currentEarned / goal) * 100)) : 0;
    const remaining = Math.max(0, goal - currentEarned);

    document.getElementById('goalPercentBadge').textContent = `${pct}%`;
    document.getElementById('goalRemainingText').textContent = remaining === 0 && goal > 0
        ? '🎉 ¡Meta superada!'
        : `Faltan ${remaining.toFixed(2)} €`;
    document.getElementById('goalProgressBar').style.width = `${pct}%`;

    let prevM = state.currentMonth - 1;
    let prevY = state.currentYear;
    if (prevM < 0) { prevM = 11; prevY--; }

    const prevTotal = getMonthPayrollSummary(prevY, prevM).realTotal;
    const diff = currentEarned - prevTotal;
    const compareEl = document.getElementById('prevMonthComparison');

    if (prevTotal === 0) {
        compareEl.textContent = '📊 Mes anterior: 0.00 € registrados';
    } else {
        const sign = diff >= 0 ? '+' : '';
        const emoji = diff >= 0 ? '📈' : '📉';
        compareEl.innerHTML = `${emoji} Mes anterior: <strong>${prevTotal.toFixed(2)} €</strong> (${sign}${diff.toFixed(2)} €)`;
    }
}

// 5. MI CAJA, HUCHA DE AHORRO Y GASTOS FIJOS
function getWalletBalance() {
    let totalIn = 0;
    let totalOut = 0;
    state.walletMovements.forEach(m => {
        if (m.type === 'IN') totalIn += Number(m.amount);
        else totalOut += Number(m.amount);
    });
    return { totalIn, totalOut, balance: totalIn - totalOut };
}

function addWalletMovement(type, customAmount = null, customConcept = null) {
    const amountInput = document.getElementById('walletAmountInput');
    const conceptInput = document.getElementById('walletConceptInput');
    const amount = customAmount !== null ? customAmount : parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        alert('Introduce una cantidad mayor que 0 €.');
        return;
    }

    const defaultConcept = type === 'IN' ? 'Ingreso en Caja' : 'Retirada / Gasto';
    const concept = customConcept || conceptInput.value.trim() || defaultConcept;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    state.walletMovements.unshift({
        id: 'W_' + Date.now() + Math.random(),
        type,
        amount: Number(amount.toFixed(2)),
        concept,
        date: dateStr
    });

    if (customAmount === null) {
        amountInput.value = '';
        conceptInput.value = '';
    }
    saveState();
    renderWallet();
}

function renderWallet() {
    const listEl = document.getElementById('walletMovementsList');
    listEl.innerHTML = '';

    const { totalIn, totalOut, balance } = getWalletBalance();

    state.walletMovements.forEach(item => {
        const li = document.createElement('li');
        li.className = 'worked-list__item';
        const isIn = item.type === 'IN';
        li.innerHTML = `
            <div>
                <strong>${item.concept}</strong>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${item.date}</div>
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

// 6. GESTIÓN DE TURNOS Y COLORES
function renderShiftsConfigList() {
    const container = document.getElementById('shiftsConfigList');
    container.innerHTML = '';

    Object.values(state.shifts).forEach(shift => {
        if (shift.id === 'NONE') return;
        const row = document.createElement('div');
        row.className = 'shift-row-item';
        row.innerHTML = `
            <div class="shift-row-item__left">
                <div class="shift-color-swatch" style="background:${shift.color}; color:${shift.textColor}">${shift.short}</div>
                <div>
                    <strong>${shift.name}</strong>
                    <div style="font-size:0.72rem; color:var(--text-secondary);">${shift.defaultHours}h · Entrada ${shift.startTime} · Alarma ${shift.alarmTime}</div>
                </div>
            </div>
            <button type="button" class="btn btn--sm btn--outline">✏️ Editar</button>
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
        dot.addEventListener('click', () => { document.getElementById('cfgShiftColor').value = hex; });
        grid.appendChild(dot);
    });
}

function openShiftConfigModal(shiftId = null) {
    state.editingShiftId = shiftId;
    const isNew = !shiftId;
    const s = isNew
        ? { name: '', short: '', color: '#fde047', defaultHours: 8, startTime: '08:00', alarmTime: '06:00' }
        : state.shifts[shiftId];

    document.getElementById('shiftModalTitle').textContent = isNew ? 'Crear Nuevo Turno' : `Editar (${s.name})`;
    document.getElementById('cfgShiftName').value = s.name;
    document.getElementById('cfgShiftShort').value = s.short;
    document.getElementById('cfgShiftColor').value = s.color;
    document.getElementById('cfgShiftHours').value = s.defaultHours;
    document.getElementById('cfgShiftStart').value = s.startTime;
    document.getElementById('cfgShiftAlarm').value = s.alarmTime;
    document.getElementById('btnDeleteShiftType').style.display = isNew ? 'none' : 'block';
    document.getElementById('shiftConfigModal').classList.add('modal--open');
}

// 7. REPETIR SEMANA, PIN Y EVENTOS
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
        statusText.textContent = '🔐 Protegido con PIN';
        btnConfig.textContent = '⚙️ PIN';
        btnLock.style.display = state.statsUnlocked ? 'inline-block' : 'none';
    } else {
        statusText.textContent = '🔓 Sin PIN';
        btnConfig.textContent = '🔒 Activar PIN';
        btnLock.style.display = 'none';
    }
}

function switchTab(targetTabId) {
    if ((targetTabId === 'statsView' || targetTabId === 'walletView') && state.statsPin && !state.statsUnlocked) {
        const entered = prompt('🔒 Introduce tu PIN de 4 dígitos:');
        if (entered !== state.statsPin) {
            if (entered !== null) alert('❌ PIN incorrecto.');
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
    // NAVEGACIÓN INFERIOR (Compatible al 100% con iPhone Safari)
    document.querySelectorAll('.bottom-nav__item').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Tema Claro / Oscuro
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

    // Vaciar mes
    document.getElementById('btnClearMonth').addEventListener('click', () => {
        if (!confirm('¿Vaciar todos los días de este mes?')) return;
        const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
        Object.keys(state.daysData).forEach(k => { if (k.startsWith(prefix)) delete state.daysData[k]; });
        saveState();
        renderAll();
    });

    // Backup JSON y Exportar ICS
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
                if (!parsed.daysData) return alert('❌ Archivo no válido.');
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                loadState();
                applyTheme();
                renderAll();
                alert('✅ Copia restaurada.');
            } catch { alert('❌ Error leyendo archivo.'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.getElementById('btnExportICS').addEventListener('click', () => {
        const keys = Object.keys(state.daysData);
        if (!keys.length) return alert('No hay turnos guardados.');
        let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ShifterPro//ES\n';
        keys.forEach(k => {
            const d = state.daysData[k];
            if (!d || (d.shiftId === 'NONE' && !d.customText)) return;
            const sName = state.shifts[d.shiftId] ? state.shifts[d.shiftId].name : 'Turno';
            ics += `BEGIN:VEVENT\nSUMMARY:${sName} ${d.customText || ''}\nDTSTART:${k.replace(/-/g, '')}T${(d.startTime || '08:00').replace(':', '')}00\nEND:VEVENT\n`;
        });
        ics += 'END:VCALENDAR';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
        a.download = 'shifterpro_turnos.ics';
        a.click();
    });

    // Botones - y + de los steppers
    document.querySelectorAll('.stepper__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.stepTarget);
            const step = parseFloat(btn.dataset.step);
            const val = Math.max(0, (parseFloat(input.value) || 0) + step);
            input.value = val;
            updateLivePreview();
        });
    });

    // Color especial del día
    document.getElementById('dayUseCustomColor').addEventListener('change', updateLivePreview);
    document.getElementById('dayCustomBgColor').addEventListener('input', (e) => {
        document.getElementById('dayUseCustomColor').checked = true;
        document.getElementById('dayColorHexLabel').textContent = e.target.value.toUpperCase();
        updateLivePreview();
    });

    // Presets y slider de tamaño de letra
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

    ['dayHours', 'dayExtraHours', 'dayHourlyRate', 'dayExtraRate', 'dayTips', 'dayAlarmEnabled', 'dayStartTime', 'dayAlarmTime', 'dayCustomText', 'dayPrioritizeText'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            updateAlarmHintText();
            updateLivePreview();
        });
    });

    // Botones repetir semana
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

    // Modal Día: Cerrar, Vaciar, Guardar
    document.getElementById('btnCloseDayModal').addEventListener('click', closeDayModal);
    document.getElementById('btnClearDay').addEventListener('click', () => {
        if (state.editingDateKey) {
            delete state.daysData[state.editingDateKey];
            saveState();
            renderAll();
            closeDayModal();
        }
    });

    function handleSaveDay(e) {
        if (e) e.preventDefault();
        if (!state.editingDateKey) return;

        const data = collectDayModalData();
        const isEmpty = data.shiftId === 'NONE' && !data.useCustomColor && data.hours === 0 &&
                        data.extraHours === 0 && data.tips === 0 && !data.alarmEnabled &&
                        !data.customText && !data.sticker;

        if (isEmpty) {
            delete state.daysData[state.editingDateKey];
        } else {
            state.daysData[state.editingDateKey] = data;
            if (typeof applyRepeatToSelectedWeekDays === 'function') {
                applyRepeatToSelectedWeekDays(state.editingDateKey, data);
            }
        }

        saveState();
        renderAll();
        closeDayModal();
    }

    const dayFormEl = document.getElementById('dayForm');
    if (dayFormEl) dayFormEl.addEventListener('submit', handleSaveDay);

    const btnSaveDayEl = document.getElementById('btnSaveDay');
    if (btnSaveDayEl) btnSaveDayEl.addEventListener('click', handleSaveDay);

    // Calculadora de Ganancias y Retenciones
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
            if (cur !== state.statsPin) return alert('❌ PIN incorrecto.');
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

    // Eventos de Mi Caja, Hucha y Gastos Fijos
    document.getElementById('btnWalletAdd').addEventListener('click', () => addWalletMovement('IN'));
    document.getElementById('btnWalletWithdraw').addEventListener('click', () => addWalletMovement('OUT'));

    document.getElementById('btnSyncMonthToWallet').addEventListener('click', () => {
        const summary = getMonthPayrollSummary(state.currentYear, state.currentMonth);
        if (summary.realTotal <= 0) return alert('No hay ganancias acumuladas este mes.');
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        addWalletMovement('IN', summary.realTotal, `Nómina + Bote (${months[state.currentMonth]})`);
    });

    document.getElementById('btnClearWallet').addEventListener('click', () => {
        if (!confirm('¿Vaciar el historial de Mi Caja?')) return;
        state.walletMovements = [];
        saveState();
        renderWallet();
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
        addWalletMovement('OUT', amt, `🐷 Apartado a Hucha: ${state.piggyTitle}`);
        input.value = '';
        saveState();
        renderPiggyBank();
    });

    document.getElementById('btnPiggyWithdraw').addEventListener('click', () => {
        const input = document.getElementById('piggyTransferInput');
        const amt = parseFloat(input.value);
        if (!amt || amt <= 0 || amt > state.piggySaved) return alert('Cantidad no válida o mayor que lo ahorrado.');
        state.piggySaved -= amt;
        addWalletMovement('IN', amt, `🐷 Retirado de Hucha: ${state.piggyTitle}`);
        input.value = '';
        saveState();
        renderPiggyBank();
    });

    document.getElementById('btnAddFixedExpense').addEventListener('click', () => {
        const nameEl = document.getElementById('fixedExpenseName');
        const amtEl = document.getElementById('fixedExpenseAmount');
        const name = nameEl.value.trim();
        const amount = parseFloat(amtEl.value);
        if (!name || !amount || amount <= 0) return alert('Escribe un nombre y una cantidad válida.');
        state.fixedExpenses.push({ id: 'F_' + Date.now(), name, amount });
        nameEl.value = '';
        amtEl.value = '';
        saveState();
        renderFixedExpenses();
    });

    document.getElementById('btnApplyFixedExpenses').addEventListener('click', () => {
        if (state.fixedExpenses.length === 0) return alert('Añade primero algún gasto fijo arriba.');
        if (!confirm('¿Descontar todos los gastos fijos de tu saldo ahora?')) return;
        state.fixedExpenses.forEach(exp => {
            addWalletMovement('OUT', exp.amount, `📌 Gasto fijo: ${exp.name}`);
        });
    });

    // Modal Configurar Turnos
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
}
