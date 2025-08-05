# 🚀 Guía de Instalación Rápida

## Variables de Entorno Necesarias

Crea un archivo `.env` en la raíz del proyecto con:

```env
# Puerto del servidor (opcional, por defecto 3000)
PORT=3000

# URL de Ollama (opcional, por defecto http://localhost:11434)
OLLAMA_URL=http://localhost:11434

# Modelo de Ollama (usar el que tienes instalado)
OLLAMA_MODEL=gemma3:4b

# Modelo de Whisper local (tiny, base, small, medium, large)
WHISPER_MODEL=base
```

## ✨ ¡Modelos 100% Locales!
- ❌ **NO necesitas** API Key de OpenAI 
- ✅ Whisper funciona completamente local
- ✅ Ollama funciona completamente local
- ✅ Sin costo por uso
- ✅ Privacidad total de tus datos

## Instalación de Ollama

### macOS
```bash
brew install ollama
ollama serve
ollama pull llama3.2
```

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
ollama pull llama3.2
```

### Windows
1. Descargar desde https://ollama.ai
2. Instalar y ejecutar
3. En PowerShell: `ollama pull llama3.2`

## Iniciar la Aplicación

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# O iniciar en producción
npm start
```

## Verificar que Todo Funciona

1. **Servidor**: http://localhost:3000 debe cargar la interfaz
2. **Ollama**: `ollama list` debe mostrar los modelos instalados
3. **Whisper**: Se descarga automáticamente al usarse por primera vez
4. **Micrófono**: El navegador debe pedir permisos de micrófono

## Solución Rápida de Problemas

- **Error en Whisper**: El modelo se descarga automáticamente (puede tardar la primera vez)
- **Error de conexión Ollama**: Ejecuta `ollama serve`
- **Sin permisos de micrófono**: Usa HTTPS o localhost
- **Modelo no encontrado**: Ejecuta `ollama pull gemma3:4b`