export const STORAGE_KEY = 'shifterpro_v6_data';
export const LEGACY_KEYS = ['shifterpro_v5_data', 'shifterpro_v4_data'];

export const DEFAULT_SHIFTS = {
    NONE: { id: 'NONE', name: 'Ninguno',    short: '-', color: '#ffffff', textColor: '#1e293b', defaultHours: 0, startTime: '08:00', alarmTime: '06:00', customRate: 0, shiftPlus: 0 },
    M:    { id: 'M',    name: 'Mañana',     short: 'M', color: '#fef08a', textColor: '#713f12', defaultHours: 8, startTime: '08:00', alarmTime: '06:00', customRate: 0, shiftPlus: 0 },
    A:    { id: 'A',    name: 'Tarde',      short: 'A', color: '#fbcfe8', textColor: '#831843', defaultHours: 8, startTime: '15:00', alarmTime: '13:00', customRate: 0, shiftPlus: 0 },
    N:    { id: 'N',    name: 'Noche',      short: 'N', color: '#a5f3fc', textColor: '#164e63', defaultHours: 8, startTime: '22:00', alarmTime: '20:00', customRate: 0, shiftPlus: 0 },
    L:    { id: 'L',    name: 'Libre',      short: 'L', color: '#bbf7d0', textColor: '#14532d', defaultHours: 0, startTime: '00:00', alarmTime: '09:00', customRate: 0, shiftPlus: 0 },
    V:    { id: 'V',    name: 'Vacaciones', short: 'V', color: '#ddd6fe', textColor: '#4c1d95', defaultHours: 0, startTime: '00:00', alarmTime: '09:00', customRate: 0, shiftPlus: 0 }
};

export const DEFAULT_EXERCISES = [
    { id: 'EX_1', name: 'Press Banca', weight: 60 },
    { id: 'EX_2', name: 'Sentadilla', weight: 80 },
    { id: 'EX_3', name: 'Peso Muerto', weight: 90 },
    { id: 'EX_4', name: 'Press Militar', weight: 40 },
    { id: 'EX_5', name: 'Jalón al Pecho', weight: 55 }
];

export const COLOR_PALETTE = [
    '#fef08a', '#fde047', '#fed7aa', '#fdba74',
    '#fbcfe8', '#f9a8d4', '#fecdd3', '#fca5a5',
    '#a5f3fc', '#7dd3fc', '#bfdbfe', '#c7d2fe',
    '#ddd6fe', '#f5d0fe', '#bbf7d0', '#86efac',
    '#e2e8f0', '#cbd5e1'
];

export const STICKERS = ['', '🎂', '🏥', '🎉', '⚠️', '🏋️', '✈️', '🍻', '❤️', '⭐'];

export const DEFAULT_CYCLE = {
    enabled: true,
    cycleLength: 28,
    periodLength: 5,
    lastPeriodDate: '',
    showOnCalendar: true,
    discreetMode: false,
    selectedDate: '',
    logs: {}
};

export const state = {
    theme: 'dark',
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    calendarFilter: 'ALL',
    profile: {
        name: '',
        role: '',
        company: '',
        bio: '',
        avatar: '',
        vacationDays: 30
    },
    shifts: JSON.parse(JSON.stringify(DEFAULT_SHIFTS)),
    daysData: {},
    hourlyRate: 10,
    extraRate: 12,
    retentionPercent: 0,
    monthlyGoal: 1200,
    statsPin: null,
    statsUnlocked: false,
    walletSubTab: 'CAJA',
    walletMovements: [],
    piggyTitle: 'Ahorro / Viaje',
    piggyGoal: 600,
    piggySaved: 0,
    fixedExpenses: [],
    debts: [],
    debtTab: 'OWE',
    createdIphoneAlarms: [],
    gymWeeklyGoal: 4,
    exercises: JSON.parse(JSON.stringify(DEFAULT_EXERCISES)),
    weightLogs: [],
    tasks: [],
    taskFilter: 'ALL',
    taskUrgentDraft: false,
    notes: [],
    selectedNoteColor: 'emerald',
    notesSearch: '',
    quickNote: '',
    cycle: JSON.parse(JSON.stringify(DEFAULT_CYCLE)),
    sendingTaskId: null,
    patternSequence: [],
    editingDateKey: null,
    modalSelectedShift: 'NONE',
    modalSelectedSticker: '',
    repeatSelectedDows: [],
    editingShiftId: null
};

let cloudSaveHook = null;
let renderAllHook = null;
let switchTabHook = null;

export function registerCloudSaveHook(fn) {
    cloudSaveHook = fn;
}

export function registerRenderAllHook(fn) {
    renderAllHook = fn;
}

export function triggerRenderAll() {
    if (renderAllHook) renderAllHook();
}

export function registerSwitchTabHook(fn) {
    switchTabHook = fn;
}

export function triggerSwitchTab(tabId) {
    if (switchTabHook) switchTabHook(tabId);
}

export function getSerializableState() {
    return {
        theme: state.theme,
        profile: state.profile,
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
        debts: state.debts,
        createdIphoneAlarms: state.createdIphoneAlarms,
        gymWeeklyGoal: state.gymWeeklyGoal,
        exercises: state.exercises,
        weightLogs: state.weightLogs,
        tasks: state.tasks,
        notes: state.notes,
        quickNote: state.quickNote,
        cycle: state.cycle,
        patternSequence: state.patternSequence
    };
}

export function applyParsedState(p) {
    if (!p) return;
    state.theme = p.theme || 'dark';
    state.profile = {
        name: p.profile?.name || '',
        role: p.profile?.role || '',
        company: p.profile?.company || '',
        bio: p.profile?.bio || '',
        avatar: p.profile?.avatar || '',
        vacationDays: p.profile?.vacationDays ?? 30
    };
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
    state.debts = p.debts || [];
    state.createdIphoneAlarms = p.createdIphoneAlarms || [];
    state.gymWeeklyGoal = p.gymWeeklyGoal ?? 4;
    state.exercises = p.exercises || JSON.parse(JSON.stringify(DEFAULT_EXERCISES));
    state.weightLogs = p.weightLogs || [];
    state.tasks = p.tasks || [];
    state.notes = Array.isArray(p.notes) ? p.notes : [];
    state.quickNote = p.quickNote || '';
    state.cycle = Object.assign(JSON.parse(JSON.stringify(DEFAULT_CYCLE)), p.cycle || {});

    // Migración automática si tenía texto en el bloc antiguo y aún no tenía notas Pro
    if (state.notes.length === 0 && state.quickNote.trim() !== '') {
        state.notes.push({
            id: 'N_' + Date.now(),
            title: 'Apuntes rápidos',
            content: state.quickNote.trim(),
            tag: 'General',
            color: 'emerald',
            pinned: true,
            updatedAt: formatNowTime()
        });
    }

    state.patternSequence = p.patternSequence || [];

    document.getElementById('hourlyRateInput').value = state.hourlyRate;
    document.getElementById('extraRateInput').value = state.extraRate;
    document.getElementById('retentionPercentInput').value = state.retentionPercent;
    document.getElementById('monthlyGoalInput').value = state.monthlyGoal;
    document.getElementById('piggyTitleInput').value = state.piggyTitle;
    document.getElementById('piggyGoalInput').value = state.piggyGoal;
    document.getElementById('gymWeeklyGoalInput').value = state.gymWeeklyGoal;
}

export function loadState() {
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
            applyParsedState(JSON.parse(raw));
        } catch (err) {
            console.error('Error cargando datos locales:', err);
        }
    } else {
        applyParsedState({});
    }
}

export function saveState() {
    const payload = getSerializableState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (cloudSaveHook) {
        cloudSaveHook(payload);
    }
}

export function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const isDark = state.theme === 'dark';
    document.getElementById('iconMoon').style.display = isDark ? 'none' : 'block';
    document.getElementById('iconSun').style.display = isDark ? 'block' : 'none';
}

export function getContrastText(hexColor) {
    if (!hexColor || hexColor === '#ffffff') return '#1e293b';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 255;
    const g = parseInt(hex.substring(2, 4), 16) || 255;
    const b = parseInt(hex.substring(4, 6), 16) || 255;
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 145 ? '#1e293b' : '#ffffff';
}

export function formatDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatNowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
