/**
 * Script principal para la interfaz profesional
 * Inicializa todos los componentes y gestiona la aplicación
 */

// Aplicación principal
class ReunionApp {
    constructor() {
        this.notificationSystem = null;
        this.progressStepper = null;
        this.sessionManager = null;
        this.recordingManager = null;
        this.uploadManager = null;
        this.transcriptionManager = null;
        this.uiManager = null;
        this.actionItems = null;
    }

    async init() {
        try {
            console.log('🚀 Iniciando LA AURORA - Sistema de Reuniones Ejecutivas...');
            
            // Crear instancias de los managers en orden de dependencias
            this.notificationSystem = new NotificationSystem();
            this.progressStepper = new ProgressStepper();
            this.sessionManager = new SessionManager(this.notificationSystem, this.progressStepper);
            this.recordingManager = new RecordingManager(this.notificationSystem, this.sessionManager, this.progressStepper);
            this.uploadManager = new UploadManager(this.notificationSystem, this.sessionManager);
            this.transcriptionManager = new TranscriptionManager(this.notificationSystem, this.progressStepper);
            this.uiManager = new UIManager(this.notificationSystem, this.sessionManager);
            this.actionItems = new ActionItemsManager();
            
            // Configurar referencias cruzadas
            this.setupCrossReferences();
            
            // Configurar event listeners globales
            this.setupGlobalEvents();
            
            // Mostrar mensaje de éxito
            this.notificationSystem.success('✅ ReunionAI listo para usar');
            
            console.log('🎉 Sistema iniciado correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar el sistema:', error);
            if (this.notificationSystem) {
                this.notificationSystem.error('Error al inicializar el sistema');
            }
        }
    }

    setupCrossReferences() {
        // Configurar referencias adicionales entre managers
        if (this.recordingManager && this.transcriptionManager) {
            this.recordingManager.transcriptionManager = this.transcriptionManager;
        }
        
        if (this.uploadManager && this.transcriptionManager && this.recordingManager) {
            this.uploadManager.transcriptionManager = this.transcriptionManager;
            this.uploadManager.recordingManager = this.recordingManager;
        }
        
        if (this.transcriptionManager && this.sessionManager) {
            this.transcriptionManager.sessionManager = this.sessionManager;
        }
        
        if (this.uiManager && this.transcriptionManager) {
            this.uiManager.transcriptionManager = this.transcriptionManager;
        }
        
        // Hacer disponibles globalmente para otros componentes
        window.app = this;
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + N = Nueva sesión
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                document.getElementById('newSessionBtn')?.click();
            }
            
            // Spacebar = Iniciar/Detener grabación (solo si no está en input)
            if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                e.preventDefault();
                const startBtn = document.getElementById('startRecordBtn');
                const stopBtn = document.getElementById('stopRecordBtn');
                
                if (startBtn && !startBtn.disabled) {
                    startBtn.click();
                } else if (stopBtn && !stopBtn.disabled) {
                    stopBtn.click();
                }
            }
            
            // Cmd/Ctrl + S = Guardar sesión
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                document.getElementById('saveSessionBtn')?.click();
            }
        });

        // Antes de cerrar la página
        window.addEventListener('beforeunload', (event) => {
            if (this.recordingManager && this.recordingManager.isRecording) {
                event.preventDefault();
                event.returnValue = '¿Estás seguro? Hay una grabación en curso.';
                return event.returnValue;
            }
        });
    }

    cleanup() {
        console.log('🧹 Limpiando recursos del sistema...');
        // Detener grabación si está activa
        if (this.recordingManager && this.recordingManager.isRecording) {
            this.recordingManager.stopRecording();
        }
        
        // Limpiar otros recursos si es necesario
        if (this.sessionManager) {
            // Guardar sesión actual si hay cambios pendientes
        }
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    const app = new ReunionApp();
    await app.init();
});

// Cleanup al cerrar
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.cleanup();
    }
});