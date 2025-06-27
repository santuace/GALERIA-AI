// generatePrompts.js

require('dotenv').config();              // 0) Carga vars de tu .env
const fs   = require('fs');
const path = require('path');

// 1) Credenciales de servicio
process.env.GOOGLE_APPLICATION_CREDENTIALS =
  path.join(__dirname, 'gen-lang-client-0354832879-744e172b1a90.json');

// 2) Clientes oficiales
const vision        = require('@google-cloud/vision');
const { GoogleGenAI } = require('@google/genai');

// 3) Lee proyecto y región
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION   = process.env.GOOGLE_CLOUD_LOCATION;
if (!PROJECT_ID || !LOCATION) {
  console.error('❌ Define GOOGLE_CLOUD_PROJECT y GOOGLE_CLOUD_LOCATION en tu .env');
  process.exit(1);
}

// 4) Inicializa los clientes
const visionClient = new vision.ImageAnnotatorClient();
const aiClient     = new GoogleGenAI({
  vertexai:   true,
  project:    PROJECT_ID,
  location:   LOCATION,
  apiVersion: 'v1',
});

// 5) Rutas
const imageFolder = path.join(__dirname, 'imagenes');
const outputFile  = path.join(__dirname, 'gallery_data_concise.js');

// --- CHECKPOINT: carga lo ya procesado si existe ---
let gallery = [];
const processed = new Set();
if (fs.existsSync(outputFile)) {
  const text  = fs.readFileSync(outputFile, 'utf8');
  const match = /const galleryImages = ([\s\S]*?\]);/.exec(text);
  if (match && match[1]) {
    try {
      const existing = JSON.parse(match[1]);
      gallery = existing;
      existing.forEach(item => processed.add(item.filename));
    } catch (e) {
      console.warn('⚠️ No pude parsear gallery_data_restaurado.js, empezando desde cero.');
    }
  }
}

// leer solo imágenes pendientes
const allFiles  = fs.readdirSync(imageFolder).filter(f => /\.(png|jpe?g)$/i.test(f));
const toProcess = allFiles.filter(f => !processed.has(f));

(async () => {
  if (!fs.existsSync(imageFolder)) {
    console.error('❌ No encuentro la carpeta:', imageFolder);
    process.exit(1);
  }
  if (toProcess.length === 0) {
    console.log('✅ Todas las imágenes ya estaban procesadas.');
    return;
  }

  for (const file of toProcess) {
    console.log(`🧠 Procesando ${file}…`);

    // a) Vision API: extraer etiquetas
    let labels = '';
    try {
      const [visionRes] = await visionClient.labelDetection(path.join(imageFolder, file));
      labels = visionRes.labelAnnotations
        .slice(0,5)
        .map(l => l.description)
        .join(', ');
    } catch (e) {
      console.warn(`⚠️ Falló Vision API en ${file}:`, e.message);
    }
    const description = `Etiquetas: ${labels}.`;

    // b) Generative AI: prompt con Gemini 2.5 Pro
    let mjPrompt = 'Error generando prompt';
    try {
      const instruction =
        "You are an expert at writing Midjourney prompts. " +
        "Based on the following keywords, generate a single, concise, English prompt optimized for Midjourney (no analysis, no extra commentary):";
      const genRes = await aiClient.models.generateContent({
        model:    'publishers/google/models/gemini-2.5-pro',
        contents: `${instruction}\n\n${description}`
      });
      mjPrompt = genRes.text.trim();
    } catch (err) {
      console.warn(`⚠️ Falló Gemini en ${file}:`, err.message);
    }

    // c) Guardar en el array y volcar a disco
    const num = file.match(/\d+/)?.[0] || file;
    const entry = {
      filename: file,
      type:     'image',
      title:    `Creación AI #${num}`,
      prompt:   mjPrompt,
      model:    'Gemini 2.5 Pro'
    };
    gallery.push(entry);

    // checkpoint: actualizar archivo tras cada imagen
    const out = `// ¡GENERADO AUTOMÁTICAMENTE!\nconst galleryImages = ${JSON.stringify(gallery, null, 2)};`;
    fs.writeFileSync(outputFile, out, 'utf8');
  }

  console.log(`✅ gallery_data_restaurado.js actualizado con ${gallery.length} entradas.`);
})();
