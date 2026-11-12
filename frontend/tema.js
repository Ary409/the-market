// tema.js — Cambio de apariencia del sistema.
//
// Todo el escritorio se pinta con variables CSS, así que basta con poner el
// atributo data-tema en <html> para repintar la aplicación entera.
// La preferencia se guarda por dispositivo, no por usuario: la computadora del
// mostrador puede estar en oscuro y la de la oficina en pink.

(function () {
  var CLAVE = "tema";

  var TEMAS = [
    { id: "claro",  nombre: "Claro",  descripcion: "El de siempre",            muestra: ["#ffffff", "#0a0a0a"] },
    { id: "oscuro", nombre: "Oscuro", descripcion: "Para trabajar de noche",   muestra: ["#1a1d21", "#f2f4f6"] },
    { id: "pink",   nombre: "Pink",   descripcion: "Blush y Antique Rose",     muestra: ["#FBEAD6", "#C87D87"] },
  ];

  function leer() {
    try { return localStorage.getItem(CLAVE) || "claro"; } catch (e) { return "claro"; }
  }

  function aplicar(id) {
    var raiz = document.documentElement;
    if (id === "claro") raiz.removeAttribute("data-tema");
    else                raiz.setAttribute("data-tema", id);
    try { localStorage.setItem(CLAVE, id); } catch (e) {}
    // Avisar por si alguna pantalla necesita recalcular algo (gráficas, etc.)
    window.dispatchEvent(new CustomEvent("temacambiado", { detail: { tema: id } }));
  }

  // Aplicar cuanto antes para que no se vea el destello del tema claro
  aplicar(leer());

  window.Tema = { TEMAS: TEMAS, leer: leer, aplicar: aplicar };
})();
