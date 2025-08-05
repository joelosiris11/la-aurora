#!/usr/bin/env python3
"""
Script de transcripción usando Whisper local
Maneja la descarga automática del modelo y la transcripción de archivos de audio
"""

import whisper
import sys
import os
import json
import warnings
import ssl

# Configurar SSL para resolver problemas de certificados
ssl._create_default_https_context = ssl._create_unverified_context

# Suprimir warnings de Whisper
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

class WhisperTranscriber:
    def __init__(self, model_name="base"):
        """
        Inicializa el transcriptor de Whisper
        
        Args:
            model_name (str): Nombre del modelo a usar ("tiny", "base", "small", "medium", "large")
        """
        self.model_name = model_name
        self.model = None
        
    def load_model(self):
        """Carga el modelo de Whisper, descargándolo si es necesario"""
        try:
            print(f"Cargando modelo Whisper '{self.model_name}'...", file=sys.stderr)
            self.model = whisper.load_model(self.model_name)
            print(f"Modelo '{self.model_name}' cargado correctamente", file=sys.stderr)
            return True
        except Exception as e:
            print(f"Error cargando modelo: {str(e)}", file=sys.stderr)
            return False
    
    def transcribe_file(self, audio_path, language="es"):
        """
        Transcribe un archivo de audio
        
        Args:
            audio_path (str): Ruta al archivo de audio
            language (str): Idioma del audio (opcional)
            
        Returns:
            dict: Resultado de la transcripción
        """
        if not self.model:
            if not self.load_model():
                return {"error": "No se pudo cargar el modelo"}
        
        if not os.path.exists(audio_path):
            return {"error": f"Archivo no encontrado: {audio_path}"}
        
        try:
            print(f"Transcribiendo archivo: {audio_path}", file=sys.stderr)
            
            # Configurar opciones de transcripción
            options = {
                "language": language,
                "task": "transcribe",
                "fp16": False,  # Usar fp32 para mejor compatibilidad
            }
            
            # Realizar transcripción
            result = self.model.transcribe(audio_path, **options)
            
            return {
                "success": True,
                "text": result["text"].strip(),
                "language": result.get("language", language),
                "segments": [
                    {
                        "start": seg["start"],
                        "end": seg["end"], 
                        "text": seg["text"].strip()
                    }
                    for seg in result.get("segments", [])
                ]
            }
            
        except Exception as e:
            error_msg = f"Error en transcripción: {str(e)}"
            print(error_msg, file=sys.stderr)
            return {"error": error_msg}

def main():
    """Función principal para uso desde línea de comandos"""
    if len(sys.argv) < 2:
        print("Uso: python3 whisper_transcriber.py <archivo_audio> [modelo] [idioma]")
        print("Modelos disponibles: tiny, base, small, medium, large")
        print("Idiomas: es, en, fr, de, etc.")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else "es"
    
    # Crear transcriptor
    transcriber = WhisperTranscriber(model_name)
    
    # Transcribir archivo
    result = transcriber.transcribe_file(audio_file, language)
    
    # Imprimir resultado como JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()