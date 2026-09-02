// Elementos DOM con getters dinámicos para garantizar referencias vivas sin errores null
const dom = {
    get valBudget() { return document.getElementById('val-budget'); },
    get valSpent() { return document.getElementById('val-spent'); },
    get valSpentSubtext() { return document.getElementById('val-spent-subtext'); },
    get valIncome() { return document.getElementById('val-income'); },
    get valIncomeSubtext() { return document.getElementById('val-income-subtext'); },
    get valBalance() { return document.getElementById('val-balance'); },
    get valBalanceSubtext() { return document.getElementById('val-balance-subtext'); },
    get cardBalance() { return document.getElementById('card-balance'); },
    get iconBalance() { return document.getElementById('icon-balance'); },
    get filterMonth() { return document.getElementById('filter-month'); },
    get filterCategory() { return document.getElementById('filter-category'); },
    get searchDesc() { return document.getElementById('search-desc'); },
    get expensesList() { return document.getElementById('expenses-list'); },
    get expenseForm() { return document.getElementById('expense-form'); },
    get expenseIdInput() { return document.getElementById('expense-id'); },
    get expenseType() { return document.getElementById('expense-type'); },
    get expenseAmount() { return document.getElementById('expense-amount'); },
    get expenseDesc() { return document.getElementById('expense-desc'); },
    get expenseCategory() { return document.getElementById('expense-category'); },
    get expenseDate() { return document.getElementById('expense-date'); },
    get formTitle() { return document.getElementById('form-title'); },
    get btnSaveExpense() { return document.getElementById('btn-save-expense'); },
    get btnCancelEdit() { return document.getElementById('btn-cancel-edit'); },
    get monthlySummaryBody() { return document.getElementById('monthly-summary-body'); },
    get summaryYear() { return document.getElementById('summary-year'); },
    get summaryCategory() { return document.getElementById('summary-category'); },
    get summaryViewMode() { return document.getElementById('summary-view-mode'); },
    get connectionStatus() { return document.getElementById('connection-status'); },
    get statusText() { return document.getElementById('status-text'); }
};

// Handlers de acción inyectados desde AppController
let transactionActionHandlers = { onEdit: null, onDelete: null };

function setTransactionActionHandlers(handlers) {
    transactionActionHandlers = { ...transactionActionHandlers, ...handlers };
}

// Actualizar estadísticas del Dashboard
function updateDashboardStats(allExpenses, currentFilterMonth) {
    if (!allExpenses) return;

    // Transacciones del mes filtrado
    const currentMonthExpenses = allExpenses.filter(exp => exp.date && exp.date.startsWith(currentFilterMonth));
    const currentMonthSpentOnly = currentMonthExpenses.filter(exp => exp.type === 'gasto' || (!exp.type && !['Juni', 'Isa'].includes(exp.category)));

    // Gastos Totales (este mes)
    const totalSpent = currentMonthSpentOnly.reduce((sum, item) => sum + Number(item.amount), 0);
    if (dom.valSpent) {
        animateCurrencyCounter(dom.valSpent, totalSpent);
        dom.valSpentSubtext.textContent = `${currentMonthSpentOnly.length} transacciones este mes`;
    }

    // Saldo Disponible Acumulado (histórico hasta el mes seleccionado inclusive)
    const historyExpenses = allExpenses.filter(exp => exp.date && exp.date.substring(0, 7) <= currentFilterMonth);
    const totalCumulativeIncome = historyExpenses
        .filter(exp => exp.type === 'ingreso' || ['Juni', 'Isa'].includes(exp.category))
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalCumulativeExpense = historyExpenses
        .filter(exp => exp.type === 'gasto' || (!exp.type && !['Juni', 'Isa'].includes(exp.category)))
        .reduce((sum, item) => sum + Number(item.amount), 0);

    const balance = totalCumulativeIncome - totalCumulativeExpense;
    if (dom.valBalance) {
        animateCurrencyCounter(dom.valBalance, balance);
    }

    if (dom.valIncome) {
        const currentMonthIncomes = currentMonthExpenses.filter(exp => exp.type === 'ingreso' || ['Juni', 'Isa'].includes(exp.category));
        const totalIncome = currentMonthIncomes.reduce((sum, item) => sum + Number(item.amount), 0);
        animateCurrencyCounter(dom.valIncome, totalIncome);
        if (dom.valIncomeSubtext) dom.valIncomeSubtext.textContent = `${currentMonthIncomes.length} aportes registrados`;
    }

    // Modificar estilos según saldo positivo/negativo
    if (dom.cardBalance && dom.iconBalance && dom.valBalanceSubtext) {
        dom.cardBalance.classList.remove('deficit', 'shake');
        dom.iconBalance.style.color = '';

        if (balance < 0) {
            dom.cardBalance.classList.add('deficit');
            setTimeout(() => dom.cardBalance.classList.add('shake'), 50);
            dom.valBalanceSubtext.textContent = '¡Saldo acumulado en déficit!';
            dom.valBalanceSubtext.style.color = 'var(--danger)';
            dom.iconBalance.innerHTML = '<i data-lucide="alert-triangle"></i>';
            dom.iconBalance.style.color = 'var(--danger)';
        } else {
            dom.valBalanceSubtext.textContent = 'Saldo a favor (Acumulado)';
            dom.valBalanceSubtext.style.color = '';
            dom.iconBalance.innerHTML = '<i data-lucide="check-circle-2"></i>';
            dom.iconBalance.style.color = 'var(--success)';
        }
    }
    if (window.lucide) window.lucide.createIcons();
}

// Renderizar barras de presupuesto por categoría
function renderCategoryBudgets(allExpenses, currentFilterMonth, categoryBudgets = {}) {
    const container = document.getElementById('category-budgets-list');
    if (!container) return;

    // Calcular consumo del mes por categoría de gasto
    const currentMonthExpenses = (allExpenses || []).filter(exp => 
        exp.date && 
        exp.date.startsWith(currentFilterMonth) && 
        (exp.type === 'gasto' || (!exp.type && !['Juni', 'Isa'].includes(exp.category)))
    );

    const spentMap = {};
    currentMonthExpenses.forEach(exp => {
        const cat = exp.category || 'Otros';
        spentMap[cat] = (spentMap[cat] || 0) + Number(exp.amount);
    });

    const categoriesList = ['Mercado', 'D1', 'Servicios Públicos', 'Arriendo', 'Casa', 'Carne', 'Internet', 'Gas', 'Otros'];
    const fixedCategories = new Set(['Arriendo', 'Internet', 'Gas']);

    // Calcular totales globales de presupuestos asignados y consumidos
    const totalLimits = categoriesList.reduce((sum, cat) => sum + (Number(categoryBudgets[cat]) || 0), 0);
    const totalSpentOnCats = categoriesList.reduce((sum, cat) => sum + (spentMap[cat] || 0), 0);

    let globalPct = 0;
    let globalStatusClass = 'normal';
    let globalStatusText = 'Sin presupuestos asignados';

    if (totalLimits > 0) {
        globalPct = Math.round((totalSpentOnCats / totalLimits) * 100);
        if (totalSpentOnCats >= totalLimits) {
            globalStatusClass = 'danger';
            globalStatusText = `¡Excedido por ${formatCOP.format(totalSpentOnCats - totalLimits)}!`;
        } else if (totalSpentOnCats >= 0.75 * totalLimits) {
            globalStatusClass = 'warning';
            globalStatusText = `¡Alerta! Quedan ${formatCOP.format(totalLimits - totalSpentOnCats)}`;
        } else {
            globalStatusClass = 'normal';
            globalStatusText = `Quedan ${formatCOP.format(totalLimits - totalSpentOnCats)}`;
        }
    } else if (totalSpentOnCats > 0) {
        globalStatusText = `Total gastado: ${formatCOP.format(totalSpentOnCats)}`;
    }

    const globalBarWidth = totalLimits > 0 ? Math.min(globalPct, 100) : (totalSpentOnCats > 0 ? 100 : 0);

    container.innerHTML = `
        <div class="global-budget-card" style="background: linear-gradient(135deg, rgba(15, 42, 74, 0.05) 0%, rgba(217, 119, 6, 0.08) 100%); border: 1px solid rgba(15, 42, 74, 0.14); border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 4px 16px rgba(15, 42, 74, 0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                <span style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">Consumo Presupuestal Global (Mes Actual)</span>
                <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${formatCOP.format(totalSpentOnCats)} <small style="font-weight: 600; color: var(--text-muted);">/ ${totalLimits > 0 ? formatCOP.format(totalLimits) : '$ 0'}</small></span>
            </div>
            <div class="budget-bar-track" style="height: 12px; margin-bottom: 0.6rem; border-radius: 99px;">
                <div class="budget-bar-fill ${globalStatusClass}" style="width: ${globalBarWidth}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-secondary); flex-wrap: wrap; gap: 0.5rem;">
                <span style="font-weight: 700;">${totalLimits > 0 ? `${globalPct}% consumido del presupuesto total` : 'Sin presupuestos asignados'}</span>
                <span class="budget-status-tag ${globalStatusClass}" style="font-size: 0.78rem; padding: 0.2rem 0.6rem;">${globalStatusText}</span>
            </div>
        </div>

        <div style="margin-bottom: 0.5rem;">
            <h3 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Límites por Categoría de Gasto</h3>
        </div>

        <div class="budget-cards-grid"></div>
    `;

    const cardsGrid = container.querySelector('.budget-cards-grid');

    categoriesList.forEach((cat, idx) => {
        const spent = spentMap[cat] || 0;
        const limit = Number(categoryBudgets[cat]) || 0;
        const isFixed = fixedCategories.has(cat);
        const emoji = categoryEmojis[cat] || '⚙️';

        let pct = 0;
        let statusClass = 'normal';
        let statusText = 'Sin límite fijado';

        if (limit > 0) {
            pct = Math.round((spent / limit) * 100);
            if (spent >= limit && isFixed) {
                statusClass = 'fixed';
                statusText = spent === limit
                    ? '📌 Pago fijo completado'
                    : `📌 Pago fijo registrado: ${formatCOP.format(spent)}`;
            } else if (spent >= limit) {
                statusClass = 'danger';
                const over = spent - limit;
                statusText = `Excedido por ${formatCOP.format(over)}`;
            } else if (spent >= 0.75 * limit) {
                statusClass = 'warning';
                const remaining = limit - spent;
                statusText = `¡Alerta! Quedan ${formatCOP.format(remaining)}`;
            } else {
                statusClass = 'normal';
                const remaining = limit - spent;
                statusText = `Quedan ${formatCOP.format(remaining)}`;
            }
        } else if (spent > 0) {
            statusText = `Gastado este mes: ${formatCOP.format(spent)}`;
        }

        const barWidth = limit > 0 ? Math.min(pct, 100) : (spent > 0 ? 100 : 0);
        const barClass = limit > 0 ? statusClass : 'normal';

        const itemEl = document.createElement('div');
        const staggerClass = `stagger-${(idx % 5) + 1}`;
        itemEl.className = `budget-item animate-entrance ${staggerClass}`;
        itemEl.innerHTML = `
            <div class="budget-item-header">
                <span class="budget-cat-name">${emoji} ${escapeHTML(cat)}</span>
                <span class="budget-amounts">
                    ${formatCOP.format(spent)} ${limit > 0 ? `/ <small style="font-weight: 500;">${formatCOP.format(limit)}</small>` : ''}
                </span>
            </div>
            <div class="budget-bar-track">
                <div class="budget-bar-fill ${barClass}" style="width: ${barWidth}%;"></div>
            </div>
            <div class="budget-item-footer">
                <span>${limit > 0 ? `${pct}% consumido` : 'Límite no asignado'}</span>
                <span class="budget-status-tag ${statusClass}">${statusText}</span>
            </div>
        `;
        cardsGrid.appendChild(itemEl);
    });
}

// Re-activar la animación fluida de las barras de presupuesto al entrar a la sección
function triggerBudgetBarsAnimation() {
    const bars = document.querySelectorAll('#tab-budgets .budget-bar-fill');
    bars.forEach(bar => {
        bar.classList.remove('animate-bar');
        void bar.offsetWidth; // Forzar reflujo del navegador
        bar.classList.add('animate-bar');
    });
}
window.triggerBudgetBarsAnimation = triggerBudgetBarsAnimation;

// Renderizar el Dashboard de Proyección e Inteligencia Financiera
function renderProjectionTab(allExpenses, currentFilterMonth, categoryBudgets = {}) {
    const container = document.getElementById('projection-container');
    const dateBadge = document.getElementById('projection-date-badge');
    if (!container) return;

    // Determinar día actual y días totales del mes
    const now = new Date();
    const currentMonthStr = getCurrentMonthStr();
    const isCurrentMonth = !currentFilterMonth || currentFilterMonth === currentMonthStr;

    const [yearStr, monthStr] = (currentFilterMonth || currentMonthStr).split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    let currentDay = isCurrentMonth ? now.getDate() : daysInMonth;
    const remainingDays = Math.max(1, daysInMonth - currentDay);

    const monthObj = new Date(year, monthIndex, 1);
    const monthName = monthObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    if (dateBadge) {
        dateBadge.innerHTML = isCurrentMonth
            ? `<i data-lucide="clock" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i> Día ${currentDay} de ${daysInMonth} • ${capitalizedMonth}`
            : `<i data-lucide="calendar" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i> ${capitalizedMonth} (Cerrado)`;
    }

    // Calcular gastos del mes
    const monthExpenses = (allExpenses || []).filter(exp => 
        exp.date && 
        exp.date.startsWith(currentFilterMonth) && 
        (exp.type === 'gasto' || (!exp.type && !['Juni', 'Isa'].includes(exp.category)))
    );

    const spentMap = {};
    let spentSoFar = 0;
    monthExpenses.forEach(exp => {
        const amt = Number(exp.amount);
        spentSoFar += amt;
        const cat = exp.category || 'Otros';
        spentMap[cat] = (spentMap[cat] || 0) + amt;
    });

    const categoriesList = ['Mercado', 'D1', 'Servicios Públicos', 'Arriendo', 'Casa', 'Carne', 'Internet', 'Gas', 'Otros'];
    const fixedCategories = ['Arriendo', 'Internet', 'Gas'];
    const variableCategories = ['Mercado', 'D1', 'Servicios Públicos', 'Casa', 'Carne', 'Otros'];

    const totalLimits = categoriesList.reduce((sum, cat) => sum + (Number(categoryBudgets[cat]) || 0), 0);

    // Separar gastado a la fecha entre fijos y variables
    let fixedSpentSoFar = 0;
    let variableSpentSoFar = 0;

    categoriesList.forEach(cat => {
        const amt = spentMap[cat] || 0;
        if (fixedCategories.includes(cat)) {
            fixedSpentSoFar += amt;
        } else {
            variableSpentSoFar += amt;
        }
    });

    // Obtener transacciones de meses anteriores para cálculo de promedios históricos acumulados
    const pastExpenses = (allExpenses || []).filter(exp => 
        exp.date && 
        exp.date.substring(0, 7) < currentFilterMonth && 
        (exp.type === 'gasto' || (!exp.type && !['Juni', 'Isa'].includes(exp.category)))
    );

    const pastMonthsSet = new Set(pastExpenses.map(exp => exp.date.substring(0, 7)));
    const pastMonthCount = pastMonthsSet.size;

    const historicalCatSpentSum = {};
    pastExpenses.forEach(exp => {
        const cat = exp.category || 'Otros';
        historicalCatSpentSum[cat] = (historicalCatSpentSum[cat] || 0) + Number(exp.amount);
    });

    const historicalCatAvg = {};
    categoriesList.forEach(cat => {
        historicalCatAvg[cat] = pastMonthCount > 0 ? Math.round((historicalCatSpentSum[cat] || 0) / pastMonthCount) : 0;
    });

    const historicalTotalSpentSum = Object.values(historicalCatSpentSum).reduce((a, b) => a + b, 0);
    const historicalTotalMonthlyAvg = pastMonthCount > 0 ? Math.round(historicalTotalSpentSum / pastMonthCount) : 0;

    // 🛡️ Detección y Capping de Outliers (Winsorización de picos diarios > 2.5x histórico)
    const catWinsorizedDailyPace = {};
    categoriesList.forEach(cat => {
        if (currentDay <= 0) {
            catWinsorizedDailyPace[cat] = 0;
            return;
        }
        const catExpenses = monthExpenses.filter(e => (e.category || 'Otros') === cat);
        const histDailyAvg = historicalCatAvg[cat] > 0 ? (historicalCatAvg[cat] / daysInMonth) : 0;
        const capLimit = histDailyAvg > 0 ? (histDailyAvg * 2.5) : Infinity;

        const dailyMap = {};
        catExpenses.forEach(e => {
            const d = parseInt((e.date || '').substring(8, 10), 10);
            if (d) dailyMap[d] = (dailyMap[d] || 0) + Number(e.amount);
        });

        let cappedSum = 0;
        for (let d = 1; d <= currentDay; d++) {
            const spentD = dailyMap[d] || 0;
            const cappedD = (histDailyAvg > 0 && spentD > capLimit) ? capLimit : spentD;
            cappedSum += cappedD;
        }
        catWinsorizedDailyPace[cat] = cappedSum / currentDay;
    });

    // 🎚️ Shrinkage Adaptativo por Varianza de Categoría (Empirical Bayes)
    const catShrinkageWeights = {};
    categoriesList.forEach(cat => {
        if (pastMonthCount < 2 || currentDay <= 0) {
            catShrinkageWeights[cat] = Math.min(1, currentDay / 10);
            return;
        }
        const monthTotals = {};
        pastExpenses.forEach(e => {
            if ((e.category || 'Otros') === cat) {
                const m = e.date.substring(0, 7);
                monthTotals[m] = (monthTotals[m] || 0) + Number(e.amount);
            }
        });
        const vals = Object.values(monthTotals);
        if (vals.length < 2) {
            catShrinkageWeights[cat] = Math.min(1, currentDay / 10);
            return;
        }
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (vals.length - 1);
        const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
        const k_cat = Math.max(2, Math.min(12, Math.round(8 / (cv + 0.1))));
        catShrinkageWeights[cat] = currentDay / (currentDay + k_cat);
    });

    // Proyección por categoría distinguiendo fijos vs variables con ajuste adaptativo estocástico
    let projectedTotal = 0;
    const catProjections = {};

    categoriesList.forEach(cat => {
        const catSpent = spentMap[cat] || 0;
        const catLimit = Number(categoryBudgets[cat]) || 0;

        if (fixedCategories.includes(cat)) {
            // Gasto fijo/recurrente: evento discreto. Si ya se pagó en el mes, proyecta el pago real.
            // Si aún no se paga, toma el límite o la media histórica esperada.
            catProjections[cat] = catSpent > 0 ? catSpent : (catLimit > 0 ? catLimit : (historicalCatAvg[cat] || 0));
        } else {
            // Gasto variable: Shrinkage empírico sobre velocidad winsorizada
            if (isCurrentMonth && currentDay > 0) {
                const winsorizedPace = catWinsorizedDailyPace[cat] || 0;
                const historicalDailyPace = historicalCatAvg[cat] > 0 ? (historicalCatAvg[cat] / daysInMonth) : 0;
                const weightCurrent = catShrinkageWeights[cat] !== undefined ? catShrinkageWeights[cat] : Math.min(1, currentDay / 10);
                
                const effectiveDailyPace = (winsorizedPace * weightCurrent) + (historicalDailyPace * (1 - weightCurrent));
                catProjections[cat] = Math.round(catSpent + (effectiveDailyPace * remainingDays));
            } else {
                catProjections[cat] = catSpent;
            }
        }
        projectedTotal += catProjections[cat];
    });

    // 🚨 Ordenar categorías dinámicamente por urgencia/riesgo de desborde
    categoriesList.sort((a, b) => {
        const limitA = Number(categoryBudgets[a]) || 0;
        const limitB = Number(categoryBudgets[b]) || 0;
        const projA = catProjections[a] || 0;
        const projB = catProjections[b] || 0;

        const isOverA = limitA > 0 && projA > limitA;
        const isOverB = limitB > 0 && projB > limitB;

        const overAmountA = isOverA ? (projA - limitA) : 0;
        const overAmountB = isOverB ? (projB - limitB) : 0;

        if (isOverA && isOverB) return overAmountB - overAmountA;
        if (isOverA) return -1;
        if (isOverB) return 1;

        const pctA = limitA > 0 ? (projA / limitA) : 0;
        const pctB = limitB > 0 ? (projB / limitB) : 0;

        if (pctA !== pctB) return pctB - pctA;

        return projB - projA;
    });

    // 📊 Intervalo de Confianza (Rango de Incertidumbre Honest - 90% IC)
    let historicalStdDev = 0;
    if (pastMonthCount >= 2) {
        const monthTotalsMap = {};
        pastExpenses.forEach(e => {
            const m = e.date.substring(0, 7);
            monthTotalsMap[m] = (monthTotalsMap[m] || 0) + Number(e.amount);
        });
        const vals = Object.values(monthTotalsMap);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const varSum = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (vals.length - 1);
        historicalStdDev = Math.sqrt(varSum);
    } else {
        historicalStdDev = projectedTotal * 0.12; // 12% por defecto si no hay histórico
    }

    const uncertaintyFactor = isCurrentMonth ? Math.sqrt(remainingDays / daysInMonth) : 0;
    const marginOfError = Math.round(historicalStdDev * 1.645 * uncertaintyFactor);
    const projectedMin = Math.max(spentSoFar, projectedTotal - marginOfError);
    const projectedMax = projectedTotal + marginOfError;

    // Ritmo promedio diario para gastos VARIABLES
    const variableDailyPace = currentDay > 0 ? Math.round(variableSpentSoFar / currentDay) : variableSpentSoFar;

    // Presupuesto restante reservado para gastos VARIABLES
    const projectedFixedTotal = fixedCategories.reduce((sum, cat) => sum + catProjections[cat], 0);
    const variableBudgetLimit = totalLimits > projectedFixedTotal ? totalLimits - projectedFixedTotal : 0;
    const remainingVariableBudget = Math.max(0, variableBudgetLimit - variableSpentSoFar);
    
    // Meta diaria recomendada para los gastos variables en los días restantes
    const recommendedDailyVariableMax = isCurrentMonth && remainingDays > 0 
        ? Math.round(remainingVariableBudget / remainingDays) 
        : 0;

    // Diagnóstico inteligente
    let alertType = 'info';
    let alertMessage = '';

    if (totalLimits === 0) {
        alertType = 'info';
        alertMessage = 'Configura los límites de tus categorías en la pestaña <strong>Presupuestos</strong> para recibir recomendaciones y alertas inteligentes en tiempo real.';
    } else if (projectedTotal <= totalLimits) {
        alertType = 'success';
        const estSavings = totalLimits - projectedTotal;
        alertMessage = `<strong>¡Ritmo financiero saludable!</strong> En tus gastos variables mantienes un promedio de <strong>${formatCOP.format(variableDailyPace)}/día</strong>. Al cierre de mes estimas un ahorro de <strong>${formatCOP.format(estSavings)}</strong> respecto a tu presupuesto total.`;
    } else if (projectedTotal <= 1.05 * totalLimits) {
        alertType = 'warning';
        alertMessage = `<strong>Atención en gastos variables:</strong> Estás al límite de tu presupuesto total. Te sugerimos ajustar tus compras diarias (Mercado, D1, Carne, etc.) a máximo <strong>${formatCOP.format(recommendedDailyVariableMax)}/día</strong> durante los <strong>${remainingDays} días restantes</strong>.`;
    } else {
        alertType = 'danger';
        const over = projectedTotal - totalLimits;
        alertMessage = `<strong>⚠️ Alerta de Sobre-gasto Proyectado:</strong> Al ritmo actual en gastos variables (<strong>${formatCOP.format(variableDailyPace)}/día</strong>), te sobrepasarás en <strong>${formatCOP.format(over)}</strong> al finalizar el mes. Para mantenerte en meta, limita tus compras variables a <strong>${formatCOP.format(recommendedDailyVariableMax)}/día</strong> en los <strong>${remainingDays} días restantes</strong>.`;
    }

    // Contar categorías en alerta
    let alertCount = 0;
    categoriesList.forEach(cat => {
        const catProj = catProjections[cat] || 0;
        const catLimit = Number(categoryBudgets[cat]) || 0;
        if (catLimit > 0 && catProj > catLimit) alertCount++;
    });

    container.innerHTML = `
        <!-- Métricas Principales -->
        <div class="projection-grid">
            <div class="projection-metric-card animate-entrance stagger-1">
                <span class="projection-metric-title">
                    <i data-lucide="trending-up" style="color: var(--primary);"></i> Gastado a la Fecha
                </span>
                <span class="projection-metric-value" style="color: var(--text-primary);">${formatCOP.format(spentSoFar)}</span>
                <span class="projection-metric-subtext">Fijos: ${formatCOP.format(fixedSpentSoFar)} | Var: ${formatCOP.format(variableSpentSoFar)}</span>
            </div>

            <div class="projection-metric-card animate-entrance stagger-2">
                <span class="projection-metric-title">
                    <i data-lucide="calculator" style="color: var(--gold);"></i> Promedio Diario Variable
                </span>
                <span class="projection-metric-value" style="color: var(--gold);">${formatCOP.format(variableDailyPace)}</span>
                <span class="projection-metric-subtext">Velocidad en Mercado, D1, Carne, etc.</span>
            </div>

            <div class="projection-metric-card animate-entrance stagger-3">
                <span class="projection-metric-title">
                    <i data-lucide="flag" style="color: ${projectedTotal > totalLimits && totalLimits > 0 ? 'var(--danger)' : 'var(--success)'};"></i> Proyección Cierre de Mes
                </span>
                <span class="projection-metric-value" style="color: ${projectedTotal > totalLimits && totalLimits > 0 ? 'var(--danger)' : 'var(--success)'};">${formatCOP.format(projectedTotal)}</span>
                <span class="projection-metric-subtext" style="font-weight: 600;">${marginOfError > 0 ? `Rango IC 90%: <strong>${formatCOP.format(projectedMin)} – ${formatCOP.format(projectedMax)}</strong>` : (totalLimits > 0 ? `Límite asignado: ${formatCOP.format(totalLimits)}` : 'Sin límite global')}</span>
            </div>

            <div class="projection-metric-card animate-entrance stagger-4">
                <span class="projection-metric-title">
                    <i data-lucide="shield-alert" style="color: var(--secondary);"></i> Meta Diaria Variable Rec.
                </span>
                <span class="projection-metric-value" style="color: var(--secondary);">${isCurrentMonth ? formatCOP.format(recommendedDailyVariableMax) : '$ 0'}</span>
                <span class="projection-metric-subtext">Máx. diario en compras rest. (${remainingDays} días)</span>
            </div>

            <div class="projection-metric-card animate-entrance stagger-5">
                <span class="projection-metric-title">
                    <i data-lucide="history" style="color: var(--primary);"></i> Media Histórica Mensual
                </span>
                <span class="projection-metric-value" style="color: var(--text-primary);">${pastMonthCount > 0 ? formatCOP.format(historicalTotalMonthlyAvg) : '—'}</span>
                <span class="projection-metric-subtext">${pastMonthCount > 0 ? `Acumulada sobre ${pastMonthCount} mes(es) anterior(es)` : 'Se alimenta con cada mes guardado'}</span>
            </div>
        </div>

        <!-- Banner de Diagnóstico -->
        <div class="projection-alert ${alertType}">
            <div style="font-size: 1.3rem; line-height: 1;">
                ${alertType === 'success' ? '🟢' : alertType === 'warning' ? '🟡' : alertType === 'danger' ? '🚨' : '💡'}
            </div>
            <div>
                ${alertMessage}
            </div>
        </div>

        <!-- 🏆 Medalla de Logro Visual de Ahorro Proyectado -->
        ${(projectedTotal <= totalLimits && totalLimits > 0) ? `
            <div class="achievement-badge-card animate-entrance">
                <div class="achievement-badge-icon">🏆</div>
                <div>
                    <div style="font-size: 0.95rem; font-weight: 800; color: #b8791a;">¡Camino al Ahorro de ${formatCOP.format(totalLimits - projectedTotal)}!</div>
                    <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.15rem;">
                        Mantienes un excelente ritmo financiero. Al ritmo actual cerrarás el mes con saldo a favor respecto a tu presupuesto asignado.
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- Tabla de Proyección por Categorías -->
        <div style="margin-top: 2rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
                <h3 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin: 0;">
                    Desglose Proyectado por Categoría (Fijos vs Variables)
                </h3>
            </div>

            <!-- 🎛️ Píldoras de Filtro Rápido en la Tabla -->
            <div class="projection-filter-pills">
                <button class="projection-filter-btn is-active" data-proj-filter="all">Todas (${categoriesList.length})</button>
                <button class="projection-filter-btn" data-proj-filter="fixed">📌 Solo Fijos (${fixedCategories.length})</button>
                <button class="projection-filter-btn" data-proj-filter="variable">🔄 Solo Variables (${variableCategories.length})</button>
                <button class="projection-filter-btn" data-proj-filter="alert">🚨 En Alerta (${alertCount})</button>
            </div>

            <div class="table-section">
                <p class="table-scroll-hint" aria-hidden="true">Desliza lateralmente para ver todas las columnas <span>↔</span></p>
                <div class="table-responsive" tabindex="0" role="region" aria-label="Tabla de proyección por categoría">
                    <table class="summary-table cols-6">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th class="text-right">Gastado a la Fecha</th>
                            <th class="text-right">Proyección Cierre</th>
                            <th class="text-right">Media Histórica</th>
                            <th class="text-right">Límite Asignado</th>
                            <th class="text-right">Estado Est.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categoriesList.map(cat => {
                            const isFixed = fixedCategories.includes(cat);
                            const catSpent = spentMap[cat] || 0;
                            const catProj = catProjections[cat] || 0;
                            const catLimit = Number(categoryBudgets[cat]) || 0;
                            const catHistAvg = historicalCatAvg[cat] || 0;
                            const emoji = categoryEmojis[cat] || '⚙️';
                            const isOver = catLimit > 0 && catProj > catLimit;

                            let statusBadge = '<span class="badge-pill" style="background: rgba(11, 29, 58, 0.05); color: var(--text-muted);">Sin límite</span>';
                            if (catLimit > 0) {
                                if (isOver) {
                                    const over = catProj - catLimit;
                                    statusBadge = `<span class="badge-pill badge-meta-over">🔴 +${formatCOP.format(over)}</span>`;
                                } else {
                                    statusBadge = `<span class="badge-pill badge-meta-ok">🟢 En meta</span>`;
                                }
                            }

                            return `
                                <tr class="projection-table-row" data-type="${isFixed ? 'fixed' : 'variable'}" data-over="${isOver ? 'true' : 'false'}">
                                    <td><span style="font-weight: 600; color: var(--text-primary);">${emoji} ${escapeHTML(cat)}</span></td>
                                    <td class="text-right" style="font-weight: 600;">${formatCOP.format(catSpent)}</td>
                                    <td class="text-right" style="font-weight: 700; color: ${isOver ? 'var(--danger)' : 'var(--text-primary)'};">${formatCOP.format(catProj)}</td>
                                    <td class="text-right" style="color: var(--text-muted); font-size: 0.85rem;">${catHistAvg > 0 ? formatCOP.format(catHistAvg) : '—'}</td>
                                    <td class="text-right" style="color: var(--text-muted);">${catLimit > 0 ? formatCOP.format(catLimit) : '—'}</td>
                                    <td class="text-right">${statusBadge}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Gráfico de Tendencia Diaria -->
        <div style="margin-top: 2.5rem;">
            <h3 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 1rem;">
                📈 Tendencia de Gasto Acumulado del Mes
            </h3>
            <div class="projection-chart-wrapper">
                <canvas id="projection-trend-chart"></canvas>
            </div>
        </div>
    `;

    // ── Listener de clics para píldoras de filtro rápido de Proyección ─────────
    container.querySelectorAll('.projection-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.projection-filter-btn').forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            const filterType = btn.dataset.projFilter;
            const rows = container.querySelectorAll('.projection-table-row');
            rows.forEach(tr => {
                const rowType = tr.dataset.type;
                const isOver = tr.dataset.over === 'true';
                if (filterType === 'all') {
                    tr.style.display = '';
                } else if (filterType === 'fixed') {
                    tr.style.display = rowType === 'fixed' ? '' : 'none';
                } else if (filterType === 'variable') {
                    tr.style.display = rowType === 'variable' ? '' : 'none';
                } else if (filterType === 'alert') {
                    tr.style.display = isOver ? '' : 'none';
                }
            });
        });
    });

    // ── Construir el gráfico de tendencia diaria ──────────────────────────────
    const trendCanvas = document.getElementById('projection-trend-chart');
    if (trendCanvas && window.Chart) {

        // Agrupar gastos reales por día del mes
        const dailySpent = {};
        monthExpenses.forEach(exp => {
            const d = new Date(exp.date + 'T00:00:00').getDate();
            dailySpent[d] = (dailySpent[d] || 0) + Number(exp.amount);
        });

        // Construir datos acumulados reales hasta el día actual
        const labels = [];
        const realAccum = [];
        const projAccum = [];
        const limitLine = [];

        let accum = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            labels.push(`${d}`);

            if (d <= currentDay) {
                accum += (dailySpent[d] || 0);
                realAccum.push(accum);
                projAccum.push(null);
            } else if (isCurrentMonth) {
                const gap = d - currentDay;
                projAccum.push(Math.round(accum + (variableDailyPace * gap)));
                realAccum.push(null);
            } else {
                realAccum.push(null);
                projAccum.push(null);
            }

            limitLine.push(totalLimits > 0 ? totalLimits : null);
        }

        // Punto de unión entre línea real y proyectada
        if (isCurrentMonth && currentDay > 0 && currentDay < daysInMonth) {
            projAccum[currentDay - 1] = realAccum[currentDay - 1];
        }

        // Detectar si es pantalla pequeña para ajustar opciones
        const isMobile = window.innerWidth < 600;

        // Destruir instancia anterior si existe
        if (window._projectionTrendChart instanceof Chart) {
            window._projectionTrendChart.destroy();
        }

        window._projectionTrendChart = new Chart(trendCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Real',
                        data: realAccum,
                        borderColor: '#0f2a4a',
                        backgroundColor: 'rgba(15,42,74,0.07)',
                        borderWidth: isMobile ? 2 : 2.5,
                        pointRadius: isMobile ? 0 : 2,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.35,
                        spanGaps: false,
                    },
                    {
                        label: 'Proyección',
                        data: projAccum,
                        borderColor: '#d97706',
                        borderWidth: isMobile ? 1.5 : 2,
                        borderDash: [5, 4],
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: false,
                        tension: 0.35,
                        spanGaps: false,
                    },
                    {
                        label: 'Límite',
                        data: limitLine,
                        borderColor: totalLimits > 0 ? '#e11d48' : 'transparent',
                        borderWidth: 1.2,
                        borderDash: [3, 5],
                        pointRadius: 0,
                        fill: false,
                        tension: 0,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: isMobile ? 10 : 11, weight: '600' },
                            color: '#374151',
                            padding: isMobile ? 10 : 16,
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            boxHeight: 6,
                        }
                    },
                    tooltip: {
                        titleFont: { size: 11 },
                        bodyFont: { size: 11 },
                        callbacks: {
                            title: items => `Día ${items[0].label}`,
                            label: ctx => {
                                if (ctx.raw === null) return null;
                                return ` ${ctx.dataset.label}: ${formatCOP.format(ctx.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0,0,0,0.03)', drawTicks: false },
                        border: { display: false },
                        ticks: {
                            font: { size: isMobile ? 9 : 10 },
                            color: '#9ca3af',
                            maxTicksLimit: isMobile ? 7 : 10,
                            maxRotation: 0,
                        }
                    },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.03)', drawTicks: false },
                        border: { display: false },
                        ticks: {
                            font: { size: isMobile ? 9 : 10 },
                            color: '#9ca3af',
                            maxTicksLimit: isMobile ? 5 : 6,
                            callback: v => {
                                if (v >= 1000000) return `$${(v/1000000).toFixed(1)}M`;
                                if (v >= 1000) return `$${(v/1000).toFixed(0)}K`;
                                return `$${v}`;
                            }
                        }
                    }
                }
            }
        });
    }

    if (window.lucide) window.lucide.createIcons();
}

// Renderizar la lista de gastos con filtros aplicados
function renderExpensesList(expenses, currentFilterMonth, categoryVal, searchVal) {
    const searchValLower = (searchVal || '').toLowerCase().trim();
    
    // 1. Filtrar por el mes seleccionado
    let items = expenses.filter(exp => exp.date && exp.date.startsWith(currentFilterMonth));
    
    // 2. Filtrar por categoría si no es 'all'
    if (categoryVal !== 'all') {
        items = items.filter(exp => exp.category === categoryVal);
    }
    
    // 3. Filtrar por descripción
    if (searchValLower) {
        items = items.filter(exp => (exp.desc || '').toLowerCase().includes(searchValLower));
    }
    
    // Ordenar gastos por fecha descendente
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    dom.expensesList.innerHTML = '';
    
    if (items.length === 0) {
        dom.expensesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i data-lucide="info"></i>
                </div>
                <p>No se encontraron transacciones con los filtros aplicados.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    // Agrupar movimientos por fecha (YYYY-MM-DD)
    const groupedByDate = {};
    const dateKeysOrder = [];

    items.forEach(exp => {
        const d = exp.date;
        if (!groupedByDate[d]) {
            groupedByDate[d] = {
                expenses: [],
                dayNet: 0
            };
            dateKeysOrder.push(d);
        }
        groupedByDate[d].expenses.push(exp);
        const amt = Number(exp.amount) || 0;
        const isIncome = exp.type === 'ingreso' || ['Juni', 'Isa'].includes(exp.category);
        groupedByDate[d].dayNet += isIncome ? amt : -amt;
    });

    let globalItemIdx = 0;
    dateKeysOrder.forEach(dateStr => {
        const group = groupedByDate[dateStr];
        const formattedDateHeader = formatDateString(dateStr);

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-group-header';
        dayHeader.innerHTML = `
            <span>📅 ${formattedDateHeader}</span>
            <span class="day-group-total" style="color: ${group.dayNet >= 0 ? 'var(--success)' : 'var(--text-muted)'};">
                ${group.dayNet >= 0 ? '+' : ''}${formatCOP.format(group.dayNet)}
            </span>
        `;
        dom.expensesList.appendChild(dayHeader);

        group.expenses.forEach(exp => {
            globalItemIdx++;
            const itemEl = document.createElement('div');
            const staggerClass = `stagger-${(globalItemIdx % 5) + 1}`;
            itemEl.className = `expense-item animate-entrance ${staggerClass}`;
            itemEl.setAttribute('data-transaction-id', String(exp.id));
            
            const catClass = getCategoryIconClass(exp.category);
            const emoji = categoryEmojis[exp.category] || '⚙️';
            const isIncome = exp.type === 'ingreso' || ['Juni', 'Isa'].includes(exp.category);
            const amountSign = isIncome ? '+' : '-';
            const amountClass = isIncome ? 'expense-amount income-color' : 'expense-amount';
            
            itemEl.innerHTML = `
                <div class="expense-left">
                    <div class="category-badge-icon ${catClass}">
                        <span style="font-size: 1.3rem;">${emoji}</span>
                    </div>
                    <div class="expense-details">
                        <span class="expense-desc">${escapeHTML(exp.desc)}</span>
                        <div class="expense-meta">
                            <span class="expense-tag">${escapeHTML(exp.category)}</span>
                        </div>
                    </div>
                </div>
                <div class="expense-right">
                    <span class="${amountClass}">${amountSign} ${formatCOP.format(exp.amount)}</span>
                    <div class="expense-actions">
                        <button class="btn btn-secondary btn-icon" type="button" title="Editar">
                            <i data-lucide="edit" style="width: 14px; height: 14px; color: var(--text-secondary);"></i>
                        </button>
                        <button class="btn btn-danger btn-icon" type="button" title="Eliminar">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </div>
            `;

            const [editButton, deleteButton] = itemEl.querySelectorAll('.expense-actions button');
            if (editButton) editButton.addEventListener('click', () => transactionActionHandlers.onEdit?.(exp.id));
            if (deleteButton) deleteButton.addEventListener('click', () => transactionActionHandlers.onDelete?.(exp.id));
            
            dom.expensesList.appendChild(itemEl);
        });
    });
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Actualizar opciones de categoría según el tipo de transacción en el formulario
function updateCategoryOptions() {
    const type = dom.expenseType.value;
    dom.expenseCategory.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
    
    if (type === 'gasto') {
        dom.expenseCategory.innerHTML += `
            <option value="Mercado">Mercado 🛒</option>
            <option value="D1">D1 🔴</option>
            <option value="Servicios Públicos">Servicios Públicos ⚡</option>
            <option value="Arriendo">Arriendo 🏠</option>
            <option value="Casa">Casa 🏡</option>
            <option value="Carne">Carne 🥩</option>
            <option value="Internet">Internet 🌐</option>
            <option value="Gas">Gas 🔥</option>
            <option value="Otros">Otros ⚙️</option>
        `;
    } else if (type === 'ingreso') {
        dom.expenseCategory.innerHTML += `
            <option value="Juni">Juni 🙋‍♂️</option>
            <option value="Isa">Isa 🙋‍♀️</option>
        `;
    }
}

// Cargar los filtros de meses basados en las transacciones únicas
function populatePeriodFilters(sortedMonths, currentFilterMonth) {
    dom.filterMonth.innerHTML = '';
    sortedMonths.forEach(m => {
        const [year, month] = m.split('-');
        const dateObj = new Date(year, parseInt(month) - 1, 1);
        const monthLabel = dateObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
        
        const option = document.createElement('option');
        option.value = m;
        option.textContent = capitalizedLabel;
        dom.filterMonth.appendChild(option);
    });
    
    if (sortedMonths.includes(currentFilterMonth)) {
        dom.filterMonth.value = currentFilterMonth;
    }
}

// Renderizar la tabla de resumen mensual acumulado (General o por Categoría)
// Renderizar la tabla de resumen mensual/trimestral acumulado (General o por Categoría)
function renderMonthlySummary(allExpenses, monthlyBudget, selectedYear, selectedCategory = 'all', viewMode = 'monthly') {
    if (!dom.monthlySummaryBody) return;

    const tableHeader = document.getElementById('summary-table-header');

    if (viewMode === 'quarterly') {
        // ── VISTA TRIMESTRAL (Q1 - Q4) ──────────────────────────────────────────
        const quarters = [
            { id: 'Q1', months: ['01', '02', '03'], label: 'Q1 (Ene - Mar)' },
            { id: 'Q2', months: ['04', '05', '06'], label: 'Q2 (Abr - Jun)' },
            { id: 'Q3', months: ['07', '08', '09'], label: 'Q3 (Jul - Sep)' },
            { id: 'Q4', months: ['10', '11', '12'], label: 'Q4 (Oct - Dic)' }
        ];

        if (selectedCategory === 'all') {
            if (tableHeader) {
                tableHeader.innerHTML = `
                    <th>Trimestre</th>
                    <th class="text-right">Ingresos</th>
                    <th class="text-right">Gastos</th>
                    <th class="text-right">Balance Neto</th>
                `;
            }

            const qMap = { Q1: { income: 0, expenses: 0 }, Q2: { income: 0, expenses: 0 }, Q3: { income: 0, expenses: 0 }, Q4: { income: 0, expenses: 0 } };
            let totalYearIncome = 0;
            let totalYearExpenses = 0;

            allExpenses.forEach(exp => {
                if (!exp.date || (selectedYear && !exp.date.startsWith(`${selectedYear}-`))) return;
                const monthStr = exp.date.substring(5, 7);
                const qObj = quarters.find(q => q.months.includes(monthStr));
                if (!qObj) return;

                const isIncome = exp.type === 'ingreso' || (!exp.type && ['Juni', 'Isa'].includes(exp.category));
                const amt = Number(exp.amount);
                if (isIncome) {
                    qMap[qObj.id].income += amt;
                    totalYearIncome += amt;
                } else {
                    qMap[qObj.id].expenses += amt;
                    totalYearExpenses += amt;
                }
            });

            dom.monthlySummaryBody.innerHTML = '';

            quarters.forEach(q => {
                const { income, expenses } = qMap[q.id];
                const balance = income - expenses;
                const balanceClass = balance >= 0 ? 'balance-positive' : 'balance-negative';
                const balancePrefix = balance >= 0 ? '+' : '';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span class="badge-pill badge-fixed" style="font-size: 0.78rem;">${q.label}</span></td>
                    <td class="text-right"><span class="badge-pill badge-income">+ ${formatCOP.format(income)}</span></td>
                    <td class="text-right"><span class="badge-pill badge-expense">- ${formatCOP.format(expenses)}</span></td>
                    <td class="text-right ${balanceClass}" style="font-size: 0.92rem;">${balancePrefix}${formatCOP.format(balance)}</td>
                `;
                dom.monthlySummaryBody.appendChild(tr);
            });

            // Fila de Total Acumulado del Año
            const totalBalance = totalYearIncome - totalYearExpenses;
            const totalBalanceClass = totalBalance >= 0 ? 'balance-positive' : 'balance-negative';
            const totalPrefix = totalBalance >= 0 ? '+' : '';

            const totalTr = document.createElement('tr');
            totalTr.style.background = 'rgba(11, 29, 58, 0.04)';
            totalTr.style.fontWeight = '800';
            totalTr.innerHTML = `
                <td><span style="font-weight: 800; color: #0b1d3a;">Total Año ${selectedYear || ''}</span></td>
                <td class="text-right" style="color: var(--success); font-weight: 800;">+ ${formatCOP.format(totalYearIncome)}</td>
                <td class="text-right" style="color: var(--danger); font-weight: 800;">- ${formatCOP.format(totalYearExpenses)}</td>
                <td class="text-right ${totalBalanceClass}" style="font-weight: 800; font-size: 0.95rem;">${totalPrefix}${formatCOP.format(totalBalance)}</td>
            `;
            dom.monthlySummaryBody.appendChild(totalTr);
        } else {
            // Trimestral por Categoría Específica
            const isIncomeCat = ['Juni', 'Isa'].includes(selectedCategory);

            if (tableHeader) {
                tableHeader.innerHTML = `
                    <th>Trimestre</th>
                    <th class="text-right">Monto (${selectedCategory})</th>
                    <th class="text-right">% del Trimestre</th>
                    <th class="text-right">vs. Trim. Anterior</th>
                `;
            }

            const qMap = { Q1: { catAmount: 0, totalGroupAmount: 0 }, Q2: { catAmount: 0, totalGroupAmount: 0 }, Q3: { catAmount: 0, totalGroupAmount: 0 }, Q4: { catAmount: 0, totalGroupAmount: 0 } };
            
            allExpenses.forEach(exp => {
                if (!exp.date || (selectedYear && !exp.date.startsWith(`${selectedYear}-`))) return;
                const monthStr = exp.date.substring(5, 7);
                const qObj = quarters.find(q => q.months.includes(monthStr));
                if (!qObj) return;

                const isIncome = exp.type === 'ingreso' || (!exp.type && ['Juni', 'Isa'].includes(exp.category));
                const belongsToGroup = isIncomeCat ? isIncome : !isIncome;

                if (belongsToGroup) {
                    qMap[qObj.id].totalGroupAmount += Number(exp.amount);
                }
                if (exp.category === selectedCategory) {
                    qMap[qObj.id].catAmount += Number(exp.amount);
                }
            });

            const qIds = ['Q1', 'Q2', 'Q3', 'Q4'];
            dom.monthlySummaryBody.innerHTML = '';

            qIds.forEach((qId, idx) => {
                const qObj = quarters.find(q => q.id === qId);
                const { catAmount, totalGroupAmount } = qMap[qId];

                let diff = 0;
                let pct = 0;
                const isFirst = idx === 0;
                if (!isFirst) {
                    const prevAmount = qMap[qIds[idx - 1]].catAmount;
                    diff = catAmount - prevAmount;
                    pct = prevAmount > 0 ? (diff / prevAmount) * 100 : (catAmount > 0 ? 100 : 0);
                }

                const sharePct = totalGroupAmount > 0 ? ((catAmount / totalGroupAmount) * 100).toFixed(1) : '0.0';

                let compHtml = '';
                if (isFirst || diff === 0) {
                    compHtml = `<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>`;
                } else if (diff > 0) {
                    const color = isIncomeCat ? 'var(--success)' : 'var(--danger)';
                    compHtml = `<span style="color: ${color}; font-weight: 600;">+${formatCOP.format(diff)} <small>(▲ ${pct.toFixed(1)}%)</small></span>`;
                } else {
                    const color = isIncomeCat ? 'var(--danger)' : 'var(--success)';
                    compHtml = `<span style="color: ${color}; font-weight: 600;">${formatCOP.format(diff)} <small>(▼ ${Math.abs(pct).toFixed(1)}%)</small></span>`;
                }

                const amountColor = isIncomeCat ? 'var(--success)' : 'var(--text-primary)';
                const amountPrefix = isIncomeCat ? '+' : '-';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span class="badge-pill badge-fixed" style="font-size: 0.78rem;">${qObj.label}</span></td>
                    <td class="text-right" style="color: ${amountColor}; font-weight: 700;">
                        ${catAmount > 0 ? `${amountPrefix} ${formatCOP.format(catAmount)}` : '$ 0'}
                    </td>
                    <td class="text-right" style="font-weight: 600; color: var(--text-secondary);">
                        ${sharePct}%
                    </td>
                    <td class="text-right">
                        ${compHtml}
                    </td>
                `;
                dom.monthlySummaryBody.appendChild(tr);
            });
        }
        return;
    }

    // ── VISTA MENSUAL (TRADICIONAL) ──────────────────────────────────────────
    if (selectedCategory === 'all') {
        if (tableHeader) {
            tableHeader.innerHTML = `
                <th>Mes</th>
                <th class="text-right">Ingresos</th>
                <th class="text-right">Gastos</th>
                <th class="text-right">Balance Neto</th>
            `;
        }

        const monthMap = {};
        allExpenses.forEach(exp => {
            if (!exp.date || (selectedYear && !exp.date.startsWith(`${selectedYear}-`))) return;
            const monthKey = exp.date.substring(0, 7);
            if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expenses: 0 };
            const isIncome = exp.type === 'ingreso' || (!exp.type && ['Juni', 'Isa'].includes(exp.category));
            if (isIncome) monthMap[monthKey].income += Number(exp.amount);
            else monthMap[monthKey].expenses += Number(exp.amount);
        });

        const sortedMonths = Object.keys(monthMap).sort().reverse();
        dom.monthlySummaryBody.innerHTML = '';

        if (sortedMonths.length === 0) {
            dom.monthlySummaryBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        No hay transacciones registradas aún.
                    </td>
                </tr>
            `;
            return;
        }

        sortedMonths.forEach(monthKey => {
            const { income, expenses } = monthMap[monthKey];
            const balance = income - expenses;
            const balanceClass = balance >= 0 ? 'balance-positive' : 'balance-negative';
            const balancePrefix = balance >= 0 ? '+' : '';

            const [year, month] = monthKey.split('-');
            const dateObj = new Date(year, parseInt(month) - 1, 1);
            const monthLabel = dateObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
            const monthName = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-weight: 700; color: var(--text-primary);">${monthName}</span></td>
                <td class="text-right"><span class="badge-pill badge-income">+ ${formatCOP.format(income)}</span></td>
                <td class="text-right"><span class="badge-pill badge-expense">- ${formatCOP.format(expenses)}</span></td>
                <td class="text-right ${balanceClass}" style="font-size: 0.92rem;">${balancePrefix}${formatCOP.format(balance)}</td>
            `;
            dom.monthlySummaryBody.appendChild(tr);
        });
    } else {
        // Comparativo por categoría específica mensual
        const isIncomeCat = ['Juni', 'Isa'].includes(selectedCategory);

        if (tableHeader) {
            tableHeader.innerHTML = `
                <th>Mes</th>
                <th class="text-right">Monto (${selectedCategory})</th>
                <th class="text-right">% del Mes</th>
                <th class="text-right">vs. Mes Anterior</th>
            `;
        }

        const monthMap = {};
        allExpenses.forEach(exp => {
            if (!exp.date || (selectedYear && !exp.date.startsWith(`${selectedYear}-`))) return;
            const monthKey = exp.date.substring(0, 7);
            if (!monthMap[monthKey]) monthMap[monthKey] = { catAmount: 0, totalGroupAmount: 0 };

            const isIncome = exp.type === 'ingreso' || (!exp.type && ['Juni', 'Isa'].includes(exp.category));
            const belongsToGroup = isIncomeCat ? isIncome : !isIncome;

            if (belongsToGroup) {
                monthMap[monthKey].totalGroupAmount += Number(exp.amount);
            }
            if (exp.category === selectedCategory) {
                monthMap[monthKey].catAmount += Number(exp.amount);
            }
        });

        const ascMonths = Object.keys(monthMap).sort();
        const diffMap = {};

        ascMonths.forEach((m, idx) => {
            const currentAmount = monthMap[m].catAmount;
            if (idx === 0) {
                diffMap[m] = { diff: 0, pct: 0, isFirst: true };
            } else {
                const prevAmount = monthMap[ascMonths[idx - 1]].catAmount;
                const diff = currentAmount - prevAmount;
                const pct = prevAmount > 0 ? (diff / prevAmount) * 100 : (currentAmount > 0 ? 100 : 0);
                diffMap[m] = { diff, pct, isFirst: false };
            }
        });

        const descMonths = [...ascMonths].reverse();
        dom.monthlySummaryBody.innerHTML = '';

        if (descMonths.length === 0) {
            dom.monthlySummaryBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        No hay registros para la categoría <strong>${escapeHTML(selectedCategory)}</strong> en el año seleccionado.
                    </td>
                </tr>
            `;
            return;
        }

        descMonths.forEach(monthKey => {
            const { catAmount, totalGroupAmount } = monthMap[monthKey];
            const { diff, pct, isFirst } = diffMap[monthKey];

            const sharePct = totalGroupAmount > 0 ? ((catAmount / totalGroupAmount) * 100).toFixed(1) : '0.0';

            let compHtml = '';
            if (isFirst || diff === 0) {
                compHtml = `<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>`;
            } else if (diff > 0) {
                const color = isIncomeCat ? 'var(--success)' : 'var(--danger)';
                compHtml = `<span style="color: ${color}; font-weight: 600;">+${formatCOP.format(diff)} <small>(▲ ${pct.toFixed(1)}%)</small></span>`;
            } else {
                const color = isIncomeCat ? 'var(--danger)' : 'var(--success)';
                compHtml = `<span style="color: ${color}; font-weight: 600;">${formatCOP.format(diff)} <small>(▼ ${Math.abs(pct).toFixed(1)}%)</small></span>`;
            }

            const [year, month] = monthKey.split('-');
            const dateObj = new Date(year, parseInt(month) - 1, 1);
            const monthLabel = dateObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
            const monthName = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

            const amountColor = isIncomeCat ? 'var(--success)' : 'var(--text-primary)';
            const amountPrefix = isIncomeCat ? '+' : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-weight: 600; color: var(--text-primary);">${monthName}</span></td>
                <td class="text-right" style="color: ${amountColor}; font-weight: 700;">
                    ${catAmount > 0 ? `${amountPrefix} ${formatCOP.format(catAmount)}` : '$ 0'}
                </td>
                <td class="text-right" style="font-weight: 600; color: var(--text-secondary);">
                    ${sharePct}%
                </td>
                <td class="text-right">
                    ${compHtml}
                </td>
            `;
            dom.monthlySummaryBody.appendChild(tr);
        });
    }
}

// Instancia del gráfico mensual
let monthlyChartInstance = null;

// Renderizar gráfica de barras: General (Ingresos vs Gastos) o Evolución por Categoría
function renderMonthlyChart(allExpenses, selectedYear, selectedCategory = 'all', viewMode = 'monthly') {
    const canvas = document.getElementById('monthlyChart');
    const chartTitleEl = document.getElementById('summary-chart-title');
    if (!canvas) return;

    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
        monthlyChartInstance = null;
    }

    if (viewMode === 'quarterly') {
        const quarters = [
            { id: 'Q1', months: ['01', '02', '03'], label: 'Q1 (Ene-Mar)' },
            { id: 'Q2', months: ['04', '05', '06'], label: 'Q2 (Abr-Jun)' },
            { id: 'Q3', months: ['07', '08', '09'], label: 'Q3 (Jul-Sep)' },
            { id: 'Q4', months: ['10', '11', '12'], label: 'Q4 (Oct-Dic)' }
        ];

        const labels = quarters.map(q => q.label);
        const qMap = { Q1: { income: 0, expenses: 0 }, Q2: { income: 0, expenses: 0 }, Q3: { income: 0, expenses: 0 }, Q4: { income: 0, expenses: 0 } };

        allExpenses.forEach(exp => {
            if (!exp.date || (selectedYear && !exp.date.startsWith(`${selectedYear}-`))) return;
            const monthStr = exp.date.substring(5, 7);
            const qObj = quarters.find(q => q.months.includes(monthStr));
            if (!qObj) return;

            const isIncome = exp.type === 'ingreso' || (!exp.type && ['Juni', 'Isa'].includes(exp.category));
            const amt = Number(exp.amount);
            if (selectedCategory === 'all' || exp.category === selectedCategory) {
                if (isIncome) qMap[qObj.id].income += amt;
                else qMap[qObj.id].expenses += amt;
            }
        });

        const incomeData = quarters.map(q => qMap[q.id].income);
        const expenseData = quarters.map(q => qMap[q.id].expenses);
        const balanceData = quarters.map(q => qMap[q.id].income - qMap[q.id].expenses);
        const ctx = canvas.getContext('2d');

        if (chartTitleEl) chartTitleEl.textContent = `Consolidado por Trimestres ${selectedYear || ''}`;

        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Balance Neto 📈',
                        data: balanceData,
                        borderColor: '#0b1d3a',
                        backgroundColor: 'rgba(11, 29, 58, 0.08)',
                        borderWidth: 3,
                        pointBackgroundColor: balanceData.map(v => v >= 0 ? '#0a7c5c' : '#dc2626'),
                        pointBorderColor: '#ffffff',
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.35,
                        order: 1
                    },
                    {
                        type: 'bar',
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(5, 150, 105, 0.75)',
                        borderColor: 'rgba(5, 150, 105, 1)',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        order: 2
                    },
                    {
                        type: 'bar',
                        label: 'Gastos',
                        data: expenseData,
                        backgroundColor: 'rgba(207, 102, 90, 0.72)',
                        borderColor: 'rgba(207, 102, 90, 1)',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#4b5563',
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
                            boxWidth: 12,
                            borderRadius: 4,
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255,255,255,0.97)',
                        titleColor: '#1d3448',
                        bodyColor: '#4b5563',
                        borderColor: 'rgba(36,99,143,0.2)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${formatCOP.format(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6b7280', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } },
                        border: { display: false }
                    },
                    y: {
                        grid: { color: 'rgba(36,99,143,0.08)', drawBorder: false },
                        ticks: {
                            color: '#6b7280',
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            callback: v => {
                                if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                                if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'k';
                                return '$' + v;
                            }
                        },
                        border: { display: false }
                    }
                }
            }
        });
        return;
    }

    if (selectedCategory === 'all') {
        if (chartTitleEl) chartTitleEl.textContent = 'Ingresos vs Gastos por Mes';

        const monthMap = {};
        allExpenses.forEach(exp => {
            if (!exp.date || (selectedYear && !exp.date.startsWith(`${selectedYear}-`))) return;
            const key = exp.date.substring(0, 7);
            if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0 };
            const isIncome = exp.type === 'ingreso' || (!exp.type && ['Juni', 'Isa'].includes(exp.category));
            if (isIncome) monthMap[key].income += Number(exp.amount);
            else monthMap[key].expenses += Number(exp.amount);
        });

        const sortedMonths = Object.keys(monthMap).sort();
        const labels = sortedMonths.map(m => {
            const [y, mo] = m.split('-');
            const d = new Date(y, parseInt(mo) - 1, 1);
            const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
            return label.charAt(0).toUpperCase() + label.slice(1);
        });

        const incomeData  = sortedMonths.map(m => monthMap[m].income);
        const expenseData = sortedMonths.map(m => monthMap[m].expenses);
        const balanceData = sortedMonths.map(m => monthMap[m].income - monthMap[m].expenses);
        const ctx = canvas.getContext('2d');

        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Balance Neto 📈',
                        data: balanceData,
                        borderColor: '#0b1d3a',
                        backgroundColor: 'rgba(11, 29, 58, 0.08)',
                        borderWidth: 3,
                        pointBackgroundColor: balanceData.map(v => v >= 0 ? '#0a7c5c' : '#dc2626'),
                        pointBorderColor: '#ffffff',
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.35,
                        order: 1
                    },
                    {
                        type: 'bar',
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(5, 150, 105, 0.75)',
                        borderColor: 'rgba(5, 150, 105, 1)',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        order: 2
                    },
                    {
                        type: 'bar',
                        label: 'Gastos',
                        data: expenseData,
                        backgroundColor: 'rgba(207, 102, 90, 0.72)',
                        borderColor: 'rgba(207, 102, 90, 1)',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#4b5563',
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
                            boxWidth: 12,
                            borderRadius: 4,
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255,255,255,0.97)',
                        titleColor: '#1d3448',
                        bodyColor: '#4b5563',
                        borderColor: 'rgba(36,99,143,0.2)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${formatCOP.format(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6b7280', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } },
                        border: { display: false }
                    },
                    y: {
                        grid: { color: 'rgba(36,99,143,0.08)', drawBorder: false },
                        ticks: {
                            color: '#6b7280',
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            callback: v => {
                                if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                                if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'k';
                                return '$' + v;
                            }
                        },
                        border: { display: false }
                    }
                }
            }
        });
    } else {
        // Gráfica de evolución por categoría específica
        const catEmoji = categoryEmojis[selectedCategory] || '📊';
        const catColor = categoryColors[selectedCategory] || '#0f2a4a';
        if (chartTitleEl) chartTitleEl.textContent = `${catEmoji} Evolución Mensual: ${selectedCategory}`;

        const monthMap = {};
        allExpenses.forEach(exp => {
            if (!exp.date || (selectedYear && !exp.date.startsWith(`${selectedYear}-`))) return;
            const key = exp.date.substring(0, 7);
            if (!monthMap[key]) monthMap[key] = 0;
            if (exp.category === selectedCategory) {
                monthMap[key] += Number(exp.amount);
            }
        });

        const sortedMonths = Object.keys(monthMap).sort();
        const labels = sortedMonths.map(m => {
            const [y, mo] = m.split('-');
            const d = new Date(y, parseInt(mo) - 1, 1);
            const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
            return label.charAt(0).toUpperCase() + label.slice(1);
        });

        const categoryData = sortedMonths.map(m => monthMap[m]);
        const ctx = canvas.getContext('2d');

        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: selectedCategory,
                        data: categoryData,
                        backgroundColor: catColor + 'bf',
                        borderColor: catColor,
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255,255,255,0.97)',
                        titleColor: '#1d3448',
                        bodyColor: '#4b5563',
                        borderColor: 'rgba(36,99,143,0.2)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${formatCOP.format(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6b7280', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } },
                        border: { display: false }
                    },
                    y: {
                        grid: { color: 'rgba(36,99,143,0.08)', drawBorder: false },
                        ticks: {
                            color: '#6b7280',
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            callback: v => {
                                if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                                if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'k';
                                return '$' + v;
                            }
                        },
                        border: { display: false }
                    }
                }
            }
        });
    }
}

// Mostrar notificaciones emergentes Toast
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 0.75rem 1.25rem;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-color);
        margin-top: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
    `;
    toast.innerHTML = message;
    container.appendChild(toast);
    container.classList.remove('hidden');

    setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
            container.classList.add('hidden');
        }
    }, duration);
}

// 🌙 Inicialización del Modo Oscuro Profundo (OLED Dark Mode)
function initTheme() {
    const savedTheme = localStorage.getItem('hogargasto_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    } else {
        document.body.classList.remove('dark-mode');
        updateThemeIcon(false);
    }

    const btnToggle = document.getElementById('btn-toggle-theme');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('hogargasto_theme', isDark ? 'dark' : 'light');
            updateThemeIcon(isDark);
        });
    }
}

function updateThemeIcon(isDark) {
    const btnToggle = document.getElementById('btn-toggle-theme');
    if (!btnToggle) return;
    btnToggle.innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    if (window.lucide) window.lucide.createIcons();
}
window.initTheme = initTheme;

// 🔥 Medidor de Racha de Control Financiero (Streaks)
function updateStreakBadge(allExpenses) {
    const streakCountEl = document.getElementById('streak-count');
    if (!streakCountEl) return;

    if (!allExpenses || allExpenses.length === 0) {
        streakCountEl.textContent = '0d';
        return;
    }

    const datesSet = new Set(allExpenses.filter(e => e.date).map(e => e.date));
    const sortedDates = Array.from(datesSet).sort().reverse();
    if (sortedDates.length === 0) {
        streakCountEl.textContent = '0d';
        return;
    }

    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (let i = 0; i < 60; i++) {
        const y = checkDate.getFullYear();
        const m = String(checkDate.getMonth() + 1).padStart(2, '0');
        const d = String(checkDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        if (datesSet.has(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            if (i === 0) {
                checkDate.setDate(checkDate.getDate() - 1);
                continue;
            }
            break;
        }
    }

    streakCountEl.textContent = `${streak}d`;
}
window.updateStreakBadge = updateStreakBadge;
