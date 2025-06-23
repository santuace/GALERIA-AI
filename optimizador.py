import os
import tinify

# 🔑 Clave de API de Tinify (no la compartas públicamente)
tinify.key = "d6cssF6DBMyDymDQ9QnpFHlwNP7lPmMB"

# 📂 Carpetas
input_folder = "imagenes"
output_folder = "imagenes-optim"

# Crear carpeta de salida si no existe
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# Optimizar imágenes
for filename in os.listdir(input_folder):
    if filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        input_path = os.path.join(input_folder, filename)
        output_path = os.path.join(output_folder, filename)

        try:
            print(f"Optimizando: {filename}")
            source = tinify.from_file(input_path)
            source.to_file(output_path)
        except Exception as e:
            print(f"⚠️ Error al procesar {filename}: {e}")

print("✅ Optimización completa. Archivos guardados en 'imagenes-optim'.")
