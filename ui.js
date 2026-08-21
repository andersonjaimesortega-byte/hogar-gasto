// Elementos DOM
const dom = {
    valBudget: document.getElementById('val-budget'),
    valSpent: document.getElementById('val-spent'),
    valSpentSubtext: document.getElementById('val-spent-subtext'),
    valIncome: document.getElementById('val-income'),
    valIncomeSubtext: document.getElementById('val-income-subtext'),
    valBalance: document.getElementById('val-balance'),
    valBalanceSubtext: document.getElementById('val-balance-subtext'),
    cardBalance: document.getElementById('card-balance'),
    iconBalance: document.getElementById('icon-balance'),
    filterMonth: document.getElementById('filter-month'),
    filterCategory: document.getElementById('filter-category'),
    searchDesc: document.getElementById('search-desc'),
    expensesList: document.getElementById('expenses-list'),
    expenseForm: document.getElementById('expense-form'),
    expenseIdInput: document.getElementById('expense-id'),
    expenseType: document.getElementById('expense-type'),
    expenseAmount: document.getElementById('expense-amount'),
    expenseDesc: document.getElementById('expense-desc'),
    expenseCategory: document.getElementById('expense-category'),
    expenseDate: document.getElementById('expense-date'),
    formTitle: document.getElementById('form-title'),
    btnSaveExpense: document.getElementById('btn-save-expense'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),
    monthlySummaryBody: document.getElementById('monthly-summary-body'),
    summaryYear: document.getElementById('summary-year'),
    summaryCategory: document.getElementById('summary-category'),
    connectionStatus: document.getElementById('connection-status'),
    statusText: document.getElementById('status-text')
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
        dom.valSpent.textContent = formatCOP.format(totalSpent);
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
        dom.valBalance.textContent = formatCOP.format(balance);
    }

    if (dom.valIncome) {
        const currentMonthIncomes = currentMonthExpenses.filter(exp => exp.type === 'ingreso' || ['Juni', 'Isa'].includes(exp.category));
        const totalIncome = currentMonthIncomes.reduce((sum, item) => sum + Number(item.amount), 0);
        dom.valIncome.textContent = formatCOP.format(totalIncome);
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

    categoriesList.forEach(cat => {
        const spent = spentMap[cat] || 0;
        const limit = Number(categoryBudgets[cat]) || 0;
        const emoji = categoryEmojis[cat] || '⚙️';

        let pct = 0;
        let statusClass = 'normal';
        let statusText = 'Sin límite fijado';

        if (limit > 0) {
            pct = Math.round((spent / limit) * 100);
            if (spent >= limit) {
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
        itemEl.className = 'budget-item';
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

    // Proyección por categoría distinguiendo fijos vs variables con ajuste adaptativo histórico
    let projectedTotal = 0;
    const catProjections = {};

    categoriesList.forEach(cat => {
        const catSpent = spentMap[cat] || 0;
        const catLimit = Number(categoryBudgets[cat]) || 0;

        if (fixedCategories.includes(cat)) {
            // Gasto fijo: Si ya se pagó en el mes, la proyección es el pago real realizado.
            // Si no se ha pagado aún en el mes, estimamos el límite o el promedio histórico.
            catProjections[cat] = catSpent > 0 ? catSpent : (catLimit > 0 ? catLimit : (historicalCatAvg[cat] || 0));
        } else {
            // Gasto variable: Se proyecta usando la velocidad diaria de consumo
            if (isCurrentMonth && currentDay > 0) {
                const catDailyPace = catSpent / currentDay;
                let effectiveDailyPace = catDailyPace;

                // Si estamos en los primeros 5 días del mes y tenemos histórico,
                // combinamos el ritmo inicial con el promedio histórico diario para prevenir distorsiones.
                if (currentDay <= 5 && historicalCatAvg[cat] > 0) {
                    const historicalDailyPace = historicalCatAvg[cat] / daysInMonth;
                    const weightCurrent = currentDay / 10; // ej. Día 2: 20% mes actual + 80% histórico
                    effectiveDailyPace = (catDailyPace * weightCurrent) + (historicalDailyPace * (1 - weightCurrent));
                }

                catProjections[cat] = Math.round(catSpent + (effectiveDailyPace * remainingDays));
            } else {
                catProjections[cat] = catSpent;
            }
        }
        projectedTotal += catProjections[cat];
    });

    // Ritmo promedio diario para gastos VARIABLES (Mercado, D1, Carne, Casa, Servicios, Otros)
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

    container.innerHTML = `
        <!-- Métricas Principales -->
        <div class="projection-grid">
            <div class="projection-metric-card">
                <span class="projection-metric-title">
                    <i data-lucide="trending-up" style="color: var(--primary);"></i> Gastado a la Fecha
                </span>
                <span class="projection-metric-value" style="color: var(--text-primary);">${formatCOP.format(spentSoFar)}</span>
                <span class="projection-metric-subtext">Fijos: ${formatCOP.format(fixedSpentSoFar)} | Var: ${formatCOP.format(variableSpentSoFar)}</span>
            </div>

            <div class="projection-metric-card">
                <span class="projection-metric-title">
                    <i data-lucide="calculator" style="color: var(--gold);"></i> Promedio Diario Variable
                </span>
                <span class="projection-metric-value" style="color: var(--gold);">${formatCOP.format(variableDailyPace)}</span>
                <span class="projection-metric-subtext">Velocidad en Mercado, D1, Carne, etc.</span>
            </div>

            <div class="projection-metric-card">
                <span class="projection-metric-title">
                    <i data-lucide="flag" style="color: ${projectedTotal > totalLimits && totalLimits > 0 ? 'var(--danger)' : 'var(--success)'};"></i> Proyección Cierre de Mes
                </span>
                <span class="projection-metric-value" style="color: ${projectedTotal > totalLimits && totalLimits > 0 ? 'var(--danger)' : 'var(--success)'};">${formatCOP.format(projectedTotal)}</span>
                <span class="projection-metric-subtext">${totalLimits > 0 ? `Límite asignado: ${formatCOP.format(totalLimits)}` : 'Sin límite global'}</span>
            </div>

            <div class="projection-metric-card">
                <span class="projection-metric-title">
                    <i data-lucide="shield-alert" style="color: var(--secondary);"></i> Meta Diaria Variable Rec.
                </span>
                <span class="projection-metric-value" style="color: var(--secondary);">${isCurrentMonth ? formatCOP.format(recommendedDailyVariableMax) : '$ 0'}</span>
                <span class="projection-metric-subtext">Máx. diario en compras rest. (${remainingDays} días)</span>
            </div>

            <div class="projection-metric-card">
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

        <!-- Tabla de Proyección por Categorías -->
        <div style="margin-top: 2rem;">
            <h3 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 1rem;">
                Desglose Proyectado por Categoría (Fijos vs Variables)
            </h3>
            <div class="table-responsive">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th>Tipo</th>
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

                            let statusBadge = '<span class="budget-status-tag normal">Sin límite</span>';
                            if (catLimit > 0) {
                                if (catProj > catLimit) {
                                    const over = catProj - catLimit;
                                    statusBadge = `<span class="budget-status-tag danger">🔴 +${formatCOP.format(over)}</span>`;
                                } else {
                                    statusBadge = `<span class="budget-status-tag normal">🟢 En meta</span>`;
                                }
                            }

                            const typeTag = isFixed 
                                ? `<span style="font-size: 0.72rem; font-weight: 700; color: #1e40af; background: rgba(30,64,175,0.1); padding: 0.15rem 0.45rem; border-radius: 4px;">📌 Fijo</span>`
                                : `<span style="font-size: 0.72rem; font-weight: 700; color: #d97706; background: rgba(217,119,6,0.12); padding: 0.15rem 0.45rem; border-radius: 4px;">🔄 Variable</span>`;

                            return `
                                <tr>
                                    <td><span style="font-weight: 600; color: var(--text-primary);">${emoji} ${escapeHTML(cat)}</span></td>
                                    <td>${typeTag}</td>
                                    <td class="text-right" style="font-weight: 600;">${formatCOP.format(catSpent)}</td>
                                    <td class="text-right" style="font-weight: 700; color: ${catLimit > 0 && catProj > catLimit ? 'var(--danger)' : 'var(--text-primary)'};">${formatCOP.format(catProj)}</td>
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
    
    items.forEach(exp => {
        const itemEl = document.createElement('div');
        itemEl.className = 'expense-item';
        itemEl.dataset.transactionId = String(exp.id);
        
        const catClass = getCategoryIconClass(exp.category);
        const emoji = categoryEmojis[exp.category] || '⚙️';
        const formattedDate = formatDateString(exp.date);
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
                        <span>${formattedDate}</span>
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
        editButton.addEventListener('click', () => transactionActionHandlers.onEdit?.(exp.id));
        deleteButton.addEventListener('click', () => transactionActionHandlers.onDelete?.(exp.id));
        
        dom.expensesList.appendChild(itemEl);
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
function renderMonthlySummary(allExpenses, monthlyBudget, selectedYear, selectedCategory = 'all') {
    if (!dom.monthlySummaryBody) return;

    const tableHeader = document.getElementById('summary-table-header');

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
                <td><span style="font-weight: 600; color: var(--text-primary);">${monthName}</span></td>
                <td class="text-right" style="color: var(--success); font-weight: 600;">+ ${formatCOP.format(income)}</td>
                <td class="text-right" style="color: var(--danger); font-weight: 600;">- ${formatCOP.format(expenses)}</td>
                <td class="text-right ${balanceClass}">${balancePrefix}${formatCOP.format(balance)}</td>
            `;
            dom.monthlySummaryBody.appendChild(tr);
        });
    } else {
        // Comparativo por categoría específica
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
function renderMonthlyChart(allExpenses, selectedYear, selectedCategory = 'all') {
    const canvas = document.getElementById('monthlyChart');
    const chartTitleEl = document.getElementById('summary-chart-title');
    if (!canvas) return;

    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
        monthlyChartInstance = null;
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
        const ctx = canvas.getContext('2d');

        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(5, 150, 105, 0.75)',
                        borderColor: 'rgba(5, 150, 105, 1)',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    },
                    {
                        label: 'Gastos',
                        data: expenseData,
                        backgroundColor: 'rgba(207, 102, 90, 0.72)',
                        borderColor: 'rgba(207, 102, 90, 1)',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
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
