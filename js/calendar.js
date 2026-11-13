import {
    state,
    COLOR_PALETTE,
    STICKERS,
    saveState,
    getContrastText,
    formatDateKey,
    triggerRenderAll
} from './state.js';

export function renderCalendar() {
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

export function renderTomorrowBanner() {
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

export function paintCell(cellEl, dayNumber, info) {
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

export function initStickerSelector() {
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

export function initDayQuickPalette() {
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

function syncPresetButtons(size) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('preset-btn--active', Number(btn.dataset.size) === Number(size));
    });
}

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

function triggerIphoneAlarmPrompt(dateKey, data) {
    if (!data.alarmEnabled || !data.alarmTime) return;
    if (state.createdIphoneAlarms.includes(data.alarmTime)) return;

    const [y, m, d] = dateKey.split('-');
    const shiftName = state.shifts[data.shiftId] && state.shifts[data.shiftId].id !== 'NONE'
        ? state.shifts[data.shiftId].name
        : 'Turno';

    const ok = confirm(`⏰ Has activado una alarma a las ${data.alarmTime} (${shiftName} - ${d}/${m}/${y}).\n\n¿Quieres añadirla a la app Reloj de tu iPhone? (Solo se creará una vez para esta hora)`);
    if (!ok) return;

    state.createdIphoneAlarms.push(data.alarmTime);
    saveState();

    const shortcutName = encodeURIComponent('Alarma ShifterPro');
    const alarmTimeParam = encodeURIComponent(data.alarmTime);
    window.location.href = `shortcuts://run-shortcut?name=${shortcutName}&input=text&text=${alarmTimeParam}`;
}

export function bindCalendarEvents() {
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
        triggerRenderAll();
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
            triggerRenderAll();
            closeDayModal();
        }
    });
}