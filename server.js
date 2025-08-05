const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const fetch = require('node-fetch').default;
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar límite para audio base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Servir archivos de audio de sesiones
app.use('/sessions-audio', express.static('./sessions'));

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `audio_${timestamp}.webm`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

// Endpoint para recibir audio y transcribir con Whisper
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo de audio' });
    }

    console.log('Archivo recibido:', req.file.filename);
    
    // Transcribir con Whisper
    const transcription = await transcribeAudio(req.file.path);
    
    // Guardar el archivo de audio en sessions si se proporciona sessionId
    const sessionId = req.body.sessionId;
    let audioUrl = null;
    
    if (sessionId) {
      try {
        const sessionsDir = './sessions';
        await fs.ensureDir(sessionsDir);
        const extension = path.extname(req.file.originalname);
        const audioFileName = `${sessionId}_uploaded${extension}`;
        const audioPath = path.join(sessionsDir, audioFileName);
        
        // Copiar archivo a sessions
        await fs.copy(req.file.path, audioPath);
        audioUrl = `/sessions-audio/${audioFileName}`;
        
        // Actualizar sesión con info del audio
        const sessionFiles = await fs.readdir(sessionsDir);
        const sessionFile = sessionFiles.find(file => file.includes(sessionId) && file.endsWith('.json'));
        
        if (sessionFile) {
          const sessionPath = path.join(sessionsDir, sessionFile);
          const sessionData = await fs.readJson(sessionPath);
          sessionData.hasAudio = true;
          sessionData.audioFile = audioFileName;
          sessionData.uploadedFile = req.file.originalname;
          await fs.writeJson(sessionPath, sessionData, { spaces: 2 });
        }
      } catch (audioError) {
        console.error('Error guardando audio en sesión:', audioError);
      }
    }
    
    // Limpiar archivo temporal
    await fs.remove(req.file.path);
    
    res.json({ 
      success: true, 
      transcription: transcription,
      filename: req.file.filename,
      audioUrl: audioUrl
    });

  } catch (error) {
    console.error('Error en transcripción:', error);
    res.status(500).json({ 
      error: 'Error al procesar el audio',
      details: error.message 
    });
  }
});

// Endpoint para procesar texto con Ollama
app.post('/process-with-ollama', async (req, res) => {
  try {
    const { text, prompt } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No se proporcionó texto para procesar' });
    }

    const processedText = await processWithOllama(text, prompt);
    
    res.json({ 
      success: true, 
      original: text,
      processed: processedText 
    });

  } catch (error) {
    console.error('Error procesando con Ollama:', error);
    res.status(500).json({ 
      error: 'Error al procesar con Ollama',
      details: error.message 
    });
  }
});

// Función para transcribir audio con Whisper local
async function transcribeAudio(audioPath) {
  return new Promise((resolve, reject) => {
    const whisperModel = process.env.WHISPER_MODEL || 'base';
    const pythonScript = path.join(__dirname, 'whisper_transcriber.py');
    const command = `python3 "${pythonScript}" "${audioPath}" "${whisperModel}" "es"`;
    
    console.log('Ejecutando transcripción:', command);
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error ejecutando Whisper:', error);
        console.error('stderr:', stderr);
        reject(new Error(`Error en Whisper: ${error.message}`));
        return;
      }
      
      try {
        // El script de Python devuelve JSON
        const result = JSON.parse(stdout);
        
        if (result.error) {
          reject(new Error(result.error));
        } else {
          console.log('Transcripción completada exitosamente');
          resolve(result.text);
        }
      } catch (parseError) {
        console.error('Error parseando resultado:', parseError);
        console.error('stdout:', stdout);
        console.error('stderr:', stderr);
        reject(new Error('Error procesando resultado de Whisper'));
      }
    });
  });
}

// Función para procesar texto con Ollama
async function processWithOllama(text, userPrompt = '') {
  try {
    // Construir el prompt incluyendo siempre el texto
    let prompt;
    if (userPrompt && userPrompt.trim()) {
      // Si hay prompt personalizado, incluir el texto al final
      prompt = `${userPrompt.trim()}\n\nTexto a procesar:\n"${text}"`;
    } else {
      // Prompt por defecto
      prompt = `Mejora y estructura el siguiente texto:\n\n"${text}"`;
    }
    
    console.log('Enviando prompt a Ollama:', prompt.substring(0, 200) + '...');
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'gemma3:4b', // Usa el modelo configurado
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Error de Ollama: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;

  } catch (error) {
    console.error('Error con Ollama:', error);
    throw error;
  }
}

// Endpoint para obtener sesiones
app.get('/api/sessions', async (req, res) => {
  try {
    const sessionsDir = './sessions';
    await fs.ensureDir(sessionsDir);
    
    const files = await fs.readdir(sessionsDir);
    const sessions = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(sessionsDir, file);
          const sessionData = await fs.readJson(filePath);
          sessions.push(sessionData);
        } catch (error) {
          console.error(`Error leyendo sesión ${file}:`, error);
        }
      }
    }
    
    // Ordenar por fecha (más reciente primero)
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(sessions);
  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
});

// Endpoint para guardar sesión
app.post('/api/sessions', async (req, res) => {
  try {
    const session = req.body;
    const sessionsDir = './sessions';
    await fs.ensureDir(sessionsDir);
    
    // Guardar audio si existe (base64)
    if (session.audioBlob) {
      try {
        const audioBuffer = Buffer.from(session.audioBlob, 'base64');
        const audioFileName = `${session.id}.webm`;
        const audioPath = path.join(sessionsDir, audioFileName);
        await fs.writeFile(audioPath, audioBuffer);
        
        // Actualizar sesión con info del audio
        session.hasAudio = true;
        session.audioFile = audioFileName;
        delete session.audioBlob; // No guardar el blob en JSON
      } catch (audioError) {
        console.error('Error guardando audio:', audioError);
      }
    }
    
    // Generar nombre de archivo seguro
    const timestamp = new Date(session.date).toISOString().split('T')[0];
    const safeTitle = session.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const fileName = `${timestamp}_${safeTitle}_${session.id}.json`;
    const filePath = path.join(sessionsDir, fileName);
    
    // Guardar datos de sesión
    await fs.writeJson(filePath, session, { spaces: 2 });
    
    // También guardar transcripción como txt si existe
    if (session.transcription) {
      const txtFileName = fileName.replace('.json', '.txt');
      const txtFilePath = path.join(sessionsDir, txtFileName);
      
      const txtContent = `REUNIÓN: ${session.title}
========================================

📅 Fecha: ${new Date(session.date).toLocaleString()}
⏱️  Duración: ${session.duration}
👥 Participantes: ${session.participants || 'No especificados'}
📂 Categoría: ${session.category || 'General'}

TRANSCRIPCIÓN
========================================
${session.transcription}

${session.summary ? `RESUMEN/ANÁLISIS
========================================
${session.summary}` : ''}

---
Generado por ReunionAI - ${new Date().toLocaleString()}`;
      
      await fs.writeFile(txtFilePath, txtContent, 'utf8');
    }
    
    console.log(`Sesión guardada: ${fileName}`);
    res.json({ success: true, fileName });
    
  } catch (error) {
    console.error('Error guardando sesión:', error);
    res.status(500).json({ error: 'Error al guardar sesión' });
  }
});

// Endpoint para obtener una sesión específica
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const sessionsDir = './sessions';
    
    // Asegurar que el directorio existe
    await fs.ensureDir(sessionsDir);
    
    const files = await fs.readdir(sessionsDir);
    console.log(`🔍 Buscando sesión ${sessionId} en archivos:`, files.filter(f => f.endsWith('.json')));
    
    const sessionFile = files.find(file => file.includes(sessionId) && file.endsWith('.json'));
    
    if (!sessionFile) {
      console.log(`❌ Sesión ${sessionId} no encontrada en archivos disponibles`);
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    const filePath = path.join(sessionsDir, sessionFile);
    const sessionData = await fs.readJson(filePath);
    
    console.log(`✅ Sesión ${sessionId} encontrada y enviada`);
    res.json(sessionData);
  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

// Endpoint para eliminar sesión
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const sessionsDir = './sessions';
    
    console.log(`🗑️ Eliminando sesión: ${sessionId}`);
    
    // Asegurar que el directorio existe
    await fs.ensureDir(sessionsDir);
    
    const files = await fs.readdir(sessionsDir);
    console.log(`📁 Archivos disponibles:`, files);
    
    // Buscar todos los archivos relacionados con la sesión (JSON, TXT, audio)
    const sessionFiles = files.filter(file => file.includes(sessionId));
    console.log(`🔍 Archivos a eliminar:`, sessionFiles);
    
    if (sessionFiles.length === 0) {
      console.log(`❌ No se encontraron archivos para la sesión: ${sessionId}`);
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    // Eliminar todos los archivos relacionados
    for (const file of sessionFiles) {
      const filePath = path.join(sessionsDir, file);
      await fs.remove(filePath);
      console.log(`🗑️ Archivo eliminado: ${file}`);
    }
    
    console.log(`✅ Sesión eliminada completamente: ${sessionId} (${sessionFiles.length} archivos)`);
    res.json({ success: true, deletedFiles: sessionFiles.length, files: sessionFiles });
  } catch (error) {
    console.error('❌ Error eliminando sesión:', error);
    res.status(500).json({ error: 'Error al eliminar sesión' });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Servir archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Guardar análisis en sesión
app.post('/api/sessions/analysis', async (req, res) => {
  try {
    const { sessionId, analysis } = req.body;
    const sessionsDir = './sessions';
    
    // Asegurar que el directorio existe
    await fs.ensureDir(sessionsDir);
    
    console.log(`🔍 Guardando análisis para sesión: ${sessionId}`);
    
    // Buscar el archivo de sesión (puede tener prefijo de fecha)
    const sessionFiles = await fs.readdir(sessionsDir);
    console.log(`📁 Archivos disponibles:`, sessionFiles.filter(f => f.endsWith('.json')));
    
    const sessionFile = sessionFiles.find(file => 
      file.includes(sessionId) && file.endsWith('.json')
    );
    
    if (!sessionFile) {
      console.log(`❌ Sesión ${sessionId} no encontrada para guardar análisis`);
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    const sessionPath = path.join(sessionsDir, sessionFile);
    console.log(`📄 Archivo de sesión encontrado: ${sessionFile}`);
    
    // Leer sesión actual
    const sessionData = await fs.readJson(sessionPath);
    
    // Agregar análisis
    sessionData.analysis = analysis;
    sessionData.updatedAt = new Date().toISOString();
    
    // Guardar sesión actualizada
    await fs.writeJson(sessionPath, sessionData, { spaces: 2 });
    
    console.log(`✅ Análisis guardado en sesión: ${sessionId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error guardando análisis:', error);
    res.status(500).json({ error: 'Error guardando análisis' });
  }
});

// Servir nueva interfaz profesional
app.get('/pro', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-pro.html'));
});

// Ruta para la página de análisis/resumen
app.get('/resumen', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resumen.html'));
});

// Ruta para el modo automático
app.get('/auto', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-automatic.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
  console.log('💡 Sistema configurado con:');
  console.log(`   - Whisper local (modelo: ${process.env.WHISPER_MODEL || 'base'})`);
  console.log(`   - Ollama local (modelo: ${process.env.OLLAMA_MODEL || 'gemma3:4b'})`);
  console.log('   - Modelos 100% locales - Sin costos por uso');
  console.log('');
  console.log('🌐 Accede a la aplicación en tu navegador:');
  console.log(`   http://localhost:${PORT}`);
});

module.exports = app;