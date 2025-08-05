class VoiceTranscriptor {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.isRecording = false;
        this.recordingTimer = null;
        this.recordingStartTime = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.checkServerStatus();
        this.requestMicrophonePermission();
    }

    initializeElements() {
        // Botones de control
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.transcribeBtn = document.getElementById('transcribeBtn');
        this.processBtn = document.getElementById('processBtn');

        // Elementos de estado
        this.recordingStatus = document.getElementById('recordingStatus');
        this.timer = document.getElementById('timer');
        this.audioPreview = document.getElementById('audioPreview');
        this.audioPlayback = document.getElementById('audioPlayback');

        // Elementos de resultado
        this.transcriptionResult = document.getElementById('transcriptionResult');
        this.ollamaResult = document.getElementById('ollamaResult');
        this.customPrompt = document.getElementById('customPrompt');

        // Elementos de estado del sistema
        this.micStatus = document.getElementById('micStatus');
        this.serverStatus = document.getElementById('serverStatus');
        this.micStatusText = document.getElementById('micStatusText');
        this.serverStatusText = document.getElementById('serverStatusText');
        this.logContent = document.getElementById('logContent');
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.transcribeBtn.addEventListener('click', () => this.transcribeAudio());
        this.processBtn.addEventListener('click', () => this.processWithOllama());
    }

    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Detener el stream de prueba
            this.updateMicrophoneStatus('ready', 'Listo');
            this.log('Acceso al micrófono concedido', 'success');
        } catch (error) {
            this.updateMicrophoneStatus('error', 'Sin acceso');
            this.log(`Error de micrófono: ${error.message}`, 'error');
            alert('Se necesita acceso al micrófono para grabar audio. Por favor, permite el acceso y recarga la página.');
        }
    }

    async checkServerStatus() {
        try {
            const response = await fetch('/health');
            if (response.ok) {
                this.updateServerStatus('active', 'Conectado');
                this.log('Conexión con servidor establecida', 'success');
            } else {
                throw new Error(`Estado: ${response.status}`);
            }
        } catch (error) {
            this.updateServerStatus('error', 'Desconectado');
            this.log(`Error de servidor: ${error.message}`, 'error');
        }
    }

    updateMicrophoneStatus(status, text) {
        this.micStatusText.textContent = text;
        this.micStatus.className = `indicator ${status}`;
    }

    updateServerStatus(status, text) {
        this.serverStatusText.textContent = text;
        this.serverStatus.className = `indicator ${status}`;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('p');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.logContent.appendChild(logEntry);
        this.logContent.scrollTop = this.logContent.scrollHeight;
        
        // Mantener solo los últimos 50 logs
        const logs = this.logContent.querySelectorAll('.log-entry');
        if (logs.length > 50) {
            logs[0].remove();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            this.mediaRecorder = new MediaRecorder(stream, {
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
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start(1000); // Capturar datos cada segundo
            this.isRecording = true;
            this.updateRecordingUI(true);
            this.startTimer();
            this.log('Grabación iniciada', 'info');

        } catch (error) {
            this.log(`Error al iniciar grabación: ${error.message}`, 'error');
            alert('Error al acceder al micrófono. Verifica los permisos.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordingUI(false);
            this.stopTimer();
            this.log('Grabación detenida', 'success');
        }
    }

    updateRecordingUI(recording) {
        if (recording) {
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.recordingStatus.classList.add('recording');
            document.querySelector('.status-text').textContent = 'Grabando...';
        } else {
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.transcribeBtn.disabled = false;
            this.recordingStatus.classList.remove('recording');
            document.querySelector('.status-text').textContent = 'Grabación completada';
        }
    }

    startTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    showAudioPreview() {
        const audioURL = URL.createObjectURL(this.audioBlob);
        this.audioPlayback.src = audioURL;
        this.audioPreview.style.display = 'block';
    }

    async transcribeAudio() {
        if (!this.audioBlob) {
            alert('No hay audio para transcribir');
            return;
        }

        try {
            this.transcribeBtn.disabled = true;
            this.transcribeBtn.classList.add('loading');
            this.log('Enviando audio para transcripción...', 'info');

            const formData = new FormData();
            formData.append('audio', this.audioBlob, 'recording.webm');

            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.transcriptionResult.value = result.transcription;
                this.processBtn.disabled = false;
                this.log('Transcripción completada', 'success');
            } else {
                throw new Error(result.error || 'Error desconocido');
            }

        } catch (error) {
            this.log(`Error en transcripción: ${error.message}`, 'error');
            alert(`Error al transcribir: ${error.message}`);
        } finally {
            this.transcribeBtn.disabled = false;
            this.transcribeBtn.classList.remove('loading');
        }
    }

    async processWithOllama() {
        const text = this.transcriptionResult.value.trim();
        if (!text) {
            alert('No hay texto para procesar');
            return;
        }

        try {
            this.processBtn.disabled = true;
            this.processBtn.classList.add('loading');
            this.log('Procesando con Ollama...', 'info');

            const requestData = {
                text: text,
                prompt: this.customPrompt.value.trim() || undefined
            };

            const response = await fetch('/process-with-ollama', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.success) {
                this.ollamaResult.value = result.processed;
                this.log('Procesamiento con Ollama completado', 'success');
            } else {
                throw new Error(result.error || 'Error desconocido');
            }

        } catch (error) {
            this.log(`Error con Ollama: ${error.message}`, 'error');
            alert(`Error al procesar con Ollama: ${error.message}`);
        } finally {
            this.processBtn.disabled = false;
            this.processBtn.classList.remove('loading');
        }
    }

    // Método para limpiar y reiniciar
    reset() {
        this.audioBlob = null;
        this.audioChunks = [];
        this.transcriptionResult.value = '';
        this.ollamaResult.value = '';
        this.customPrompt.value = '';
        this.audioPreview.style.display = 'none';
        this.transcribeBtn.disabled = true;
        this.processBtn.disabled = true;
        this.timer.textContent = '00:00';
        document.querySelector('.status-text').textContent = 'Listo para grabar';
        this.log('Sistema reiniciado', 'info');
    }
}

// Funciones utilitarias
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkBrowserSupport() {
    const features = {
        mediaRecorder: 'MediaRecorder' in window,
        getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        audioContext: 'AudioContext' in window || 'webkitAudioContext' in window
    };

    const unsupported = Object.entries(features)
        .filter(([feature, supported]) => !supported)
        .map(([feature]) => feature);

    if (unsupported.length > 0) {
        console.warn('Características no soportadas:', unsupported);
        alert(`Tu navegador no soporta: ${unsupported.join(', ')}. Algunas funciones pueden no funcionar correctamente.`);
    }

    return unsupported.length === 0;
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎤 Transcriptor de Voz iniciado');
    
    if (checkBrowserSupport()) {
        window.voiceTranscriptor = new VoiceTranscriptor();
    } else {
        console.error('Navegador no compatible');
    }
});

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('Error global capturado:', event.error);
    if (window.voiceTranscriptor) {
        window.voiceTranscriptor.log(`Error: ${event.error.message}`, 'error');
    }
});

// Cleanup cuando se cierra la página
window.addEventListener('beforeunload', () => {
    if (window.voiceTranscriptor && window.voiceTranscriptor.isRecording) {
        window.voiceTranscriptor.stopRecording();
    }
});