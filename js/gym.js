import { state, saveState, formatDateKey } from './state.js';

let timerInterval = null;
let timerSecondsLeft = 90;

export function renderGymView() {
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

export function bindGymEvents() {
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
}