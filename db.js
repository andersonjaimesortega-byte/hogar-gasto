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

// Agregar gasto/ingreso a IndexedDB
async function addExpense(expense) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.add(expense);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Actualizar gasto/ingreso en IndexedDB
async function updateExpense(expense) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.put(expense);

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
        
        // Intentar borrar con el ID original y sus variantes tipo string/number
        store.delete(id);
        if (typeof id === 'string' && !isNaN(Number(id))) {
            store.delete(Number(id));
        } else if (typeof id === 'number') {
            store.delete(String(id));
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
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
