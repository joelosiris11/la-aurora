/**
 * Gestor de Análisis de Transcripciones
 * Maneja la generación de diferentes tipos de análisis usando IA
 */
class AnalysisManager {
    constructor(notificationSystem) {
        this.notifications = notificationSystem;
        this.currentTranscription = '';
        this.selectedTemplate = null;
        
        // Elementos DOM
        this.transcriptionText = document.getElementById('transcriptionText');
        this.templateCards = document.querySelectorAll('.template-card-large');
        this.customPrompt = document.getElementById('customPrompt');
        this.generateBtn = document.getElementById('generateAnalysisBtn');
        this.resultPlaceholder = document.getElementById('resultPlaceholder');
        this.resultOutput = document.getElementById('resultOutput');
        this.loadingState = document.getElementById('loadingState');
        this.resultText = document.getElementById('resultText');
        this.analysisType = document.getElementById('analysisType');
        this.analysisTimestamp = document.getElementById('analysisTimestamp');
        
        // Botones de acciones
        this.copyResultBtn = document.getElementById('copyResultBtn');
        this.exportResultBtn = document.getElementById('exportResultBtn');
        this.saveAnalysisBtn = document.getElementById('saveAnalysisBtn');
        this.backToMainBtn = document.getElementById('backToMainBtn');
        
        // Templates
        this.templates = {
            executive: "Crea un resumen ejecutivo profesional para directivos. Incluye: puntos clave más importantes (máximo 5), decisiones críticas tomadas, impacto en el negocio, próximos pasos estratégicos y recomendaciones. Máximo 300 palabras, formato claro y ejecutivo.",
            actions: "Extrae un plan de acción detallado. Para cada tarea incluye: descripción específica de la acción, responsable asignado (si se menciona), fecha límite o timeframe, prioridad (alta/media/baja), y dependencias. Organiza por orden de prioridad.",
            decisions: "Lista todas las decisiones tomadas y acuerdos alcanzados. Para cada decisión incluye: descripción clara, justificación o contexto, impacto esperado, quién la tomó, y si requiere seguimiento. Organiza por orden de importancia.",
            insights: "Identifica los insights más valiosos y oportunidades de negocio. Incluye: tendencias identificadas, oportunidades de mejora, ideas innovadoras mencionadas, riesgos potenciales, y recomendaciones estratégicas. Enfócate en valor comercial.",
            risks: "Analiza riesgos, desafíos y problemas identificados. Para cada riesgo incluye: descripción del problema, impacto potencial, probabilidad, estrategias de mitigación sugeridas, y responsable de seguimiento. Prioriza por criticidad.",
            followup: "Crea un plan de seguimiento completo. Incluye: próximas reuniones programadas, temas pendientes de decisión, compromisos a verificar, métricas a monitorear, y cronograma de revisiones. Organiza por fechas y prioridades."
        };
        
        this.init();
    }

    init() {
        this.loadTranscriptionFromURL();
        this.bindEvents();
        this.updateSessionInfo();
    }

    bindEvents() {
        // Templates
        this.templateCards.forEach(card => {
            card.addEventListener('click', () => {
                this.selectTemplate(card.dataset.template);
            });
        });

        // Prompt personalizado
        this.customPrompt.addEventListener('input', () => {
            this.updateGenerateButton();
        });

        // Generar análisis
        this.generateBtn.addEventListener('click', () => {
            this.generateAnalysis();
        });

        // Acciones
        this.copyResultBtn.addEventListener('click', () => this.copyResult());
        this.exportResultBtn.addEventListener('click', () => this.exportResult());
        this.saveAnalysisBtn.addEventListener('click', () => this.saveAnalysis());
        this.backToMainBtn.addEventListener('click', () => this.goBackToMain());
    }

    loadTranscriptionFromURL() {
        // Cargar transcripción desde localStorage o URL params
        const urlParams = new URLSearchParams(window.location.search);
        const transcriptionParam = urlParams.get('transcription');
        
        if (transcriptionParam) {
            try {
                this.currentTranscription = decodeURIComponent(transcriptionParam);
            } catch (error) {
                console.error('Error decodificando transcripción:', error);
            }
        } else {
            // Intentar cargar desde localStorage
            const savedTranscription = localStorage.getItem('currentTranscription');
            if (savedTranscription) {
                this.currentTranscription = savedTranscription;
            }
        }

        if (this.currentTranscription) {
            this.transcriptionText.value = this.currentTranscription;
            // Cargar análisis previo si existe
            this.loadPreviousAnalysis();
        } else {
            this.notifications.warning('No se encontró transcripción. Redirigiéndote a la página principal...');
            setTimeout(() => {
                window.location.href = '/pro';
            }, 2000);
        }
    }

    async loadPreviousAnalysis() {
        try {
            const currentSessionId = localStorage.getItem('currentSessionId');
            if (!currentSessionId) return;

            const response = await fetch(`/api/sessions/${currentSessionId}`);
            if (!response.ok) return;

            const sessionData = await response.json();
            
            // Si tiene análisis previo, mostrarlo
            if (sessionData.analysis && sessionData.analysis.content) {
                this.showResult(sessionData.analysis.content, sessionData.analysis.type);
                this.analysisTimestamp.textContent = sessionData.analysis.timestamp;
                this.notifications.info('Análisis previo cargado de la sesión');
            }
            
        } catch (error) {
            console.error('Error cargando análisis previo:', error);
            // Silencioso, no afecta funcionalidad principal
        }
    }

    updateSessionInfo() {
        const sessionName = localStorage.getItem('currentSessionTitle') || 'Sesión sin título';
        const sessionDate = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('sessionName').textContent = sessionName;
        document.getElementById('sessionDate').textContent = sessionDate;
    }

    selectTemplate(templateKey) {
        // Desseleccionar templates anteriores
        this.templateCards.forEach(card => {
            card.classList.remove('active');
        });

        // Seleccionar nuevo template
        const selectedCard = document.querySelector(`[data-template="${templateKey}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            this.selectedTemplate = templateKey;
            this.customPrompt.value = '';
            this.updateGenerateButton();
        }
    }

    updateGenerateButton() {
        const hasSelection = this.selectedTemplate || this.customPrompt.value.trim();
        const hasTranscription = this.currentTranscription.trim();
        
        this.generateBtn.disabled = !hasSelection || !hasTranscription;
        
        if (hasSelection && hasTranscription) {
            this.generateBtn.classList.add('pulsing');
        } else {
            this.generateBtn.classList.remove('pulsing');
        }
    }

    async generateAnalysis() {
        if (!this.currentTranscription.trim()) {
            this.notifications.error('No hay transcripción para analizar');
            return;
        }

        const prompt = this.getPrompt();
        if (!prompt) {
            this.notifications.error('Selecciona un template o escribe un prompt personalizado');
            return;
        }

        this.showLoadingState();

        try {
            const response = await fetch('/process-with-ollama', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: this.currentTranscription,
                    prompt: prompt
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showResult(result.processed, this.getAnalysisTypeName());
                this.notifications.success('Análisis generado exitosamente');
            } else {
                throw new Error(result.error || 'Error desconocido');
            }

        } catch (error) {
            console.error('Error generando análisis:', error);
            this.notifications.error(`Error al generar análisis: ${error.message}`);
            this.hideLoadingState();
        }
    }

    getPrompt() {
        if (this.customPrompt.value.trim()) {
            return this.customPrompt.value.trim();
        } else if (this.selectedTemplate) {
            return this.templates[this.selectedTemplate];
        }
        return null;
    }

    getAnalysisTypeName() {
        if (this.customPrompt.value.trim()) {
            return 'Análisis Personalizado';
        } else if (this.selectedTemplate) {
            const names = {
                executive: 'Resumen Ejecutivo',
                actions: 'Plan de Acción',
                decisions: 'Decisiones Tomadas',
                insights: 'Ideas y Oportunidades',
                risks: 'Riesgos y Desafíos',
                followup: 'Plan de Seguimiento'
            };
            return names[this.selectedTemplate] || 'Análisis';
        }
        return 'Análisis';
    }

    showLoadingState() {
        this.resultPlaceholder.classList.add('hidden');
        this.resultOutput.classList.add('hidden');
        this.loadingState.classList.remove('hidden');
        this.generateBtn.disabled = true;
    }

    hideLoadingState() {
        this.loadingState.classList.add('hidden');
        this.generateBtn.disabled = false;
        this.resultOutput.classList.remove('hidden');
    }

    showResult(content, analysisType) {
        this.hideLoadingState();
        
        this.resultText.value = content;
        this.analysisType.textContent = analysisType;
        this.analysisTimestamp.textContent = new Date().toLocaleString('es-ES');
        
        this.resultPlaceholder.classList.add('hidden');
        this.loadingState.classList.add('hidden');
        this.resultOutput.classList.remove('hidden');
        
        // Habilitar botones de acción
        this.copyResultBtn.disabled = false;
        this.exportResultBtn.disabled = false;
        this.saveAnalysisBtn.disabled = false;
        
        // Auto-guardar en la sesión
        this.saveAnalysisToCurrentSession();
    }

    async copyResult() {
        try {
            await navigator.clipboard.writeText(this.resultText.value);
            this.notifications.success('Resultado copiado al portapapeles');
        } catch (error) {
            this.notifications.error('Error al copiar: ' + error.message);
        }
    }

    exportResult() {
        const content = this.resultText.value;
        const analysisType = this.analysisType.textContent;
        const timestamp = this.analysisTimestamp.textContent;
        
        const fullContent = `${analysisType}\nGenerado: ${timestamp}\n\n${content}`;
        
        const blob = new Blob([fullContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analisis-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.notifications.success('Análisis exportado exitosamente');
    }

    saveAnalysis() {
        // Guardar el análisis en la sesión actual
        this.saveAnalysisToCurrentSession();
        
        // También guardar en localStorage para persistencia
        const analysisData = {
            type: this.analysisType.textContent,
            content: this.resultText.value,
            timestamp: this.analysisTimestamp.textContent,
            transcription: this.currentTranscription
        };
        
        const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
        savedAnalyses.unshift(analysisData);
        
        // Mantener solo los últimos 10 análisis
        if (savedAnalyses.length > 10) {
            savedAnalyses.splice(10);
        }
        
        localStorage.setItem('savedAnalyses', JSON.stringify(savedAnalyses));
        this.notifications.success('Análisis guardado en la sesión');
    }

    async saveAnalysisToCurrentSession() {
        try {
            // Obtener el ID de la sesión actual
            const currentSessionId = localStorage.getItem('currentSessionId');
            if (!currentSessionId) {
                console.warn('No hay sesión actual para guardar el análisis');
                return;
            }

            const analysisData = {
                type: this.analysisType.textContent,
                content: this.resultText.value,
                timestamp: this.analysisTimestamp.textContent,
                prompt: this.getPrompt()
            };

            // Enviar al servidor para guardar en la sesión
            const response = await fetch('/api/sessions/analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    analysis: analysisData
                })
            });

            if (!response.ok) {
                throw new Error('Error al guardar análisis en la sesión');
            }

            console.log('Análisis guardado en la sesión exitosamente');
            
        } catch (error) {
            console.error('Error guardando análisis en sesión:', error);
            // No mostrar error al usuario, es funcionalidad adicional
        }
    }

    goBackToMain() {
        window.location.href = '/pro';
    }
}