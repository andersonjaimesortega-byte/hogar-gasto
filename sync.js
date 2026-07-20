// Sincronización con Supabase (Cloud Sync)
let supabaseClient = null;
let isSyncing = false;

// Inicializar el cliente de Supabase
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

// Actualizar el estado visual del botón de la nube
function updateSyncBadge(connected) {
    const btn = document.getElementById('btn-sync-settings');
    const dot = document.getElementById('sync-active-dot');
    if (!btn) return;
    
    if (connected) {
        btn.classList.add('connected');
        if (dot) dot.style.display = 'block';
    } else {
        btn.classList.remove('connected');
        if (dot) dot.style.display = 'none';
    }
}

// Guardar credenciales de Supabase
async function saveSupabaseConfig(url, key) {
    const previousUrl = await getSetting('supabase_url', '');
    const previousKey = await getSetting('supabase_key', '');

    // Los IDs confirmados pertenecen a una instancia concreta de Supabase.
    // No deben reutilizarse si la persona conecta otra base de datos.
    if (previousUrl !== url || previousKey !== key) {
        await saveSetting('synced_cloud_ids', []);
    }
    await saveSetting('supabase_url', url);
    await saveSetting('supabase_key', key);
    return await initSupabase();
}

// Desconectar Supabase
async function disconnectSupabase() {
    await saveSetting('supabase_url', '');
    await saveSetting('supabase_key', '');
    await saveSetting('synced_cloud_ids', []);
    supabaseClient = null;
    updateSyncBadge(false);
}

// Subir una transacción individual (Upsert)
// Lanza error si falla para que el llamador pueda manejarlo
async function uploadToSupabase(expense) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient
        .from('transactions')
        .upsert({
            id: String(expense.id),
            amount: Number(expense.amount),
            description: expense.desc,
            category: expense.category,
            date: expense.date,
            type: expense.type
        });
    if (error) throw error;
    console.log(`Sincronizado en la nube: ${expense.id}`);
}

// Borrar una transacción de Supabase
// Lanza error si falla para que el llamador pueda manejarlo
async function deleteFromSupabase(id) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient
        .from('transactions')
        .delete()
        .eq('id', String(id));
    if (error) throw error;
    console.log(`Eliminado de la nube: ${id}`);
}

// Sincronización bidireccional completa
async function syncWithSupabase() {
    if (!supabaseClient || isSyncing) return false;
    isSyncing = true;
    console.log('Iniciando sincronización con Supabase...');
    
    try {
        // PASO 1: Enviar a la nube las eliminaciones que ocurrieron offline
        const pendingDeletedIds = await getSetting('deleted_ids', []);
        if (pendingDeletedIds.length > 0) {
            console.log('Procesando eliminaciones offline pendientes:', pendingDeletedIds);
            const successfullyDeleted = [];
            for (const id of pendingDeletedIds) {
                try {
                    await deleteFromSupabase(id);
                    successfullyDeleted.push(id);
                } catch (err) {
                    // Si falla uno, se deja en la cola para el próximo intento
                    console.warn(`No se pudo eliminar ${id} de la nube, se intentará después:`, err.message);
                }
            }
            // Solo limpiar de la cola los que SÍ se borraron con éxito
            const remaining = pendingDeletedIds.filter(id => !successfullyDeleted.includes(id));
            await saveSetting('deleted_ids', remaining);
        }

        // PASO 2: Obtener todos los registros de la nube.
        const { data: cloudItems, error: fetchError } = await supabaseClient
            .from('transactions')
            .select('*');
        if (fetchError) throw fetchError;

        // PASO 3: Obtener todos los registros locales actuales
        const localItems = await getAllExpenses();

        // Crear mapas para búsqueda rápida O(1)
        const cloudMap = new Map(cloudItems.map(item => [String(item.id), item]));
        const localMap = new Map(localItems.map(item => [String(item.id), item]));
        // Solo un ID visto en una sincronización anterior puede considerarse
        // eliminado remotamente. Un ID local desconocido debe subirse, nunca
        // borrarse: así se protege el trabajo hecho sin conexión.
        const knownCloudIds = new Set(await getSetting('synced_cloud_ids', []));
        const nextKnownCloudIds = new Set(cloudMap.keys());

        // PASO 4: Nube → Local: agregar o actualizar registros que vinieron de la nube
        for (const cloudItem of cloudItems) {
            const cloudIdStr = String(cloudItem.id);
            const localItem = localMap.get(cloudIdStr);

            const mappedItem = {
                id: cloudItem.id,
                amount: Number(cloudItem.amount),
                desc: cloudItem.description || '',
                category: cloudItem.category,
                date: cloudItem.date,
                type: cloudItem.type
            };

            if (!localItem) {
                // No existe localmente: agregarlo
                await addExpense(mappedItem);
                console.log(`Descargado de la nube (nuevo): ${mappedItem.id}`);
            } else {
                // Existe localmente: actualizar si hay diferencias
                const isDifferent =
                    Number(localItem.amount) !== mappedItem.amount ||
                    localItem.desc        !== mappedItem.desc     ||
                    localItem.category    !== mappedItem.category ||
                    localItem.date        !== mappedItem.date     ||
                    localItem.type        !== mappedItem.type;

                if (isDifferent) {
                    await updateExpense(mappedItem);
                    console.log(`Actualizado localmente desde la nube: ${mappedItem.id}`);
                }
            }
        }

        // PASO 5: Resolver los elementos locales que no están en la nube.
        // Un registro ya confirmado que desaparece de la nube fue borrado en
        // otro dispositivo; uno desconocido todavía está pendiente de subida.
        for (const localItem of localItems) {
            const localIdStr = String(localItem.id);
            if (!cloudMap.has(localIdStr)) {
                if (knownCloudIds.has(localIdStr)) {
                    await deleteExpense(localItem.id);
                    console.log(`Eliminado localmente (borrado desde otro dispositivo): ${localItem.id}`);
                } else {
                    try {
                        await uploadToSupabase(localItem);
                        nextKnownCloudIds.add(localIdStr);
                        console.log(`Subido a la nube (pendiente local): ${localItem.id}`);
                    } catch (err) {
                        // Se conserva localmente para reintentar en la próxima sincronización.
                        console.warn(`No se pudo subir ${localItem.id} a la nube:`, err.message);
                    }
                }
            }
        }

        await saveSetting('synced_cloud_ids', [...nextKnownCloudIds]);

        console.log('✅ Sincronización completada con éxito.');
        isSyncing = false;
        return true;
    } catch (err) {
        console.error('Error durante la sincronización:', err);
        isSyncing = false;
        throw err;
    }
}
