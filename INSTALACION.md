# 🚀 Guía de Instalación - LA AURORA

## Sistema de Reuniones Ejecutivas con IA Local

Esta guía te ayudará a instalar y configurar **LA AURORA**, un sistema completo de transcripción y análisis de reuniones que utiliza modelos de IA 100% locales.

---

## 📋 Requisitos Previos

### Sistema Operativo
- **macOS** (recomendado)
- **Linux** (Ubuntu 20.04+)
- **Windows** (con WSL2)

### Hardware Mínimo
- **RAM**: 8GB (16GB recomendado)
- **Procesador**: Intel i5/AMD Ryzen 5 o superior
- **Almacenamiento**: 10GB libres
- **GPU**: Opcional (acelera transcripción)

---

## 🛠️ Instalación Paso a Paso

### 1. Instalar Node.js

#### macOS (con Homebrew):
```bash
brew install node
```

#### Linux (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Windows:
Descarga desde [nodejs.org](https://nodejs.org/)

### 2. Clonar el Repositorio

```bash
git clone https://github.com/joelosiris11/la-aurora.git
cd la-aurora
```

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Instalar Python y Dependencias

#### macOS:
```bash
brew install python3
pip3 install openai-whisper torch torchaudio
```

#### Linux:
```bash
sudo apt update
sudo apt install python3 python3-pip ffmpeg
pip3 install openai-whisper torch torchaudio
```

### 5. Instalar Ollama

#### macOS/Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows:
Descarga desde [ollama.ai](https://ollama.ai/download)

### 6. Configurar Modelos de IA

#### Descargar Modelo de Ollama (por defecto):
```bash
ollama pull gemma2:2b
```

#### Descargar Modelo de Whisper (por defecto):
```bash
# Se descarga automáticamente en el primer uso
# Modelo por defecto: "base"
```

---

## ⚙️ Configuración de Modelos

### 🤖 Cambiar Modelo de Ollama

Puedes usar cualquier modelo compatible con Ollama:

#### Modelos Recomendados:
```bash
# Ligeros (2-4GB RAM)
ollama pull gemma2:2b
ollama pull phi3:mini

# Medianos (8-16GB RAM)
ollama pull llama3.1:8b
ollama pull mistral:7b

# Pesados (16GB+ RAM)
ollama pull llama3.1:70b
ollama pull codellama:34b
```

#### Cambiar en el Código:
Edita `server.js` línea ~15:
```javascript
const OLLAMA_MODEL = 'gemma2:2b'; // Cambia aquí tu modelo
```

### 🎤 Cambiar Modelo de Whisper

#### Modelos Disponibles:
- `tiny` - Más rápido, menos preciso (39MB)
- `base` - Balanceado (74MB) **[Por defecto]**
- `small` - Mejor precisión (244MB)
- `medium` - Muy buena precisión (769MB)
- `large` - Máxima precisión (1550MB)

#### Cambiar en el Código:
Edita `server.js` línea ~16:
```javascript
const WHISPER_MODEL = 'base'; // tiny, base, small, medium, large
```

#### Cambiar Idioma:
Edita `server.js` línea ~17:
```javascript
const WHISPER_LANGUAGE = 'es'; // es, en, fr, de, it, pt, etc.
```

---

## 🚀 Ejecutar la Aplicación

### Método 1: Script de Inicio
```bash
chmod +x start.sh
./start.sh
```

### Método 2: Manual
```bash
node server.js
```

### Método 3: NPM Script
```bash
npm run aurora
```

---

## 🌐 Configurar Acceso Público (Opcional)

### Instalar Cloudflare Tunnel

#### macOS:
```bash
brew install cloudflared
```

#### Linux:
```bash
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Crear Tunnel:
1. Visita [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Crea un tunnel
3. Copia el token
4. Ejecuta:
```bash
cloudflared tunnel --protocol http2 run --token TU_TOKEN_AQUI
```

---

## 📁 Estructura del Proyecto

```
la-aurora/
├── server.js              # Servidor principal
├── package.json            # Dependencias Node.js
├── whisper_transcriber.py  # Script de transcripción
├── public/                 # Frontend
│   ├── index.html         # Selector de modos
│   ├── index-pro.html     # Modo profesional
│   ├── automatic.html     # Modo automático
│   ├── resumen.html       # Análisis avanzado
│   ├── styles.css         # Estilos principales
│   ├── components/        # Componentes JavaScript
│   └── assets/           # Recursos estáticos
├── sessions/             # Sesiones guardadas
└── uploads/             # Archivos temporales
```

---

## 🎯 Modos de Uso

### 1. **Modo Automático** (`/auto`)
- Grabación/subida simple
- Transcripción automática
- Resumen inteligente
- Ideal para reuniones rápidas

### 2. **Modo Profesional** (`/pro`)
- Control total del proceso
- Gestión de sesiones
- Múltiples opciones de análisis
- Ideal para reuniones importantes

### 3. **Análisis Avanzado** (`/resumen`)
- Múltiples tipos de análisis
- Resúmenes ejecutivos
- Planes de acción
- Análisis de sentimientos

---

## 🔧 Configuración Avanzada

### Variables de Entorno

Crea un archivo `.env`:
```bash
# Puerto del servidor
PORT=3000

# Modelos de IA
OLLAMA_MODEL=gemma2:2b
WHISPER_MODEL=base
WHISPER_LANGUAGE=es

# Configuración de archivos
MAX_FILE_SIZE=50mb
SESSION_RETENTION_DAYS=30

# Cloudflare (opcional)
CLOUDFLARE_TOKEN=tu_token_aqui
```

### Personalizar Prompts de IA

Edita `server.js` líneas ~200-250 para modificar los prompts de análisis.

---

## 🐛 Solución de Problemas

### Error: "Ollama no encontrado"
```bash
# Verificar instalación
ollama --version

# Iniciar servicio
ollama serve

# Descargar modelo
ollama pull gemma2:2b
```

### Error: "Whisper no encontrado"
```bash
# Reinstalar Whisper
pip3 uninstall openai-whisper
pip3 install openai-whisper

# Verificar FFmpeg
ffmpeg -version
```

### Error: "Puerto 3000 ocupado"
```bash
# Encontrar proceso
lsof -ti:3000

# Terminar proceso
kill -9 $(lsof -ti:3000)
```

### Error: "Archivo muy grande"
Edita `server.js` línea ~50:
```javascript
app.use(express.json({ limit: '100mb' }));
```

---

## 📊 Monitoreo y Logs

### Ver logs en tiempo real:
```bash
tail -f logs/app.log
```

### Verificar uso de recursos:
```bash
# CPU y memoria
htop

# Uso de GPU (si aplica)
nvidia-smi
```

---

## 🔒 Seguridad

### Configurar HTTPS (Producción):
```bash
# Generar certificados SSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Editar server.js para usar HTTPS
```

### Configurar Firewall:
```bash
# Ubuntu/Debian
sudo ufw allow 3000
sudo ufw enable
```

---

## 🔄 Actualizaciones

### Actualizar LA AURORA:
```bash
git pull origin main
npm install
```

### Actualizar Modelos:
```bash
# Ollama
ollama pull gemma2:2b

# Whisper se actualiza automáticamente
pip3 install --upgrade openai-whisper
```

---

## 📞 Soporte

### Logs de Debug:
```bash
# Activar modo debug
export DEBUG=true
node server.js
```

### Reportar Issues:
- GitHub: [Issues](https://github.com/joelosiris11/la-aurora/issues)
- Email: soporte@la-aurora.com

---

## 📄 Licencia

MIT License - Ver archivo `LICENSE` para más detalles.

---

## 🎉 ¡Listo!

Tu instalación de **LA AURORA** está completa. Accede a:

- **Local**: `http://localhost:3000`
- **Público**: Tu URL de Cloudflare Tunnel

### Próximos Pasos:
1. Crea tu primera sesión
2. Prueba ambos modos (Automático y Profesional)
3. Experimenta con diferentes modelos de IA
4. Configura acceso público si es necesario

¡Disfruta de tu sistema de reuniones con IA! 🚀