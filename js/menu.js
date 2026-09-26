// Pantalla del Menú: categorías, buscador y tarjetas de producto.

var categoriaActiva = categorias[0];
var busqueda = '';

// quita tildes para buscar sin importar cómo se escriba
function normalizarTexto(texto) {
  var resultado = '';
  var normalizado = texto.normalize('NFD');
  for (var i = 0; i < normalizado.length; i++) {
    var codigo = normalizado.codePointAt(i);
    if (codigo >= 0x0300 && codigo <= 0x036f) continue;
    resultado += normalizado[i];
  }
  return resultado.toLowerCase();
}

function coincideConBusqueda(producto, texto) {
  var q = normalizarTexto(texto.trim());
  if (!q) return true;
  return normalizarTexto(producto.nombre).indexOf(q) !== -1;
}

function crearTarjetaProducto(producto) {
  var disponible = producto.estado === 'disponible';

  var card = document.createElement('div');
  card.className = 'card' + (disponible ? '' : ' is-out');

  var main = document.createElement('button');
  main.className = 'card-main';
  main.disabled = !disponible;
  main.innerHTML =
    '<div class="cupwrap">' +
      '<img class="product-image" src="' + producto.imagen + '" alt="' + producto.nombre + '" loading="lazy" decoding="async">' +
    '</div>' +
    '<div class="card-body">' +
      '<div class="card-top">' +
        '<h3></h3>' +
        '<div class="price">' + formatPrice(producto.precio) + '</div>' +
      '</div>' +
      '<p class="contains"></p>' +
      '<span class="status' + (disponible ? ' ok' : '') + '"><span class="dot"></span>' + (disponible ? 'Disponible' : 'Agotado') + '</span>' +
    '</div>' +
    '<div class="tapcue">›</div>';
  main.querySelector('h3').textContent = producto.nombre;
  main.querySelector('.contains').textContent = producto.categoria;
  if (disponible) {
    main.addEventListener('click', function () {
      abrirFichaProducto(producto.id);
    });
  }
  card.appendChild(main);

  card.appendChild(crearControlCantidad(producto));

  return card;
}

var ICONO_MAS =
  '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M12 5v14M5 12h14" />' +
  '</svg>';

// botón "+" o control "− cantidad +" si ya está en el carrito.
// si el producto tiene sabores se queda con el "+" simple, que abre la ficha.
function crearControlCantidad(producto) {
  var disponible = producto.estado === 'disponible';
  var requiereSabor = Boolean(producto.sabores && producto.sabores.length);
  var contenedor = document.createElement('div');
  contenedor.className = 'card-qty';

  function pintar() {
    contenedor.innerHTML = '';

    if (requiereSabor) {
      var botonSabor = document.createElement('button');
      botonSabor.type = 'button';
      botonSabor.className = 'quick-add';
      botonSabor.disabled = !disponible;
      botonSabor.setAttribute('aria-disabled', String(!disponible));
      botonSabor.setAttribute('aria-label', 'Agregar ' + producto.nombre + ' al carrito');
      botonSabor.innerHTML = ICONO_MAS;
      botonSabor.addEventListener('click', function () {
        abrirFichaProducto(producto.id);
      });
      contenedor.appendChild(botonSabor);
      return;
    }

    var cantidad = obtenerCantidadEnCarrito(producto.id, undefined);

    if (cantidad === 0) {
      var botonAgregar = document.createElement('button');
      botonAgregar.type = 'button';
      botonAgregar.className = 'quick-add';
      botonAgregar.disabled = !disponible;
      botonAgregar.setAttribute('aria-disabled', String(!disponible));
      botonAgregar.setAttribute('aria-label', 'Agregar ' + producto.nombre + ' al carrito');
      botonAgregar.innerHTML = ICONO_MAS;
      botonAgregar.addEventListener('click', function () {
        agregarAlCarrito(producto);
        mostrarToast(producto.nombre + ' agregado al carrito');
        pintar();
      });
      contenedor.appendChild(botonAgregar);
      return;
    }

    var stepper = document.createElement('div');
    stepper.className = 'qty-controls';

    var btnMenos = document.createElement('button');
    btnMenos.type = 'button';
    btnMenos.className = 'qty-btn';
    btnMenos.setAttribute('aria-label', 'Quitar una unidad de ' + producto.nombre);
    btnMenos.textContent = '−';
    btnMenos.addEventListener('click', function () {
      quitarUnidadDeProductoDelCarrito(producto.id, undefined);
      pintar();
    });

    var valor = document.createElement('span');
    valor.className = 'qty-value';
    valor.textContent = cantidad;

    var btnMas = document.createElement('button');
    btnMas.type = 'button';
    btnMas.className = 'qty-btn';
    btnMas.setAttribute('aria-label', 'Agregar una unidad de ' + producto.nombre);
    btnMas.textContent = '+';
    btnMas.addEventListener('click', function () {
      agregarAlCarrito(producto);
      pintar();
    });

    stepper.appendChild(btnMenos);
    stepper.appendChild(valor);
    stepper.appendChild(btnMas);
    contenedor.appendChild(stepper);
  }

  pintar();
  return contenedor;
}

function renderizarProductos() {
  var panel = document.getElementById('catpanel');
  var contador = document.getElementById('cat-count');
  if (!panel || !contador) return;

  var buscando = busqueda.trim().length > 0;
  var productosBase = buscando ? productos : productos.filter(function (p) {
    return p.categoria === categoriaActiva;
  });
  var visibles = productosBase.filter(function (p) {
    return coincideConBusqueda(p, busqueda);
  });

  contador.textContent = buscando
    ? visibles.length + (visibles.length === 1 ? ' resultado' : ' resultados')
    : visibles.length + (visibles.length === 1 ? ' producto' : ' productos');

  panel.querySelectorAll('.card, .menu-empty').forEach(function (el) {
    el.remove();
  });

  if (visibles.length === 0) {
    var vacio = document.createElement('p');
    vacio.className = 'menu-empty';
    vacio.textContent = buscando
      ? 'No encontramos ningún producto con "' + busqueda.trim() + '".'
      : 'Por ahora no hay productos disponibles en ' + categoriaActiva.toLowerCase() + '.';
    panel.appendChild(vacio);
    return;
  }

  visibles.forEach(function (producto) {
    panel.appendChild(crearTarjetaProducto(producto));
  });
}

function seleccionarCategoria(categoria) {
  busqueda = '';
  categoriaActiva = categoria;
  var input = document.getElementById('search-input');
  if (input) input.value = '';
  document.querySelectorAll('.subtabs button').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.categoria === categoria);
  });
  renderizarProductos();
}

// usadas por el swipe (navegacion.js): mueven la categoría activa y avisan
// con true/false si ya se llegó al final, para que el swipe cambie de pantalla.
function avanzarCategoria() {
  var indice = categorias.indexOf(categoriaActiva);
  var siguiente = categorias[indice + 1];
  if (!siguiente) return false;
  seleccionarCategoria(siguiente);
  return true;
}

function retrocederCategoria() {
  var indice = categorias.indexOf(categoriaActiva);
  var anterior = categorias[indice - 1];
  if (!anterior) return false;
  seleccionarCategoria(anterior);
  return true;
}

function pintarSubtabs() {
  var contenedor = document.getElementById('subtabs');
  if (!contenedor) return;
  categorias.forEach(function (categoria) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.categoria = categoria;
    btn.textContent = categoria;
    if (categoria === categoriaActiva) btn.classList.add('active');
    btn.addEventListener('click', function () {
      seleccionarCategoria(categoria);
    });
    contenedor.appendChild(btn);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  var categoriaSolicitada = params.get('categoria');
  if (categoriaSolicitada && categorias.indexOf(categoriaSolicitada) !== -1) {
    categoriaActiva = categoriaSolicitada;
  }

  pintarSubtabs();
  renderizarProductos();

  var input = document.getElementById('search-input');
  if (input) {
    input.addEventListener('input', function (e) {
      busqueda = e.target.value;
      renderizarProductos();
    });
  }
});
