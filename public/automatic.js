/**
 * LA AURORA - Modo Automático
 * Procesamiento completamente automatizado de reuniones
 */

class AutomaticMode {
    constructor() {
        this.notifications = new NotificationSystem();
        this.currentSession = null;
        this.mediaRecorder = null;
        this.audioBlob = null;
        this.isRecording = false;
        this.recordingTimer = null;
        this.recordingStartTime = null;
        
        this.init();
    }

    init() {
        console.log('🚀 Iniciando LA AURORA - Modo Automático');
        
        // Referencias a elementos DOM
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        
        // Pantallas
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.recordingScreen = document.getElementById('recordingScreen');
        this.processingScreen = document.getElementById('processingScreen');
        this.resultsScreen = document.getElementById('resultsScreen');
        
        // Botones principales
        this.startRecordBtn = document.getElementById('startRecordBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.fileInput = document.getElementById('fileInput');
        this.stopRecordBtn = document.getElementById('stopRecordBtn');
        
        // Elementos de grabación
        this.recordingTimer = document.getElementById('recordingTimer');
        
        // Elementos de resultados
        this.transcriptText = document.getElementById('transcriptText');
        this.summaryText = document.getElementById('summaryText');
        this.copyTranscriptBtn = document.getElementById('copyTranscriptBtn');
        this.copySummaryBtn = document.getElementById('copySummaryBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.advancedAnalysisBtn = document.getElementById('advancedAnalysisBtn');
        
        this.setupEventListeners();
        this.updateStatus('ready', 'Listo para procesar');
    }

    setupEventListeners() {
        // Botones de acción principal
        this.startRecordBtn.addEventListener('click', () => this.startRecording());
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.stopRecordBtn.addEventListener('click', () => this.stopRecording());
        
        // Botones de resultados
        this.copyTranscriptBtn.addEventListener('click', () => this.copyToClipboard(this.transcriptText.textContent));
        this.copySummaryBtn.addEventListener('click', () => this.copyToClipboard(this.summaryText.textContent));
        this.downloadBtn.addEventListener('click', () => this.downloadResults());
        this.newSessionBtn.addEventListener('click', () => this.resetToWelcome());
        this.advancedAnalysisBtn.addEventListener('click', () => this.goToAdvancedAnalysis());
    }

    updateStatus(type, message) {
        this.statusText.textContent = message;
        this.statusIndicator.className = `status-indicator ${type}`;
    }

    showScreen(screenName) {
        // Ocultar todas las pantallas
        [this.welcomeScreen, this.recordingScreen, this.processingScreen, this.resultsScreen].forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Mostrar la pantalla solicitada
        const screenMap = {
            'welcome': this.welcomeScreen,
            'recording': this.recordingScreen,
            'processing': this.processingScreen,
            'results': this.resultsScreen
        };
        
        if (screenMap[screenName]) {
            screenMap[screenName].classList.remove('hidden');
        }
    }

    async startRecording() {
        try {
            this.updateStatus('processing', 'Iniciando grabación...');
            
            // Crear nueva sesión
            await this.createNewSession();
            
            // Solicitar permisos de micrófono
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Configurar MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioBlob = null;
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioBlob = event.data;
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processAudio();
            };
            
            // Iniciar grabación
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            // Mostrar pantalla de grabación
            this.showScreen('recording');
            this.updateStatus('processing', 'Grabando...');
            
            // Iniciar timer
            this.startTimer();
            
            this.notifications.success('🎤 Grabación iniciada');
            
        } catch (error) {
            console.error('Error iniciando grabación:', error);
            this.notifications.error(`Error al acceder al micrófono: ${error.message}`);
            this.updateStatus('error', 'Error de micrófono');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
            
            // Detener stream
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            this.updateStatus('processing', 'Procesando grabación...');
            this.notifications.success('🎉 Grabación completada');
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            this.updateStatus('processing', 'Procesando archivo...');
            
            // Crear nueva sesión
            await this.createNewSession();
            
            // Convertir archivo a blob
            this.audioBlob = file;
            
            // Mostrar pantalla de procesamiento
            this.showScreen('processing');
            
            this.notifications.success(`📁 Archivo "${file.name}" cargado`);
            
            // Procesar automáticamente
            setTimeout(() => this.processAudio(), 1000);
            
        } catch (error) {
            console.error('Error procesando archivo:', error);
            this.notifications.error(`Error procesando archivo: ${error.message}`);
            this.updateStatus('error', 'Error procesando archivo');
        }
    }

    async createNewSession() {
        this.currentSession = {
            id: `session-${Date.now()}`,
            title: `Reunión Automática ${new Date().toLocaleString()}`,
            date: new Date().toISOString(),
            duration: '00:00',
            participants: 'Usuario Automático',
            category: 'Automática',
            status: 'in_progress',
            mode: 'automatic',
            transcription: '',
            summary: '',
            hasAudio: false,
            audioFile: null
        };
        
        console.log('✨ Nueva sesión creada:', this.currentSession.id);
        
        // Guardar sesión inicial
        await this.saveSession();
    }

    async processAudio() {
        if (!this.audioBlob) return;
        
        try {
            // Mostrar pantalla de procesamiento
            this.showScreen('processing');
            this.updateProcessingStep(1, 'completed');
            this.updateProcessingStep(2, 'active');
            
            // Transcribir con Whisper (esto ya guarda el audio en el servidor)
            const transcription = await this.transcribeAudio();
            
            // Actualizar sesión con transcripción
            this.currentSession.transcription = transcription;
            await this.saveSession();
            
            this.updateProcessingStep(2, 'completed');
            this.updateProcessingStep(3, 'active');
            
            // Generar resumen con Ollama
            const summary = await this.generateSummary(transcription);
            
            // Actualizar sesión con resumen y marcar como completada
            this.currentSession.summary = summary;
            this.currentSession.status = 'completed';
            await this.saveSession();
            
            this.updateProcessingStep(3, 'completed');
            this.updateProcessingStep(4, 'completed');
            
            // Mostrar resultados
            this.showResults(transcription, summary);
            
        } catch (error) {
            console.error('Error procesando audio:', error);
            this.notifications.error(`Error en procesamiento: ${error.message}`);
            this.updateStatus('error', 'Error en procesamiento');
        }
    }

    async transcribeAudio() {
        try {
            this.updateStatus('processing', 'Transcribiendo con Whisper...');
            
            const formData = new FormData();
            formData.append('audio', this.audioBlob, 'recording.webm');
            formData.append('sessionId', this.currentSession.id);
            
            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.notifications.success('✅ Transcripción completada');
                
                // Actualizar sesión con info del archivo de audio guardado
                if (result.audioFile) {
                    this.currentSession.hasAudio = true;
                    this.currentSession.audioFile = result.audioFile;
                }
                
                return result.transcription;
            } else {
                throw new Error(result.error || 'Error en transcripción');
            }
            
        } catch (error) {
            console.error('Error transcribiendo:', error);
            throw error;
        }
    }

    async generateSummary(transcription) {
        try {
            this.updateStatus('processing', 'Generando resumen ejecutivo...');
            
            // Determinar el tipo de prompt basado en la longitud del contenido
            const wordCount = transcription.split(' ').length;
            let prompt;
            
            if (wordCount < 50) {
                // Para contenido muy corto (menos de 50 palabras)
                prompt = `Analiza este breve audio y proporciona un resumen conciso en 2-3 líneas máximo. Solo menciona lo esencial sin elaborar demasiado.`;
            } else if (wordCount < 200) {
                // Para contenido corto (menos de 200 palabras)
                prompt = `Crea un resumen ejecutivo breve y directo. Incluye solo los puntos más importantes (máximo 3) y cualquier acción requerida. Mantén la respuesta concisa.`;
            } else {
                // Para contenido largo (más de 200 palabras)
                prompt = `Crea un resumen ejecutivo profesional para directivos. Incluye: puntos clave más importantes (máximo 5), decisiones críticas tomadas, impacto en el negocio, próximos pasos estratégicos y recomendaciones específicas. Estructura el contenido de forma clara y ejecutiva.`;
            }
            
            const response = await fetch('/process-with-ollama', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: transcription,
                    prompt: prompt
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.notifications.success('✅ Resumen ejecutivo generado');
                return result.processed;
            } else {
                throw new Error(result.error || 'Error generando resumen');
            }
            
        } catch (error) {
            console.error('Error generando resumen:', error);
            throw error;
        }
    }

    updateProcessingStep(stepNumber, status) {
        const step = document.getElementById(`step${stepNumber}`);
        if (!step) return;
        
        // Remover clases existentes
        step.classList.remove('active', 'completed');
        
        // Añadir nueva clase
        if (status !== 'pending') {
            step.classList.add(status);
        }
        
        // Actualizar icono y texto
        const icon = step.querySelector('.step-icon');
        const statusEl = step.querySelector('.step-status');
        
        if (status === 'active') {
            icon.innerHTML = '<div class="loading-spinner"></div>';
            statusEl.textContent = '⏳ Procesando...';
        } else if (status === 'completed') {
            icon.innerHTML = '✅';
            statusEl.textContent = '✅ Completado';
        }
    }

    showResults(transcription, summary) {
        // Actualizar contenido
        this.transcriptText.textContent = transcription;
        this.summaryText.textContent = summary;
        
        // Mostrar pantalla de resultados
        this.showScreen('results');
        this.updateStatus('ready', 'Procesamiento completado');
        
        this.notifications.success('🎉 ¡Procesamiento automático completado!');
    }

    startTimer() {
        const timerElement = this.recordingTimer;
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.notifications.success('📋 Copiado al portapapeles');
        } catch (error) {
            this.notifications.error('Error copiando al portapapeles');
        }
    }

    downloadResults() {
        const content = `REUNIÓN AUTOMÁTICA - LA AURORA
========================================

📅 Fecha: ${new Date().toLocaleString()}
🆔 Sesión: ${this.currentSession.id}

TRANSCRIPCIÓN
========================================
${this.transcriptText.textContent}

RESUMEN EJECUTIVO
========================================
${this.summaryText.textContent}

---
Generado automáticamente por LA AURORA
Sistema de Reuniones Ejecutivas con IA Local`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reunion-${this.currentSession.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.notifications.success('📥 Archivo descargado');
    }

    resetToWelcome() {
        // Limpiar datos
        this.currentSession = null;
        this.audioBlob = null;
        this.isRecording = false;
        
        // Limpiar timer
        this.stopTimer();
        
        // Resetear contenido
        this.transcriptText.textContent = 'La transcripción aparecerá aquí automáticamente...';
        this.summaryText.textContent = 'El resumen ejecutivo se generará automáticamente...';
        
        // Resetear input de archivo
        this.fileInput.value = '';
        
        // Mostrar pantalla de bienvenida
        this.showScreen('welcome');
        this.updateStatus('ready', 'Listo para procesar');
        
        this.notifications.info('🔄 Listo para nueva sesión');
    }

    goToAdvancedAnalysis() {
        if (!this.currentSession) {
            this.notifications.warning('No hay sesión activa para análisis avanzado');
            return;
        }
        
        // Guardar datos en localStorage para el análisis avanzado
        localStorage.setItem('currentSessionId', this.currentSession.id);
        
        // Guardar transcripción disponible
        const transcription = this.transcriptText.textContent;
        if (transcription && transcription !== 'La transcripción aparecerá aquí automáticamente...') {
            localStorage.setItem('transcriptionData', transcription);
        }
        
        this.notifications.info('🔬 Redirigiendo a análisis avanzado...');
        
        // Redirigir a análisis avanzado
        setTimeout(() => {
            window.location.href = '/resumen';
        }, 500);
    }

    async saveSession() {
        if (!this.currentSession) return;
        
        try {
            console.log('💾 Guardando sesión:', this.currentSession.id);
            
            // Calcular duración si es de grabación
            if (this.recordingStartTime && !this.currentSession.duration) {
                const duration = Date.now() - this.recordingStartTime;
                const minutes = Math.floor(duration / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);
                this.currentSession.duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // No enviar audioBlob (demasiado grande)
            const sessionToSave = { ...this.currentSession };
            delete sessionToSave.audioBlob;
            
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionToSave)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Sesión guardada exitosamente');
            } else {
                console.error('❌ Error guardando sesión:', result.error);
            }
            
        } catch (error) {
            console.error('❌ Error guardando sesión:', error);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.automaticMode = new AutomaticMode();
});

// Prevenir salida accidental durante grabación
window.addEventListener('beforeunload', (e) => {
    if (window.automaticMode && window.automaticMode.isRecording) {
        e.preventDefault();
        e.returnValue = '¿Estás seguro? Se perderá la grabación actual.';
        return e.returnValue;
    }
});