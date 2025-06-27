const fs   = require('fs');
const path = require('path');
const axios= require('axios');

// -----------------------------------------
// Inserta tu API Key de OpenAI directamente aquí:
const apiKey = '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';
// -----------------------------------------

const imageFolder = path.join(__dirname, 'imagenes');
const outputFile  = path.join(__dirname, 'output.csv');

async function analyzeImage(imagePath) {
  try {
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: 'Describí esta imagen y generá un prompt de Midjourney para recrearla visualmente.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
        ],
        temperature: 0.7
      },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error(`Error procesando ${path.basename(imagePath)}:`, err.response?.data || err.message);
    return null;
  }
}

async function main() {
  // Verifica carpeta de imágenes
  if (!fs.existsSync(imageFolder)) {
    console.error(`❌ Carpeta no encontrada: ${imageFolder}`);
    process.exit(1);
  }

  // Filtra imágenes (.jpg, .jpeg, .png)
  const files = fs.readdirSync(imageFolder)
    .filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()));
  if (files.length === 0) {
    console.error('❌ No se encontraron imágenes en la carpeta.');
    process.exit(1);
  }

  const results = [];
  for (const file of files) {
    console.log(`🧠 Procesando ${file}...`);
    const prompt = await analyzeImage(path.join(imageFolder, file));
    if (prompt) results.push([file, prompt]);
  }

  // Construye CSV
  const csvLines = results.map(([fname, p]) => {
    const safe = p.replace(/"/g, '""');
    return `"${fname}","${safe}"`;
  });
  const csv = `Imagen,Descripción + Prompt\n${csvLines.join('\n')}`;
  fs.writeFileSync(outputFile, csv, 'utf8');
  console.log(`✅ output.csv generado con ${results.length} entradas.`);
}

main().catch(console.error);
