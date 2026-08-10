// Formateador para pesos colombianos (COP)
const formatCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

// Colores de las categorías correspondientes al tema Navy Blue, Verde Esmeralda y Dorado
const categoryColors = {
    'Mercado': '#d97706',           // Dorado Cálido
    'D1': '#e11d48',                // Carmín
    'Servicios Públicos': '#0f2a4a',// Navy Blue Imperial
    'Arriendo': '#047857',          // Verde Esmeralda Oscuro
    'Casa': '#10b981',              // Verde Esmeralda Vivo
    'Carne': '#c05621',              // Cobre Cálido
    'Internet': '#2563eb',          // Azul Marino
    'Gas': '#f59e0b',               // Dorado Ámbar
    'Otros': '#64748b',              // Gris Pizarra
    'Juni': '#0f2a4a',              // Navy Blue
    'Isa': '#059669'                // Verde Esmeralda
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
        case 'Juni': return 'cat-icon-juni';
        case 'Isa': return 'cat-icon-isa';
        default: return 'cat-icon-otros';
    }
}

// Formatear string YYYY-MM-DD a fecha legible en español sin desfase UTC
function formatDateString(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    
    return dateObj.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Obtener fecha de hoy en formato YYYY-MM-DD local
function getTodayStr() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Obtener mes actual en formato YYYY-MM local
function getCurrentMonthStr() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Sanitizar string HTML para prevenir XSS
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
