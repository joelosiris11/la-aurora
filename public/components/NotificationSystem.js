/**
 * Sistema de Notificaciones Toast
 * Maneja notificaciones temporales para feedback al usuario
 */
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notifications');
        this.notifications = [];
        this.activeMessages = new Set(); // Para evitar duplicados
    }

    show(message, type = 'info', duration = 5000) {
        // Evitar duplicados
        const messageKey = `${type}:${message}`;
        if (this.activeMessages.has(messageKey)) {
            return null; // No mostrar duplicado
        }

        const notification = this.createNotification(message, type, duration);
        notification.messageKey = messageKey; // Guardar referencia para limpieza
        this.container.appendChild(notification);
        this.notifications.push(notification);
        this.activeMessages.add(messageKey);

        // Auto-remover después del tiempo especificado
        setTimeout(() => {
            this.remove(notification);
            this.activeMessages.delete(messageKey);
        }, duration);

        return notification;
    }

    createNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">${icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${this.getTitle(type)}</div>
                    <div style="font-size: 0.875rem; opacity: 0.8;">${message}</div>
                </div>
                <button class="notification-close" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.6;">×</button>
            </div>
        `;

        // Evento para cerrar manualmente
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.remove(notification);
        });

        return notification;
    }

    remove(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
                // Limpiar del set de mensajes activos si existe
                if (notification.messageKey) {
                    this.activeMessages.delete(notification.messageKey);
                }
            }, 300);
        }
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    getTitle(type) {
        const titles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };
        return titles[type] || titles.info;
    }

    // Métodos de conveniencia
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
    }
}

// CSS adicional para animación y estilos mejorados
const notificationStyles = `
.notification {
    background: rgba(17, 24, 39, 0.95) !important;
    backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important;
    color: white !important;
    border-radius: 16px !important;
    padding: 16px !important;
    margin-bottom: 12px !important;
    min-width: 320px !important;
    max-width: 480px !important;
    animation: slideIn 0.3s ease forwards !important;
}

.notification.success {
    border-left: 4px solid #10B981 !important;
    background: rgba(5, 46, 22, 0.95) !important;
}

.notification.error {
    border-left: 4px solid #EF4444 !important;
    background: rgba(69, 10, 10, 0.95) !important;
}

.notification.warning {
    border-left: 4px solid #F59E0B !important;
    background: rgba(69, 39, 3, 0.95) !important;
}

.notification.info {
    border-left: 4px solid #3B82F6 !important;
    background: rgba(7, 29, 61, 0.95) !important;
}

.notification-close {
    color: rgba(255, 255, 255, 0.6) !important;
    transition: color 0.2s ease !important;
}

.notification-close:hover {
    color: rgba(255, 255, 255, 1) !important;
}

@keyframes slideIn {
    from { 
        transform: translateX(100%) scale(0.8);
        opacity: 0;
    }
    to { 
        transform: translateX(0) scale(1);
        opacity: 1;
    }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;

// Agregar estilos si no existen
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = notificationStyles;
    document.head.appendChild(style);
}