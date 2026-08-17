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
