/**
 * ─── APP CONTROLLER ──────────────────────────────────────────────────────────
 * Orquestador principal de la aplicación Flayer (Hogar & Gasto).
 * Gestiona el estado, persistencia local/nube, navegación y renderizado de UI.
 */
class AppController {
    constructor() {
        this.expenses = [];
        this.monthlyBudget = 1000000;
        this.currentFilterMonth = '';
        this.summaryYear = '';
        this.summaryCategory = 'all';
        this.categoryChart = null;
        this.syncTimer = null;
        this.activeTab = 'dashboard';
        this.chartDistributionType = 'gasto';
        this.categoryBudgets = {
            'Mercado': 800000,
            'D1': 400000,
            'Servicios Públicos': 300000,
            'Arriendo': 1200000,
            'Casa': 250000,
            'Carne': 200000,
            'Internet': 80000,
            'Gas': 40000,
            'Otros': 150000
        };
    }

    /**
     * Inicialización principal de la app
     */
    async initialize() {
        try {
            await initDB();
            this.monthlyBudget = await getSetting('monthly_budget', 1000000);
            this.categoryBudgets = await getSetting('category_budgets', this.categoryBudgets);
            
            this.setupDefaultDates();
            this.bindEvents();
            await this.loadPeriodFilters();
            await this.refresh();

            if (await initSupabase()) {
                await this.syncAndRefresh();
            }

            registerServiceWorker();
            checkOnlineStatus(dom.connectionStatus, dom.statusText);
            this.enableAutomaticSync();
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            showToast('⚠️ Error al inicializar la base de datos local. Por favor recarga la página.', 'danger');
        }
    }

    /**
     * Configurar fecha por defecto a la fecha actual local
     */
    setupDefaultDates() {
        if (dom.expenseDate) dom.expenseDate.value = getTodayStr();
        this.currentFilterMonth = getCurrentMonthStr();
    }

    /**
     * Cargar meses disponibles en los filtros de período
     */
    async loadPeriodFilters() {
        const allExpenses = await getAllExpenses();
        const months = new Set([getCurrentMonthStr()]);
        allExpenses.forEach(({ date }) => {
            if (date) months.add(date.substring(0, 7));
        });

        const sortedMonths = [...months].sort().reverse();
        populatePeriodFilters(sortedMonths, this.currentFilterMonth);
        this.currentFilterMonth = sortedMonths.includes(this.currentFilterMonth)
            ? this.currentFilterMonth
            : dom.filterMonth.value;
        if (dom.filterMonth) dom.filterMonth.value = this.currentFilterMonth;
    }

    /**
     * Refrescar todos los datos y vistas activas
     */
    async refresh() {
        this.expenses = await getAllExpenses();
        this.categoryBudgets = await getSetting('category_budgets', this.categoryBudgets);
        const currentExpenses = this.expenses.filter(item => item.date?.startsWith(this.currentFilterMonth));

        // Renderizado según pestaña o componente activo
        updateDashboardStats(this.expenses, this.currentFilterMonth);
        renderCategoryBudgets(this.expenses, this.currentFilterMonth, this.categoryBudgets);
        renderProjectionTab(this.expenses, this.currentFilterMonth, this.categoryBudgets);
        renderExpensesList(this.expenses, this.currentFilterMonth, dom.filterCategory?.value || 'all', '');

        const canvas = document.getElementById('categoryChart');
        if (canvas) {
            this.categoryChart = updateCategoryChart(
                canvas.getContext('2d'),
                currentExpenses,
                this.categoryChart,
                document.getElementById('chart-legend'),
                this.chartDistributionType || 'gasto'
            );
        }
        this.updateSummaryYearOptions();
        this.renderSummary();
    }

    /**
     * Vincular todos los eventos de la UI
     */
    bindEvents() {
        setTransactionActionHandlers({
            onEdit: id => this.editTransaction(id),
            onDelete: id => this.requestDeleteTransaction(id)
        });
        updateCategoryOptions();

        this.bindFilterEvents();
        this.bindModalEvents();
        this.bindTabEvents();
        this.bindChartEvents();
        this.bindSyncEvents();
    }

    /**
     * Eventos de filtros de mes, categoría y formulario
     */
    bindFilterEvents() {
        dom.filterMonth?.addEventListener('change', async event => {
            this.currentFilterMonth = event.target.value;
            await this.refresh();
        });

        dom.filterCategory?.addEventListener('change', () => {
            renderExpensesList(this.expenses, this.currentFilterMonth, dom.filterCategory.value, '');
        });

        dom.expenseType?.addEventListener('change', () => this.updateTransactionTypeUI());
        dom.expenseForm?.addEventListener('submit', event => this.saveTransaction(event));
        
        dom.btnCancelEdit?.addEventListener('click', () => {
            this.resetForm();
            this.closeModal('modal-add');
        });

        dom.summaryYear?.addEventListener('change', event => {
            this.summaryYear = event.target.value;
            this.renderSummary();
        });

        dom.summaryCategory?.addEventListener('change', event => {
            this.summaryCategory = event.target.value;
            this.renderSummary();
        });
    }

    /**
     * Eventos de modales (Transacciones y Presupuestos)
     */
    bindModalEvents() {
        // Modal de Presupuestos por Categoría
        const btnOpenBudgetModal = document.getElementById('btn-open-budget-modal');
        const btnCloseBudgetModal = document.getElementById('btn-close-budget-modal');
        const btnCancelBudgetModal = document.getElementById('btn-cancel-budget-modal');
        const formBudgets = document.getElementById('category-budgets-form');

        const openBudgetModal = () => {
            const container = document.getElementById('budget-inputs-container');
            if (container) {
                const categories = ['Mercado', 'D1', 'Servicios Públicos', 'Arriendo', 'Casa', 'Carne', 'Internet', 'Gas', 'Otros'];
                container.innerHTML = categories.map(cat => `
                    <div class="form-group" style="margin-bottom: 0.25rem;">
                        <label for="budget-input-${cat}" style="font-size: 0.85rem; font-weight: 700;">
                            ${categoryEmojis[cat] || '⚙️'} ${cat}
                        </label>
                        <input type="number" id="budget-input-${cat}" data-category="${cat}" class="input-control budget-input-field" value="${this.categoryBudgets[cat] || 0}" placeholder="0" min="0" step="1000">
                    </div>
                `).join('');
            }
            this.openModal('modal-budgets');
        };

        btnOpenBudgetModal?.addEventListener('click', openBudgetModal);
        btnCloseBudgetModal?.addEventListener('click', () => this.closeModal('modal-budgets'));
        btnCancelBudgetModal?.addEventListener('click', () => this.closeModal('modal-budgets'));

        formBudgets?.addEventListener('submit', async event => {
            event.preventDefault();
            const newBudgets = {};
            document.querySelectorAll('.budget-input-field').forEach(input => {
                const cat = input.dataset.category;
                const val = Math.max(0, Number(input.value) || 0);
                newBudgets[cat] = val;
            });
            this.categoryBudgets = newBudgets;
            await saveSetting('category_budgets', newBudgets);
            if (typeof uploadSettingToSupabase === 'function') {
                await uploadSettingToSupabase('category_budgets', newBudgets);
            }
            this.closeModal('modal-budgets');
            renderCategoryBudgets(this.expenses, this.currentFilterMonth, this.categoryBudgets);
            showToast('✅ Presupuestos actualizados y sincronizados', 'success');
        });

        // Botones para abrir modal de agregar transacción
        const openAddModalHandler = () => {
            this.resetForm();
            this.openModal('modal-add');
            setTimeout(() => dom.expenseAmount?.focus(), 300);
        };

        document.getElementById('fab-add')?.addEventListener('click', openAddModalHandler);
        document.getElementById('btn-open-add-modal')?.addEventListener('click', openAddModalHandler);
        document.getElementById('btn-close-modal')?.addEventListener('click', () => {
            this.closeModal('modal-add');
            this.resetForm();
        });
    }

    /**
     * Eventos de selección de pestañas
     */
    bindTabEvents() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.selectTab(button.dataset.tab));
        });
    }

    /**
     * Eventos del gráfico de distribución
     */
    bindChartEvents() {
        const btnGastos = document.getElementById('btn-chart-gastos');
        const btnIngresos = document.getElementById('btn-chart-ingresos');
        
        const toggleChartType = (type) => {
            this.chartDistributionType = type;
            btnGastos?.classList.toggle('active', type === 'gasto');
            btnIngresos?.classList.toggle('active', type === 'ingreso');
            const currentExpenses = this.expenses.filter(item => item.date?.startsWith(this.currentFilterMonth));
            const canvas = document.getElementById('categoryChart');
            if (canvas) {
                this.categoryChart = updateCategoryChart(
                    canvas.getContext('2d'),
                    currentExpenses,
                    this.categoryChart,
                    document.getElementById('chart-legend'),
                    this.chartDistributionType
                );
            }
        };

        btnGastos?.addEventListener('click', () => toggleChartType('gasto'));
        btnIngresos?.addEventListener('click', () => toggleChartType('ingreso'));
    }

    /**
     * Métodos auxiliares para manejo de modales
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('active');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.classList.add('hidden');
        }
    }

    /**
     * Sincronización en segundo plano
     */
    async syncAndRefresh() {
        if (!supabaseClient || !navigator.onLine) return false;
        try {
            const synchronized = await syncWithSupabase();
            if (!synchronized) return false;
            await this.loadPeriodFilters();
            await this.refresh();
            return true;
        } catch (error) {
            console.warn('No se pudo sincronizar en este momento; se reintentará luego.', error);
            return false;
        }
    }

    enableAutomaticSync() {
        window.addEventListener('online', () => this.syncAndRefresh());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.syncAndRefresh();
        });
        this.syncTimer = window.setInterval(() => this.syncAndRefresh(), 45000);
    }

    /**
     * Cambio de Pestañas
     */
    selectTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.tab-button').forEach(button => {
            const isActive = button.dataset.tab === tabName;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            const isTarget = panel.id === `tab-${tabName}`;
            panel.hidden = !isTarget;
        });

        const isDashboard = tabName === 'dashboard';
        const fab = document.getElementById('fab-add');
        if (fab) fab.style.display = isDashboard ? '' : 'none';

        if (tabName === 'summary') this.renderSummary();
        if (tabName === 'budgets') renderCategoryBudgets(this.expenses, this.currentFilterMonth, this.categoryBudgets);
        if (tabName === 'projection') renderProjectionTab(this.expenses, this.currentFilterMonth, this.categoryBudgets);

        window.lucide?.createIcons();
    }

    updateSummaryYearOptions() {
        if (!dom.summaryYear) return;
        const years = [...new Set(this.expenses.map(item => item.date?.substring(0, 4)).filter(Boolean))]
            .sort()
            .reverse();
        if (!years.includes(this.summaryYear)) this.summaryYear = years[0] || '';
        dom.summaryYear.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
        dom.summaryYear.value = this.summaryYear;
        dom.summaryYear.disabled = years.length === 0;
    }

    renderSummary() {
        const selectedCat = dom.summaryCategory ? dom.summaryCategory.value : (this.summaryCategory || 'all');
        renderMonthlySummary(this.expenses, this.monthlyBudget, this.summaryYear, selectedCat);
        renderMonthlyChart(this.expenses, this.summaryYear, selectedCat);
    }

    updateTransactionTypeUI() {
        updateCategoryOptions();
        const isIncome = dom.expenseType.value === 'ingreso';
        dom.btnSaveExpense.textContent = isIncome ? 'Guardar Ingreso' : 'Guardar Gasto';
        dom.formTitle.innerHTML = `<i data-lucide="plus-circle" style="color: ${isIncome ? 'var(--primary)' : 'var(--success)'};"></i> Registrar Nuevo ${isIncome ? 'Ingreso' : 'Gasto'}`;
        window.lucide?.createIcons();
    }

    /**
     * Sincronización remota modal
     */
    bindSyncEvents() {
        const modal = document.getElementById('modal-sync');
        const button = document.getElementById('btn-sync-settings');
        const closeButton = document.getElementById('btn-close-sync');
        const cancelButton = document.getElementById('btn-cancel-sync');
        const saveButton = document.getElementById('btn-save-sync');
        const disconnectButton = document.getElementById('btn-disconnect-sync');
        const urlInput = document.getElementById('sync-url');
        const keyInput = document.getElementById('sync-key');
        const status = document.getElementById('sync-status-msg');
        const closeSync = () => this.closeModal('modal-sync');

        const showStatus = (message, type) => {
            if (!status) return;
            status.textContent = message;
            status.className = type;
            status.style.display = 'block';
        };

        button?.addEventListener('click', async () => {
            if (urlInput) urlInput.value = await getSetting('supabase_url', '');
            if (keyInput) keyInput.value = await getSetting('supabase_key', '');
            if (disconnectButton) disconnectButton.style.display = urlInput?.value && keyInput?.value ? 'block' : 'none';
            if (status) status.style.display = 'none';
            this.openModal('modal-sync');
        });

        closeButton?.addEventListener('click', closeSync);
        cancelButton?.addEventListener('click', closeSync);

        disconnectButton?.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de que deseas desconectar la sincronización en la nube? Tu base de datos local se mantendrá intacta.')) return;
            await disconnectSupabase();
            closeSync();
            await this.refresh();
            showToast('Sincronización en la nube desconectada', 'info');
        });

        saveButton?.addEventListener('click', async () => {
            const url = urlInput?.value.trim();
            const key = keyInput?.value.trim();
            if (!url || !key) return showStatus('Por favor completa ambos campos.', 'error');

            saveButton.disabled = true;
            showStatus('Conectando y sincronizando por primera vez...', 'info');
            try {
                if (!await saveSupabaseConfig(url, key)) throw new Error('Verifica la URL y la Key.');
                await this.syncAndRefresh();
                showStatus('¡Conectado y sincronizado con éxito!', 'success');
                showToast('✅ Sincronización en la nube configurada con éxito', 'success');
                setTimeout(closeSync, 1000);
            } catch (error) {
                console.error(error);
                showStatus(`Falló la sincronización: ${error.message || error}`, 'error');
            } finally {
                saveButton.disabled = false;
            }
        });
    }

    /**
     * Guardar / Editar transacción
     */
    async saveTransaction(event) {
        event.preventDefault();
        const amount = Number(dom.expenseAmount.value);
        const transaction = {
            amount,
            desc: dom.expenseDesc.value.trim(),
            category: dom.expenseCategory.value,
            date: dom.expenseDate.value,
            type: dom.expenseType.value
        };

        if (!amount || amount <= 0 || !transaction.category || !transaction.date || (transaction.type === 'gasto' && !transaction.desc)) {
            showToast('⚠️ Completa los campos obligatorios con valores válidos', 'warning');
            return;
        }

        const editedId = dom.expenseIdInput.value;
        const existingTransaction = this.expenses.find(item => String(item.id) === String(editedId));
        transaction.id = existingTransaction
            ? existingTransaction.id
            : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        try {
            if (editedId) await updateExpense(transaction);
            else await addExpense(transaction);

            if (supabaseClient) {
                try { await uploadToSupabase(transaction); }
                catch (error) { console.warn('No se pudo subir a la nube en este momento.', error); }
            }

            const transactionMonth = transaction.date.substring(0, 7);
            this.resetForm();
            this.closeModal('modal-add');

            if (transactionMonth !== this.currentFilterMonth) this.currentFilterMonth = transactionMonth;
            await this.loadPeriodFilters();
            await this.refresh();

            showToast(editedId ? 'Transacción actualizada con éxito' : 'Transacción registrada con éxito', 'success');
        } catch (error) {
            console.error('Error al guardar la transacción:', error);
            showToast('❌ No se pudo guardar la información localmente', 'danger');
        }
    }

    /**
     * Limpiar formulario
     */
    resetForm() {
        if (dom.expenseIdInput) dom.expenseIdInput.value = '';
        if (dom.expenseAmount) dom.expenseAmount.value = '';
        if (dom.expenseDesc) dom.expenseDesc.value = '';
        if (dom.expenseType) dom.expenseType.value = 'gasto';
        if (dom.expenseCategory) dom.expenseCategory.value = '';
        if (dom.expenseDate) dom.expenseDate.value = getTodayStr();
        updateCategoryOptions();
        if (dom.formTitle) dom.formTitle.innerHTML = '<i data-lucide="plus-circle" style="color: var(--success);"></i> Registrar Nuevo Gasto';
        if (dom.btnSaveExpense) dom.btnSaveExpense.textContent = 'Guardar Gasto';
        if (dom.btnCancelEdit) dom.btnCancelEdit.style.display = 'none';
        window.lucide?.createIcons();
    }

    /**
     * Cargar transacción en el formulario para editar
     */
    editTransaction(id) {
        const transaction = this.expenses.find(item => String(item.id) === String(id));
        if (!transaction) return;
        dom.expenseIdInput.value = transaction.id;
        dom.expenseAmount.value = transaction.amount;
        dom.expenseDesc.value = transaction.desc;
        dom.expenseDate.value = transaction.date;
        dom.expenseType.value = transaction.type || (['Juni', 'Isa'].includes(transaction.category) ? 'ingreso' : 'gasto');
        updateCategoryOptions();
        dom.expenseCategory.value = transaction.category;
        dom.formTitle.innerHTML = '<i data-lucide="edit" style="color: var(--primary);"></i> Editar Transacción';
        dom.btnSaveExpense.textContent = 'Actualizar Transacción';
        if (dom.btnCancelEdit) dom.btnCancelEdit.style.display = 'inline-flex';
        
        this.openModal('modal-add');
        window.lucide?.createIcons();
    }

    /**
     * Confirmar y eliminar transacción
     */
    async requestDeleteTransaction(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta transacción?')) return;
        const transaction = this.expenses.find(item => String(item.id) === String(id));
        if (!transaction) return;
        const exactId = transaction.id;
        const idString = String(exactId);

        try {
            await deleteExpense(exactId);
            const deletedIds = await getSetting('deleted_ids', []);
            if (!deletedIds.includes(idString)) await saveSetting('deleted_ids', [...deletedIds, idString]);
            
            if (supabaseClient) {
                try {
                    await deleteFromSupabase(exactId);
                    const remaining = (await getSetting('deleted_ids', [])).filter(value => value !== idString);
                    await saveSetting('deleted_ids', remaining);
                } catch (error) {
                    console.warn('No se pudo borrar de la nube en este momento.', error);
                }
            }

            await this.loadPeriodFilters();
            await this.refresh();
            showToast('Transacción eliminada con éxito', 'info');
        } catch (error) {
            console.error('Error al eliminar transacción:', error);
            showToast('❌ No se pudo eliminar la transacción', 'danger');
        }
    }
}

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => new AppController().initialize());
