// Variables globales de estado (en memoria)
let expenses = [];
let monthlyBudget = 1000000; // Presupuesto inicial base por defecto
let currentFilterMonth = ''; // Formato: 'YYYY-MM'
let categoryChart = null;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        
        // Cargar presupuesto mensual guardado
        monthlyBudget = await getSetting('monthly_budget', 1000000);
        
        // Configurar fechas iniciales
        setupDefaultDates();
        

        // Cargar filtros y refrescar
        await loadPeriodFilters();
        await refreshUI();
        
        // Configurar controladores de eventos
        setupEventListeners();
        
        // Configurar PWA
        registerServiceWorker();
        checkOnlineStatus(dom.connectionStatus, dom.statusText);
        setupInstallPrompt(dom.btnInstall, dom.installPromo, dom.btnPromoInstall);
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        alert('Hubo un error al inicializar la base de datos local. Por favor recarga la página.');
    }
});

// Configurar fechas iniciales del formulario y filtro
function setupDefaultDates() {
    dom.expenseDate.value = getTodayStr();
    currentFilterMonth = getCurrentMonthStr();
}

// Cargar los filtros de meses basados en las transacciones de la DB
async function loadPeriodFilters() {
    const allExpenses = await getAllExpenses();
    const monthsSet = new Set();
    
    // Añadir el mes actual siempre
    monthsSet.add(getCurrentMonthStr());
    
    // Obtener los meses únicos de las transacciones
    allExpenses.forEach(exp => {
        if (exp.date) {
            monthsSet.add(exp.date.substring(0, 7));
        }
    });
    
    // Ordenar los meses de forma descendente
    const sortedMonths = Array.from(monthsSet).sort().reverse();
    
    // Poblar en la UI
    populatePeriodFilters(sortedMonths, currentFilterMonth);
    
    // Sincronizar selección
    if (sortedMonths.includes(currentFilterMonth)) {
        dom.filterMonth.value = currentFilterMonth;
    } else {
        currentFilterMonth = dom.filterMonth.value;
    }
}

// Actualizar la interfaz de usuario completa (Refrescar datos)
async function refreshUI() {
    expenses = await getAllExpenses();
    
    // Filtrar transacciones por el mes actual seleccionado
    const filteredExpenses = expenses.filter(exp => exp.date.startsWith(currentFilterMonth));
    
    // Actualizar métricas del dashboard
    updateDashboardStats(filteredExpenses, monthlyBudget, currentFilterMonth);
    
    // Cargar la lista en pantalla
    renderExpensesList(expenses, currentFilterMonth, dom.filterCategory.value, '');
    
    // Actualizar Gráfico
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const legendContainer = document.getElementById('chart-legend');
    categoryChart = updateCategoryChart(ctx, filteredExpenses, categoryChart, legendContainer);

    // Actualizar tabla de resumen acumulado por mes (usa TODAS las transacciones)
    renderMonthlySummary(expenses, monthlyBudget);

    // Actualizar gráfica acumulada por mes
    renderMonthlyChart(expenses);
}

// Configuración de escuchas de eventos (Listeners)
function setupEventListeners() {
    // Inicializar opciones de categoría
    updateCategoryOptions();

    // Filtros
    dom.filterMonth.addEventListener('change', (e) => {
        currentFilterMonth = e.target.value;
        refreshUI();
    });
    
    dom.filterCategory.addEventListener('change', () => {
        renderExpensesList(expenses, currentFilterMonth, dom.filterCategory.value, '');
    });
    
    // Formulario de transacciones
    dom.expenseType.addEventListener('change', () => {
        updateCategoryOptions();
        const isIncome = dom.expenseType.value === 'ingreso';
        // Update button text
        dom.btnSaveExpense.textContent = isIncome ? 'Guardar Ingreso' : 'Guardar Gasto';
        // Update form title
        const titleText = isIncome ? 'Registrar Nuevo Ingreso' : 'Registrar Nuevo Gasto';
        const icon = 'plus-circle';
        const color = isIncome ? 'var(--primary)' : 'var(--success)';
        dom.formTitle.innerHTML = `<i data-lucide="${icon}" style="color: ${color};"></i> ${titleText}`;
        if (window.lucide) window.lucide.createIcons();
    });
    dom.expenseForm.addEventListener('submit', handleExpenseFormSubmit);
    dom.btnCancelEdit.addEventListener('click', resetExpenseForm);
    
    // Modal de presupuesto
    if (dom.btnEditBudget) {
        dom.btnEditBudget.addEventListener('click', () => {
            dom.budgetInput.value = monthlyBudget;
            dom.modalBudget.classList.add('active');
        });
    }
    
    const closeModal = () => {
        dom.modalBudget.classList.remove('active');
    };
    
    if (dom.btnCloseBudgetModal) dom.btnCloseBudgetModal.addEventListener('click', closeModal);
    if (dom.btnCancelBudget) dom.btnCancelBudget.addEventListener('click', closeModal);
    
    if (dom.btnSaveBudget) {
        dom.btnSaveBudget.addEventListener('click', async () => {
            const val = Number(dom.budgetInput.value);
            if (isNaN(val) || val < 0) {
                alert('Por favor introduce un valor válido superior o igual a 0.');
                return;
            }
            
            monthlyBudget = val;
            await saveSetting('monthly_budget', monthlyBudget);
            closeModal();
            await refreshUI();
        });
    }

    // Reiniciar / Limpiar todos los datos
    dom.btnClearDb.addEventListener('click', clearAllDatabase);
}

// Limpieza completa de todos los datos
async function clearAllDatabase() {
    if (confirm('⚠️ ¿Estás seguro de que deseas borrar TODOS los datos? Esta acción es irreversible.')) {
        try {
            await clearDatabase();
            alert('✅ Datos eliminados. La app se reiniciará.');
            location.reload();
        } catch (err) {
            console.error('Error al reiniciar DB:', err);
            alert('No se pudo borrar la base de datos.');
        }
    }
}

// Guardar o Actualizar una transacción
async function handleExpenseFormSubmit(e) {
    e.preventDefault();
    
    const amountVal = Number(dom.expenseAmount.value);
    const descVal = dom.expenseDesc.value.trim();
    const catVal = dom.expenseCategory.value;
    const dateVal = dom.expenseDate.value;
    const idVal = dom.expenseIdInput.value;
    const typeVal = dom.expenseType.value;
    
    // Validación de entrada
    if (!amountVal || amountVal <= 0) {
        alert('Por favor introduce un valor válido.');
        return;
    }
    // La descripción es obligatoria solo para gastos
    if (typeVal !== 'ingreso' && !descVal) {
        alert('Por favor introduce una descripción.');
        return;
    }
    if (!catVal) {
        alert('Por favor selecciona una categoría.');
        return;
    }
    if (!dateVal) {
        alert('Por favor selecciona una fecha.');
        return;
    }
    
    const transactionData = {
        amount: amountVal,
        desc: descVal,
        category: catVal,
        date: dateVal,
        type: typeVal
    };
    
    try {
        if (idVal) {
            // Modo edición
            transactionData.id = Number(idVal);
            await updateExpense(transactionData);
        } else {
            // Modo creación
            await addExpense(transactionData);
        }
        
        resetExpenseForm();
        
        // Recargar periodos de filtro si la fecha corresponde a un mes nuevo
        const itemMonth = dateVal.substring(0, 7);
        if (itemMonth !== currentFilterMonth) {
            currentFilterMonth = itemMonth;
            await loadPeriodFilters();
        }
        
        await refreshUI();
        
    } catch (err) {
        console.error('Error al guardar la transacción:', err);
        alert('No se pudo guardar la información localmente.');
    }
}

// Resetear el formulario de gastos/ingresos
function resetExpenseForm() {
    dom.expenseIdInput.value = '';
    dom.expenseAmount.value = '';
    dom.expenseDesc.value = '';
    setupDefaultDates();
    
    dom.expenseType.value = 'gasto';
    updateCategoryOptions();
    dom.expenseCategory.value = '';
    
    dom.formTitle.innerHTML = '<i data-lucide="plus-circle" style="color: var(--success);"></i> Registrar Nuevo Gasto';
    dom.btnSaveExpense.textContent = 'Guardar Gasto';
    dom.btnCancelEdit.style.display = 'none';
    
    if (window.lucide) window.lucide.createIcons();
}

// Cargar un gasto en el formulario para editar (disponible en window para llamadas onclick inline)
window.editExpense = function(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    
    dom.expenseIdInput.value = exp.id;
    dom.expenseAmount.value = exp.amount;
    dom.expenseDesc.value = exp.desc;
    dom.expenseDate.value = exp.date;
    
    // Establecer tipo de transacción y forzar actualización del select de categorías
    dom.expenseType.value = exp.type || (['Juni', 'Isa'].includes(exp.category) ? 'ingreso' : 'gasto');
    updateCategoryOptions();
    dom.expenseCategory.value = exp.category;
    
    dom.formTitle.innerHTML = '<i data-lucide="edit" style="color: var(--primary);"></i> Editar Transacción';
    dom.btnSaveExpense.textContent = 'Actualizar Transacción';
    dom.btnCancelEdit.style.display = 'inline-flex';
    
    // Auto-scroll al formulario
    dom.expenseForm.scrollIntoView({ behavior: 'smooth' });
    
    if (window.lucide) window.lucide.createIcons();
};

// Borrar un gasto/ingreso (disponible en window para llamadas onclick inline)
// Se captura la referencia a la función de DB antes de que window.deleteExpense la sobreescriba
const _dbDeleteExpense = deleteExpense;
window.deleteExpense = async function(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
        try {
            await _dbDeleteExpense(id);
            await loadPeriodFilters();
            await refreshUI();
        } catch (err) {
            console.error('Error al eliminar transacción:', err);
            alert('No se pudo eliminar la transacción.');
        }
    }
};


