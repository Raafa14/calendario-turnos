import {
    state,
    APP_VERSION,
    STORAGE_KEY,
    loadState,
    saveState,
    applyParsedState,
    applyTheme,
    registerRenderAllHook,
    registerSwitchTabHook
} from './state.js';

import { initCloudSync, bindCloudEvents, updateProfileUI } from './cloud.js';
import {
    renderCalendar,
    renderTomorrowBanner,
    initStickerSelector,
    initDayQuickPalette,
    changeMonth,
    toggleBatchMode,
    bindCalendarEvents
} from './calendar.js';

import {
    renderStats,
    renderWallet,
    renderPiggyBank,
    renderFixedExpenses,
    renderDebts,
    updatePinUI,
    bindFinanceEvents
} from './finance.js?v=33';

import { renderGymView, bindGymEvents } from './gym.js';
import { renderCycleView, bindCycleEvents } from './cycle.js';
import { renderTasksView, bindTaskEvents } from './tasks.js';
import {
    initPatternDefaultDate,
    initColorPalette,
    renderShiftsConfigList,
    renderPatternGenerator,
    bindShiftEvents
} from './shifts.js';

export function applyModuleVisibility() {
    const isCycle = state.cycle?.enabled !== false;
    const isGym = state.gymEnabled !== false;

    // 1. Barra de navegación inferior
    const cycleTab = document.querySelector('.bottom-nav__item[data-tab="cycleView"]');
    if (cycleTab) cycleTab.style.display = isCycle ? '' : 'none';

    const gymTab = document.querySelector('.bottom-nav__item[data-tab="gymView"]');
    if (gymTab) gymTab.style.display = isGym ? '' : 'none';

    // 2. Si la vista activa es de un módulo desactivado, volver a Calendario
    const activeView = document.querySelector('.view.view--active');
    if (activeView) {
        if (!isCycle && activeView.id === 'cycleView') switchTab('calendarView');
        if (!isGym && activeView.id === 'gymView') switchTab('calendarView');
    }

    // 3. Resumen y filtros del calendario
    const calSumGymPill = document.getElementById('calSumGymPill');
    if (calSumGymPill) calSumGymPill.style.display = isGym ? '' : 'none';

    const gymFilterBtn = document.querySelector('.task-pill-btn[data-cal-filter="GYM"]');
    if (gymFilterBtn) gymFilterBtn.style.display = isGym ? '' : 'none';

    const dayGymSection = document.getElementById('dayGymSection');
    if (dayGymSection) dayGymSection.style.display = isGym ? '' : 'none';

    const dayPeriodRow = document.getElementById('dayPeriodRow');
    if (dayPeriodRow) dayPeriodRow.style.display = isCycle ? '' : 'none';

    if (!isGym && state.calendarFilter === 'GYM') {
        state.calendarFilter = 'ALL';
        document.querySelectorAll('#calendarFilterPills .task-pill-btn').forEach(b => {
            b.classList.toggle('task-pill-btn--active', b.dataset.calFilter === 'ALL');
        });
    }
}

function initSettingsModal() {
    const btnOpen = document.getElementById('btnOpenSettings');
    const btnOpenFromProfile = document.getElementById('btnOpenSettingsFromProfile');
    const modal = document.getElementById('settingsModal');
    const btnClose = document.getElementById('btnCloseSettingsModal');
    const btnSave = document.getElementById('btnSaveSettingsModal');
    const toggleCycle = document.getElementById('settingToggleCycle');
    const toggleGym = document.getElementById('settingToggleGym');

    function syncCheckboxes() {
        if (toggleCycle) toggleCycle.checked = state.cycle?.enabled !== false;
        if (toggleGym) toggleGym.checked = state.gymEnabled !== false;
    }

    function openModal() {
        syncCheckboxes();
        if (modal) modal.classList.add('modal--open');
    }

    function closeModal() {
        if (modal) modal.classList.remove('modal--open');
    }

    if (btnOpen) btnOpen.addEventListener('click', openModal);
    if (btnOpenFromProfile) btnOpenFromProfile.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function saveAndApplySettings() {
        if (toggleCycle) {
            if (!state.cycle) state.cycle = {};
            state.cycle.enabled = toggleCycle.checked;
        }
        if (toggleGym) {
            state.gymEnabled = toggleGym.checked;
        }
        saveState();
        applyModuleVisibility();
        renderAll();
    }

    if (toggleCycle) toggleCycle.addEventListener('change', saveAndApplySettings);
    if (toggleGym) toggleGym.addEventListener('change', saveAndApplySettings);

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            saveAndApplySettings();
            closeModal();
        });
    }
}

function initLegalModal() {
    const legalModal = document.getElementById('legalModal');
    const btnOpen = document.getElementById('btnOpenLegalModal');
    const btnClose = document.getElementById('btnCloseLegalModal');
    const btnConfirm = document.getElementById('btnConfirmCloseLegal');

    if (btnOpen && legalModal) {
        btnOpen.addEventListener('click', () => {
            legalModal.classList.add('modal--open');
        });
    }

    if (btnClose && legalModal) {
        btnClose.addEventListener('click', () => {
            legalModal.classList.remove('modal--open');
        });
    }

    if (btnConfirm && legalModal) {
        btnConfirm.addEventListener('click', () => {
            legalModal.classList.remove('modal--open');
        });
    }

    if (legalModal) {
        legalModal.addEventListener('click', (e) => {
            if (e.target === legalModal) legalModal.classList.remove('modal--open');
        });
    }
}

function renderAll() {
    applyModuleVisibility();
    renderCalendar();
    renderTomorrowBanner();
    renderStats();
    renderGymView();
    renderCycleView();
    renderWallet();
    renderPiggyBank();
    renderFixedExpenses();
    renderDebts();
    renderTasksView();
    renderShiftsConfigList();
    renderPatternGenerator();
}

function switchTab(targetTabId) {
    if (targetTabId === 'walletView' && state.statsPin && !state.statsUnlocked) {
        const entered = prompt('Introduce tu PIN de 4 dígitos:');
        if (entered !== state.statsPin) {
            if (entered !== null) alert('PIN incorrecto.');
            return;
        }
        state.statsUnlocked = true;
        updatePinUI();
    }

    if (targetTabId !== 'calendarView' && state.isBatchMode) {
        toggleBatchMode(false);
    }

    document.querySelectorAll('.bottom-nav__item').forEach(b => {
        b.classList.toggle('bottom-nav__item--active', b.dataset.tab === targetTabId);
    });
    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('view--active', v.id === targetTabId);
    });
}

function bindGlobalEvents() {
    document.querySelectorAll('.bottom-nav__item').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('btnThemeToggle').addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveState();
    });

    document.getElementById('btnPrevMonth').addEventListener('click', () => {
        changeMonth(-1);
    });

    document.getElementById('btnNextMonth').addEventListener('click', () => {
        changeMonth(1);
    });

    document.getElementById('btnTodayMonth').addEventListener('click', () => {
        const now = new Date();
        state.currentYear = now.getFullYear();
        state.currentMonth = now.getMonth();
        renderAll();
    });

    document.getElementById('btnClearMonth').addEventListener('click', () => {
        if (!confirm('¿Vaciar todos los días de este mes?')) return;
        const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
        Object.keys(state.daysData).forEach(k => { if (k.startsWith(prefix)) delete state.daysData[k]; });
        state.createdIphoneAlarms = [];
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

    document.getElementById('btnImportBackup').addEventListener('click', () => {
        document.getElementById('inputImportBackup').click();
    });

    document.getElementById('inputImportBackup').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!parsed.daysData) return alert('Archivo no válido.');
                applyParsedState(parsed);
                saveState();
                applyTheme();
                updatePinUI();
                updateProfileUI();
                renderAll();
                alert('Copia restaurada.');
            } catch {
                alert('Error leyendo archivo.');
            }
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
}

document.addEventListener('DOMContentLoaded', () => {
    registerRenderAllHook(renderAll);
    registerSwitchTabHook(switchTab);

    loadState();
    applyTheme();
    updatePinUI();
    updateProfileUI();

    initStickerSelector();
    initDayQuickPalette();
    initColorPalette();
    initPatternDefaultDate();

    bindGlobalEvents();
    bindCloudEvents();
    bindCalendarEvents();
    bindFinanceEvents();
    bindGymEvents();
    bindCycleEvents();
    bindTaskEvents();
    bindShiftEvents();
    initSettingsModal();
    initLegalModal();
    applyModuleVisibility();

    document.querySelectorAll('.app-version-text').forEach(el => {
        el.textContent = APP_VERSION;
    });

    initCloudSync();
    renderAll();
});
