/**
 * Gestor de Action Items
 * Extrae y maneja elementos de acción de las transcripciones
 */
class ActionItemsManager {
    constructor() {
        this.actionItems = [];
        this.actionsList = document.getElementById('actionsList');
        this.noActions = document.querySelector('.no-actions');
    }

    extractFromText(text) {
        this.actionItems = [];
        
        // Patrones para detectar action items
        const patterns = [
            // Items con guiones
            /(?:^|\n)[-•*]\s*(.+?)(?=\n|$)/gm,
            // Items numerados
            /(?:^|\n)\d+\.\s*(.+?)(?=\n|$)/gm,
            // Tareas explícitas
            /(?:tarea|acción|hacer|completar|implementar|resolver):\s*(.+?)(?=\n|\.|,|$)/gim,
            // Responsabilidades
            /(.+?)\s+(?:debe|debería|tiene que|va a)\s+(.+?)(?=\n|\.|,|$)/gim,
            // Fechas límite
            /(.+?)\s+(?:para|antes del|hasta)\s+(\d{1,2}\/\d{1,2}|\w+\s+\d{1,2})/gim
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const actionText = match[1] ? match[1].trim() : match[0].trim();
                if (actionText.length > 10 && actionText.length < 200) {
                    this.actionItems.push({
                        id: this.generateId(),
                        text: actionText,
                        completed: false,
                        priority: this.detectPriority(actionText),
                        assignee: this.detectAssignee(actionText),
                        dueDate: this.detectDueDate(actionText),
                        createdAt: new Date()
                    });
                }
            }
        });

        // Remover duplicados
        this.actionItems = this.removeDuplicates(this.actionItems);
        
        this.render();
        return this.actionItems;
    }

    detectPriority(text) {
        const urgentWords = ['urgente', 'crítico', 'inmediato', 'prioridad', 'asap'];
        const importantWords = ['importante', 'clave', 'fundamental', 'esencial'];
        
        const lowerText = text.toLowerCase();
        
        if (urgentWords.some(word => lowerText.includes(word))) {
            return 'high';
        } else if (importantWords.some(word => lowerText.includes(word))) {
            return 'medium';
        }
        
        return 'low';
    }

    detectAssignee(text) {
        // Buscar nombres propios o pronombres
        const assigneePatterns = [
            /(\w+)\s+(?:debe|debería|tiene que|va a)/i,
            /(?:asignar a|responsable:|encargado:)\s*(\w+)/i,
            /(\w+)\s+se encargará/i
        ];
        
        for (const pattern of assigneePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    detectDueDate(text) {
        const datePatterns = [
            /(?:para|antes del|hasta)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
            /(?:para|antes del|hasta)\s+(\w+\s+\d{1,2})/i,
            /(mañana|hoy|esta semana|próxima semana|este mes)/i
        ];
        
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return this.parseDate(match[1]);
            }
        }
        
        return null;
    }

    parseDate(dateStr) {
        const today = new Date();
        const lowerStr = dateStr.toLowerCase();
        
        switch (lowerStr) {
            case 'hoy':
                return today;
            case 'mañana':
                return new Date(today.getTime() + 24 * 60 * 60 * 1000);
            case 'esta semana':
                const endOfWeek = new Date(today);
                endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
                return endOfWeek;
            case 'próxima semana':
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return nextWeek;
            default:
                // Intentar parsear fecha normal
                const parsed = new Date(dateStr);
                return isNaN(parsed.getTime()) ? null : parsed;
        }
    }

    removeDuplicates(items) {
        const seen = new Set();
        return items.filter(item => {
            const key = item.text.toLowerCase().substring(0, 50);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    render() {
        if (!this.actionsList) return;

        // Limpiar contenido existente
        this.actionsList.innerHTML = '';

        if (this.actionItems.length === 0) {
            this.actionsList.innerHTML = `
                <div class="no-actions">
                    <span class="icon">📝</span>
                    <p>No se encontraron action items en la transcripción</p>
                </div>
            `;
            return;
        }

        // Ordenar por prioridad y fecha
        const sortedItems = this.actionItems.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            
            if (priorityDiff !== 0) return priorityDiff;
            
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            } else if (a.dueDate) {
                return -1;
            } else if (b.dueDate) {
                return 1;
            }
            
            return 0;
        });

        // Renderizar items
        sortedItems.forEach(item => {
            const itemElement = this.createActionItemElement(item);
            this.actionsList.appendChild(itemElement);
        });
    }

    createActionItemElement(item) {
        const div = document.createElement('div');
        div.className = `action-item priority-${item.priority}`;
        div.dataset.itemId = item.id;

        const priorityIcon = {
            high: '🔴',
            medium: '🟡', 
            low: '🟢'
        }[item.priority];

        const dueDateStr = item.dueDate 
            ? new Date(item.dueDate).toLocaleDateString()
            : '';

        div.innerHTML = `
            <div class="action-content">
                <input type="checkbox" id="action-${item.id}" class="action-checkbox" ${item.completed ? 'checked' : ''}>
                <label for="action-${item.id}" class="action-text ${item.completed ? 'completed' : ''}">
                    ${item.text}
                </label>
                <span class="priority-indicator" title="Prioridad ${item.priority}">${priorityIcon}</span>
            </div>
            <div class="action-meta">
                ${item.assignee ? `<span class="assignee">👤 ${item.assignee}</span>` : ''}
                ${dueDateStr ? `<span class="due-date">📅 ${dueDateStr}</span>` : ''}
                <span class="created-date">Extraído automáticamente</span>
                <button class="action-delete" title="Eliminar">🗑️</button>
            </div>
        `;

        // Event listeners
        const checkbox = div.querySelector('.action-checkbox');
        checkbox.addEventListener('change', () => {
            this.toggleComplete(item.id, checkbox.checked);
        });

        const deleteBtn = div.querySelector('.action-delete');
        deleteBtn.addEventListener('click', () => {
            this.deleteItem(item.id);
        });

        return div;
    }

    toggleComplete(itemId, completed) {
        const item = this.actionItems.find(item => item.id === itemId);
        if (item) {
            item.completed = completed;
            
            // Actualizar UI
            const element = document.querySelector(`[data-item-id="${itemId}"]`);
            const label = element.querySelector('.action-text');
            label.classList.toggle('completed', completed);
            
            // Notificar cambio
            if (window.app && window.app.notificationSystem) {
                const message = completed ? 'Action item completado' : 'Action item marcado como pendiente';
                window.app.notificationSystem.success(message, 2000);
            }
        }
    }

    deleteItem(itemId) {
        this.actionItems = this.actionItems.filter(item => item.id !== itemId);
        
        // Remover del DOM
        const element = document.querySelector(`[data-item-id="${itemId}"]`);
        if (element) {
            element.remove();
        }
        
        // Re-renderizar si no hay más items
        if (this.actionItems.length === 0) {
            this.render();
        }
        
        if (window.app && window.app.notificationSystem) {
            window.app.notificationSystem.info('Action item eliminado', 2000);
        }
    }

    addManualItem(text, priority = 'medium', assignee = null, dueDate = null) {
        const item = {
            id: this.generateId(),
            text: text,
            completed: false,
            priority: priority,
            assignee: assignee,
            dueDate: dueDate,
            createdAt: new Date(),
            manual: true
        };
        
        this.actionItems.push(item);
        this.render();
        
        return item;
    }

    exportToText() {
        if (this.actionItems.length === 0) {
            return 'No hay action items para exportar.';
        }
        
        let text = 'ACTION ITEMS\n';
        text += '=' .repeat(40) + '\n\n';
        
        const groupedByPriority = {
            high: this.actionItems.filter(item => item.priority === 'high'),
            medium: this.actionItems.filter(item => item.priority === 'medium'),
            low: this.actionItems.filter(item => item.priority === 'low')
        };
        
        Object.entries(groupedByPriority).forEach(([priority, items]) => {
            if (items.length > 0) {
                const priorityName = {
                    high: 'ALTA PRIORIDAD',
                    medium: 'PRIORIDAD MEDIA',
                    low: 'BAJA PRIORIDAD'
                }[priority];
                
                text += `${priorityName}\n`;
                text += '-'.repeat(priorityName.length) + '\n';
                
                items.forEach((item, index) => {
                    text += `${index + 1}. ${item.completed ? '[✓]' : '[ ]'} ${item.text}\n`;
                    if (item.assignee) text += `   👤 Responsable: ${item.assignee}\n`;
                    if (item.dueDate) text += `   📅 Fecha límite: ${new Date(item.dueDate).toLocaleDateString()}\n`;
                    text += '\n';
                });
            }
        });
        
        return text;
    }

    generateId() {
        return 'action-' + Math.random().toString(36).substr(2, 9);
    }
}

// CSS adicional para action items
const actionItemsStyles = `
.action-item {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    background: var(--background);
    transition: all 0.2s ease;
}

.action-item:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow-sm);
}

.action-item.priority-high {
    border-left: 4px solid var(--danger);
}

.action-item.priority-medium {
    border-left: 4px solid var(--warning);
}

.action-item.priority-low {
    border-left: 4px solid var(--success);
}

.action-content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.action-checkbox {
    margin-top: 2px;
}

.action-text {
    flex: 1;
    font-size: var(--font-size-sm);
    line-height: 1.4;
    cursor: pointer;
}

.action-text.completed {
    text-decoration: line-through;
    opacity: 0.6;
}

.priority-indicator {
    font-size: 1rem;
}

.action-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    font-size: var(--font-size-xs);
    color: var(--foreground-muted);
}

.assignee, .due-date, .created-date {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.action-delete {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s ease;
    margin-left: auto;
}

.action-delete:hover {
    opacity: 1;
}

.no-actions {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--foreground-muted);
}

.no-actions .icon {
    font-size: 2rem;
    margin-bottom: var(--spacing-md);
    display: block;
}
`;

// Agregar estilos si no existen
if (!document.querySelector('#action-items-styles')) {
    const style = document.createElement('style');
    style.id = 'action-items-styles';
    style.textContent = actionItemsStyles;
    document.head.appendChild(style);
}