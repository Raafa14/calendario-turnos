import { state, saveState, triggerRenderAll, triggerSwitchTab } from './state.js';

export function getMonthPayrollSummary(year, month, overrideRate = null, overrideExtraRate = null) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    let daysWorked = 0;
    let normalHours = 0;
    let extraHours = 0;
    let grossMoney = 0;
    let totalPlus = 0;
    let totalTips = 0;

    const baseRate = (overrideRate !== null && !isNaN(overrideRate)) ? overrideRate : (Number(state.hourlyRate) || 0);
    const extraRate = (overrideExtraRate !== null && !isNaN(overrideExtraRate)) ? overrideExtraRate : (Number(state.extraRate) || 0);

    Object.keys(state.daysData).filter(k => k.startsWith(prefix)).sort().forEach(key => {
        const d = state.daysData[key];
        const h = Number(d.hours) || 0;
        const ex = Number(d.extraHours) || 0;
        const plus = Number(d.shiftPlus) || 0;
        const tips = Number(d.tips) || 0;

        const shift = state.shifts[d.shiftId];
        // Si el tipo de turno tiene una tarifa propia explícita (customRate > 0), se respeta; si no, se usa la tarifa base indicada
        const r = (shift && Number(shift.customRate) > 0) ? Number(shift.customRate) : baseRate;
        const exR = extraRate;

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

export function renderWorkedDaysList(overrideRate = null, overrideExtraRate = null) {
    const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
    const listEl = document.getElementById('workedDaysList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const baseRate = (overrideRate !== null && !isNaN(overrideRate)) ? overrideRate : (Number(state.hourlyRate) || 0);
    const extraRate = (overrideExtraRate !== null && !isNaN(overrideExtraRate)) ? overrideExtraRate : (Number(state.extraRate) || 0);

    let hasDays = false;
    Object.keys(state.daysData).filter(k => k.startsWith(prefix)).sort().forEach(key => {
        const d = state.daysData[key];
        const h = Number(d.hours) || 0;
        const ex = Number(d.extraHours) || 0;
        const plus = Number(d.shiftPlus) || 0;
        const tips = Number(d.tips) || 0;

        const shift = state.shifts[d.shiftId];
        const r = (shift && Number(shift.customRate) > 0) ? Number(shift.customRate) : baseRate;
        const exR = extraRate;

        if (h > 0 || ex > 0 || plus > 0 || tips > 0) {
            hasDays = true;
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

    if (!hasDays) {
        listEl.innerHTML = '<li class="worked-list__item">Aún no has registrado horas este mes.</li>';
    }
}

export function renderStats() {
    const rateInput = document.getElementById('hourlyRateInput');
    const exRateInput = document.getElementById('extraRateInput');
    const retInput = document.getElementById('retentionPercentInput');

    if (rateInput && document.activeElement !== rateInput) rateInput.value = state.hourlyRate;
    if (exRateInput && document.activeElement !== exRateInput) exRateInput.value = state.extraRate;
    if (retInput && document.activeElement !== retInput) retInput.value = state.retentionPercent || 0;

    const summary = getMonthPayrollSummary(state.currentYear, state.currentMonth);

    document.getElementById('statDaysWorked').textContent = summary.daysWorked;
    document.getElementById('statNormalHours').textContent = `${summary.normalHours} h`;
    document.getElementById('statExtraHours').textContent = `${summary.extraHours} h`;
    document.getElementById('calcTotalHoursInput').value = summary.normalHours;

    renderWorkedDaysList();
    recalculateEarnings(summary.extraHours, summary.totalPlus, summary.totalTips, false);
}

export function recalculateEarnings(extraFromMonth = null, plusFromMonth = null, tipsFromMonth = null, shouldSave = true) {
    const normalH = parseFloat(document.getElementById('calcTotalHoursInput').value) || 0;
    const rate = parseFloat(document.getElementById('hourlyRateInput').value) || 0;
    const exRate = parseFloat(document.getElementById('extraRateInput').value) || 0;
    const retentionPct = parseFloat(document.getElementById('retentionPercentInput').value) || 0;

    if (shouldSave) {
        state.hourlyRate = rate;
        state.extraRate = exRate;
        state.retentionPercent = retentionPct;

        // Actualizar las tarifas de las jornadas del mes actual para que coincidan con la nueva tarifa base y extra
        const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-`;
        Object.keys(state.daysData).filter(k => k.startsWith(prefix)).forEach(key => {
            const d = state.daysData[key];
            const shift = state.shifts[d.shiftId];
            if (!shift || !(Number(shift.customRate) > 0)) {
                d.hourlyRate = rate;
            }
            d.extraRate = exRate;
        });
        saveState();
    }

    const currentSummary = getMonthPayrollSummary(state.currentYear, state.currentMonth, rate, exRate);
    const extraH = extraFromMonth !== null ? extraFromMonth : currentSummary.extraHours;
    const plus = plusFromMonth !== null ? plusFromMonth : currentSummary.totalPlus;
    const tips = tipsFromMonth !== null ? tipsFromMonth : currentSummary.totalTips;

    const usesDayBreakdown = normalH === currentSummary.normalHours;
    const gross = usesDayBreakdown
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
        : `${normalH}h base (${rate}€/h) + ${extraH}h extra (${exRate}€/h)${plusLabel}`;

    updateGoalAndComparison(totalReal);
    renderWorkedDaysList(rate, exRate);
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

export function getWalletBalance() {
    let totalIn = 0;
    let totalOut = 0;
    state.walletMovements.forEach(m => {
        if (m.type === 'IN') totalIn += Number(m.amount);
        else totalOut += Number(m.amount);
    });
    return { totalIn, totalOut, balance: totalIn - totalOut };
}

export function addWalletMovement(type, customAmount = null, customConcept = null, customCategory = null) {
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
    triggerRenderAll();
}

export function renderWallet() {
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
            triggerRenderAll();
        });
        listEl.appendChild(li);
    });

    if (state.walletMovements.length === 0) {
        listEl.innerHTML = '<li class="worked-list__item">Aún no hay movimientos en tu caja.</li>';
    }

    document.getElementById('walletCurrentBalance').textContent = `${balance.toFixed(2)} €`;
    document.getElementById('walletTotalIn').textContent = `${totalIn.toFixed(2)} €`;
    document.getElementById('walletTotalOut').textContent = `${totalOut.toFixed(2)} €`;
    renderDebts();
}

export function renderPiggyBank() {
    const goal = Number(state.piggyGoal) || 0;
    const saved = Number(state.piggySaved) || 0;
    const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;

    document.getElementById('piggySavedAmount').textContent = `${saved.toFixed(2)} €`;
    document.getElementById('piggyPercentBadge').textContent = `${pct}%`;
    document.getElementById('piggyProgressBar').style.width = `${pct}%`;
}

export function renderFixedExpenses() {
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

export function renderDebts() {
    const listEl = document.getElementById('debtsList');
    const totalLabel = document.getElementById('debtsTotalLabel');
    const freeBalanceEl = document.getElementById('debtFreeBalanceValue');
    if (!listEl) return;

    listEl.innerHTML = '';
    let totalOwe = 0;
    let totalOwed = 0;

    state.debts.forEach(d => {
        if (d.type === 'OWE') totalOwe += Number(d.amount) || 0;
        else totalOwed += Number(d.amount) || 0;
    });

    const isOweTab = state.debtTab === 'OWE';
    totalLabel.textContent = isOweTab
        ? `Debo: ${totalOwe.toFixed(2)} €`
        : `Me deben: ${totalOwed.toFixed(2)} €`;
    totalLabel.style.color = isOweTab ? 'var(--danger)' : 'var(--accent)';

    const filtered = state.debts.filter(d => d.type === state.debtTab);

    filtered.forEach(item => {
        const li = document.createElement('li');
        li.className = 'worked-list__item';
        const actionLabel = isOweTab ? 'Saldar' : 'Cobrado';
        const amountClass = isOweTab ? 'movement-amount--out' : 'movement-amount--in';

        li.innerHTML = `
            <div>
                <strong>${item.person}</strong>${item.concept ? ` · ${item.concept}` : ''}
                <div style="font-size:0.68rem; color:var(--text-secondary);">${item.date}</div>
            </div>
            <div style="display:flex; align-items:center;">
                <span class="${amountClass}">${Number(item.amount).toFixed(2)} €</span>
                <button type="button" class="debt-settle-btn">${actionLabel}</button>
                <button type="button" class="movement-delete-btn" title="Borrar sin mover caja">&times;</button>
            </div>
        `;

        li.querySelector('.debt-settle-btn').addEventListener('click', () => {
            const msg = isOweTab
                ? `¿Has pagado ${Number(item.amount).toFixed(2)} € a ${item.person}?\n\nSe descontará de Mi Caja y se borrará la deuda.`
                : `¿Te ha pagado ${item.person} ${Number(item.amount).toFixed(2)} €?\n\nSe sumará a Mi Caja y se borrará de la lista.`;
            if (!confirm(msg)) return;

            const conceptTxt = isOweTab
                ? `Deuda pagada a ${item.person}${item.concept ? ' (' + item.concept + ')' : ''}`
                : `Deuda cobrada de ${item.person}${item.concept ? ' (' + item.concept + ')' : ''}`;

            state.debts = state.debts.filter(d => d.id !== item.id);
            addWalletMovement(isOweTab ? 'OUT' : 'IN', item.amount, conceptTxt, 'General');
            saveState();
            renderDebts();
        });

        li.querySelector('.movement-delete-btn').addEventListener('click', () => {
            state.debts = state.debts.filter(d => d.id !== item.id);
            saveState();
            renderDebts();
        });

        listEl.appendChild(li);
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<li class="worked-list__item">${isOweTab ? 'No debes dinero a nadie.' : 'Nadie te debe dinero ahora mismo.'}</li>`;
    }

    const { balance } = getWalletBalance();
    const realFree = balance - totalOwe;
    freeBalanceEl.textContent = `${realFree.toFixed(2)} €`;
    freeBalanceEl.style.color = realFree >= 0 ? 'var(--accent)' : 'var(--danger)';
}

export function updatePinUI() {
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

export function bindFinanceEvents() {
    document.getElementById('walletSubTabCaja').addEventListener('click', () => {
        state.walletSubTab = 'CAJA';
        document.getElementById('walletSubTabCaja').classList.add('debt-tab-btn--active');
        document.getElementById('walletSubTabGanancias').classList.remove('debt-tab-btn--active');
        document.getElementById('walletSubPanelCaja').style.display = 'block';
        document.getElementById('walletSubPanelGanancias').style.display = 'none';
    });

    document.getElementById('walletSubTabGanancias').addEventListener('click', () => {
        state.walletSubTab = 'GANANCIAS';
        document.getElementById('walletSubTabGanancias').classList.add('debt-tab-btn--active');
        document.getElementById('walletSubTabCaja').classList.remove('debt-tab-btn--active');
        document.getElementById('walletSubPanelGanancias').style.display = 'block';
        document.getElementById('walletSubPanelCaja').style.display = 'none';
    });

    ['calcTotalHoursInput', 'hourlyRateInput', 'extraRateInput', 'retentionPercentInput'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => recalculateEarnings());
    });

    document.getElementById('monthlyGoalInput').addEventListener('input', (e) => {
        state.monthlyGoal = parseFloat(e.target.value) || 0;
        saveState();
        recalculateEarnings();
    });

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
        triggerSwitchTab('calendarView');
    });

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
        triggerRenderAll();
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

    document.getElementById('debtTabOwe').addEventListener('click', () => {
        state.debtTab = 'OWE';
        document.getElementById('debtTabOwe').classList.add('debt-tab-btn--active');
        document.getElementById('debtTabOwed').classList.remove('debt-tab-btn--active');
        renderDebts();
    });

    document.getElementById('debtTabOwed').addEventListener('click', () => {
        state.debtTab = 'OWED';
        document.getElementById('debtTabOwed').classList.add('debt-tab-btn--active');
        document.getElementById('debtTabOwe').classList.remove('debt-tab-btn--active');
        renderDebts();
    });

    document.getElementById('btnAddDebt').addEventListener('click', () => {
        const personEl = document.getElementById('debtPersonInput');
        const conceptEl = document.getElementById('debtConceptInput');
        const amountEl = document.getElementById('debtAmountInput');

        const person = personEl.value.trim();
        const concept = conceptEl.value.trim();
        const amount = parseFloat(amountEl.value);

        if (!person || !amount || amount <= 0) {
            alert('Escribe el nombre de la persona y una cantidad mayor que 0 €.');
            return;
        }

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        state.debts.unshift({
            id: 'D_' + Date.now(),
            type: state.debtTab,
            person,
            concept,
            amount: Number(amount.toFixed(2)),
            date: dateStr
        });

        personEl.value = '';
        conceptEl.value = '';
        amountEl.value = '';
        saveState();
        renderDebts();
    });
}