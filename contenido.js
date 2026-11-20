// ─────────────────────────────────────────────────────────────
// CONTENIDO DE LA GALERÍA
//
// Cada pieza tiene:
//   filename  nombre del archivo dentro de /imagenes
//   type      "image" o "video"
//   tool      herramienta usada (Midjourney, Google Veo 3, Runway…)
//   year      año
//   series    clave de una serie de SERIES, o null si es una exploración suelta
//   note      (opcional) nota corta sobre cómo nació la pieza
//   prompt    (opcional) si está, aparece el botón "Copiar prompt"
//
// Después de agregar archivos nuevos a /imagenes, correr:
//   python3 scripts/build_media.py
// ─────────────────────────────────────────────────────────────

// Series. La clave (ej: "tinta") es la que va en "series" de cada pieza.
// Los nombres y descripciones son provisorios: cambialos libremente.
const SERIES = {
  "niebla-rosa":   { name: "Niebla rosa",       description: "" },
  "tinta":         { name: "Tinta",             description: "" },
  "alter-ego":     { name: "Alter ego",         description: "" },
  "noche-violeta": { name: "Noche violeta",     description: "" },
  "color-salvaje": { name: "Color salvaje",     description: "" },
  "acido":         { name: "Ácido",             description: "" },
  "azul-y-rosa":   { name: "Azul y rosa",       description: "" },
  "color-block":   { name: "Color block",       description: "" },
  "marmol":        { name: "Mármol líquido",    description: "" },
  "calle":         { name: "Retratos de calle", description: "" },
  "flash-90s":     { name: "Flash 90s",         description: "" },
  "tracksuit":     { name: "Tracksuit",         description: "" },
  "retrofuturo":   { name: "Retrofuturo",       description: "" },
  "zombie-selfie": { name: "Zombie selfie",     description: "" },
};

// Qué imágenes numeradas van en cada serie (rangos "desde-hasta" o números sueltos).
// Las que no estén en ningún rango quedan como Exploración.
const IMAGES_BY_SERIES = {
  "niebla-rosa":   "2-8",
  "tinta":         "12-21",
  "alter-ego":     "22-26, 28-33",
  "noche-violeta": "38-48",
  "color-salvaje": "67-74",
  "acido":         "84-87, 93",
  "azul-y-rosa":   "104-110",
  "color-block":   "115-119",
  "marmol":        "121-124",
  "calle":         "125-133",
  "flash-90s":     "137-155",
  "tracksuit":     "156-161",
  "retrofuturo":   "162-166",
};

// Videos (y cualquier pieza que necesite datos propios)
const PIECES = [
  {
    "filename": "video1.mp4",
    "type": "video",
    "tool": "Midjourney",
    "year": 2025,
    "series": null,
    "note": "",
    "prompt": "A lone figure, seen from behind, walking on a snow-dusted, rocky path. The figure wears a long, light blue or grey coat and carries a backpack. The path leads towards a distant settlement of white, rounded buildings with domed roofs, nestled among craggy, reddish-brown rock formations. The landscape is a vast, icy plain with patches of snow and exposed rocks, suggesting a cold, barren environment. In the far distance, faint, angular objects (possibly spacecraft or distant structures) are visible against a pale blue sky. The overall style should be a detailed, hand-drawn illustration with a slight watercolor or ink wash feel, emphasizing natural textures and a sense of solitude and vastness. --sref 889962737 --v 7 --profile h9pgy68 --ar 4:5"
  },
  {
    "filename": "video2.mp4",
    "type": "video",
    "tool": "Google Veo 3",
    "year": 2025,
    "series": null,
    "note": "",
    "prompt": "A bright, hyper-realistic medium shot opens on a gleaming kitchen studio where Gargamel, a thin, obscure 50-years old man with crooked teeth, clad in his signature black robe with tattered sleeves, stands behind a polished marble counter brimming with cooking utensils, herb jars, a steaming cauldron, and an opened mason jar full of very little smurf moving inside. Some Smurfs escaped the mason jar and they are running around the marble counter, in panic. Audio: Crisp, clear capture of Gargamel’s deep, gravelly voice as he looks directly into the camera and says, “Hello, welcome to GargaChef, my cooking channel. Today I’m going to teach you how to make my famous Smurf Soup.” Underlying ambient sounds include gentle bubbling from the cauldron, rhythmic knife chops on a wooden cutting board, and a soft, upbeat cooking-show jingle fading under his dialogue. The camera, mounted on a smooth Steadicam rig, stands still, framing Gargamel’s animated expression as he cheerfully addresses the audience while he chops carrots, then he puts down the knife and grabs a Smurf from the mason jar and toss it into de pot. Composed with Gargamel centered and ingredients arrayed along the lower third of the frame, vibrant pops of Smurf-blue contrast the warm wooden cabinetry and gleaming metal surfaces. Captured in 8K on a RED Komodo with a 50 mm vintage Panavision lens, this scene boasts razor-sharp detail—every droplet of broth, every glint on a silver ladle—enhanced by a crisp, true-to-life color grade and ultra-subtle film grain, perfectly simulating a high-end culinary show"
  },
  {
    "filename": "video4.mp4",
    "type": "video",
    "tool": "Midjourney",
    "year": 2025,
    "series": "tracksuit",
    "note": "",
    "prompt": "fashion photography studio of a young black female wearing a green adidas jumpsuit, in the back a jungle pattern --sref 889962737 --v 7 --profile h9pgy68 --ar 4:5"
  },
  {
    "filename": "video5.mp4",
    "type": "video",
    "tool": "Midjourney",
    "year": 2025,
    "series": null,
    "note": "",
    "prompt": "1940s film noir detective scene, heavy chiaroscuro lighting, paper textures and halftone grain, blood-red accents, stylized mid-century typography, cinematic composition. A stormy night exterior of a 1947 neo-noir mansion on a hill, rain pouring against amber-lit windows, deep chiaroscuro contrasts, subtle film grain and halftone texture. Cinematic composition. --sref 889962737 --v 7 --profile h9pgy68 --ar 4:5"
  },
  {
    "filename": "video6.mp4",
    "type": "video",
    "tool": "Midjourney",
    "year": 2025,
    "series": "flash-90s",
    "note": "",
    "prompt": "a hyperdinamic fisheye editorial photograph of two black men holding two black dobermans, leaning onto a Mercedes Benz G wagon. Noise and motion blur, hard flash, 90's style street photo. --sref 889962737 --v 7 --profile h9pgy68 --ar 4:5"
  },
  {
    "filename": "video7.mp4",
    "type": "video",
    "tool": "Midjourney",
    "year": 2025,
    "series": "tracksuit",
    "note": "",
    "prompt": "fashion photography studio of a young black male wearing an adidas by Prada jumpsuit anda a adidas bucket hat --sref 889962737 --v 7 --profile h9pgy68 --ar 4:5"
  },
  {
    "filename": "video8.mp4",
    "type": "video",
    "tool": "Midjourney",
    "year": 2025,
    "series": "niebla-rosa",
    "note": "",
    "prompt": "A group of figures walking away on a dusty path beside train tracks, the foreground figure wearing a striking light red overcoat and carrying two suitcases. The background shows a hazy, expansive landscape under a sky with soft, diffused light and hints of pink or reddish clouds. Focus on a slightly desaturated, vintage color palette and a sense of movement away from the viewer. --ar 3:4 --style raw --v 7 --sref 2203203547 --profile h9pgy68 --sv 4"
  },
  {
    "filename": "video9.mp4",
    "type": "video",
    "tool": "Midjourney",
    "year": 2025,
    "series": "niebla-rosa",
    "note": "",
    "prompt": "Surreal images --chaos 15 --ar 2:3 --exp 25 --sref 2203203547 --profile h9pgy68 --sv 4"
  },
  {
    "filename": "video10.mp4",
    "type": "video",
    "tool": "Runway",
    "year": 2025,
    "series": "niebla-rosa",
    "note": "",
    "prompt": "A man seen from behind, standing on a beach with his back to the viewer, looking out at a turbulent ocean with waves crashing. The sky is dramatic and filled with pink and purple clouds, suggesting either sunrise or sunset, with several birds flying in the distance. The man is wearing a light-colored, possibly white or off-white, long-sleeved shirt with a ruffled or pleated detail on the back, and dark trousers. The overall mood is contemplative and slightly melancholic, with a painterly or filmic quality. --chaos 15 --ar 2:3 --exp 25 --sref 2203203547 --profile h9pgy68 --sv 4"
  },
  {
    "filename": "video11.mp4",
    "type": "video",
    "tool": "Google Veo 3",
    "year": 2025,
    "series": null,
    "note": "",
    "prompt": "A dynamic, wide-angle shot of a young male skateboarder performing a trick inside a vast, abandoned warehouse. The skater is in mid-air or mid-slide, captured with motion blur, wearing a denim jacket, t-shirt, and cargo pants. The warehouse features high ceilings with skylights letting in natural light, concrete floors, and walls heavily covered in vibrant graffiti. The perspective is low and slightly distorted, giving a fisheye effect and emphasizing the action. The overall mood is urban, gritty, and energetic, with a slightly desaturated or raw film aesthetic."
  },
  {
    "filename": "A_dynamic_handheld_202505271519.mp4",
    "type": "video",
    "tool": "Google Veo 3",
    "year": 2025,
    "series": "zombie-selfie",
    "note": "",
    "prompt": ""
  },
  {
    "filename": "A_handheld_selfie_202506101428_ki8ev.mp4",
    "type": "video",
    "tool": "Google Veo 3",
    "year": 2025,
    "series": "zombie-selfie",
    "note": "",
    "prompt": ""
  },
  {
    "filename": "A_handheld_selfie_202506101620_1p29r.mp4",
    "type": "video",
    "tool": "Google Veo 3",
    "year": 2025,
    "series": "zombie-selfie",
    "note": "",
    "prompt": ""
  },
  {
    "filename": "A_handheld_selfiestyle_202506101519_66j9x.mp4",
    "type": "video",
    "tool": "Google Veo 3",
    "year": 2025,
    "series": "zombie-selfie",
    "note": "",
    "prompt": ""
  },
  {
    "filename": "A_handheld_selfiestyle_202506101533_x29hi.mp4",
    "type": "video",
    "tool": "Google Veo 3",
    "year": 2025,
    "series": "zombie-selfie",
    "note": "",
    "prompt": ""
  }
];

// Imágenes numeradas imagen1.webp … imagen166.webp (Midjourney, 2025).
// Para sumarle una nota o un prompt a una imagen, sacala de este bucle y agregala arriba.
const seriesOfImage = n => {
  for (const [key, spec] of Object.entries(IMAGES_BY_SERIES)) {
    for (const part of spec.split(",")) {
      const [a, b = a] = part.trim().split("-").map(Number);
      if (n >= a && n <= b) return key;
    }
  }
  return null;
};
for (let i = 166; i >= 1; i--) {
  PIECES.push({
    filename: `imagen${i}.webp`,
    type: "image",
    tool: "Midjourney",
    year: 2025,
    series: seriesOfImage(i),
    note: "",
    prompt: "",
  });
}
