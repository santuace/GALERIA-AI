const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===========================================
// CONFIGURACIÓN - Inserta tu API Key aquí:
// ===========================================
const GEMINI_API_KEY = 'TU_API_KEY_AQUI'; // Reemplaza con tu API key real
// Obtén tu API key gratis en: https://makersuite.google.com/app/apikey

// ===========================================
// CONFIGURACIÓN DE DIRECTORIOS
// ===========================================
const imageFolder = path.join(__dirname, 'imagenes');
const outputFile = path.join(__dirname, 'gallery_data_with_gemini.js');
const logFile = path.join(__dirname, 'gemini_analysis_log.txt');

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ===========================================
// FUNCIÓN PRINCIPAL DE ANÁLISIS
// ===========================================
async function analyzeImageWithGemini(imagePath) {
    try {
        console.log(`🔍 Analizando: ${path.basename(imagePath)}`);
        
        // Leer imagen como base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        // Preparar el prompt optimizado para tu estilo
        const prompt = `
Analiza esta imagen y genera un prompt de Midjourney para recrearla. 
Enfócate en:
- Estilo visual y estética
- Composición y encuadre  
- Iluminación y atmósfera
- Paleta de colores
- Técnica fotográfica o artística

Formato de respuesta:
DESCRIPCIÓN: [breve descripción de la imagen]
PROMPT: [prompt de Midjourney optimizado con parámetros --ar, --v, --stylize, etc.]

Mantén el estilo sofisticado y cinematográfico que caracteriza el trabajo de un Director Creativo experimentado.`;

        // Hacer la consulta a Gemini
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: getMimeType(imagePath)
                }
            }
        ]);
        
        const response = await result.response;
        const analysisText = response.text();
        
        // Extraer el prompt del texto de respuesta
        const promptMatch = analysisText.match(/PROMPT:\s*(.+?)(?:\n|$)/i);
        const descriptionMatch = analysisText.match(/DESCRIPCIÓN:\s*(.+?)(?:\n|PROMPT:)/i);
        
        const extractedPrompt = promptMatch ? promptMatch[1].trim() : analysisText.trim();
        const description = descriptionMatch ? descriptionMatch[1].trim() : '';
        
        // Log para debugging
        logAnalysis(path.basename(imagePath), description, extractedPrompt);
        
        return {
            success: true,
            prompt: extractedPrompt,
            description: description,
            fullAnalysis: analysisText
        };
        
    } catch (error) {
        console.error(`❌ Error analizando ${path.basename(imagePath)}:`, error.message);
        
        // Fallback: generar un prompt básico si falla la API
        const fallbackPrompt = generateFallbackPrompt(imagePath);
        
        return {
            success: false,
            prompt: fallbackPrompt,
            description: 'Análisis fallido - prompt generado automáticamente',
            error: error.message
        };
    }
}

// ===========================================
// FUNCIONES AUXILIARES
// ===========================================
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', 
        '.png': 'image/png',
        '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
}

function generateFallbackPrompt(imagePath) {
    const imageNumber = path.basename(imagePath, path.extname(imagePath)).replace('imagen', '');
    const fallbackPrompts = [
        "Professional portrait photography with dramatic lighting, contemporary style --ar 4:5 --v 6",
        "Cinematic composition, moody atmosphere, film photography aesthetic --ar 4:5 --style raw",
        "Modern editorial photography, clean composition, professional lighting --ar 4:5 --stylize 250",
        "Artistic portrait with creative lighting, contemporary style --ar 4:5 --chaos 10"
    ];
    
    const index = parseInt(imageNumber) % fallbackPrompts.length;
    return fallbackPrompts[index];
}

function logAnalysis(filename, description, prompt) {
    const logEntry = `
===========================================
ARCHIVO: ${filename}
FECHA: ${new Date().toISOString()}
DESCRIPCIÓN: ${description}
PROMPT: ${prompt}
===========================================
`;
    fs.appendFileSync(logFile, logEntry, 'utf8');
}

// ===========================================
// FUNCIÓN PRINCIPAL
// ===========================================
async function processAllImages() {
    console.log('🚀 Iniciando análisis con Gemini API...');
    
    // Verificar carpeta de imágenes
    if (!fs.existsSync(imageFolder)) {
        console.error(`❌ Carpeta no encontrada: ${imageFolder}`);
        process.exit(1);
    }
    
    // Obtener archivos de imagen
    const imageFiles = fs.readdirSync(imageFolder)
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        })
        .filter(file => file.startsWith('imagen')) // Solo las imágenes numeradas
        .sort((a, b) => {
            const numA = parseInt(a.replace('imagen', '').replace(/\.\w+$/, ''));
            const numB = parseInt(b.replace('imagen', '').replace(/\.\w+$/, ''));
            return numA - numB;
        });
    
    if (imageFiles.length === 0) {
        console.error('❌ No se encontraron imágenes en la carpeta.');
        process.exit(1);
    }
    
    console.log(`📊 Encontradas ${imageFiles.length} imágenes para analizar`);
    console.log(`💰 Costo estimado: ~$${(imageFiles.length * 0.0025).toFixed(3)} USD`);
    
    // Inicializar log
    fs.writeFileSync(logFile, `GEMINI ANALYSIS LOG - ${new Date().toISOString()}\n`, 'utf8');
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Procesar imágenes con delay para evitar rate limits
    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const filePath = path.join(imageFolder, file);
        
        console.log(`📸 Procesando ${i + 1}/${imageFiles.length}: ${file}`);
        
        const analysis = await analyzeImageWithGemini(filePath);
        
        if (analysis.success) {
            successCount++;
            console.log(`✅ Éxito: ${file}`);
        } else {
            errorCount++;
            console.log(`⚠️  Fallback: ${file}`);
        }
        
        results.push({
            filename: file,
            analysis: analysis
        });
        
        // Delay para evitar rate limits (Gemini permite ~60 requests/min)
        if (i < imageFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 segundos entre requests
        }
        
        // Mostrar progreso cada 10 imágenes
        if ((i + 1) % 10 === 0) {
            console.log(`📈 Progreso: ${i + 1}/${imageFiles.length} (${Math.round((i + 1)/imageFiles.length * 100)}%)`);
        }
    }
    
    // Generar archivo JavaScript actualizado
    await generateUpdatedGalleryFile(results);
    
    // Resumen final
    console.log('\n🎉 ANÁLISIS COMPLETADO');
    console.log(`✅ Éxitos: ${successCount}`);
    console.log(`⚠️  Fallbacks: ${errorCount}`);
    console.log(`📄 Archivo generado: ${outputFile}`);
    console.log(`📋 Log guardado en: ${logFile}`);
    console.log(`💰 Costo real estimado: ~$${(successCount * 0.0025).toFixed(3)} USD`);
}

// ===========================================
// GENERAR ARCHIVO DE GALERÍA ACTUALIZADO
// ===========================================
async function generateUpdatedGalleryFile(results) {
    console.log('📝 Generando archivo de galería actualizado...');
    
    // Videos existentes (mantener intactos)
    const existingVideos = `    {
        filename: "video1.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "A lone figure, seen from behind, walking on a snow-dusted, rocky path. The figure wears a long, light blue or grey coat and carries a backpack. The path leads towards a distant settlement of white, rounded buildings with domed roofs, nestled among craggy, reddish-brown rock formations. The landscape is a vast, icy plain with patches of snow and exposed rocks, suggesting a cold, barren environment. In the far distance, faint, angular objects (possibly spacecraft or distant structures) are visible against a pale blue sky. The overall style should be a detailed, hand-drawn illustration with a slight watercolor or ink wash feel, emphasizing natural textures and a sense of solitude and vastness. --sref 889962737 --v 7 --profile h9pgy68 --ar 4:5",
        model: "Midjourney video"
    },
    {
        filename: "video2.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "A bright, hyper-realistic medium shot opens on a gleaming kitchen studio where Gargamel, a thin, obscure 50-years old man with crooked teeth, clad in his signature black robe with tattered sleeves, stands behind a polished marble counter brimming with cooking utensils, herb jars, a steaming cauldron, and an opened mason jar full of very little smurf moving inside. Some Smurfs escaped the mason jar and they are running around the marble counter, in panic. Audio: Crisp, clear capture of Gargamel's deep, gravelly voice as he looks directly into the camera and says, 'Hello, welcome to GargaChef, my cooking channel. Today I'm going to teach you how to make my famous Smurf Soup.' Underlying ambient sounds include gentle bubbling from the cauldron, rhythmic knife chops on a wooden cutting board, and a soft, upbeat cooking-show jingle fading under his dialogue. The camera, mounted on a smooth Steadicam rig, stands still, framing Gargamel's animated expression as he cheerfully addresses the audience while he chops carrots, then he puts down the knife and grabs a Smurf from the mason jar and toss it into de pot. Composed with Gargamel centered and ingredients arrayed along the lower third of the frame, vibrant pops of Smurf-blue contrast the warm wooden cabinetry and gleaming metal surfaces. Captured in 8K on a RED Komodo with a 50 mm vintage Panavision lens, this scene boasts razor-sharp detail—every droplet of broth, every glint on a silver ladle—enhanced by a crisp, true-to-life color grade and ultra-subtle film grain, perfectly simulating a high-end culinary show",
        model: "Google Veo3"
    }`;
    // ... (incluir todos los videos existentes)
    
    let fileContent = `const galleryImages = [\n${existingVideos}`;
    
    // Agregar videos restantes y luego las imágenes analizadas
    const remainingVideos = [
        // ... todos los demás videos de tu array original
    ];
    
    // Agregar imágenes analizadas
    results.forEach((result, index) => {
        const imageNumber = result.filename.replace('imagen', '').replace(/\.\w+$/, '');
        
        fileContent += `,\n    {\n`;
        fileContent += `        filename: "${result.filename}",\n`;
        fileContent += `        type: "image",\n`;
        fileContent += `        title: "Creación AI #${imageNumber}",\n`;
        fileContent += `        prompt: "${result.analysis.prompt.replace(/"/g, '\\"')}",\n`;
        fileContent += `        model: "Midjourney"\n`;
        fileContent += `    }`;
    });
    
    fileContent += `\n];`;
    
    fs.writeFileSync(outputFile, fileContent, 'utf8');
    console.log(`✅ Archivo generado: ${outputFile}`);
}

// ===========================================
// EJECUTAR SCRIPT
// ===========================================
if (require.main === module) {
    // Verificar API key
    if (GEMINI_API_KEY === 'AIzaSyCv3GVVGB6Py7YArFPY_wdX_206YBC2olQ') {
        console.error('❌ Por favor, configura tu API key de Gemini en la variable GEMINI_API_KEY');
        console.log('🔗 Obtén tu API key gratis en: https://makersuite.google.com/app/apikey');
        process.exit(1);
    }
    
    processAllImages().catch(console.error);
}

module.exports = { analyzeImageWithGemini, processAllImages };