// Configuración de la Base de Datos Local IndexedDB
const DB_NAME = 'HogarGastoDB';
const DB_VERSION = 1;
let db = null;

// Inicialización de la base de datos
function initDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Almacén de gastos
            if (!database.objectStoreNames.contains('expenses')) {
                const expenseStore = database.createObjectStore('expenses', { keyPath: 'id' });
                expenseStore.createIndex('date', 'date', { unique: false });
                expenseStore.createIndex('category', 'category', { unique: false });
            }
            
            // Almacén de configuraciones (ej: presupuesto)
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Asegurar que db esté inicializado antes de operar
async function getDB() {
    if (db) return db;
    return await initDB();
}

// Obtener una configuración por su clave
async function getSetting(key, defaultValue) {
    try {
        const database = await getDB();
        return new Promise((resolve) => {
            const transaction = database.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = (event) => {
                if (event.target.result !== undefined && event.target.result.value !== undefined) {
                    resolve(event.target.result.value);
                } else {
                    saveSetting(key, defaultValue).then(() => resolve(defaultValue));
                }
            };

            request.onerror = () => resolve(defaultValue);
        });
    } catch (err) {
        return defaultValue;
    }
}

// Guardar configuración genérica
async function saveSetting(key, value) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put({ key: key, value: value });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Obtener todos los gastos de la DB
async function getAllExpenses() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['expenses'], 'readonly');
        const store = transaction.objectStore('expenses');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Agregar gasto/ingreso a IndexedDB (normalizando id a String)
async function addExpense(expense) {
    const database = await getDB();
    const normalizedExpense = {
        ...expense,
        id: String(expense.id),
        type: expense.type || (['Juni', 'Isa'].includes(expense.category) ? 'ingreso' : 'gasto'),
        updated_at: expense.updated_at || new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.add(normalizedExpense);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Actualizar gasto/ingreso en IndexedDB (normalizando id a String)
async function updateExpense(expense) {
    const database = await getDB();
    const normalizedExpense = {
        ...expense,
        id: String(expense.id),
        type: expense.type || (['Juni', 'Isa'].includes(expense.category) ? 'ingreso' : 'gasto'),
        updated_at: expense.updated_at || new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.put(normalizedExpense);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Borrar gasto en IndexedDB probando tanto tipo String como Number para evitar huérfanos
async function deleteExpense(id) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        
        const stringId = String(id);
        store.delete(stringId);
        if (!isNaN(Number(id))) {
            store.delete(Number(id));
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

// Migración y sanitización automática del esquema de la BD local al iniciar
async function migrateDB() {
    try {
        const database = await getDB();
        const allItems = await getAllExpenses();
        if (!allItems || allItems.length === 0) return;

        const seenIds = new Set();
        const itemsToSave = [];
        const keysToDelete = [];

        for (const item of allItems) {
            const rawId = item.id;
            const strId = String(rawId);

            if (typeof rawId === 'number') {
                keysToDelete.push(rawId);
            }

            if (!seenIds.has(strId)) {
                seenIds.add(strId);
                const normalized = {
                    ...item,
                    id: strId,
                    type: item.type || (['Juni', 'Isa'].includes(item.category) ? 'ingreso' : 'gasto'),
                    updated_at: item.updated_at || new Date().toISOString(),
                    desc: item.desc || item.description || ''
                };
                itemsToSave.push(normalized);
            }
        }

        return new Promise((resolve, reject) => {
            const tx = database.transaction(['expenses'], 'readwrite');
            const store = tx.objectStore('expenses');

            keysToDelete.forEach(k => store.delete(k));
            itemsToSave.forEach(item => store.put(item));

            tx.oncomplete = () => {
                console.log('✅ Migración de base de datos local completada con éxito.');
                resolve();
            };
            tx.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.warn('Advertencia durante la migración de IndexedDB:', err);
    }
}

// Limpiar base de datos
async function clearDatabase() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['expenses', 'settings'], 'readwrite');
        const expenseStore = transaction.objectStore('expenses');
        const settingsStore = transaction.objectStore('settings');
        
        expenseStore.clear();
        settingsStore.clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(e.target.error);
    });
}

