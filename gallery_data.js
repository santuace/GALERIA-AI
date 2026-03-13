// Esta es la "Lista Mágica" de tus imágenes y videos.

const galleryImages = [
    // --- PARTE 1: AQUÍ AÑADE TUS VIDEOS (Y CUALQUIER IMAGEN ESPECÍFICA QUE QUIERAS CONTROLAR MANUALMENTE) ---
    // ¡Añade los más nuevos AL PRINCIPIO de esta lista!

    // Tus 11 videos (¡ESTA ES LA SINTAXIS CORRECTA PARA CADA OBJETO Y LAS COMAS!)
    {
        filename: "video1.mp4",
        type: "video",
        title: "Animación Fluida IA #1",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video2.mp4",
        type: "video",
        title: "Animación Fluida IA #2",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video3.mp4",
        type: "video",
        title: "Animación Fluida IA #3",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video4.mp4",
        type: "video",
        title: "Animación Fluida IA #4",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video5.mp4",
        type: "video",
        title: "Animación Fluida IA #5",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video6.mp4",
        type: "video",
        title: "Animación Fluida IA #6",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video7.mp4",
        type: "video",
        title: "Animación Fluida IA #7",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video8.mp4",
        type: "video",
        title: "Animación Fluida IA #8",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video9.mp4",
        type: "video",
        title: "Animación Fluida IA #9",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video10.mp4",
        type: "video",
        title: "Animación Fluida IA #10",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    },
    {
        filename: "video11.mp4",
        type: "video",
        title: "Animación Fluida IA #11",
        prompt: "Bucle animado generado por IA con formas orgánicas y colores vibrantes."
    }
    // <-- NO HAY COMA AQUÍ, PORQUE ES EL ÚLTIMO ELEMENTO MANUAL ANTES DE CERRAR EL ARRAY INICIAL!
]; // ¡AQUÍ TERMINA LA PARTE 1, CON LA LLAVE DE CIERRE DEL ARRAY!

// --- PARTE 2: EL BUCLE FOR PARA EL RESTO DE TUS IMÁGENES NUMERADAS (NO LO TOQUES MÁS) ---
// Este bucle añade elementos al array 'galleryImages' que ya está definido arriba.
// ¡Cuando añadas nuevas imágenes numeradas, SOLO CAMBIA EL NÚMERO DE INICIO DEL BUCLE!
// Por ejemplo, si tienes 167 imágenes (imagen167.png), pon 167.
for (let i = 166; i >= 1; i--) { // <-- ¡SOLO CAMBIA EL 166 POR EL NÚMERO TOTAL DE TU IMAGEN MÁS ALTA!
    galleryImages.push({
        filename: `imagen${i}.png`,
        type: "image", // Aquí el bucle asume que son imágenes
        title: `Creación AI #${i}`, // Estos títulos/prompts seguirán siendo genéricos
        prompt: `Prompt: Detalles de la creación AI número ${i}.`
    });
}

// console.log(galleryImages); // Puedes descomentar esta línea para ver la lista en la consola del navegador.