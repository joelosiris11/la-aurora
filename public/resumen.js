/**
 * Script principal para la página de análisis
 */

// Aplicación principal
class AnalysisApp {
    constructor() {
        this.notificationSystem = null;
        this.analysisManager = null;
    }

    async init() {
        try {
            console.log('🔬 Iniciando LA AURORA - Análisis de Reuniones...');
            
            // Crear instancias de los managers
            this.notificationSystem = new NotificationSystem();
            this.analysisManager = new AnalysisManager(this.notificationSystem);
            
            // Configurar event listeners globales
            this.setupGlobalEvents();
            
            // Mostrar mensaje de éxito
            this.notificationSystem.success('✅ Sistema de análisis listo');
            
            console.log('🎉 Sistema de análisis iniciado correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar el sistema de análisis:', error);
            if (this.notificationSystem) {
                this.notificationSystem.error('Error al inicializar el sistema de análisis');
            }
        }
    }

    setupGlobalEvents() {
        // Error handler global
        window.addEventListener('error', (event) => {
            console.error('Error global:', event.error);
            this.notificationSystem.error('Ha ocurrido un error inesperado');
        });

        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promise rejection no manejada:', event.reason);
            this.notificationSystem.error('Error de conexión o procesamiento');
        });

        // Antes de cerrar la página
        window.addEventListener('beforeunload', (event) => {
            // Limpiar localStorage temporal si es necesario
            localStorage.removeItem('currentTranscription');
        });
    }

    cleanup() {
        console.log('🧹 Limpiando recursos del sistema de análisis...');
        // Limpiar recursos si es necesario
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Hacer la app disponible globalmente para debugging
    window.analysisApp = new AnalysisApp();
    
    // Inicializar la aplicación
    await window.analysisApp.init();
});

// Debugging helpers (solo en desarrollo)
if (window.location.hostname === 'localhost') {
    window.debug = {
        app: () => window.analysisApp,
        notifications: () => window.analysisApp?.notificationSystem,
        analysis: () => window.analysisApp?.analysisManager,
        clearStorage: () => {
            localStorage.clear();
            console.log('🗑️ localStorage limpiado');
        }
    };
    
    console.log('🔧 Debugging disponible en window.debug');
}