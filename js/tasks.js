import { state, saveState, formatDateKey, triggerRenderAll, triggerSwitchTab } from './state.js';

export function renderTasksView() {
    const pendingList = document.getElementById('tasksPendingList');
    const completedList = document.getElementById('tasksCompletedList');
    if (!pendingList) return;

    const total = state.tasks.length;
    const doneTotal = state.tasks.filter(t => t.done).length;
    const pct = total > 0 ? Math.round((doneTotal / total) * 100) : 0;

    document.getElementById('tasksProgressBadge').textContent = `${doneTotal} / ${total}`;
    document.getElementById('tasksProgressBar').style.width = `${pct}%`;

    const filtered = state.tasks.filter(t => state.taskFilter === 'ALL' || t.category === state.taskFilter);
    const pending = filtered.filter(t => !t.done);
    const completed = filtered.filter(t => t.done);

    document.getElementById('tasksPendingCount').textContent = pending.length;
    document.getElementById('tasksCompletedCount').textContent = completed.length;

    pendingList.innerHTML = '';
    completedList.innerHTML = '';

    const createTaskLi = (task) => {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.urgent && !task.done ? ' task-item--urgent' : '');

        const urgentTag = task.urgent ? `<span class="task-urgent-badge">URGENTE</span>` : '';
        li.innerHTML = `
            <div class="task-item__left">
                <button type="button" class="task-check-circle ${task.done ? 'task-check-circle--done' : ''}" title="Completar">
                    ${task.done ? '✓' : ''}
                </button>
                <div class="task-item__body">
                    <span class="task-item__text">${task.text}</span>
                    <div class="task-item__meta">
                        <span>${task.category}</span>
                        ${urgentTag}
                    </div>
                </div>
            </div>
            <div class="task-item__actions">
                <button type="button" class="task-cal-btn" title="Pasar al calendario">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="3"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </button>
                <button type="button" class="movement-delete-btn" title="Eliminar">&times;</button>
            </div>
        `;

        li.querySelector('.task-check-circle').addEventListener('click', () => {
            task.done = !task.done;
            saveState();
            renderTasksView();
        });

        li.querySelector('.task-item__text').addEventListener('click', () => {
            const edited = prompt('Editar tarea:', task.text);
            if (edited !== null && edited.trim() !== '') {
                task.text = edited.trim();
                saveState();
                renderTasksView();
            }
        });

        li.querySelector('.task-cal-btn').addEventListener('click', () => {
            state.sendingTaskId = task.id;
            document.getElementById('taskCalPreviewText').textContent = `"${task.text}"`;
            const now = new Date();
            document.getElementById('taskCalDateInput').value = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
            document.getElementById('taskToCalModal').classList.add('modal--open');
        });

        li.querySelector('.movement-delete-btn').addEventListener('click', () => {
            state.tasks = state.tasks.filter(t => t.id !== task.id);
            saveState();
            renderTasksView();
        });

        return li;
    };

    pending.forEach(t => pendingList.appendChild(createTaskLi(t)));
    completed.forEach(t => completedList.appendChild(createTaskLi(t)));

    if (pending.length === 0) {
        pendingList.innerHTML = '<li class="worked-list__item">No tienes tareas pendientes en esta categoría.</li>';
    }
    if (completed.length === 0) {
        completedList.innerHTML = '<li class="worked-list__item">Aún no hay tareas completadas.</li>';
    }
}

export function bindTaskEvents() {
    const urgentBtn = document.getElementById('btnTaskUrgentToggle');
    urgentBtn.addEventListener('click', () => {
        state.taskUrgentDraft = !state.taskUrgentDraft;
        urgentBtn.classList.toggle('task-urgent-toggle--active', state.taskUrgentDraft);
    });

    function handleAddTask() {
        const input = document.getElementById('taskTextInput');
        const category = document.getElementById('taskCategorySelect').value;
        const text = input.value.trim();
        if (!text) return;

        state.tasks.unshift({
            id: 'T_' + Date.now(),
            text,
            category,
            urgent: state.taskUrgentDraft,
            done: false
        });

        input.value = '';
        state.taskUrgentDraft = false;
        urgentBtn.classList.remove('task-urgent-toggle--active');
        saveState();
        renderTasksView();
    }

    document.getElementById('btnAddTask').addEventListener('click', handleAddTask);
    document.getElementById('taskTextInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTask();
        }
    });

    document.querySelectorAll('.task-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.taskFilter = btn.dataset.filter;
            document.querySelectorAll('.task-pill-btn').forEach(b => b.classList.remove('task-pill-btn--active'));
            btn.classList.add('task-pill-btn--active');
            renderTasksView();
        });
    });

    document.getElementById('btnClearCompletedTasks').addEventListener('click', () => {
        const hasDone = state.tasks.some(t => t.done);
        if (!hasDone) return;
        state.tasks = state.tasks.filter(t => !t.done);
        saveState();
        renderTasksView();
    });

    document.getElementById('btnCloseTaskCalModal').addEventListener('click', () => {
        document.getElementById('taskToCalModal').classList.remove('modal--open');
        state.sendingTaskId = null;
    });

    document.getElementById('btnConfirmTaskToCal').addEventListener('click', () => {
        const dateKey = document.getElementById('taskCalDateInput').value;
        const task = state.tasks.find(t => t.id === state.sendingTaskId);
        if (!dateKey || !task) return;

        const existing = state.daysData[dateKey] || {
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

        existing.customText = existing.customText
            ? `${existing.customText} · ${task.text}`
            : task.text;
        existing.prioritizeText = true;
        state.daysData[dateKey] = existing;

        const [y, m] = dateKey.split('-').map(Number);
        state.currentYear = y;
        state.currentMonth = m - 1;

        saveState();
        triggerRenderAll();
        document.getElementById('taskToCalModal').classList.remove('modal--open');
        state.sendingTaskId = null;
        triggerSwitchTab('calendarView');
    });

    document.getElementById('quickNoteTextarea').addEventListener('input', (e) => {
        state.quickNote = e.target.value;
        saveState();
        const badge = document.getElementById('quickNoteSavedBadge');
        badge.textContent = 'Guardado ✓';
    });
}