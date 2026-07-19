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
                const expenseStore = database.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
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

// Obtener una configuración por su clave
function getSetting(key, defaultValue) {
    return new Promise((resolve) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(key);

        request.onsuccess = (event) => {
            if (event.target.result) {
                resolve(event.target.result.value);
            } else {
                // Guardar valor inicial si no existe
                saveSetting(key, defaultValue).then(() => resolve(defaultValue));
            }
        };

        request.onerror = () => {
            resolve(defaultValue); // Retorna default en caso de error
        };
    });
}

// Guardar configuración genérica
function saveSetting(key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put({ key: key, value: value });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Obtener todos los gastos de la DB
function getAllExpenses() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readonly');
        const store = transaction.objectStore('expenses');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Agregar gasto/ingreso a IndexedDB
function addExpense(expense) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.add(expense);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Actualizar gasto/ingreso en IndexedDB
function updateExpense(expense) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.put(expense);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Borrar gasto en IndexedDB
function deleteExpense(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Limpiar base de datos (Promesa interna)
function clearDatabase() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses', 'settings'], 'readwrite');
        const expenseStore = transaction.objectStore('expenses');
        const settingsStore = transaction.objectStore('settings');
        
        const req1 = expenseStore.clear();
        const req2 = settingsStore.clear();
        
        let successCount = 0;
        const checkSuccess = () => {
            successCount++;
            if (successCount === 2) resolve();
        };
        
        req1.onsuccess = checkSuccess;
        req2.onsuccess = checkSuccess;
        
        req1.onerror = (e) => reject(e.target.error);
        req2.onerror = (e) => reject(e.target.error);
    });
}

