/**
 * Gestor de Sesiones/Reuniones
 * Maneja el almacenamiento y recuperación de sesiones usando archivos en el servidor
 */
class SessionManager {
    constructor(notificationSystem, progressStepper) {
        this.notifications = notificationSystem;
        this.progressStepper = progressStepper;
        this.currentSession = null;
        this.sessions = [];
        this.sessionsList = document.getElementById('sessionsList');
        this.searchInput = document.getElementById('sessionSearch');
        this.filterTabs = document.querySelectorAll('.filter-tab');
        this.currentFilter = 'all';
        
        this.templates = {
            executive: "Crea un resumen ejecutivo claro y conciso para presentar a directivos. Incluye: puntos clave, decisiones importantes y próximos pasos. Máximo 200 palabras.",
            actions: "Extrae una lista clara de tareas y responsabilidades. Para cada tarea incluye: qué hacer, quién es responsable (si se menciona) y cuándo debe completarse.",
            decisions: "Lista todas las decisiones tomadas y acuerdos alcanzados. Organiza por orden de importancia y explica brevemente el impacto de cada decisión.",
            insights: "Identifica las 3-5 ideas más importantes e insights valiosos de esta conversación. Explica por qué cada una es relevante para el negocio."
        };

        this.init();
    }

    init() {
        this.loadSessions();
        this.bindEvents();
    }

    bindEvents() {
        // Búsqueda
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filterSessions(e.target.value);
            });
        }

        // Filtros
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.filter);
            });
        });

        // Refresh
        const refreshBtn = document.getElementById('refreshSessions');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadSessions();
            });
        }
    }

    async loadSessions() {
        try {
            const response = await fetch('/api/sessions');
            if (response.ok) {
                this.sessions = await response.json();
                this.renderSessions();
            } else {
                // Si no hay endpoint aún, usar datos de ejemplo
                this.loadMockSessions();
            }
        } catch (error) {
            console.log('Usando datos de ejemplo para sesiones');
            this.loadMockSessions();
        }
    }

    loadMockSessions() {
        // Datos de ejemplo mientras implementamos el backend
        this.sessions = [
            {
                id: 'session-1',
                title: 'Daily Standup - Equipo Desarrollo',
                participants: 'Juan, María, Carlos',
                date: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
                duration: '00:02:34',
                category: 'standup',
                status: 'completed',
                transcription: 'Buenos días equipo. Juan reporta avance en la API de usuarios...',
                summary: 'Reunión de standup diaria con actualizaciones del equipo...'
            },
            {
                id: 'session-2',
                title: 'Reunión con Cliente ACME Corp',
                participants: 'Ana, Director ACME, PM',
                date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                duration: '00:45:12',
                category: 'client',
                status: 'completed',
                transcription: 'Gracias por recibirnos. Queremos discutir los requerimientos...',
                summary: 'Sesión de levantamiento de requerimientos con cliente...'
            }
        ];
        this.renderSessions();
    }

    renderSessions() {
        if (!this.sessionsList) return;

        // Limpiar lista actual (excepto el ejemplo)
        const existingSessions = this.sessionsList.querySelectorAll('.session-card:not(.sample)');
        existingSessions.forEach(card => card.remove());

        // Filtrar sesiones
        const filteredSessions = this.getFilteredSessions();

        // Renderizar sesiones
        filteredSessions.forEach(session => {
            const card = this.createSessionCard(session);
            this.sessionsList.appendChild(card);
        });

        // Ocultar ejemplo si hay sesiones reales
        const sampleCard = this.sessionsList.querySelector('.sample');
        if (sampleCard && filteredSessions.length > 0) {
            sampleCard.style.display = 'none';
        }
    }

    createSessionCard(session) {
        const card = document.createElement('div');
        card.className = 'session-card';
        card.dataset.sessionId = session.id;

        const timeAgo = this.getTimeAgo(session.date);
        const statusIcon = session.status === 'completed' ? '✅' : '⏳';
        
        card.innerHTML = `
            <div class="session-header">
                <h3 class="session-title">${session.title}</h3>
                <div class="session-actions">
                    <span class="session-date">${timeAgo}</span>
                    <button class="delete-session-btn" title="Eliminar sesión" data-session-id="${session.id}">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="session-meta">
                <span class="session-duration">⏱️ ${session.duration}</span>
                <span class="session-status">${statusIcon} Completada</span>
            </div>
            <div class="session-preview">
                ${session.transcription ? session.transcription.substring(0, 80) + '...' : 'Sin transcripción'}
            </div>
        `;

        // Evento click para cargar sesión
        card.addEventListener('click', (e) => {
            // No cargar sesión si se hizo click en el botón de eliminar
            if (e.target.classList.contains('delete-session-btn')) {
                return;
            }
            this.loadSession(session);
        });

        // Evento click para eliminar sesión
        const deleteBtn = card.querySelector('.delete-session-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que se active el click de la card
            this.confirmDeleteSession(session);
        });

        return card;
    }

    getFilteredSessions() {
        let filtered = [...this.sessions];

        // Filtro por búsqueda
        const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
        if (searchTerm) {
            filtered = filtered.filter(session => 
                session.title.toLowerCase().includes(searchTerm) ||
                session.participants.toLowerCase().includes(searchTerm) ||
                session.transcription.toLowerCase().includes(searchTerm)
            );
        }

        // Filtro por tiempo
        const now = new Date();
        switch (this.currentFilter) {
            case 'today':
                filtered = filtered.filter(session => {
                    const sessionDate = new Date(session.date);
                    return sessionDate.toDateString() === now.toDateString();
                });
                break;
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(session => {
                    const sessionDate = new Date(session.date);
                    return sessionDate >= weekAgo;
                });
                break;
        }

        // Ordenar por fecha (más reciente primero)
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    setActiveFilter(filter) {
        this.currentFilter = filter;
        
        // Actualizar UI
        this.filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        this.renderSessions();
    }

    filterSessions(searchTerm) {
        this.renderSessions();
    }

    loadSession(session) {
        this.currentSession = session;
        
        // Marcar como activa en la lista
        document.querySelectorAll('.session-card').forEach(card => {
            card.classList.toggle('active', card.dataset.sessionId === session.id);
        });

        // Actualizar UI principal
        const currentSessionTitle = document.getElementById('currentSessionTitle');
        const sessionTitleInput = document.getElementById('sessionTitleInput');
        const sessionParticipants = document.getElementById('sessionParticipants');
        const currentSession = document.getElementById('currentSession');

        if (currentSessionTitle) currentSessionTitle.textContent = session.title;
        if (sessionTitleInput) sessionTitleInput.value = session.title;
        if (sessionParticipants) sessionParticipants.value = session.participants;
        if (currentSession) currentSession.textContent = session.title;

        // Cargar transcripción y resumen si existen
        if (session.transcription) {
            const transcriptionResult = document.getElementById('transcriptionResult');
            const transcribeBtn = document.getElementById('transcribeBtn');
            
            if (transcriptionResult) transcriptionResult.value = session.transcription;
            if (transcribeBtn) transcribeBtn.disabled = false;
            
            // IMPORTANTE: Actualizar también el TranscriptionManager
            const transcriptionManager = window.app?.transcriptionManager;
            if (transcriptionManager) {
                transcriptionManager.currentTranscription = session.transcription;
            }
        }
        
        // Cargar audio si existe
        if (session.hasAudio && session.audioFile) {
            const recordingManager = window.app?.recordingManager;
            if (recordingManager) {
                const audioUrl = `/sessions-audio/${session.audioFile}`;
                recordingManager.loadSessionAudio(audioUrl, session.uploadedFile || 'Audio de sesión');
            }
        }
        
        if (session.summary) {
            const summaryResult = document.getElementById('summaryResult');
            if (summaryResult) summaryResult.value = session.summary;
        }

        this.notifications.info(`Sesión "${session.title}" cargada`);
        
        // CRÍTICO: Auto-guardar la sesión actual en localStorage para otros componentes
        localStorage.setItem('currentSessionId', session.id);
    }

    async createNewSession(data) {
        const session = {
            id: `session-${Date.now()}`,
            title: data.title || 'Nueva Sesión',
            participants: data.participants || '',
            date: new Date(),
            duration: '00:00:00',
            category: data.category || 'meeting',
            status: 'recording',
            transcription: '',
            summary: ''
        };

        this.sessions.unshift(session);
        this.currentSession = session;
        
        // Actualizar UI
        const titleEl = document.getElementById('currentSessionTitle');
        const breadcrumbEl = document.getElementById('currentSession');
        const titleInputEl = document.getElementById('sessionTitleInput');
        const participantsEl = document.getElementById('sessionParticipants');
        
        if (titleEl) titleEl.textContent = session.title;
        if (breadcrumbEl) breadcrumbEl.textContent = session.title;
        if (titleInputEl) titleInputEl.value = session.title;
        if (participantsEl) participantsEl.value = session.participants;
        
        this.renderSessions();
        
        // Resetear stepper para nueva sesión
        if (this.progressStepper) {
            this.progressStepper.reset();
        }
        
        // Asegurar que el modo de grabación esté activo
        if (window.app && window.app.uiManager) {
            window.app.uiManager.switchMode('record');
        }
        
        this.notifications.success(`✨ Nueva sesión "${session.title}" creada. ¡Ya puedes grabar!`);
        
        // CRÍTICO: Auto-guardar la sesión actual en localStorage para otros componentes
        localStorage.setItem('currentSessionId', session.id);
        
        // IMPORTANTE: Guardar la sesión inmediatamente en el servidor
        try {
            await this.autoSaveSession();
        } catch (error) {
            console.error('Error guardando nueva sesión:', error);
        }
        
        return session;
    }

    async saveSession(transcription, summary = '') {
        if (!this.currentSession) return;

        this.currentSession.transcription = transcription;
        this.currentSession.summary = summary;
        this.currentSession.status = 'completed';

        try {
            // Intentar guardar en servidor
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.currentSession)
            });

            if (response.ok) {
                this.notifications.success('Sesión guardada correctamente');
            } else {
                throw new Error('Error del servidor');
            }
        } catch (error) {
            // Por ahora, solo guardar en memoria local
            this.notifications.success('Sesión guardada localmente');
        }

        this.renderSessions();
    }

    getPromptTemplate(templateName) {
        return this.templates[templateName] || '';
    }

    getTimeAgo(date) {
        const now = new Date();
        const sessionDate = new Date(date);
        const diff = now - sessionDate;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours} h`;
        return `Hace ${days} día${days > 1 ? 's' : ''}`;
    }

    getCurrentSession() {
        return this.currentSession;
    }

    updateSessionDuration(duration) {
        if (this.currentSession) {
            this.currentSession.duration = duration;
        }
    }

    async autoSaveSession() {
        if (!this.currentSession) {
            console.log('⚠️ No hay sesión actual para auto-guardar');
            return;
        }

        try {
            console.log(`🔄 Auto-guardando sesión: ${this.currentSession.id}`);
            
            // Actualizar timestamp
            this.currentSession.updatedAt = new Date().toISOString();
            
            // Guardar en servidor
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.currentSession)
            });

            if (response.ok) {
                console.log(`✅ Sesión auto-guardada: ${this.currentSession.id}`);
                // No mostrar notificación para auto-save para no ser molesto
            } else {
                throw new Error('Error del servidor al auto-guardar');
            }
        } catch (error) {
            console.error('❌ Error auto-guardando sesión:', error);
            // No mostrar error al usuario para auto-save
        }
    }

    confirmDeleteSession(session) {
        // Mostrar confirmación antes de eliminar
        const confirmDelete = confirm(
            `¿Estás seguro de que quieres eliminar la sesión "${session.title}"?\n\n` +
            `Se eliminarán:\n` +
            `• La sesión y su transcripción\n` +
            `• El archivo de audio (si existe)\n` +
            `• Los análisis realizados\n\n` +
            `Esta acción no se puede deshacer.`
        );

        if (confirmDelete) {
            this.deleteSession(session);
        }
    }

    async deleteSession(session) {
        try {
            console.log(`🗑️ Eliminando sesión: ${session.id}`);
            
            // Llamar al endpoint del servidor para eliminar
            const response = await fetch(`/api/sessions/${session.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remover de la lista local
                this.sessions = this.sessions.filter(s => s.id !== session.id);
                
                // Si era la sesión actual, limpiar
                if (this.currentSession && this.currentSession.id === session.id) {
                    this.currentSession = null;
                    this.clearCurrentSession();
                }
                
                // Re-renderizar la lista
                this.renderSessions();
                
                this.notifications.success(`✅ Sesión "${session.title}" eliminada correctamente`);
                console.log(`✅ Sesión eliminada: ${session.id}`);
            } else {
                const result = await response.json();
                throw new Error(result.error || 'Error al eliminar sesión');
            }
        } catch (error) {
            console.error('❌ Error eliminando sesión:', error);
            this.notifications.error(`Error al eliminar sesión: ${error.message}`);
        }
    }

    clearCurrentSession() {
        // Limpiar UI cuando se elimina la sesión actual
        const currentSessionTitle = document.getElementById('currentSessionTitle');
        const sessionTitleInput = document.getElementById('sessionTitleInput');
        const sessionParticipants = document.getElementById('sessionParticipants');
        const currentSession = document.getElementById('currentSession');
        const transcriptionResult = document.getElementById('transcriptionResult');
        const summaryResult = document.getElementById('summaryResult');

        if (currentSessionTitle) currentSessionTitle.textContent = 'Nueva Sesión de Grabación';
        if (sessionTitleInput) sessionTitleInput.value = '';
        if (sessionParticipants) sessionParticipants.value = '';
        if (currentSession) currentSession.textContent = 'Nueva Sesión';
        if (transcriptionResult) transcriptionResult.value = '';
        if (summaryResult) summaryResult.value = '';

        // Limpiar localStorage
        localStorage.removeItem('currentSessionId');
        
        // Resetear stepper
        if (this.progressStepper) {
            this.progressStepper.reset();
        }
    }
}