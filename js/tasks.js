import { state, saveState, formatDateKey, formatNowTime, triggerRenderAll, triggerSwitchTab } from './state.js';

let editingTaskId = null;
let editDraftPriority = 'medium';

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getTaskPriority(task) {
    if (task.priority) return task.priority;
    if (task.urgent) return 'high';
    return 'medium';
}

function formatTaskDueDate(dueDateStr) {
    if (!dueDateStr) return null;
    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(y, m, d);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    const dd = String(d).padStart(2, '0');
    const mm = String(m + 1).padStart(2, '0');

    if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        return {
            label: absDays === 1 ? `Vencida ayer (${dd}/${mm})` : `Vencida (${dd}/${mm})`,
            isOverdue: true,
            badgeClass: 'task-due-badge--overdue'
        };
    } else if (diffDays === 0) {
        return {
            label: `Hasta hoy (${dd}/${mm})`,
            isOverdue: false,
            badgeClass: 'task-due-badge--today'
        };
    } else if (diffDays === 1) {
        return {
            label: `Hasta mañana (${dd}/${mm})`,
            isOverdue: false,
            badgeClass: 'task-due-badge--tomorrow'
        };
    } else {
        return {
            label: `Hasta el ${dd}/${mm}`,
            isOverdue: false,
            badgeClass: 'task-due-badge--future'
        };
    }
}

function getPriorityBadgeHtml(priority) {
    if (priority === 'low') {
        return `<span class="task-priority-badge task-priority-badge--low" title="No urgente">🟢 No urgente</span>`;
    } else if (priority === 'high') {
        return `<span class="task-priority-badge task-priority-badge--urgent" title="Urgente / Importante">🔴 URGENTE</span>`;
    }
    return `<span class="task-priority-badge task-priority-badge--medium" title="Hasta fecha límite">🟠 Fecha límite</span>`;
}

export function renderTasksView() {
    renderTasksLists();
    renderProNotes();
}

function renderTasksLists() {
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
        const priority = getTaskPriority(task);
        const dueInfo = formatTaskDueDate(task.dueDate);

        const li = document.createElement('li');
        li.className = 'task-item ' + (task.done
            ? 'task-item--done'
            : `task-item--${priority === 'high' ? 'urgent' : priority}`);

        const priorityBadge = !task.done ? getPriorityBadgeHtml(priority) : '';
        const dueBadge = dueInfo ? `<span class="task-due-badge ${dueInfo.badgeClass}">📅 ${dueInfo.label}</span>` : '';

        li.innerHTML = `
            <div class="task-item__left">
                <button type="button" class="task-check-circle ${task.done ? 'task-check-circle--done' : ''}" title="${task.done ? 'Reabrir tarea' : 'Aceptar tarea (Completar)'}" aria-label="Completar">
                    ${task.done ? '✓' : ''}
                </button>
                <div class="task-item__body">
                    <span class="task-item__text" title="Toca para editar">${escapeHtml(task.text)}</span>
                    <div class="task-item__meta">
                        <span class="task-category-tag">${escapeHtml(task.category)}</span>
                        ${priorityBadge}
                        ${dueBadge}
                    </div>
                </div>
            </div>
            <div class="task-item__actions">
                ${!task.done ? `
                    <button type="button" class="task-action-btn task-action-btn--accept" title="Aceptar cuando esté hecha">
                        <span class="task-accept-icon">✓</span>
                        <span class="task-accept-text">Aceptar</span>
                    </button>
                ` : ''}
                <button type="button" class="task-cal-btn" title="Pasar al calendario">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="3"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </button>
                <button type="button" class="task-edit-btn" title="Editar tarea">✏️</button>
                <button type="button" class="movement-delete-btn" title="Eliminar">&times;</button>
            </div>
        `;

        // Marcar hecha mediante círculo
        li.querySelector('.task-check-circle').addEventListener('click', () => {
            task.done = !task.done;
            saveState();
            renderTasksLists();
        });

        // Marcar hecha mediante botón "✓ Aceptar"
        const acceptBtn = li.querySelector('.task-action-btn--accept');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                task.done = true;
                saveState();
                renderTasksLists();
            });
        }

        // Editar tarea al tocar texto o botón lápiz
        const handleOpenEdit = () => openEditTaskModal(task);
        li.querySelector('.task-item__text').addEventListener('click', handleOpenEdit);
        li.querySelector('.task-edit-btn').addEventListener('click', handleOpenEdit);

        // Pasar al calendario con la fecha límite preseleccionada
        li.querySelector('.task-cal-btn').addEventListener('click', () => {
            state.sendingTaskId = task.id;
            document.getElementById('taskCalPreviewText').textContent = `"${task.text}"`;
            const now = new Date();
            const fallbackDate = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
            document.getElementById('taskCalDateInput').value = task.dueDate || fallbackDate;
            document.getElementById('taskToCalModal').classList.add('modal--open');
        });

        // Eliminar tarea
        li.querySelector('.movement-delete-btn').addEventListener('click', () => {
            state.tasks = state.tasks.filter(t => t.id !== task.id);
            saveState();
            renderTasksLists();
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

function openEditTaskModal(task) {
    editingTaskId = task.id;
    editDraftPriority = getTaskPriority(task);

    document.getElementById('editTaskTextInput').value = task.text || '';
    document.getElementById('editTaskCategorySelect').value = task.category || 'Personal';
    document.getElementById('editTaskDueDateInput').value = task.dueDate || '';

    // Sincronizar chips de prioridad en el modal de edición
    syncEditPriorityChips(editDraftPriority);

    const modal = document.getElementById('editTaskModal');
    if (modal) modal.classList.add('modal--open');
}

function closeEditTaskModal() {
    editingTaskId = null;
    const modal = document.getElementById('editTaskModal');
    if (modal) modal.classList.remove('modal--open');
}

function syncEditPriorityChips(priority) {
    document.querySelectorAll('#editTaskPriorityChips .task-priority-chip').forEach(btn => {
        btn.classList.toggle('task-priority-chip--active', btn.dataset.priority === priority);
    });
}

function syncComposerPriorityChips(priority) {
    document.querySelectorAll('#taskPriorityChips .task-priority-chip').forEach(btn => {
        btn.classList.toggle('task-priority-chip--active', btn.dataset.priority === priority);
    });
}

function updateComposerDueDateClearBtn() {
    const input = document.getElementById('taskDueDateInput');
    const clearBtn = document.getElementById('btnClearTaskDueDate');
    const quickClearBtn = document.getElementById('btnQuickClearDate');
    const hasVal = Boolean(input && input.value);
    if (clearBtn) clearBtn.style.display = hasVal ? 'block' : 'none';
    if (quickClearBtn) quickClearBtn.style.display = hasVal ? 'inline-block' : 'none';
}

function renderProNotes() {
    const grid = document.getElementById('proNotesGrid');
    const countBadge = document.getElementById('notesCountBadge');
    if (!grid) return;

    countBadge.textContent = `${state.notes.length} ${state.notes.length === 1 ? 'nota' : 'notas'}`;
    grid.innerHTML = '';

    const query = (state.notesSearch || '').toLowerCase();
    const sorted = [...state.notes]
        .filter(n => !query || (n.title || '').toLowerCase().includes(query) || (n.content || '').toLowerCase().includes(query) || (n.tag || '').toLowerCase().includes(query))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    if (sorted.length === 0) {
        grid.innerHTML = '<div class="worked-list__item" style="grid-column: 1 / -1;">No hay notas guardadas. Crea arriba tu primera tarjeta de nota.</div>';
        return;
    }

    sorted.forEach(note => {
        const card = document.createElement('article');
        card.className = `pro-note-card pro-note-card--${note.color || 'emerald'}`;

        card.innerHTML = `
            <div class="pro-note-card__top">
                <strong class="pro-note-card__title">${escapeHtml(note.title || 'Nota sin título')}</strong>
                <div class="pro-note-card__actions">
                    <button type="button" class="note-mini-btn ${note.pinned ? 'note-mini-btn--pinned' : ''}" data-act="pin" title="Fijar arriba">📌</button>
                    <button type="button" class="note-mini-btn" data-act="copy" title="Copiar texto">Copiar</button>
                    <button type="button" class="note-mini-btn" data-act="edit" title="Editar">Editar</button>
                    <button type="button" class="note-mini-btn" data-act="del" title="Borrar">&times;</button>
                </div>
            </div>
            <p class="pro-note-card__body">${escapeHtml(note.content)}</p>
            <div class="pro-note-card__footer">
                <span>${escapeHtml(note.tag || 'General')}</span>
                <span>${escapeHtml(note.updatedAt || '')}</span>
            </div>
        `;

        card.querySelector('[data-act="pin"]').addEventListener('click', () => {
            note.pinned = !note.pinned;
            saveState();
            renderProNotes();
        });

        card.querySelector('[data-act="copy"]').addEventListener('click', (e) => {
            navigator.clipboard?.writeText(note.content);
            e.target.textContent = 'Copiado ✓';
            setTimeout(() => { e.target.textContent = 'Copiar'; }, 1200);
        });

        card.querySelector('[data-act="edit"]').addEventListener('click', () => {
            const newTitle = prompt('Título de la nota:', note.title);
            if (newTitle === null) return;
            const newBody = prompt('Contenido de la nota:', note.content);
            if (newBody === null) return;
            note.title = newTitle.trim() || 'Nota sin título';
            note.content = newBody.trim();
            note.updatedAt = formatNowTime();
            saveState();
            renderProNotes();
        });

        card.querySelector('[data-act="del"]').addEventListener('click', () => {
            state.notes = state.notes.filter(n => n.id !== note.id);
            saveState();
            renderProNotes();
        });

        grid.appendChild(card);
    });
}

export function bindTaskEvents() {
    // Estado inicial de prioridad del creador
    state.taskPriorityDraft = state.taskPriorityDraft || 'medium';
    syncComposerPriorityChips(state.taskPriorityDraft);

    // Selección de prioridad en el creador de tareas
    document.querySelectorAll('#taskPriorityChips .task-priority-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            state.taskPriorityDraft = btn.dataset.priority;
            state.taskUrgentDraft = (state.taskPriorityDraft === 'high');
            syncComposerPriorityChips(state.taskPriorityDraft);
        });
    });

    // Control de fecha límite en el creador
    const dueDateInput = document.getElementById('taskDueDateInput');
    if (dueDateInput) {
        dueDateInput.addEventListener('input', updateComposerDueDateClearBtn);
    }

    const clearDateBtn = document.getElementById('btnClearTaskDueDate');
    if (clearDateBtn) {
        clearDateBtn.addEventListener('click', () => {
            if (dueDateInput) dueDateInput.value = '';
            updateComposerDueDateClearBtn();
        });
    }

    const quickClearBtn = document.getElementById('btnQuickClearDate');
    if (quickClearBtn) {
        quickClearBtn.addEventListener('click', () => {
            if (dueDateInput) dueDateInput.value = '';
            updateComposerDueDateClearBtn();
        });
    }

    // Atajos de fecha rápida: Hoy, Mañana, +7 días
    document.querySelectorAll('.task-quick-date-btn[data-days]').forEach(btn => {
        btn.addEventListener('click', () => {
            const addDays = parseInt(btn.dataset.days, 10);
            const target = new Date();
            target.setDate(target.getDate() + addDays);
            if (dueDateInput) {
                dueDateInput.value = formatDateKey(target.getFullYear(), target.getMonth(), target.getDate());
                updateComposerDueDateClearBtn();
            }
        });
    });

    function handleAddTask() {
        const input = document.getElementById('taskTextInput');
        const category = document.getElementById('taskCategorySelect').value;
        const text = input.value.trim();
        if (!text) return;

        const priority = state.taskPriorityDraft || 'medium';
        const dueDate = dueDateInput ? dueDateInput.value : '';

        state.tasks.unshift({
            id: 'T_' + Date.now(),
            text,
            category,
            priority,
            urgent: priority === 'high',
            dueDate,
            done: false,
            createdAt: Date.now()
        });

        input.value = '';
        if (dueDateInput) dueDateInput.value = '';
        updateComposerDueDateClearBtn();

        saveState();
        renderTasksLists();
    }

    document.getElementById('btnAddTask').addEventListener('click', handleAddTask);
    document.getElementById('taskTextInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTask();
        }
    });

    // Filtros por píldora (Todas, Trabajo, Gym, Personal, Estudios, Compras)
    document.querySelectorAll('#taskFilterPills .task-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.taskFilter = btn.dataset.filter;
            document.querySelectorAll('#taskFilterPills .task-pill-btn').forEach(b => b.classList.remove('task-pill-btn--active'));
            btn.classList.add('task-pill-btn--active');
            renderTasksLists();
        });
    });

    // Limpiar completadas
    document.getElementById('btnClearCompletedTasks').addEventListener('click', () => {
        const hasDone = state.tasks.some(t => t.done);
        if (!hasDone) return;
        state.tasks = state.tasks.filter(t => !t.done);
        saveState();
        renderTasksLists();
    });

    // Modal Pasar a Calendario
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

    // Eventos Modal Editar Tarea
    const closeEditBtn = document.getElementById('btnCloseEditTaskModal');
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditTaskModal);

    const cancelEditBtn = document.getElementById('btnCancelEditTask');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditTaskModal);

    const clearEditDateBtn = document.getElementById('btnClearEditTaskDueDate');
    if (clearEditDateBtn) {
        clearEditDateBtn.addEventListener('click', () => {
            const el = document.getElementById('editTaskDueDateInput');
            if (el) el.value = '';
        });
    }

    document.querySelectorAll('#editTaskPriorityChips .task-priority-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            editDraftPriority = btn.dataset.priority;
            syncEditPriorityChips(editDraftPriority);
        });
    });

    const saveEditBtn = document.getElementById('btnSaveEditTask');
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', () => {
            const task = state.tasks.find(t => t.id === editingTaskId);
            if (!task) return closeEditTaskModal();

            const newText = document.getElementById('editTaskTextInput').value.trim();
            if (!newText) {
                alert('El título de la tarea no puede estar vacío.');
                return;
            }

            task.text = newText;
            task.category = document.getElementById('editTaskCategorySelect').value;
            task.priority = editDraftPriority || 'medium';
            task.urgent = (task.priority === 'high');
            task.dueDate = document.getElementById('editTaskDueDateInput').value || '';

            saveState();
            renderTasksLists();
            closeEditTaskModal();
        });
    }

    // Eventos Bloc de Notas Pro
    document.querySelectorAll('.note-color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            state.selectedNoteColor = dot.dataset.noteColor;
            document.querySelectorAll('.note-color-dot').forEach(d => d.classList.remove('note-color-dot--active'));
            dot.classList.add('note-color-dot--active');
        });
    });

    document.getElementById('btnAddProNote').addEventListener('click', () => {
        const titleEl = document.getElementById('noteTitleInput');
        const bodyEl = document.getElementById('noteBodyInput');
        const tag = document.getElementById('noteTagSelect').value;

        const title = titleEl.value.trim();
        const content = bodyEl.value.trim();
        if (!content && !title) return alert('Escribe un título o contenido para la nota.');

        const now = new Date();
        const stamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} · ${formatNowTime()}`;

        state.notes.unshift({
            id: 'N_' + Date.now(),
            title: title || 'Nota rápida',
            content: content || title,
            tag,
            color: state.selectedNoteColor || 'emerald',
            pinned: false,
            updatedAt: stamp
        });

        titleEl.value = '';
        bodyEl.value = '';
        saveState();
        renderProNotes();
    });

    document.getElementById('notesSearchInput').addEventListener('input', (e) => {
        state.notesSearch = e.target.value;
        renderProNotes();
    });
}
