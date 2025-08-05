/**
 * Gestor de Interfaz de Usuario
 * Maneja interacciones UI, modales, tabs y navegación
 */
class UIManager {
    constructor(notificationSystem, sessionManager) {
        this.notifications = notificationSystem;
        this.sessionManager = sessionManager;
        
        // Estado UI
        this.currentMode = 'record'; // 'record' | 'upload'
        this.currentTab = 'transcription'; // 'transcription' | 'summary' | 'actions'
        
        // Elementos DOM
        this.modeTabs = document.querySelectorAll('.mode-tab');
        this.resultsTabs = document.querySelectorAll('.results-tab');
        this.recordingPanel = document.getElementById('recordingPanel');
        this.uploadPanel = document.getElementById('uploadPanel');
        this.resultsContents = document.querySelectorAll('.results-content');
        
        // Modal
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.newSessionModal = document.getElementById('newSessionModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.cancelModalBtn = document.getElementById('cancelModalBtn');
        this.createSessionBtn = document.getElementById('createSessionBtn');
        
        // Export
        this.exportBtn = document.getElementById('exportBtn');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setInitialState();
    }

    bindEvents() {
        // Mode tabs (Grabar / Subir)
        this.modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchMode(tab.dataset.mode);
            });
        });

        // Results tabs
        this.resultsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.dataset.tab === 'summary') {
                    this.goToAnalysisPage();
                } else {
                    this.switchResultsTab(tab.dataset.tab);
                }
            });
        });

        // Modal nueva sesión
        this.newSessionBtn.addEventListener('click', () => this.openNewSessionModal());
        this.closeModalBtn.addEventListener('click', () => this.closeNewSessionModal());
        this.cancelModalBtn.addEventListener('click', () => this.closeNewSessionModal());
        this.createSessionBtn.addEventListener('click', () => this.createNewSession());

        // Export
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportSession());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Click fuera del modal para cerrar
        this.newSessionModal.addEventListener('click', (e) => {
            if (e.target === this.newSessionModal) {
                this.closeNewSessionModal();
            }
        });
    }

    setInitialState() {
        console.log('🎯 UIManager: Configurando estado inicial...');
        
        // Asegurar que el panel de grabación esté visible
        this.recordingPanel.classList.remove('hidden');
        this.uploadPanel.classList.add('hidden');
        
        // Activar tabs correctos
        this.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === 'record');
        });
        
        this.switchMode('record');
        this.switchResultsTab('transcription');
        
        console.log('✅ UIManager: Estado inicial configurado - Modo grabación activo');
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // Actualizar tabs
        this.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });
        
        // Mostrar/ocultar panels
        if (mode === 'record') {
            this.recordingPanel.classList.remove('hidden');
            this.uploadPanel.classList.add('hidden');
        } else {
            this.recordingPanel.classList.add('hidden');
            this.uploadPanel.classList.remove('hidden');
        }
        
        // Solo mostrar notificación si es un cambio manual
        if (this.currentMode !== mode) {
            this.notifications.info(`Modo ${mode === 'record' ? 'grabación' : 'subida'} activado`);
        }
    }

    switchResultsTab(tab) {
        this.currentTab = tab;
        
        // Actualizar tabs
        this.resultsTabs.forEach(tabEl => {
            tabEl.classList.toggle('active', tabEl.dataset.tab === tab);
        });
        
        // Mostrar/ocultar contenido
        this.resultsContents.forEach(content => {
            const contentId = content.id;
            const shouldShow = contentId.includes(tab);
            content.classList.toggle('hidden', !shouldShow);
        });
    }

    openNewSessionModal() {
        this.newSessionModal.classList.remove('hidden');
        document.getElementById('modalTitle').focus();
    }

    closeNewSessionModal() {
        this.newSessionModal.classList.add('hidden');
        this.clearModalForm();
    }

    clearModalForm() {
        document.getElementById('modalTitle').value = '';
        document.getElementById('modalParticipants').value = '';
        document.getElementById('modalCategory').value = 'meeting';
    }

    async createNewSession() {
        const title = document.getElementById('modalTitle').value.trim();
        const participants = document.getElementById('modalParticipants').value.trim();
        const category = document.getElementById('modalCategory').value;

        if (!title) {
            this.notifications.warning('El título es requerido');
            return;
        }

        try {
            const sessionData = {
                title,
                participants,
                category
            };

            await this.sessionManager.createNewSession(sessionData);
            this.closeNewSessionModal();
            
            // Reset de componentes
            this.resetAllComponents();
            
        } catch (error) {
            this.notifications.error('Error al crear la sesión');
        }
    }

    resetAllComponents() {
        // Reset recording manager
        if (window.app && window.app.recordingManager) {
            window.app.recordingManager.reset();
        }
        
        // Reset upload manager
        if (window.app && window.app.uploadManager) {
            window.app.uploadManager.reset();
        }
        
        // Reset transcription manager
        if (window.app && window.app.transcriptionManager) {
            window.app.transcriptionManager.reset();
        }
        
        // Reset UI state
        this.switchMode('record');
        this.switchResultsTab('transcription');
    }

    async exportSession() {
        const session = this.sessionManager.getCurrentSession();
        if (!session) {
            this.notifications.warning('No hay sesión para exportar');
            return;
        }

        try {
            const exportData = {
                title: session.title,
                date: new Date(session.date).toLocaleString(),
                duration: session.duration,
                participants: session.participants,
                transcription: session.transcription || '',
                summary: session.summary || ''
            };

            // Generar contenido para exportar
            const content = this.generateExportContent(exportData);
            
            // Crear y descargar archivo
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.notifications.success('Sesión exportada correctamente');
            
        } catch (error) {
            this.notifications.error('Error al exportar la sesión');
        }
    }

    generateExportContent(data) {
        return `
REUNIÓN: ${data.title}
========================================

📅 Fecha: ${data.date}
⏱️  Duración: ${data.duration}
👥 Participantes: ${data.participants || 'No especificados'}

TRANSCRIPCIÓN
========================================
${data.transcription || 'No disponible'}

RESUMEN/ANÁLISIS
========================================
${data.summary || 'No disponible'}

---
Generado por ReunionAI - Transcriptor Profesional
        `.trim();
    }

    handleKeyboardShortcuts(e) {
        // Cmd/Ctrl + N = Nueva sesión
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            this.openNewSessionModal();
        }
        
        // Escape = Cerrar modal
        if (e.key === 'Escape') {
            this.closeNewSessionModal();
        }
        
        // Cmd/Ctrl + S = Guardar sesión
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            if (window.app && window.app.transcriptionManager) {
                window.app.transcriptionManager.saveCurrentSession();
            }
        }
        
        // Espacibar = Iniciar/Parar grabación (solo si no está en input)
        if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault();
            if (this.currentMode === 'record' && window.app && window.app.recordingManager) {
                const recordingManager = window.app.recordingManager;
                if (recordingManager.isRecording) {
                    recordingManager.stopRecording();
                } else {
                    recordingManager.startRecording();
                }
            }
        }
        
        // Tab navigation para results
        if (e.key >= '1' && e.key <= '3' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            const tabIndex = parseInt(e.key) - 1;
            const tabs = ['transcription', 'summary', 'actions'];
            if (tabs[tabIndex]) {
                this.switchResultsTab(tabs[tabIndex]);
            }
        }
    }

    showLoadingState(message = 'Cargando...') {
        // Podrías agregar un overlay de loading global aquí
        this.notifications.info(message);
    }

    hideLoadingState() {
        // Ocultar overlay de loading
    }

    updateProgress(percent, message) {
        // Actualizar barra de progreso global si existe
        console.log(`Progreso: ${percent}% - ${message}`);
    }

    getCurrentMode() {
        return this.currentMode;
    }

    getCurrentTab() {
        return this.currentTab;
    }

    // Métodos para responsive behavior
    handleResize() {
        const width = window.innerWidth;
        
        if (width < 768) {
            // Mobile adaptations
            this.adaptForMobile();
        } else {
            // Desktop adaptations
            this.adaptForDesktop();
        }
    }

    goToAnalysisPage() {
        // Verificar si hay transcripción disponible en múltiples fuentes
        const transcriptionManager = window.app?.transcriptionManager;
        const transcriptionTextarea = document.getElementById('transcriptionResult');
        
        let transcriptionText = '';
        
        // Prioridad 1: TranscriptionManager
        if (transcriptionManager?.currentTranscription?.trim()) {
            transcriptionText = transcriptionManager.currentTranscription;
        }
        // Prioridad 2: Textarea de transcripción (para sesiones cargadas)
        else if (transcriptionTextarea?.value?.trim()) {
            transcriptionText = transcriptionTextarea.value.trim();
            // Actualizar el manager también
            if (transcriptionManager) {
                transcriptionManager.currentTranscription = transcriptionText;
            }
        }
        
        if (!transcriptionText) {
            this.notifications.warning('Primero necesitas transcribir el audio');
            return;
        }

        // Guardar transcripción en localStorage para la página de análisis
        localStorage.setItem('currentTranscription', transcriptionText);
        
        // Guardar info de la sesión actual
        const currentSession = this.sessionManager.getCurrentSession();
        if (currentSession) {
            localStorage.setItem('currentSessionTitle', currentSession.title);
            localStorage.setItem('currentSessionId', currentSession.id);
        }
        
        // Navegar a la página de análisis
        window.location.href = '/resumen';
    }

    adaptForMobile() {
        // Implementar adaptaciones móviles si es necesario
    }

    adaptForDesktop() {
        // Implementar adaptaciones desktop si es necesario
    }
}

// Event listener para resize
window.addEventListener('resize', () => {
    if (window.app && window.app.uiManager) {
        window.app.uiManager.handleResize();
    }
});