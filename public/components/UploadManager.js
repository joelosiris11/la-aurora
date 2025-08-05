/**
 * Gestor de Subida de Archivos
 * Maneja drag & drop y selección de archivos de audio
 */
class UploadManager {
    constructor(notificationSystem, sessionManager) {
        this.notifications = notificationSystem;
        this.sessionManager = sessionManager;
        
        // Elementos DOM
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressPercent = document.getElementById('progressPercent');
        
        // Estado
        this.currentFile = null;
        this.supportedFormats = ['.mp3', '.wav', '.m4a', '.webm'];
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Click en zona de upload
        this.uploadZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Selección de archivo
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Drag & Drop
        this.uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadZone.addEventListener('drop', this.handleDrop.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadZone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFile(file) {
        // Validar formato
        if (!this.isValidFormat(file)) {
            this.notifications.error(`Formato no soportado. Use: ${this.supportedFormats.join(', ')}`);
            return;
        }

        // Validar tamaño
        if (file.size > this.maxFileSize) {
            this.notifications.error(`Archivo muy grande. Máximo ${this.formatFileSize(this.maxFileSize)}`);
            return;
        }

        this.currentFile = file;
        this.uploadFile(file);
    }

    isValidFormat(file) {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        return this.supportedFormats.includes(extension);
    }

    async uploadFile(file) {
        try {
            // Verificar que hay una sesión activa
            if (!this.sessionManager.getCurrentSession()) {
                this.notifications.warning('Crea una nueva sesión antes de subir archivos');
                return;
            }

            this.showProgress();
            this.updateProgress(0, 'Preparando archivo...');

            const formData = new FormData();
            formData.append('audio', file, file.name);
            
            // Agregar sessionId si existe para guardar el audio en la sesión
            const currentSession = window.app?.sessionManager?.getCurrentSession();
            if (currentSession) {
                formData.append('sessionId', currentSession.id);
            }

            const xhr = new XMLHttpRequest();

            // Progress handler
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    this.updateProgress(percent, 'Subiendo archivo...');
                }
            });

            // Success handler
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    this.updateProgress(100, 'Archivo procesado correctamente');
                    
                    // Crear URL del archivo para reproductor
                    const audioUrl = URL.createObjectURL(file);
                    
                    // Mostrar reproductor en el mismo panel de upload
                    this.showUploadedAudio(audioUrl, file.name);
                    
                    // Notificar a TranscriptionManager con la transcripción
                    if (window.app && window.app.transcriptionManager) {
                        window.app.transcriptionManager.setUploadedFile(file.name, response.transcription);
                    }
                    
                    this.notifications.success(`"${file.name}" listo para reproducir y transcribir`);
                    
                    // Mantener en modo upload pero mostrar el reproductor
                    // NO cambiar a modo grabación
                    
                    // Auto-guardar la sesión con el audio subido
                    const recordingManager = window.app?.recordingManager;
                    if (currentSession && recordingManager) {
                        recordingManager.autoSaveSession();
                    }
                    
                    setTimeout(() => {
                        this.hideProgress();
                        // NO limpiar la zona de upload, mantener el reproductor
                    }, 1500);
                } else {
                    throw new Error(`Error del servidor: ${xhr.status}`);
                }
            });

            // Error handler
            xhr.addEventListener('error', () => {
                throw new Error('Error de conexión');
            });

            // Send request
            xhr.open('POST', '/transcribe');
            xhr.send(formData);

        } catch (error) {
            this.hideProgress();
            this.notifications.error(`Error al subir archivo: ${error.message}`);
        }
    }

    showProgress() {
        this.uploadZone.style.display = 'none';
        this.uploadProgress.classList.remove('hidden');
    }

    hideProgress() {
        this.uploadZone.style.display = 'flex';
        this.uploadProgress.classList.add('hidden');
        this.updateProgress(0, '');
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressPercent.textContent = `${percent}%`;
        this.progressText.textContent = text;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getCurrentFile() {
        return this.currentFile;
    }

    reset() {
        this.currentFile = null;
        this.fileInput.value = '';
        this.hideProgress();
        this.uploadZone.classList.remove('dragover');
    }

    // Método para procesar archivos directamente (sin upload)
    async processFileDirectly(file) {
        try {
            this.notifications.info('Procesando archivo localmente...');
            
            // Crear FormData para envío directo
            const formData = new FormData();
            formData.append('audio', file, file.name);

            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.notifications.success('Archivo procesado correctamente');
                
                // Actualizar transcripción
                document.getElementById('transcriptionResult').value = result.transcription;
                document.getElementById('processBtn').disabled = false;
                
                return result;
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
            
        } catch (error) {
            this.notifications.error(`Error procesando archivo: ${error.message}`);
            throw error;
        }
    }

    showUploadedAudio(audioUrl, fileName) {
        // Ocultar zona de upload y mostrar preview
        this.uploadZone.classList.add('hidden');
        
        // Mostrar preview del audio subido
        const uploadAudioPreview = document.getElementById('uploadAudioPreview');
        const uploadedFileName = document.getElementById('uploadedFileName');
        const uploadedAudioPlayer = document.getElementById('uploadedAudioPlayer');
        const transcribeUploadedBtn = document.getElementById('transcribeUploadedBtn');
        const reUploadBtn = document.getElementById('reUploadBtn');
        
        if (uploadAudioPreview && uploadedFileName && uploadedAudioPlayer) {
            uploadedFileName.textContent = fileName;
            uploadedAudioPlayer.src = audioUrl;
            uploadAudioPreview.classList.remove('hidden');
            
            // Habilitar botón de transcribir
            if (transcribeUploadedBtn) {
                transcribeUploadedBtn.disabled = false;
                transcribeUploadedBtn.onclick = () => {
                    if (window.app?.transcriptionManager) {
                        window.app.transcriptionManager.transcribe();
                    }
                };
            }
            
            // Configurar botón de re-upload
            if (reUploadBtn) {
                reUploadBtn.onclick = () => {
                    this.resetUpload();
                };
            }
        }
    }

    resetUpload() {
        // Mostrar zona de upload y ocultar preview
        this.uploadZone.classList.remove('hidden');
        const uploadAudioPreview = document.getElementById('uploadAudioPreview');
        if (uploadAudioPreview) {
            uploadAudioPreview.classList.add('hidden');
        }
        
        // Limpiar transcription manager
        if (window.app?.transcriptionManager) {
            window.app.transcriptionManager.reset();
        }
        
        this.reset();
    }
}