let deferredPrompt = null;

// Registro de Service Worker para capacidades PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => {
                    console.log('Service Worker registrado correctamente con scope:', reg.scope);
                })
                .catch(err => {
                    console.warn('El Service Worker no se pudo registrar:', err);
                });
        });
    }
}

// Monitoreo de estado Online/Offline
function checkOnlineStatus(connectionStatusEl, statusTextEl) {
    const updateStatus = () => {
        if (navigator.onLine) {
            connectionStatusEl.className = 'status-badge online';
            statusTextEl.textContent = 'En línea';
        } else {
            connectionStatusEl.className = 'status-badge offline';
            statusTextEl.textContent = 'Modo Offline';
        }
    };
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus(); // Chequeo inicial
}

// Configuración del Prompt de Instalación PWA
function setupInstallPrompt(btnInstall, installPromo, btnPromoInstall) {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Evitar que el navegador muestre su diálogo por defecto
        e.preventDefault();
        deferredPrompt = e;
        
        // Mostrar botones de instalación
        btnInstall.style.display = 'inline-flex';
        installPromo.style.display = 'flex';
    });

    const triggerInstallFlow = async () => {
        if (!deferredPrompt) return;
        
        // Mostrar diálogo de instalación
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Elección de instalación del usuario: ${outcome}`);
        
        // Limpiar el prompt diferido
        deferredPrompt = null;
        btnInstall.style.display = 'none';
        installPromo.style.display = 'none';
    };

    btnInstall.addEventListener('click', triggerInstallFlow);
    btnPromoInstall.addEventListener('click', triggerInstallFlow);

    window.addEventListener('appinstalled', () => {
        console.log('Aplicación instalada con éxito en el sistema.');
        btnInstall.style.display = 'none';
        installPromo.style.display = 'none';
    });
}
