// Catálogo de la tienda online desde Supabase (tabla productos_domicilio),
// que se edita en el panel (pestaña «Tienda online»).
//
// Se carga justo después de productos.js y reemplaza el CONTENIDO de los
// arreglos «productos» y «categorias» (no los arreglos), así el resto del sitio
// (inicio, menú, ficha, carrito) sigue funcionando igual que antes.
//
//   1. Al cargar: si el celular ya tiene la última lista guardada, se usa de una.
//   2. Luego pide la lista a Supabase; si cambió, la aplica, actualiza los precios
//      de lo que haya en el carrito y avisa con el evento «catalogo-actualizado».
//   3. Si Supabase no responde, queda la lista guardada o, si no hay, productos.js.
(function () {
  var CLAVE_CACHE = 'pjk-tienda-v1';
  var IMAGEN_SIN_FOTO = 'imagenes/logo-optimized.png';
  var firmaActual = '';

  function aProductoDeTienda(fila) {
    return {
      id: fila.id,
      nombre: fila.nombre,
      precio: fila.precio,
      categoria: fila.categoria,
      estado: fila.disponible === false ? 'agotado' : 'disponible',
      sabores: fila.sabores && fila.sabores.length ? fila.sabores : undefined,
      descripcion: fila.descripcion || undefined,
      destacado: Boolean(fila.destacado),
      imagen: fila.imagen || IMAGEN_SIN_FOTO,
    };
  }

  function aplicar(lista) {
    productos.length = 0;
    lista.forEach(function (fila) { productos.push(aProductoDeTienda(fila)); });
    categorias.length = 0;
    productos.forEach(function (p) {
      if (categorias.indexOf(p.categoria) === -1) categorias.push(p.categoria);
    });
  }

  // Los items del carrito guardan su precio; aquí se ponen al día con el catálogo.
  function sincronizarCarrito() {
    if (typeof obtenerCarrito !== 'function') return false;
    var cambio = false;
    obtenerCarrito().forEach(function (item) {
      var producto = productos.find(function (p) { return p.id === item.productId; });
      if (!producto) return;
      if (item.precio !== producto.precio || item.nombre !== producto.nombre) {
        item.precio = producto.precio;
        item.nombre = producto.nombre;
        cambio = true;
      }
    });
    if (cambio && typeof guardarCarritoEnStorage === 'function') guardarCarritoEnStorage();
    return cambio;
  }

  function leerCache() {
    try {
      var guardado = JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null');
      return guardado && Array.isArray(guardado.productos) && guardado.productos.length ? guardado.productos : null;
    } catch (e) {
      return null;
    }
  }

  function guardarCache(lista) {
    try {
      localStorage.setItem(CLAVE_CACHE, JSON.stringify({ guardado: Date.now(), productos: lista }));
    } catch (e) {
      // Modo incógnito o sin espacio: la tienda funciona igual.
    }
  }

  // 1. Lista guardada en el celular (sincrónico, antes de que se pinte la página).
  var cache = leerCache();
  if (cache) {
    aplicar(cache);
    firmaActual = JSON.stringify(cache);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (sincronizarCarrito() && typeof actualizarVistaDelCarrito === 'function') actualizarVistaDelCarrito();
  });

  // 2. Lista de Supabase.
  function pedirCatalogo(config) {
    var url = config.SUPABASE_URL + '/rest/v1/productos_domicilio' +
      '?select=id,nombre,categoria,precio,sabores,descripcion,imagen,disponible,destacado' +
      '&visible=eq.true&order=orden.asc,id.asc';
    var controlador = window.AbortController ? new AbortController() : null;
    var temporizador = setTimeout(function () { if (controlador) controlador.abort(); }, 8000);

    return fetch(url, {
      headers: { apikey: config.SUPABASE_ANON_KEY, Accept: 'application/json' },
      signal: controlador ? controlador.signal : undefined,
    }).then(function (respuesta) {
      clearTimeout(temporizador);
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      return respuesta.json();
    });
  }

  function cuandoElDomEsteListo(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  if (!window.fetch) return;
  var rutaConfig = new URL('js/config-supabase.js', document.baseURI).href;

  import(rutaConfig)
    .then(pedirCatalogo)
    .then(function (lista) {
      if (!Array.isArray(lista) || !lista.length) throw new Error('el catálogo en Supabase está vacío');
      var firma = JSON.stringify(lista);
      guardarCache(lista);
      if (firma === firmaActual) return;
      firmaActual = firma;

      cuandoElDomEsteListo(function () {
        aplicar(lista);
        var carritoCambio = sincronizarCarrito();
        document.dispatchEvent(new CustomEvent('catalogo-actualizado'));
        if (carritoCambio && typeof actualizarVistaDelCarrito === 'function') actualizarVistaDelCarrito();
      });
    })
    .catch(function (error) {
      if (window.console) console.warn('Tienda: se usa la lista guardada (' + error.message + ').');
    });
})();
