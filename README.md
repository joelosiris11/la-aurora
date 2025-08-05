# 🌟 LA AURORA - Sistema de Reuniones Ejecutivas

**Sistema inteligente de grabación, transcripción y análisis de reuniones empresariales con IA local.**

![LA AURORA](./public/assets/logo.png)

## ✨ Características Principales

- 🎤 **Grabación en vivo** con visualización de ondas de audio
- 📁 **Importación de archivos** MP3, WAV, M4A, WEBM
- 🤖 **Transcripción local** con Whisper (OpenAI)
- 🧠 **Análisis inteligente** con Ollama (modelos locales)
- 💾 **Gestión de sesiones** con auto-guardado
- 🗑️ **Control completo** - crear, cargar y eliminar sesiones
- 🎨 **UI moderna** inspirada en Material Design
- 🔒 **100% local** - sin envío de datos a terceros

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js (v16+)
- Python 3.8+
- Ollama instalado y corriendo

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/la-aurora.git
cd la-aurora
```

### 2. Instalar dependencias
```bash
npm run setup
```

### 3. Instalar Whisper
```bash
pip3 install openai-whisper
```

### 4. Configurar Ollama
```bash
# Instalar modelo recomendado
ollama pull gemma2:2b

# O un modelo más potente
ollama pull llama3.1:8b
```

### 5. Iniciar la aplicación
```bash
npm start
# O usar el script personalizado
./start.sh
# O crear alias
alias aurora="cd $(pwd) && node server.js"
```

## 🎯 Uso

1. **Accede** a http://localhost:3000/pro
2. **Crea una nueva sesión** con título y participantes
3. **Graba en vivo** o **sube un archivo de audio**
4. **Transcribe** automáticamente con Whisper
5. **Analiza** con diferentes plantillas de IA:
   - 📋 Resumen Ejecutivo
   - ✅ Plan de Acción
   - 🎯 Decisiones Tomadas
   - 💡 Ideas y Oportunidades
   - ⚠️ Riesgos y Desafíos
   - 📅 Plan de Seguimiento

## 🏗️ Arquitectura

### Frontend
- **Vanilla JavaScript** modular
- **CSS Grid/Flexbox** responsive
- **Web Audio API** para grabación
- **Material Design** principles

### Backend
- **Node.js + Express** server
- **Multer** para uploads
- **fs-extra** para gestión de archivos
- **Local Whisper** via Python subprocess
- **Ollama API** para procesamiento de IA

### Estructura del Proyecto
```
la-aurora/
├── public/
│   ├── components/          # Componentes JS modulares
│   ├── assets/             # Logo y recursos
│   ├── styles.css          # Estilos principales
│   ├── index-pro.html      # Interfaz principal
│   └── resumen.html        # Página de análisis
├── sessions/               # Datos de sesiones (local)
├── uploads/               # Archivos de audio temporales
├── server.js              # Servidor principal
├── whisper_transcriber.py # Script de transcripción
└── start.sh              # Script de inicio
```

## 🔧 Configuración

### Variables de Entorno (Opcional)
```bash
# .env
WHISPER_MODEL=base          # tiny, base, small, medium, large
OLLAMA_MODEL=gemma2:2b     # Modelo de Ollama a usar
PORT=3000                  # Puerto del servidor
```

### Modelos Whisper Disponibles
- `tiny` - Más rápido, menos preciso
- `base` - Balance recomendado
- `small` - Mejor precisión
- `medium` - Alta precisión
- `large` - Máxima precisión (requiere más RAM)

## 📊 Plantillas de Análisis

### Resumen Ejecutivo
Puntos clave para directivos y toma de decisiones estratégicas.

### Plan de Acción
Tareas específicas con responsables y fechas límite.

### Decisiones Tomadas
Acuerdos alcanzados y compromisos establecidos.

### Ideas y Oportunidades
Insights valiosos e oportunidades identificadas.

### Riesgos y Desafíos
Problemas identificados y estrategias de mitigación.

### Plan de Seguimiento
Próximas reuniones y temas pendientes.

## 🛠️ Desarrollo

### Estructura de Componentes
```javascript
// Managers principales
- SessionManager     // Gestión de sesiones
- RecordingManager   // Grabación de audio
- UploadManager      // Subida de archivos
- TranscriptionManager // Whisper integration
- UIManager          // Control de interfaz
- NotificationSystem // Sistema de notificaciones
```

### API Endpoints
```
GET    /api/sessions          # Listar sesiones
POST   /api/sessions          # Crear/actualizar sesión
GET    /api/sessions/:id      # Obtener sesión específica
DELETE /api/sessions/:id      # Eliminar sesión
POST   /api/sessions/analysis # Guardar análisis
POST   /transcribe           # Transcribir audio
POST   /process-with-ollama  # Procesar con IA
```

## 🚀 Despliegue

### Docker (Próximamente)
```bash
docker build -t la-aurora .
docker run -p 3000:3000 la-aurora
```

### Servidor Local
```bash
# Producción
NODE_ENV=production npm start

# Con PM2
pm2 start server.js --name "la-aurora"
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

- [ ] 🐳 Docker containerization
- [ ] 🔐 Autenticación de usuarios
- [ ] 📊 Dashboard de métricas
- [ ] 🌐 Soporte multi-idioma
- [ ] 📱 App móvil (React Native)
- [ ] ☁️ Integración con cloud storage
- [ ] 🔗 API webhooks
- [ ] 📈 Analytics avanzados

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- [OpenAI Whisper](https://github.com/openai/whisper) - Transcripción de audio
- [Ollama](https://ollama.ai/) - Modelos de IA locales
- [Express.js](https://expressjs.com/) - Framework web
- Comunidad open source

---

**Desarrollado con ❤️ para mejorar la productividad empresarial**