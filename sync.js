// Sincronización con Supabase (Cloud Sync)
let supabaseClient = null;
let isSyncing = false;

// ─── Inicializar / Configurar ──────────────────────────────────────────────

async function initSupabase() {
    const url = await getSetting('supabase_url', '');
    const key = await getSetting('supabase_key', '');
    if (url && key) {
        try {
            supabaseClient = supabase.createClient(url, key);
            updateSyncBadge(true);
            return true;
        } catch (err) {
            console.error('Error al inicializar Supabase:', err);
            updateSyncBadge(false);
            return false;
        }
    }
    updateSyncBadge(false);
    return false;
}

function updateSyncBadge(connected) {
    const btn = document.getElementById('btn-sync-settings');
    const dot = document.getElementById('sync-active-dot');
    if (!btn) return;
    btn.classList.toggle('connected', connected);
    if (dot) dot.style.display = connected ? 'block' : 'none';
}

async function saveSupabaseConfig(url, key) {
    const previousUrl = await getSetting('supabase_url', '');
    const previousKey = await getSetting('supabase_key', '');
    // Si cambia la instancia, reseteamos los IDs conocidos para evitar falsos borrados.
    if (previousUrl !== url || previousKey !== key) {
        await saveSetting('synced_cloud_ids', []);
    }
    await saveSetting('supabase_url', url);
    await saveSetting('supabase_key', key);
    return initSupabase();
}

async function disconnectSupabase() {
    await saveSetting('supabase_url', '');
    await saveSetting('supabase_key', '');
    await saveSetting('synced_cloud_ids', []);
    supabaseClient = null;
    updateSyncBadge(false);
}

// ─── Operaciones cloud (lanzan error al llamador) ──────────────────────────

async function uploadToSupabase(expense) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('transactions').upsert({
        id:          String(expense.id),
        amount:      Number(expense.amount),
        description: expense.desc,
        category:    expense.category,
        date:        expense.date,
        type:        expense.type
    });
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

// ─── Sincronización bidireccional ──────────────────────────────────────────
//
// Flujo de sincronización:
//   1. Enviar a la nube las eliminaciones pendientes offline.
//   2. Descargar todos los registros de la nube.
//   3. Obtener los registros locales.
//   4. Nube → Local: agregar o actualizar lo que vino de la nube.
//      EXCEPCIÓN: no re-agregar IDs que el usuario borró localmente pero cuya
//      eliminación en la nube aún está en la cola (evita que el item vuelva
//      a aparecer al recargar).
//   5. Local → Resolver: si un ID ya había sido confirmado en la nube y ahora
//      ya no está, fue borrado desde otro dispositivo → borrarlo localmente.
//      Si nunca fue confirmado, es un registro nuevo → subirlo.
//   6. Persistir la lista de IDs confirmados en la nube para el paso 5 futuro.

async function syncWithSupabase() {
    if (!supabaseClient || isSyncing) return false;
    isSyncing = true;
    console.log('Iniciando sincronización con Supabase…');

    try {
        // ── PASO 1: Enviar eliminaciones pendientes offline ────────────────
        const pendingDeletes = await getSetting('deleted_ids', []);
        if (pendingDeletes.length > 0) {
            console.log('Eliminaciones pendientes offline:', pendingDeletes);
            const done = [];
            for (const id of pendingDeletes) {
                try {
                    await deleteFromSupabase(id);
                    done.push(id);
                } catch (err) {
                    console.warn(`No se pudo eliminar ${id} de la nube ahora; se reintentará.`, err.message);
                }
            }
            // Solo quitar de la cola los que SÍ se eliminaron con éxito
            const remaining = pendingDeletes.filter(id => !done.includes(id));
            await saveSetting('deleted_ids', remaining);
        }

        // ── PASO 2: Descargar todos los registros de la nube ──────────────
        const { data: cloudItems, error: fetchError } = await supabaseClient
            .from('transactions')
            .select('*');
        if (fetchError) throw fetchError;

        // ── PASO 3: Obtener registros locales ──────────────────────────────
        const localItems = await getAllExpenses();

        const cloudMap    = new Map(cloudItems.map(item  => [String(item.id),  item]));
        const localMap    = new Map(localItems.map(item  => [String(item.id),  item]));
        const knownIds    = new Set(await getSetting('synced_cloud_ids', []));
        const nextKnownIds = new Set(cloudMap.keys());

        // IDs que el usuario borró localmente pero cuya eliminación en la nube
        // aún no llegó (quedaron en la cola después del paso 1).
        const stillPendingDelete = new Set(await getSetting('deleted_ids', []));

        // ── PASO 4: Nube → Local ───────────────────────────────────────────
        for (const cloudItem of cloudItems) {
            const cloudIdStr = String(cloudItem.id);

            // No re-agregar un item que el usuario ya borró localmente
            // y cuya eliminación en la nube aún está pendiente.
            if (stillPendingDelete.has(cloudIdStr)) {
                console.log(`Ignorado (borrado local pendiente): ${cloudIdStr}`);
                continue;
            }

            const localItem = localMap.get(cloudIdStr);
            const mappedItem = {
                id:       cloudItem.id,
                amount:   Number(cloudItem.amount),
                desc:     cloudItem.description || '',
                category: cloudItem.category,
                date:     cloudItem.date,
                type:     cloudItem.type
            };

            if (!localItem) {
                await addExpense(mappedItem);
                console.log(`Descargado de la nube (nuevo): ${mappedItem.id}`);
            } else {
                const isDifferent =
                    Number(localItem.amount) !== mappedItem.amount ||
                    localItem.desc           !== mappedItem.desc     ||
                    localItem.category       !== mappedItem.category ||
                    localItem.date           !== mappedItem.date     ||
                    localItem.type           !== mappedItem.type;
                if (isDifferent) {
                    await updateExpense(mappedItem);
                    console.log(`Actualizado localmente desde la nube: ${mappedItem.id}`);
                }
            }
        }

        // ── PASO 5: Local → Resolver ───────────────────────────────────────
        for (const localItem of localItems) {
            const localIdStr = String(localItem.id);
            if (cloudMap.has(localIdStr)) continue; // ya procesado en paso 4

            if (knownIds.has(localIdStr)) {
                // Estaba en la nube antes y ahora no → otro dispositivo lo borró
                await deleteExpense(localItem.id);
                console.log(`Eliminado localmente (borrado en otro dispositivo): ${localItem.id}`);
            } else {
                // Nunca estuvo en la nube → es un registro nuevo, subirlo
                try {
                    await uploadToSupabase(localItem);
                    nextKnownIds.add(localIdStr);
                    console.log(`Subido a la nube (nuevo local): ${localItem.id}`);
                } catch (err) {
                    console.warn(`No se pudo subir ${localItem.id}; se reintentará.`, err.message);
                }
            }
        }

        // ── PASO 6: Persistir IDs conocidos ───────────────────────────────
        await saveSetting('synced_cloud_ids', [...nextKnownIds]);

        console.log('✅ Sincronización completada.');
        isSyncing = false;
        return true;
    } catch (err) {
        console.error('Error durante la sincronización:', err);
        isSyncing = false;
        throw err;
    }
}
