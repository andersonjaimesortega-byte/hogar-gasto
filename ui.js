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
    txtBudgetPeriod: document.getElementById('txt-budget-period'),
    valProgressPercent: document.getElementById('val-progress-percent'),
    valProgressBar: document.getElementById('val-progress-bar'),
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
    modalBudget: document.getElementById('modal-budget'),
    budgetInput: document.getElementById('budget-input'),
    btnEditBudget: document.getElementById('btn-edit-budget'),
    btnCloseBudgetModal: document.getElementById('btn-close-budget-modal'),
    btnCancelBudget: document.getElementById('btn-cancel-budget'),
    btnSaveBudget: document.getElementById('btn-save-budget'),
    monthlySummaryBody: document.getElementById('monthly-summary-body'),
    btnClearDb: document.getElementById('btn-clear-db'),
    connectionStatus: document.getElementById('connection-status'),
    statusText: document.getElementById('status-text'),
    btnInstall: document.getElementById('btn-install'),
    installPromo: document.getElementById('install-promo'),
    btnPromoInstall: document.getElementById('btn-promo-install')
};

// Actualizar estadísticas del Dashboard
function updateDashboardStats(filteredExpenses, monthlyBudget, currentFilterMonth) {
    // Clasificar transacciones en gastos e ingresos
    const incomesOnly = filteredExpenses.filter(exp => exp.type === 'ingreso' || ['Juni', 'Isa'].includes(exp.category));
    const expensesOnly = filteredExpenses.filter(exp => exp.type === 'gasto' || (!exp.type && !['Juni', 'Isa'].includes(exp.category)));

    // Presupuesto
    dom.valBudget.textContent = formatCOP.format(monthlyBudget);
    
    if (currentFilterMonth) {
        const [year, month] = currentFilterMonth.split('-');
        const dateObj = new Date(year, parseInt(month) - 1, 1);
        const periodName = dateObj.toLocaleDateString('es-CO', { month: 'long' });
        dom.txtBudgetPeriod.textContent = `Periodo: ${periodName.charAt(0).toUpperCase() + periodName.slice(1)}`;
    }
    
    // Ingresos Adicionales
    const totalIncome = incomesOnly.reduce((sum, item) => sum + Number(item.amount), 0);
    dom.valIncome.textContent = formatCOP.format(totalIncome);
    dom.valIncomeSubtext.textContent = `${incomesOnly.length} aportes registrados`;

    // Gastos Totales
    const totalSpent = expensesOnly.reduce((sum, item) => sum + Number(item.amount), 0);
    dom.valSpent.textContent = formatCOP.format(totalSpent);
    dom.valSpentSubtext.textContent = `${expensesOnly.length} transacciones este mes`;
    
    // Saldo Disponible: Presupuesto base + Ingresos - Gastos
    const balance = monthlyBudget + totalIncome - totalSpent;
    dom.valBalance.textContent = formatCOP.format(balance);
    
    // Modificar estilos según saldo positivo/negativo
    dom.cardBalance.classList.remove('deficit', 'shake');
    dom.iconBalance.style.color = '';
    
    if (balance < 0) {
        dom.cardBalance.classList.add('deficit');
        setTimeout(() => dom.cardBalance.classList.add('shake'), 50);
        dom.valBalanceSubtext.textContent = '¡Has excedido el saldo disponible!';
        dom.valBalanceSubtext.style.color = 'var(--danger)';
        dom.iconBalance.innerHTML = '<i data-lucide="alert-triangle"></i>';
        dom.iconBalance.style.color = 'var(--danger)';
    } else {
        dom.valBalanceSubtext.textContent = 'Dentro del presupuesto establecido';
        dom.valBalanceSubtext.style.color = '';
        dom.iconBalance.innerHTML = '<i data-lucide="check-circle-2"></i>';
        dom.iconBalance.style.color = 'var(--success)';
    }
    
    // Progreso global (relativo al presupuesto base)
    let percent = 0;
    if (monthlyBudget > 0) {
        percent = Math.round((totalSpent / monthlyBudget) * 100);
    }
    
    dom.valProgressPercent.textContent = `${percent}%`;
    dom.valProgressBar.style.width = `${Math.min(percent, 100)}%`;
    
    // Colores de la barra
    dom.valProgressBar.className = 'progress-bar-fill';
    if (percent <= 75) {
        dom.valProgressBar.classList.add('normal');
        dom.valProgressPercent.style.color = 'var(--success)';
    } else if (percent <= 100) {
        dom.valProgressBar.classList.add('warning');
        dom.valProgressPercent.style.color = 'var(--warning)';
    } else {
        dom.valProgressBar.classList.add('danger');
        dom.valProgressPercent.style.color = 'var(--danger)';
    }
}

// Renderizar la lista de gastos con filtros aplicados
function renderExpensesList(expenses, currentFilterMonth, categoryVal, searchVal) {
    const searchValLower = searchVal.toLowerCase().trim();
    
    // 1. Filtrar por el mes seleccionado
    let items = expenses.filter(exp => exp.date.startsWith(currentFilterMonth));
    
    // 2. Filtrar por categoría si no es 'all'
    if (categoryVal !== 'all') {
        items = items.filter(exp => exp.category === categoryVal);
    }
    
    // 3. Filtrar por descripción en la barra de búsqueda
    if (searchValLower) {
        items = items.filter(exp => exp.desc.toLowerCase().includes(searchValLower));
    }
    
    // Ordenar gastos por fecha descendente (más nuevos primero)
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
        itemEl.id = `exp-item-${exp.id}`;
        
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
                        <span class="expense-tag" style="background: rgba(255,255,255,0.03); color: var(--text-secondary);">${escapeHTML(exp.category)}</span>
                    </div>
                </div>
            </div>
            <div class="expense-right">
                <span class="${amountClass}">${amountSign} ${formatCOP.format(exp.amount)}</span>
                <div class="expense-actions">
                    <button class="btn btn-secondary btn-icon" onclick="editExpense(${exp.id})" title="Editar">
                        <i data-lucide="edit" style="width: 14px; height: 14px; color: var(--text-secondary);"></i>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteExpense(${exp.id})" title="Eliminar">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </div>
        `;
        
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

// Renderizar la tabla de resumen mensual acumulado
function renderMonthlySummary(allExpenses, monthlyBudget) {
    if (!dom.monthlySummaryBody) return;

    // Agrupar todas las transacciones por mes (YYYY-MM)
    const monthMap = {};
    allExpenses.forEach(exp => {
        if (!exp.date) return;
        const monthKey = exp.date.substring(0, 7);
        if (!monthMap[monthKey]) {
            monthMap[monthKey] = { income: 0, expenses: 0 };
        }
        const isIncome = exp.type === 'ingreso' || (!exp.type && ['Juni', 'Isa'].includes(exp.category));
        if (isIncome) {
            monthMap[monthKey].income += Number(exp.amount);
        } else {
            monthMap[monthKey].expenses += Number(exp.amount);
        }
    });

    // Ordenar meses de forma descendente (más reciente primero)
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
        const balance = monthlyBudget + income - expenses;
        const balanceClass = balance >= 0 ? 'balance-positive' : 'balance-negative';
        const balancePrefix = balance >= 0 ? '+' : '';

        // Formatear nombre del mes
        const [year, month] = monthKey.split('-');
        const dateObj = new Date(year, parseInt(month) - 1, 1);
        const monthLabel = dateObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        const monthName = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span style="font-weight: 600; color: var(--text-primary);">${monthName}</span>
            </td>
            <td class="text-right" style="color: var(--success); font-weight: 600;">
                + ${formatCOP.format(income)}
            </td>
            <td class="text-right" style="color: var(--danger); font-weight: 600;">
                - ${formatCOP.format(expenses)}
            </td>
            <td class="text-right ${balanceClass}">
                ${balancePrefix}${formatCOP.format(balance)}
            </td>
        `;
        dom.monthlySummaryBody.appendChild(tr);
    });
}

// Instancia del gráfico mensual (para destruirla antes de recrear)
let monthlyChartInstance = null;

// Renderizar gráfica de barras: Ingresos vs Gastos por mes
function renderMonthlyChart(allExpenses) {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;

    // Agrupar por mes
    const monthMap = {};
    allExpenses.forEach(exp => {
        if (!exp.date) return;
        const key = exp.date.substring(0, 7);
        if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0 };
        const isIncome = exp.type === 'ingreso' || (!exp.type && ['Juni', 'Isa'].includes(exp.category));
        if (isIncome) monthMap[key].income += Number(exp.amount);
        else monthMap[key].expenses += Number(exp.amount);
    });

    // Ordenar meses ascendente (más antiguo → más reciente)
    const sortedMonths = Object.keys(monthMap).sort();

    // Etiquetas legibles en español
    const labels = sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        const d = new Date(y, parseInt(mo) - 1, 1);
        const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    });

    const incomeData  = sortedMonths.map(m => monthMap[m].income);
    const expenseData = sortedMonths.map(m => monthMap[m].expenses);

    // Destruir instancia anterior si existe
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
        monthlyChartInstance = null;
    }

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
                    backgroundColor: 'rgba(220, 38, 38, 0.7)',
                    borderColor: 'rgba(220, 38, 38, 1)',
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
                    titleColor: '#1e1b4b',
                    bodyColor: '#4b5563',
                    borderColor: 'rgba(99,102,241,0.2)',
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
                    ticks: {
                        color: '#6b7280',
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
                    },
                    border: { display: false }
                },
                y: {
                    grid: { color: 'rgba(99,102,241,0.07)', drawBorder: false },
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
