/**
 * Gestor de Grabación de Audio
 * Maneja la grabación usando MediaRecorder API (código existente mejorado)
 */
class RecordingManager {
    constructor(notificationSystem, sessionManager, progressStepper) {
        this.notifications = notificationSystem;
        this.sessionManager = sessionManager;
        this.progressStepper = progressStepper;
        
        // Estado de grabación
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.isRecording = false;
        this.recordingTimer = null;
        this.recordingStartTime = null;
        this.stream = null;

        // Elementos DOM
        this.startBtn = document.getElementById('startRecordBtn');
        this.stopBtn = document.getElementById('stopRecordBtn');
        this.transcribeBtn = document.getElementById('transcribeBtn');
        this.reRecordBtn = document.getElementById('reRecordBtn');
        this.proceedBtn = document.getElementById('proceedTranscribeBtn');
        
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.recordingTimer = document.getElementById('recordingTimer');
        this.audioPreview = document.getElementById('audioPreview');
        this.audioPlayback = document.getElementById('audioPlayback');
        this.waveformContainer = document.getElementById('waveformContainer');

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkMicrophonePermission();
        this.initializeWaveform();
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.transcribeBtn.addEventListener('click', () => this.transcribeAudio());
        this.reRecordBtn.addEventListener('click', () => this.reRecord());
        this.proceedBtn.addEventListener('click', () => this.proceedToTranscription());
    }

    async transcribeAudio() {
        if (this.audioBlob && window.app && window.app.transcriptionManager) {
            await window.app.transcriptionManager.transcribeAudio();
        } else {
            this.notifications.warning('No hay audio para transcribir');
        }
    }

    async checkMicrophonePermission() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            // Detener stream de prueba
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            
            this.updateStatus('ready', 'Micrófono listo');
            this.notifications.success('Micrófono configurado correctamente');
            
        } catch (error) {
            this.updateStatus('error', 'Sin acceso al micrófono');
            this.notifications.error('No se puede acceder al micrófono. Verifique los permisos.');
            this.startBtn.disabled = true;
        }
    }

    async testMicrophone() {
        try {
            this.updateStatus('processing', 'Probando micrófono...');
            
            const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Simular test (podrías agregar análisis de audio real aquí)
            setTimeout(() => {
                testStream.getTracks().forEach(track => track.stop());
                this.updateStatus('ready', 'Test completado - Micrófono OK');
                this.notifications.success('Micrófono funcionando correctamente');
            }, 2000);
            
        } catch (error) {
            this.updateStatus('error', 'Error en test de micrófono');
            this.notifications.error('Error al probar el micrófono');
        }
    }

    async startRecording() {
        try {
            // Verificar que el sessionManager está disponible
            if (!this.sessionManager || typeof this.sessionManager.getCurrentSession !== 'function') {
                console.error('SessionManager no está disponible:', this.sessionManager);
                this.notifications.error('Error: Sistema no inicializado correctamente');
                return;
            }

            // Verificar que hay una sesión activa
            if (!this.sessionManager.getCurrentSession()) {
                this.notifications.warning('Crea una nueva sesión antes de grabar');
                return;
            }

            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.recordingStartTime = Date.now();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.showAudioPreview();
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            };

            this.mediaRecorder.start(1000); // Capturar datos cada segundo
            this.isRecording = true;
            this.updateRecordingUI(true);
            this.startTimer();
            this.startWaveformAnimation();
            
            // Actualizar stepper
            if (this.progressStepper) {
                this.progressStepper.startRecording();
            }
            
            this.notifications.success('🎤 Grabación iniciada - Habla con claridad');

        } catch (error) {
            this.notifications.error(`Error al iniciar grabación: ${error.message}`);
            this.updateStatus('error', 'Error de grabación');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordingUI(false);
            this.stopTimer();
            this.stopWaveformAnimation();
            
            // Actualizar stepper
            if (this.progressStepper) {
                this.progressStepper.recordingCompleted();
            }
            
            this.notifications.success('🎉 Grabación completada - Lista para transcribir');
            
            // Auto-guardar sesión con audio
            this.autoSaveSession();
        }
    }

    reRecord() {
        this.audioBlob = null;
        this.audioPreview.classList.add('hidden');
        this.updateStatus('ready', 'Listo para nueva grabación');
        this.recordingTimer.textContent = '00:00';
        
        // Notificar a otros componentes
        if (window.app && window.app.transcriptionManager) {
            window.app.transcriptionManager.reset();
        }
    }

    proceedToTranscription() {
        if (this.audioBlob && window.app && window.app.transcriptionManager) {
            window.app.transcriptionManager.setAudioBlob(this.audioBlob);
            this.notifications.info('Audio preparado para transcripción');
            
            // Auto-habilitar botón de transcripción
            const transcribeBtn = document.getElementById('transcribeBtn');
            if (transcribeBtn) {
                transcribeBtn.disabled = false;
            }
        }
    }

    updateRecordingUI(recording) {
        if (recording) {
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.transcribeBtn.disabled = true;
            this.updateStatus('recording', 'Grabando...');
        } else {
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.transcribeBtn.disabled = false; // Habilitar transcripción inmediatamente
            this.updateStatus('ready', 'Grabación completada - Listo para transcribir');
        }
    }

    updateStatus(type, message) {
        this.statusIndicator.className = `status-indicator ${type}`;
        this.statusText.textContent = message;
    }

    startTimer() {
        this.timer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.recordingTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Actualizar duración en sesión
            this.sessionManager.updateSessionDuration(this.recordingTimer.textContent);
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    showAudioPreview() {
        const audioURL = URL.createObjectURL(this.audioBlob);
        this.audioPlayback.src = audioURL;
        this.audioPreview.classList.remove('hidden');
        
        // Auto-habilitar botón de transcripción directamente
        const transcribeBtn = document.getElementById('transcribeBtn');
        if (transcribeBtn) {
            transcribeBtn.disabled = false;
        }
        
        // Auto-configurar audio en TranscriptionManager
        if (window.app && window.app.transcriptionManager) {
            window.app.transcriptionManager.setAudioBlob(this.audioBlob);
        }
        
        this.notifications.success('Audio grabado correctamente. ¡Ya puedes transcribir!');
    }

    initializeWaveform() {
        // Inicializar visualización de forma de onda
        this.waveBars = this.waveformContainer.querySelectorAll('.wave-bar');
    }

    startWaveformAnimation() {
        // Animación simple de las barras durante grabación
        this.waveformInterval = setInterval(() => {
            if (this.waveBars) {
                this.waveBars.forEach(bar => {
                    const height = Math.random() * 50 + 10;
                    bar.style.height = `${height}px`;
                    bar.style.opacity = '0.8';
                });
            }
        }, 200);
    }

    stopWaveformAnimation() {
        if (this.waveformInterval) {
            clearInterval(this.waveformInterval);
            this.waveformInterval = null;
            
            // Resetear barras
            if (this.waveBars) {
                this.waveBars.forEach(bar => {
                    bar.style.opacity = '0.3';
                });
            }
        }
    }

    async autoSaveSession() {
        // Auto-guardar la sesión cuando hay cambios importantes
        if (window.app?.sessionManager) {
            try {
                const currentSession = window.app.sessionManager.getCurrentSession();
                if (currentSession && this.audioBlob) {
                    // Actualizar la sesión con info del audio
                    currentSession.hasAudio = true;
                    currentSession.audioBlob = this.audioBlob;
                    currentSession.duration = this.recordingTimer.textContent || '00:00';
                    
                    await window.app.sessionManager.autoSaveSession();
                    console.log('✅ Sesión auto-guardada con audio');
                }
            } catch (error) {
                console.error('❌ Error auto-guardando sesión:', error);
            }
        }
    }

    getAudioBlob() {
        return this.audioBlob;
    }

    loadSessionAudio(audioUrl, fileName = 'Audio de sesión') {
        // Mostrar el reproductor con el audio de la sesión
        this.audioPreview.classList.remove('hidden');
        this.audioPlayback.src = audioUrl;
        
        // Actualizar el encabezado del preview
        const previewHeader = this.audioPreview.querySelector('.preview-header h3');
        if (previewHeader) {
            previewHeader.textContent = `Audio de sesión: ${fileName}`;
        }
        
        // Habilitar botón de transcribir
        this.transcribeBtn.disabled = false;
        
        // Activar paso 2 del stepper
        if (this.progressStepper) {
            this.progressStepper.recordingCompleted();
        }
        
        // Crear un blob ficticio para compatibilidad (no se usa realmente)
        this.audioBlob = new Blob([], { type: 'audio/webm' });
        
        // Notificar
        this.notifications.info(`Audio cargado: ${fileName}`);
        
        // Auto-configurar audio en TranscriptionManager
        if (window.app && window.app.transcriptionManager) {
            window.app.transcriptionManager.hasAudio = true;
        }
    }

    showUploadedAudio(audioUrl, fileName) {
        // Mostrar el reproductor con el archivo subido
        this.audioPreview.classList.remove('hidden');
        this.audioPlayback.src = audioUrl;
        
        // Actualizar UI para mostrar que es un archivo subido
        const previewHeader = this.audioPreview.querySelector('.preview-header h3');
        if (previewHeader) {
            previewHeader.textContent = `Archivo: ${fileName}`;
        }
        
        // Habilitar botón de transcribir
        this.transcribeBtn.disabled = false;
        
        // Activar paso 2 del stepper
        if (this.progressStepper) {
            this.progressStepper.recordingCompleted();
        }
        
        // Crear un blob ficticio para compatibilidad
        this.audioBlob = new Blob([], { type: 'audio/webm' });
        
        // Auto-configurar audio en TranscriptionManager
        if (window.app && window.app.transcriptionManager) {
            window.app.transcriptionManager.hasAudio = true;
        }
        
        this.notifications.info('Archivo listo - Puedes transcribir o reproducir');
    }

    reset() {
        this.audioBlob = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.stopTimer();
        this.stopWaveformAnimation();
        this.audioPreview.classList.add('hidden');
        this.recordingTimer.textContent = '00:00';
        this.updateStatus('ready', 'Listo para grabar');
        this.updateRecordingUI(false);
    }
}