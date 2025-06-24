const galleryImages = [
    {
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
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
  {
        filename: "video4.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
  {
        filename: "video5.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
  {
        filename: "video6.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
  {
        filename: "video7.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
  {
        filename: "video8.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
  {
        filename: "video9.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
  {
        filename: "video10.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
  {
        filename: "video11.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
 {
        filename: "video12.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
 {
        filename: "video13.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
 {
        filename: "video14.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
 {
        filename: "video15.mp4",
        type: "video",
        title: "Animación IA",
        prompt: "Video generado por IA.",
	model: "Runway"
    }, 
];

for (let i = 168; i >= 1; i--) {
    galleryImages.push({
        filename: `imagen${i}.png`,
        type: "image",
        title: `Creación AI #${i}`,
        prompt: `Prompt: Detalles de la creación AI número ${i}.`,
	model: "Midjourney"
    });
}