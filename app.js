class AppController {
    constructor() {
        this.expenses = [];
        this.monthlyBudget = 1000000;
        this.categoryBudgets = {};
        this.currentFilterMonth = '';
        this.summaryYear = '';
        this.categoryChart = null;
        this.syncTimer = null;
        this.undoTimer = null;
        this.pendingUndoTransaction = null;
    }

    async initialize() {
        try {
            await initDB();
            this.monthlyBudget = await getSetting('monthly_budget', 1000000);
            this.categoryBudgets = await getSetting('category_budgets', {});
            this.setupDefaultDates();
            this.bindEvents();
            await this.loadPeriodFilters();
            await this.refresh();

            if (await initSupabase()) await this.syncAndRefresh();

            registerServiceWorker();
            checkOnlineStatus(dom.connectionStatus, dom.statusText);
            setupInstallPrompt(dom.btnInstall, dom.installPromo, dom.btnPromoInstall);
            this.enableAutomaticSync();
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            alert('Hubo un error al inicializar la base de datos local. Por favor recarga la página.');
        }
    }

    setupDefaultDates() {
        dom.expenseDate.value = getTodayStr();
        this.currentFilterMonth = getCurrentMonthStr();
    }

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
        dom.filterMonth.value = this.currentFilterMonth;
    }

    async refresh() {
        this.expenses = await getAllExpenses();
        const currentExpenses = this.expenses.filter(item => item.date?.startsWith(this.currentFilterMonth));

        updateDashboardStats(currentExpenses, this.monthlyBudget, this.currentFilterMonth);
        renderExpensesList(this.expenses, this.currentFilterMonth, dom.filterCategory.value, '');

        const canvas = document.getElementById('categoryChart');
        this.categoryChart = updateCategoryChart(
            canvas.getContext('2d'),
            currentExpenses,
            this.categoryChart,
            document.getElementById('chart-legend')
        );
        this.updateSummaryYearOptions();
        this.renderSummary();
        renderCategoryBudgets(this.expenses, this.currentFilterMonth, this.categoryBudgets);
    }

    bindEvents() {
        setTransactionActionHandlers({
            onEdit: id => this.editTransaction(id),
            onDelete: id => this.requestDeleteTransaction(id)
        });
        updateCategoryOptions();

        dom.filterMonth.addEventListener('change', async event => {
            this.currentFilterMonth = event.target.value;
            await this.refresh();
        });
        dom.filterCategory.addEventListener('change', () => {
            renderExpensesList(this.expenses, this.currentFilterMonth, dom.filterCategory.value, '');
        });
        dom.expenseType.addEventListener('change', () => this.updateTransactionTypeUI());
        dom.expenseForm.addEventListener('submit', event => this.saveTransaction(event));
        dom.btnCancelEdit.addEventListener('click', () => {
            this.resetForm();
            this.closeTransactionForm();
        });
        dom.summaryYear?.addEventListener('change', event => {
            this.summaryYear = event.target.value;
            this.renderSummary();
        });

        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.selectTab(button.dataset.tab));
        });

        const openTransaction = () => this.openTransactionForm(true);
        document.getElementById('fab-add')?.addEventListener('click', openTransaction);
        document.getElementById('btn-add-transaction')?.addEventListener('click', openTransaction);
        document.getElementById('btn-close-transaction')?.addEventListener('click', () => this.closeTransactionForm());
        document.getElementById('transaction-backdrop')?.addEventListener('click', () => this.closeTransactionForm());
        document.getElementById('btn-undo-delete')?.addEventListener('click', () => this.undoDeleteTransaction());
        document.getElementById('btn-save-category-budgets')?.addEventListener('click', () => this.saveCategoryBudgets());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') this.closeTransactionForm();
        });
        this.bindSyncEvents();
    }

    openTransactionForm(reset = false) {
        if (reset) this.resetForm();
        document.getElementById('transaction-panel')?.classList.add('is-open');
        const backdrop = document.getElementById('transaction-backdrop');
        if (backdrop) backdrop.hidden = false;
        setTimeout(() => dom.expenseAmount.focus(), 100);
    }

    closeTransactionForm() {
        document.getElementById('transaction-panel')?.classList.remove('is-open');
        const backdrop = document.getElementById('transaction-backdrop');
        if (backdrop) backdrop.hidden = true;
    }

    async syncAndRefresh() {
        if (!supabaseClient || !navigator.onLine) return false;
        try {
            const synchronized = await syncWithSupabase();
            if (!synchronized) return false;
            this.categoryBudgets = await getSetting('category_budgets', {});
            await this.loadPeriodFilters();
            await this.refresh();
            return true;
        } catch (error) {
            console.warn('No se pudo sincronizar ahora; se reintentará automáticamente.', error);
            return false;
        }
    }

    enableAutomaticSync() {
        // Un dispositivo activo recibe los cambios del otro sin recargar.
        window.addEventListener('online', () => this.syncAndRefresh());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.syncAndRefresh();
        });
        this.syncTimer = window.setInterval(() => this.syncAndRefresh(), 45000);
    }

    selectTab(tabName) {
        const isSummary = tabName === 'summary';
        document.getElementById('tab-dashboard').hidden = isSummary;
        document.getElementById('tab-summary').hidden = !isSummary;
        document.querySelectorAll('.tab-button').forEach(button => {
            const isActive = button.dataset.tab === tabName;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });
        document.getElementById('fab-add').style.display = isSummary ? 'none' : '';
        if (isSummary) this.renderSummary();
        window.lucide?.createIcons();
    }

    updateSummaryYearOptions() {
        // Durante una actualización PWA puede cargarse temporalmente un HTML
        // anterior que aún no contiene este selector.
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
        renderMonthlySummary(this.expenses, this.monthlyBudget, this.summaryYear);
        renderMonthlyChart(this.expenses, this.summaryYear);
    }

    updateTransactionTypeUI() {
        updateCategoryOptions();
        const isIncome = dom.expenseType.value === 'ingreso';
        dom.btnSaveExpense.textContent = isIncome ? 'Guardar Ingreso' : 'Guardar Gasto';
        dom.formTitle.innerHTML = `<i data-lucide="plus-circle" style="color: ${isIncome ? 'var(--primary)' : 'var(--success)'};"></i> Registrar Nuevo ${isIncome ? 'Ingreso' : 'Gasto'}`;
        window.lucide?.createIcons();
    }

    bindSyncEvents() {
        const modal = document.getElementById('modal-sync');
        const button = document.getElementById('btn-sync-settings');
        const closeButton = document.getElementById('btn-close-sync-modal');
        const cancelButton = document.getElementById('btn-cancel-sync');
        const saveButton = document.getElementById('btn-save-sync');
        const disconnectButton = document.getElementById('btn-disconnect-sync');
        const urlInput = document.getElementById('sync-url');
        const keyInput = document.getElementById('sync-key');
        const status = document.getElementById('sync-status-msg');
        const close = () => modal.classList.remove('active');
        const showStatus = (message, type) => {
            status.textContent = message;
            status.className = type;
            status.style.display = 'block';
        };

        button?.addEventListener('click', async () => {
            urlInput.value = await getSetting('supabase_url', '');
            keyInput.value = await getSetting('supabase_key', '');
            disconnectButton.style.display = urlInput.value && keyInput.value ? 'block' : 'none';
            status.style.display = 'none';
            modal.classList.add('active');
        });
        closeButton?.addEventListener('click', close);
        cancelButton?.addEventListener('click', close);
        disconnectButton?.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de que deseas desconectar la sincronización en la nube? Tu base de datos local no se borrará.')) return;
            await disconnectSupabase();
            close();
            await this.refresh();
        });
        saveButton?.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            const key = keyInput.value.trim();
            if (!url || !key) return showStatus('Por favor completa ambos campos.', 'error');

            saveButton.disabled = true;
            showStatus('Conectando y sincronizando por primera vez...', 'info');
            try {
                if (!await saveSupabaseConfig(url, key)) throw new Error('Verifica la URL y la Key.');
                await this.syncAndRefresh();
                showStatus('¡Conectado y sincronizado con éxito!', 'success');
                setTimeout(close, 1000);
            } catch (error) {
                console.error(error);
                showStatus(`Falló la sincronización: ${error.message || error}`, 'error');
            } finally {
                saveButton.disabled = false;
            }
        });
    }

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
            alert('Completa los campos obligatorios con un valor válido.');
            return;
        }

        const editedId = dom.expenseIdInput.value;
        const existingTransaction = this.expenses.find(item => String(item.id) === editedId);
        // El input siempre devuelve texto, pero IndexedDB distingue entre la
        // clave "123" y la clave 123. Al editar conservamos el tipo original.
        transaction.id = existingTransaction
            ? existingTransaction.id
            : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        try {
            if (editedId) await updateExpense(transaction);
            else await addExpense(transaction);

            if (supabaseClient) {
                try { await uploadToSupabase(transaction); }
                catch (error) { console.warn('No se pudo subir ahora; se reintentará después.', error); }
            }
            const transactionMonth = transaction.date.substring(0, 7);
            this.resetForm();
            this.closeTransactionForm();
            if (transactionMonth !== this.currentFilterMonth) this.currentFilterMonth = transactionMonth;
            await this.loadPeriodFilters();
            await this.refresh();
        } catch (error) {
            console.error('Error al guardar la transacción:', error);
            alert('No se pudo guardar la información localmente.');
        }
    }

    resetForm() {
        dom.expenseIdInput.value = '';
        dom.expenseAmount.value = '';
        dom.expenseDesc.value = '';
        dom.expenseType.value = 'gasto';
        dom.expenseCategory.value = '';
        dom.expenseDate.value = getTodayStr();
        updateCategoryOptions();
        dom.formTitle.innerHTML = '<i data-lucide="plus-circle" style="color: var(--success);"></i> Registrar Nuevo Gasto';
        dom.btnSaveExpense.textContent = 'Guardar Gasto';
        dom.btnCancelEdit.style.display = 'none';
        window.lucide?.createIcons();
    }

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
        dom.btnCancelEdit.style.display = 'inline-flex';
        this.openTransactionForm(false);
        window.lucide?.createIcons();
    }

    async requestDeleteTransaction(id) {
        const transaction = this.expenses.find(item => String(item.id) === String(id));
        if (!transaction) return;
        const idString = String(id);
        try {
            // id llega de la transacción almacenada; no se debe coercionar.
            await deleteExpense(id);
            const deletedIds = await getSetting('deleted_ids', []);
            if (!deletedIds.includes(idString)) await saveSetting('deleted_ids', [...deletedIds, idString]);
            if (supabaseClient) {
                try {
                    await deleteFromSupabase(id);
                    const remaining = (await getSetting('deleted_ids', [])).filter(value => value !== idString);
                    await saveSetting('deleted_ids', remaining);
                } catch (error) {
                    console.warn('No se pudo borrar de la nube; se reintentará después.', error);
                }
            }
            await this.loadPeriodFilters();
            await this.refresh();
            this.showUndoDelete(transaction);
        } catch (error) {
            console.error('Error al eliminar transacción:', error);
            alert('No se pudo eliminar la transacción.');
        }
    }

    showUndoDelete(transaction) {
        this.pendingUndoTransaction = { ...transaction };
        clearTimeout(this.undoTimer);
        const toast = document.getElementById('undo-toast');
        document.getElementById('undo-message').textContent = 'Movimiento eliminado.';
        toast.hidden = false;
        this.undoTimer = setTimeout(() => {
            toast.hidden = true;
            this.pendingUndoTransaction = null;
        }, 6500);
    }

    async undoDeleteTransaction() {
        const transaction = this.pendingUndoTransaction;
        if (!transaction) return;
        try {
            await updateExpense(transaction);
            const idString = String(transaction.id);
            const remaining = (await getSetting('deleted_ids', [])).filter(id => id !== idString);
            await saveSetting('deleted_ids', remaining);
            if (supabaseClient) await uploadToSupabase(transaction);
            clearTimeout(this.undoTimer);
            this.pendingUndoTransaction = null;
            document.getElementById('undo-toast').hidden = true;
            await this.loadPeriodFilters();
            await this.refresh();
        } catch (error) {
            console.error('No se pudo deshacer el borrado:', error);
            alert('No se pudo restaurar el movimiento.');
        }
    }

    async saveCategoryBudgets() {
        const nextBudgets = {};
        document.querySelectorAll('#category-budget-list input[data-category]').forEach(input => {
            const amount = Number(input.value);
            if (amount > 0) nextBudgets[input.dataset.category] = amount;
        });
        this.categoryBudgets = nextBudgets;
        try {
            await saveSharedSetting('category_budgets', nextBudgets);
        } catch (error) {
            // La copia local queda disponible y se reintentará en la próxima sincronización.
            await saveSetting('category_budgets', nextBudgets);
            console.warn('No se pudo guardar el presupuesto en la nube:', error);
        }
        renderCategoryBudgets(this.expenses, this.currentFilterMonth, this.categoryBudgets);
    }

}

document.addEventListener('DOMContentLoaded', () => new AppController().initialize());
