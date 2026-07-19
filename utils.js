// Formateador para pesos colombianos (COP)
const formatCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

// Colores de las categorías correspondientes al CSS
const categoryColors = {
    'Mercado': '#f59e0b',
    'D1': '#ef4444',
    'Servicios Públicos': '#0ea5e9',
    'Arriendo': '#3b82f6',
    'Casa': '#10b981',
    'Carne': '#f43f5e',
    'Internet': '#6366f1',
    'Gas': '#f97316',
    'Otros': '#6b7280',
    'Juni': '#a855f7',
    'Isa': '#ec4899'
};

// Emojis de las categorías
const categoryEmojis = {
    'Mercado': '🛒',
    'D1': '🔴',
    'Servicios Públicos': '⚡',
    'Arriendo': '🏠',
    'Casa': '🏡',
    'Carne': '🥩',
    'Internet': '🌐',
    'Gas': '🔥',
    'Otros': '⚙️',
    'Juni': '🙋‍♂️',
    'Isa': '🙋‍♀️'
};

// Retornar clase CSS para los colores de las categorías
function getCategoryIconClass(cat) {
    switch (cat) {
        case 'Mercado': return 'cat-icon-mercado';
        case 'D1': return 'cat-icon-d1';
        case 'Servicios Públicos': return 'cat-icon-servicios';
        case 'Arriendo': return 'cat-icon-arriendo';
        case 'Casa': return 'cat-icon-casa';
        case 'Carne': return 'cat-icon-carne';
        case 'Internet': return 'cat-icon-internet';
        case 'Gas': return 'cat-icon-gas';
        default: return 'cat-icon-otros';
    }
}

// Formatear la fecha para visualización elegante (ej. "12 Jul 2026")
function formatDateString(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(year, parseInt(month) - 1, day);
    
    return dateObj.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Escapar cadenas HTML para prevenir XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Ayudante para obtener la fecha de hoy en formato local 'YYYY-MM-DD'
function getTodayStr() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Ayudante para obtener el mes actual en formato 'YYYY-MM'
function getCurrentMonthStr() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}
