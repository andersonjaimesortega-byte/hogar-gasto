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
        
        // Inicializar Supabase y sincronizar si está configurado
        const isConfigured = await initSupabase();
        if (isConfigured) {
            try {
                await syncWithSupabase();
                // Recargar filtros y refrescar UI después de sincronizar la primera vez
                await loadPeriodFilters();
                await refreshUI();
            } catch (err) {
                console.warn('Sincronización inicial fallida (posiblemente offline):', err);
            }
        }
        
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
    
    const fabAdd = document.getElementById('fab-add');
    if (fabAdd) {
        fabAdd.addEventListener('click', () => {
            dom.expenseForm.scrollIntoView({ behavior: 'smooth' });
            // Small delay to allow scroll before focus
            setTimeout(() => dom.expenseAmount.focus(), 300);
        });
    }


    // Reiniciar / Limpiar todos los datos
    dom.btnClearDb.addEventListener('click', clearAllDatabase);

    // Modal de Sincronización en la Nube
    const modalSync = document.getElementById('modal-sync');
    const btnSyncSettings = document.getElementById('btn-sync-settings');
    const btnCloseSyncModal = document.getElementById('btn-close-sync-modal');
    const btnCancelSync = document.getElementById('btn-cancel-sync');
    const btnSaveSync = document.getElementById('btn-save-sync');
    const btnDisconnectSync = document.getElementById('btn-disconnect-sync');
    const inputSyncUrl = document.getElementById('sync-url');
    const inputSyncKey = document.getElementById('sync-key');
    const syncStatusMsg = document.getElementById('sync-status-msg');

    const showSyncStatus = (text, type) => {
        syncStatusMsg.textContent = text;
        syncStatusMsg.className = type;
        syncStatusMsg.style.display = 'block';
    };

    if (btnSyncSettings) {
        btnSyncSettings.addEventListener('click', async () => {
            const url = await getSetting('supabase_url', '');
            const key = await getSetting('supabase_key', '');
            inputSyncUrl.value = url;
            inputSyncKey.value = key;
            
            syncStatusMsg.style.display = 'none';
            if (url && key) {
                btnDisconnectSync.style.display = 'block';
            } else {
                btnDisconnectSync.style.display = 'none';
            }
            modalSync.classList.add('active');
        });
    }

    const closeSyncModal = () => {
        modalSync.classList.remove('active');
    };

    if (btnCloseSyncModal) btnCloseSyncModal.addEventListener('click', closeSyncModal);
    if (btnCancelSync) btnCancelSync.addEventListener('click', closeSyncModal);

    if (btnDisconnectSync) {
        btnDisconnectSync.addEventListener('click', async () => {
            if (confirm('¿Estás seguro de que deseas desconectar la sincronización en la nube? Tu base de datos local no se borrará.')) {
                await disconnectSupabase();
                closeSyncModal();
                await refreshUI();
            }
        });
    }

    if (btnSaveSync) {
        btnSaveSync.addEventListener('click', async () => {
            const url = inputSyncUrl.value.trim();
            const key = inputSyncKey.value.trim();
            
            if (!url || !key) {
                showSyncStatus('Por favor completa ambos campos.', 'error');
                return;
            }
            
            showSyncStatus('Conectando y sincronizando por primera vez...', 'info');
            btnSaveSync.disabled = true;
            
            try {
                const connected = await saveSupabaseConfig(url, key);
                if (connected) {
                    await syncWithSupabase();
                    showSyncStatus('¡Conectado y sincronizado con éxito!', 'success');
                    setTimeout(async () => {
                        closeSyncModal();
                        btnSaveSync.disabled = false;
                        await loadPeriodFilters();
                        await refreshUI();
                    }, 1000);
                } else {
                    showSyncStatus('Error al conectar. Verifica la URL y la Key.', 'error');
                    btnSaveSync.disabled = false;
                }
            } catch (err) {
                console.error(err);
                showSyncStatus(`Fallo en la sincronización: ${err.message || err}`, 'error');
                btnSaveSync.disabled = false;
            }
        });
    }
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
            transactionData.id = isNaN(idVal) ? idVal : Number(idVal);
            await updateExpense(transactionData);
        } else {
            // Modo creación (generamos un ID string único para evitar colisiones entre dispositivos)
            transactionData.id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
            await addExpense(transactionData);
        }
        
        // Intentar sincronizar el cambio con Supabase
        if (supabaseClient) {
            await uploadToSupabase(transactionData);
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
    const exp = expenses.find(e => String(e.id) === String(id));
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
            await _dbDeleteExpense(isNaN(id) ? id : Number(id));
            
            // Si está conectado a Supabase, borrar de la nube.
            if (supabaseClient) {
                await deleteFromSupabase(id);
            } else {
                // Registrar eliminación en los pendientes offline
                const deletedIds = await getSetting('deleted_ids', []);
                deletedIds.push(String(id));
                await saveSetting('deleted_ids', deletedIds);
            }
            
            await loadPeriodFilters();
            await refreshUI();
        } catch (err) {
            console.error('Error al eliminar transacción:', err);
            alert('No se pudo eliminar la transacción.');
        }
    }
};


