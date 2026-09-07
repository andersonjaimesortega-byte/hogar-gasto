// Sincronización con Supabase (Cloud Sync)
let supabaseClient = null;
let realtimeChannel = null;
let isSyncing = false;

// ─── Inicializar / Configurar ──────────────────────────────────────────────

async function initSupabase() {
    const url = await getSetting('supabase_url', '');
    const key = await getSetting('supabase_key', '');
    if (url && key) {
        try {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                supabaseClient = window.supabase.createClient(url, key);
                updateSyncBadge(true);
                return true;
            }
        } catch (err) {
            console.error('Error al inicializar Supabase:', err);
            updateSyncBadge(false);
            return false;
        }
    }
    updateSyncBadge(false);
    return false;
}

function updateSyncBadge(connected, pendingCount = 0) {
    const btn = document.getElementById('btn-sync-settings');
    const dot = document.getElementById('sync-active-dot');
    if (!btn) return;
    btn.classList.toggle('connected', connected);
    if (dot) {
        dot.style.display = connected ? 'block' : 'none';
        dot.style.backgroundColor = pendingCount > 0 ? 'var(--gold)' : 'var(--success)';
        dot.title = pendingCount > 0 ? `${pendingCount} cambios pendientes por sincronizar` : 'Sincronizado';
    }
}

async function saveSupabaseConfig(url, key) {
    const previousUrl = await getSetting('supabase_url', '');
    const previousKey = await getSetting('supabase_key', '');
    if (previousUrl !== url || previousKey !== key) {
        await saveSetting('synced_cloud_ids', []);
    }
    await saveSetting('supabase_url', url);
    await saveSetting('supabase_key', key);
    return initSupabase();
}

async function disconnectSupabase() {
    if (realtimeChannel && supabaseClient) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    await saveSetting('supabase_url', '');
    await saveSetting('supabase_key', '');
    await saveSetting('synced_cloud_ids', []);
    supabaseClient = null;
    updateSyncBadge(false);
}

// ─── Operaciones cloud (lanzan error al llamador) ──────────────────────────

async function uploadToSupabase(expense) {
    if (!supabaseClient) return;
    const itemToUpload = {
        id:          String(expense.id),
        amount:      Number(expense.amount),
        description: expense.desc || '',
        category:    expense.category,
        date:        expense.date,
        type:        expense.type || (['Juni', 'Isa'].includes(expense.category) ? 'ingreso' : 'gasto'),
        updated_at:  expense.updated_at || new Date().toISOString()
    };
    const { error } = await supabaseClient.from('transactions').upsert(itemToUpload);
    if (error) throw error;
    console.log(`Sincronizado en la nube: ${expense.id}`);
}

async function deleteFromSupabase(id) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient
        .from('transactions')
        .delete()
        .eq('id', String(id));
    if (error) throw error;
    console.log(`Eliminado de la nube: ${id}`);
}

async function uploadSettingToSupabase(key, value) {
    if (!supabaseClient) return;
    try {
        const itemToUpload = {
            key: key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            updated_at: new Date().toISOString()
        };
        let { error } = await supabaseClient.from('app_settings').upsert(itemToUpload);
        if (error) {
            await supabaseClient.from('settings').upsert(itemToUpload);
        }
        console.log(`Configuración '${key}' sincronizada con la nube.`);
    } catch (err) {
        console.warn(`No se pudo subir la configuración '${key}' a la nube:`, err.message);
    }
}

async function syncSettingsWithSupabase() {
    if (!supabaseClient) return;
    try {
        let { data, error } = await supabaseClient.from('app_settings').select('*').eq('key', 'category_budgets').maybeSingle();
        if (error || !data) {
            const res = await supabaseClient.from('settings').select('*').eq('key', 'category_budgets').maybeSingle();
            if (res.data) data = res.data;
        }

        const localBudgets = await getSetting('category_budgets', null);

        if (data && data.value) {
            let parsedCloud = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            await saveSetting('category_budgets', parsedCloud);
            console.log('✅ Presupuestos por categoría descargados de la nube.');
            return parsedCloud;
        } else if (localBudgets) {
            await uploadSettingToSupabase('category_budgets', localBudgets);
        }
    } catch (err) {
        console.warn('Sincronización de configuración omitida:', err.message);
    }
    return null;
}

// ─── Configurar suscripción Supabase Realtime (WebSockets) ──────────────────

function setupRealtimeSubscription(onRealtimeChange) {
    if (!supabaseClient || realtimeChannel) return;
    try {
        realtimeChannel = supabaseClient
            .channel('public:transactions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, async (payload) => {
                console.log('⚡ Evento en tiempo real de Supabase recibido:', payload.eventType);
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const cloudItem = payload.new;
                    const mappedItem = {
                        id:         String(cloudItem.id),
                        amount:     Number(cloudItem.amount),
                        desc:       cloudItem.description || cloudItem.desc || '',
                        category:   cloudItem.category || 'Otros',
                        date:       cloudItem.date,
                        type:       cloudItem.type || (['Juni', 'Isa'].includes(cloudItem.category) ? 'ingreso' : 'gasto'),
                        updated_at: cloudItem.updated_at || new Date().toISOString()
                    };
                    await updateExpense(mappedItem);
                } else if (payload.eventType === 'DELETE' && payload.old && payload.old.id) {
                    await deleteExpense(payload.old.id);
                }
                if (typeof onRealtimeChange === 'function') {
                    onRealtimeChange();
                }
            })
            .subscribe((status) => {
                console.log(`Estado de suscripción en tiempo real: ${status}`);
            });
    } catch (err) {
        console.warn('No se pudo establecer la suscripción Realtime:', err);
    }
}

// ─── Sincronización bidireccional con resolución Last-Write-Wins ─────────────

async function syncWithSupabase() {
    if (!supabaseClient || isSyncing) return false;
    isSyncing = true;
    console.log('Iniciando sincronización con Supabase…');

    try {
        // Sincronizar configuración (Presupuestos por Categoría)
        await syncSettingsWithSupabase();

        // ── PASO 1: Enviar eliminaciones pendientes offline ────────────────
        const pendingDeletes = await getSetting('deleted_ids', []);
        if (pendingDeletes.length > 0) {
            console.log('Eliminaciones pendientes offline:', pendingDeletes);
            const done = [];
            for (const id of pendingDeletes) {
                try {
                    await deleteFromSupabase(id);
                    done.push(String(id));
                } catch (err) {
                    console.warn(`No se pudo eliminar ${id} de la nube ahora; se reintentará.`, err.message);
                }
            }
            const remaining = pendingDeletes.filter(id => !done.includes(String(id)));
            await saveSetting('deleted_ids', remaining);
        }

        // ── PASO 2: Descargar todos los registros de la nube ──────────────
        const { data: cloudItems, error: fetchError } = await supabaseClient
            .from('transactions')
            .select('*');
        if (fetchError) throw fetchError;

        // ── PASO 3: Obtener registros locales ──────────────────────────────
        const localItems = await getAllExpenses();

        const cloudMap    = new Map((cloudItems || []).map(item  => [String(item.id), item]));
        const localMap    = new Map(localItems.map(item => [String(item.id), item]));
        const knownIds    = new Set((await getSetting('synced_cloud_ids', [])).map(id => String(id)));
        const nextKnownIds = new Set(cloudMap.keys());

        const stillPendingDelete = new Set((await getSetting('deleted_ids', [])).map(id => String(id)));

        // ── PASO 4: Nube → Local (Last-Write-Wins) ──────────────────────────
        for (const cloudItem of (cloudItems || [])) {
            const cloudIdStr = String(cloudItem.id);

            if (stillPendingDelete.has(cloudIdStr)) {
                console.log(`Ignorado (borrado local pendiente): ${cloudIdStr}`);
                continue;
            }

            const localItem = localMap.get(cloudIdStr);
            const cloudUpdatedAt = cloudItem.updated_at ? new Date(cloudItem.updated_at).getTime() : 0;
            const localUpdatedAt = localItem && localItem.updated_at ? new Date(localItem.updated_at).getTime() : 0;

            const mappedItem = {
                id:         cloudIdStr,
                amount:     Number(cloudItem.amount),
                desc:       cloudItem.description || cloudItem.desc || '',
                category:   cloudItem.category || 'Otros',
                date:       cloudItem.date,
                type:       cloudItem.type || (['Juni', 'Isa'].includes(cloudItem.category) ? 'ingreso' : 'gasto'),
                updated_at: cloudItem.updated_at || new Date().toISOString()
            };

            if (!localItem) {
                await addExpense(mappedItem);
                console.log(`Descargado de la nube (nuevo): ${mappedItem.id}`);
            } else {
                // Last-Write-Wins: Solo actualizar localmente si la versión de la nube es más reciente o si difieren los valores básicos
                const cloudIsNewer = cloudUpdatedAt > localUpdatedAt;
                const isDifferent =
                    Number(localItem.amount) !== mappedItem.amount ||
                    String(localItem.desc || '').trim() !== String(mappedItem.desc || '').trim() ||
                    localItem.category !== mappedItem.category ||
                    localItem.date !== mappedItem.date ||
                    (localItem.type || '') !== mappedItem.type;

                if (cloudIsNewer || (isDifferent && cloudUpdatedAt >= localUpdatedAt)) {
                    await updateExpense(mappedItem);
                    console.log(`Actualizado localmente desde la nube (Last-Write-Wins): ${mappedItem.id}`);
                }
            }
        }

        // ── PASO 5: Local → Nube (Registros nuevos locales) ────────────────
        for (const localItem of localItems) {
            const localIdStr = String(localItem.id);
            if (cloudMap.has(localIdStr)) continue;

            if (knownIds.has(localIdStr)) {
                await deleteExpense(localItem.id);
                console.log(`Eliminado localmente (borrado en otro dispositivo): ${localItem.id}`);
            } else {
                try {
                    await uploadToSupabase(localItem);
                    nextKnownIds.add(localIdStr);
                    console.log(`Subido a la nube (nuevo local): ${localItem.id}`);
                } catch (err) {
                    console.warn(`No se pudo subir ${localItem.id}; se reintentará.`, err.message);
                }
            }
        }

        // ── PASO 6: Persistir IDs conocidos y actualizar insignia ──────────
        await saveSetting('synced_cloud_ids', [...nextKnownIds]);
        updateSyncBadge(true, 0);

        console.log('✅ Sincronización completada.');
        isSyncing = false;
        return true;
    } catch (err) {
        console.error('Error durante la sincronización:', err);
        isSyncing = false;
        throw err;
    }
}

