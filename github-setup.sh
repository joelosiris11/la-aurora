#!/bin/bash

echo "🌟 Configurando LA AURORA para GitHub..."

# Reemplaza TU_USUARIO con tu nombre de usuario de GitHub
GITHUB_USER="TU_USUARIO"

echo "📝 Configura tu usuario de GitHub:"
echo "git remote add origin https://github.com/$GITHUB_USER/la-aurora.git"
echo "git branch -M main"
echo "git push -u origin main"

echo ""
echo "🔧 O si prefieres SSH:"
echo "git remote add origin git@github.com:$GITHUB_USER/la-aurora.git"
echo "git branch -M main" 
echo "git push -u origin main"

echo ""
echo "✨ Después de crear el repo en GitHub, ejecuta los comandos de arriba"
echo "🌐 Reemplaza TU_USUARIO con tu nombre de usuario real de GitHub"