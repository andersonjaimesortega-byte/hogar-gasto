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
    await saveSetting('supabase_url', url);
    await saveSetting('supabase_key', key);
    return await initSupabase();
}

// Desconectar Supabase
async function disconnectSupabase() {
    await saveSetting('supabase_url', '');
    await saveSetting('supabase_key', '');
    supabaseClient = null;
    updateSyncBadge(false);
}

// Subir una transacción individual (Upsert)
async function uploadToSupabase(expense) {
    if (!supabaseClient) return;
    try {
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
        console.log(`Sincronizado con éxito en la nube: ${expense.id}`);
    } catch (err) {
        console.error('Error al subir a Supabase:', err);
    }
}

// Borrar una transacción de Supabase
async function deleteFromSupabase(id) {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient
            .from('transactions')
            .delete()
            .eq('id', String(id));
            
        if (error) throw error;
        console.log(`Eliminado con éxito de la nube: ${id}`);
    } catch (err) {
        console.error('Error al eliminar de Supabase:', err);
    }
}

// Sincronización bidireccional completa
async function syncWithSupabase() {
    if (!supabaseClient || isSyncing) return false;
    isSyncing = true;
    console.log('Iniciando sincronización con Supabase...');
    
    try {
        // 1. Procesar eliminaciones locales acumuladas mientras se estuvo offline
        const deletedIds = await getSetting('deleted_ids', []);
        if (deletedIds.length > 0) {
            console.log('Procesando eliminaciones offline pendientes:', deletedIds);
            for (const id of deletedIds) {
                await deleteFromSupabase(id);
            }
            await saveSetting('deleted_ids', []); // Vaciar la lista de eliminaciones
        }
        
        // 2. Traer todos los registros de la nube
        const { data: cloudItems, error } = await supabaseClient
            .from('transactions')
            .select('*');
            
        if (error) throw error;
        
        // 3. Traer todos los registros locales de IndexedDB
        const localItems = await getAllExpenses();
        
        const cloudMap = new Map(cloudItems.map(item => [item.id, item]));
        const localMap = new Map(localItems.map(item => [String(item.id), item]));
        
        // 4. Sincronizar de la nube hacia local (Pulls / Updates)
        for (const cloudItem of cloudItems) {
            const localItem = localMap.get(cloudItem.id);
            
            // Mapear campos de base de datos relacional a IndexedDB
            const mappedItem = {
                id: cloudItem.id, // Guardar el string ID
                amount: Number(cloudItem.amount),
                desc: cloudItem.description || '',
                category: cloudItem.category,
                date: cloudItem.date,
                type: cloudItem.type
            };
            
            if (!localItem) {
                // Si no existe localmente, lo agregamos a IndexedDB
                await addExpense(mappedItem);
                console.log(`Agregado localmente desde la nube: ${mappedItem.id}`);
            } else {
                // Si existe pero es diferente, actualizamos localmente
                const isDifferent = Number(localItem.amount) !== mappedItem.amount ||
                                    localItem.desc !== mappedItem.desc ||
                                    localItem.category !== mappedItem.category ||
                                    localItem.date !== mappedItem.date ||
                                    localItem.type !== mappedItem.type;
                                    
                if (isDifferent) {
                    await updateExpense(mappedItem);
                    console.log(`Actualizado localmente desde la nube: ${mappedItem.id}`);
                }
            }
        }
        
        // 5. Sincronizar de local hacia la nube (Pushes)
        for (const localItem of localItems) {
            const localIdStr = String(localItem.id);
            if (!cloudMap.has(localIdStr)) {
                // Si el item local no está en la nube, lo subimos
                await uploadToSupabase(localItem);
                console.log(`Subido a la nube: ${localItem.id}`);
            }
        }
        
        console.log('Sincronización completada con éxito.');
        isSyncing = false;
        return true;
    } catch (err) {
        console.error('Error durante la sincronización:', err);
        isSyncing = false;
        throw err;
    }
}
