/**
 * Gestor de Transcripción y Procesamiento IA
 * Maneja Whisper y Ollama (usando la lógica existente mejorada)
 */
class TranscriptionManager {
    constructor(notificationSystem, sessionManager, progressStepper) {
        this.notifications = notificationSystem;
        this.sessionManager = sessionManager;
        this.progressStepper = progressStepper;
        
        // Estado
        this.audioBlob = null;
        this.uploadedFileName = null;
        this.currentTranscription = '';
        this.currentSummary = '';
        
        // Elementos DOM
        this.transcribeBtn = document.getElementById('transcribeBtn');
        this.processBtn = document.getElementById('processBtn');
        this.transcriptionResult = document.getElementById('transcriptionResult');
        this.summaryResult = document.getElementById('summaryResult');
        this.customPrompt = document.getElementById('customPrompt');
        this.templateCards = document.querySelectorAll('.template-card');
        this.copyTranscriptBtn = document.getElementById('copyTranscriptBtn');
        this.editTranscriptBtn = document.getElementById('editTranscriptBtn');
        this.saveSessionBtn = document.getElementById('saveSessionBtn');
        
        // Templates mejorados orientados a usuarios
        this.templates = {
            executive: "Crea un resumen ejecutivo claro y conciso para presentar a directivos. Incluye: puntos clave, decisiones importantes y próximos pasos. Máximo 200 palabras.",
            actions: "Extrae una lista clara de tareas y responsabilidades. Para cada tarea incluye: qué hacer, quién es responsable (si se menciona) y cuándo debe completarse.",
            decisions: "Lista todas las decisiones tomadas y acuerdos alcanzados. Organiza por orden de importancia y explica brevemente el impacto de cada decisión.",
            insights: "Identifica las 3-5 ideas más importantes e insights valiosos de esta conversación. Explica por qué cada una es relevante para el negocio."
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        this.transcribeBtn.addEventListener('click', () => this.transcribeAudio());
        this.processBtn.addEventListener('click', () => this.processWithAI());
        
        // Templates
        this.templateCards.forEach(card => {
            card.addEventListener('click', () => {
                const template = card.dataset.template;
                this.useTemplate(template);
            });
        });
        
        // Acciones de transcripción
        if (this.copyTranscriptBtn) {
            this.copyTranscriptBtn.addEventListener('click', () => this.copyTranscription());
        }
        
        if (this.editTranscriptBtn) {
            this.editTranscriptBtn.addEventListener('click', () => this.toggleEditMode());
        }
        
        if (this.saveSessionBtn) {
            this.saveSessionBtn.addEventListener('click', () => this.saveCurrentSession());
        }
        
        // Auto-save cuando cambia la transcripción
        this.transcriptionResult.addEventListener('input', () => {
            this.currentTranscription = this.transcriptionResult.value;
        });
    }

    setAudioBlob(audioBlob) {
        this.audioBlob = audioBlob;
        this.transcribeBtn.disabled = false;
    }

    setUploadedFile(fileName, transcription = null) {
        this.uploadedFileName = fileName;
        this.transcribeBtn.disabled = false;
        this.hasAudio = true;
        
        // Si ya viene transcrito del servidor, mostrarlo
        if (transcription) {
            this.currentTranscription = transcription;
            this.transcriptionResult.value = transcription;
            this.notifications.success('Archivo transcrito automáticamente');
            
            // Actualizar progreso con el método correcto
            if (this.progressStepper) {
                this.progressStepper.transcriptionCompleted();
            }
        } else {
            this.notifications.info(`Archivo preparado: ${fileName}`);
        }
    }

    async transcribeAudio() {
        if (!this.audioBlob && !this.uploadedFileName) {
            this.notifications.warning('No hay audio para transcribir');
            return;
        }

        try {
            this.setTranscribing(true);
            
            // Actualizar stepper
            if (this.progressStepper) {
                this.progressStepper.startTranscription();
            }
            
            this.notifications.info('✨ Convirtiendo audio a texto...');

            let formData;
            
            if (this.audioBlob) {
                // Audio grabado
                formData = new FormData();
                formData.append('audio', this.audioBlob, 'recording.webm');
            } else {
                // Archivo ya subido - no necesita FormData adicional
                // El archivo ya fue procesado en UploadManager
                this.setTranscribing(false);
                return;
            }

            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.currentTranscription = result.transcription;
                this.transcriptionResult.value = this.currentTranscription;
                this.processBtn.disabled = false;
                this.saveSessionBtn.disabled = false;
                
                // Actualizar stepper
                if (this.progressStepper) {
                    this.progressStepper.transcriptionCompleted();
                }
                
                this.notifications.success('🎉 Texto extraído correctamente - Listo para procesar');
                
                // Auto-guardar la sesión con la transcripción
                if (window.app?.sessionManager) {
                    try {
                        // Actualizar la sesión con la transcripción
                        const currentSession = window.app.sessionManager.getCurrentSession();
                        if (currentSession) {
                            currentSession.transcription = this.currentTranscription;
                            await window.app.sessionManager.autoSaveSession();
                        }
                    } catch (error) {
                        console.error('Error auto-guardando transcripción:', error);
                    }
                }
                
                // Auto-switch a tab de transcripción
                this.switchToTab('transcription');
                
            } else {
                throw new Error(result.error || 'Error desconocido');
            }

        } catch (error) {
            this.notifications.error(`Error en transcripción: ${error.message}`);
        } finally {
            this.setTranscribing(false);
        }
    }

    async processWithAI() {
        const text = this.transcriptionResult.value.trim();
        if (!text) {
            this.notifications.warning('No hay texto para procesar');
            return;
        }

        try {
            this.setProcessing(true);
            
            // Actualizar stepper
            if (this.progressStepper) {
                this.progressStepper.startProcessing();
            }
            
            this.notifications.info('🤖 Analizando con IA...');

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
                this.currentSummary = result.processed;
                this.summaryResult.value = this.currentSummary;
                this.saveSessionBtn.disabled = false;
                
                // Actualizar stepper
                if (this.progressStepper) {
                    this.progressStepper.processingCompleted();
                }
                
                this.notifications.success('🎉 Análisis completado - Revisa los resultados');
                
                // Auto-switch a tab de resumen
                this.switchToTab('summary');
                
                // Extraer action items si es posible
                this.extractActionItems(result.processed);
                
            } else {
                throw new Error(result.error || 'Error desconocido');
            }

        } catch (error) {
            this.notifications.error(`Error procesando con IA: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    }

    useTemplate(templateName) {
        const template = this.templates[templateName];
        if (template) {
            this.customPrompt.value = template;
            
            // Highlight del template seleccionado
            this.templateCards.forEach(card => {
                card.classList.toggle('active', card.dataset.template === templateName);
            });
            
            this.notifications.info(`Template "${templateName}" aplicado`);
        }
    }

    extractActionItems(processedText) {
        // Buscar patrones comunes de action items
        const actionPatterns = [
            /(?:^|\n)[-•*]\s*(.+)/gm,
            /(?:^|\n)\d+\.\s*(.+)/gm,
            /(?:acción|tarea|todo|hacer):\s*(.+)/gim
        ];

        const actionsList = document.getElementById('actionsList');
        const noActions = actionsList.querySelector('.no-actions');
        
        let foundActions = [];
        
        actionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(processedText)) !== null) {
                foundActions.push(match[1].trim());
            }
        });

        if (foundActions.length > 0) {
            // Ocultar mensaje de "no actions"
            if (noActions) noActions.style.display = 'none';
            
            // Limpiar actions existentes
            const existingActions = actionsList.querySelectorAll('.action-item');
            existingActions.forEach(item => item.remove());
            
            // Agregar nuevas actions
            foundActions.forEach((action, index) => {
                const actionItem = document.createElement('div');
                actionItem.className = 'action-item';
                actionItem.innerHTML = `
                    <div class="action-content">
                        <input type="checkbox" id="action-${index}" class="action-checkbox">
                        <label for="action-${index}" class="action-text">${action}</label>
                    </div>
                    <div class="action-meta">
                        <span class="action-date">Extraído automáticamente</span>
                    </div>
                `;
                actionsList.appendChild(actionItem);
            });
        }
    }

    copyTranscription() {
        if (this.currentTranscription) {
            navigator.clipboard.writeText(this.currentTranscription).then(() => {
                this.notifications.success('Transcripción copiada al portapapeles');
            }).catch(() => {
                this.notifications.error('Error al copiar la transcripción');
            });
        }
    }

    toggleEditMode() {
        const isReadonly = this.transcriptionResult.readOnly;
        this.transcriptionResult.readOnly = !isReadonly;
        
        if (!isReadonly) {
            this.transcriptionResult.focus();
            this.editTranscriptBtn.textContent = '💾 Guardar';
            this.notifications.info('Modo edición activado');
        } else {
            this.editTranscriptBtn.textContent = '✏️ Editar';
            this.currentTranscription = this.transcriptionResult.value;
            this.notifications.success('Cambios guardados');
        }
    }

    async saveCurrentSession() {
        const session = this.sessionManager.getCurrentSession();
        if (!session) {
            this.notifications.warning('No hay sesión activa para guardar');
            return;
        }

        try {
            await this.sessionManager.saveSession(this.currentTranscription, this.currentSummary);
            
            // Actualizar stepper a completado
            if (this.progressStepper) {
                this.progressStepper.sessionSaved();
            }
            
            this.notifications.success('💾 Sesión guardada correctamente');
        } catch (error) {
            this.notifications.error('Error al guardar la sesión');
        }
    }

    switchToTab(tabName) {
        // Activar tab
        document.querySelectorAll('.results-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Mostrar contenido
        document.querySelectorAll('.results-content').forEach(content => {
            content.classList.toggle('hidden', !content.id.includes(tabName));
        });
    }

    setTranscribing(isTranscribing) {
        this.transcribeBtn.disabled = isTranscribing;
        const spinner = document.getElementById('transcribeSpinner');
        
        if (isTranscribing) {
            this.transcribeBtn.innerHTML = '<span class="icon loading-spinner">⏳</span>Convirtiendo a texto...';
            this.transcribeBtn.classList.add('loading');
            if (spinner) spinner.classList.remove('hidden');
        } else {
            this.transcribeBtn.innerHTML = '<span class="icon">✨</span>Convertir a Texto';
            this.transcribeBtn.classList.remove('loading');
            if (spinner) spinner.classList.add('hidden');
        }
    }

    setProcessing(isProcessing) {
        this.processBtn.disabled = isProcessing;
        
        if (isProcessing) {
            this.processBtn.innerHTML = '<span class="icon loading-spinner">⏳</span>Analizando...';
            this.processBtn.classList.add('loading');
        } else {
            this.processBtn.innerHTML = '<span class="icon">✨</span>Generar Análisis Inteligente';
            this.processBtn.classList.remove('loading');
        }
    }

    reset() {
        this.audioBlob = null;
        this.uploadedFileName = null;
        this.currentTranscription = '';
        this.currentSummary = '';
        
        this.transcriptionResult.value = '';
        this.summaryResult.value = '';
        this.customPrompt.value = '';
        
        this.transcribeBtn.disabled = true;
        this.processBtn.disabled = true;
        this.saveSessionBtn.disabled = true;
        
        this.transcriptionResult.readOnly = true;
        this.editTranscriptBtn.textContent = '✏️ Editar';
        
        // Limpiar action items
        const actionsList = document.getElementById('actionsList');
        const existingActions = actionsList.querySelectorAll('.action-item');
        existingActions.forEach(item => item.remove());
        
        const noActions = actionsList.querySelector('.no-actions');
        if (noActions) noActions.style.display = 'block';
        
        // Reset templates
        this.templateCards.forEach(card => {
            card.classList.remove('active');
        });
    }

    getCurrentTranscription() {
        return this.currentTranscription;
    }

    getCurrentSummary() {
        return this.currentSummary;
    }
}