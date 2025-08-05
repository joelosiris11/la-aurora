#!/bin/bash

# LA AURORA - Sistema de Reuniones Ejecutivas
# Script de inicio

echo "🌟 Iniciando LA AURORA..."
echo "📁 Directorio: $(pwd)"

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Verificar que Ollama está corriendo
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "⚠️  Ollama no está corriendo. Iniciando..."
    ollama serve &
    sleep 3
fi

# Verificar dependencias
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar que Python y Whisper están disponibles
if ! python3 -c "import whisper" 2>/dev/null; then
    echo "⚠️  Whisper no está instalado. Instalando..."
    pip3 install openai-whisper
fi

echo "🚀 Iniciando servidor..."
node server.js