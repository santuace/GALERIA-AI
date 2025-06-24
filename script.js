
document.addEventListener("DOMContentLoaded", function () {
  const gallery = document.getElementById("gallery");

  fetch("gallery_data_restaurado.js")
    .then(response => response.text())
    .then(data => {
      eval(data); // evalúa la variable galleryData declarada en el .js
      renderGallery(galleryData);
    });

  function renderGallery(items) {
    gallery.innerHTML = "";
    items.forEach(item => {
      const element = document.createElement(item.type === "image" ? "img" : "video");
      element.src = item.src;
      if (item.type === "video") {
        element.controls = true;
      }
      element.className = `gallery-item ${item.type}`;
      gallery.appendChild(element);
    });
  }

  window.filterSelection = function (type) {
    const items = document.querySelectorAll(".gallery-item");
    items.forEach(el => {
      el.style.display =
        type === "all" || el.classList.contains(type) ? "" : "none";
    });
  };

  filterSelection('all'); // Muestra todo al inicio
});
