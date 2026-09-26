// Carrito de compras, guardado en localStorage para que sobreviva entre páginas.

const CARRITO_STORAGE_KEY = 'patricksjk_carrito';

let itemsCarrito = cargarCarritoDesdeStorage();

function cargarCarritoDesdeStorage() {
  const guardado = localStorage.getItem(CARRITO_STORAGE_KEY);
  if (!guardado) return [];
  try {
    return JSON.parse(guardado);
  } catch (error) {
    console.error('El carrito guardado estaba corrupto, se reinicia vacío.', error);
    return [];
  }
}

function guardarCarritoEnStorage() {
  localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(itemsCarrito));
}

function agregarAlCarrito(producto, cantidad) {
  cantidad = cantidad && cantidad > 0 ? cantidad : 1;

  if (producto.estado === 'agotado') {
    console.warn('No se puede agregar un producto agotado:', producto.nombre);
    return;
  }

  const sabor = producto.sabor || undefined;
  const itemExistente = itemsCarrito.find(function (item) {
    return item.productId === producto.id && item.sabor === sabor;
  });

  if (itemExistente) {
    itemExistente.cantidad += cantidad;
  } else {
    itemsCarrito.push({
      id: crypto.randomUUID(),
      productId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad,
      sabor: sabor,
    });
  }

  guardarCarritoEnStorage();
  actualizarVistaDelCarrito(true);
}

function quitarDelCarrito(id) {
  const item = itemsCarrito.find(function (i) {
    return i.id === id;
  });
  if (!item) return;

  item.cantidad -= 1;
  if (item.cantidad <= 0) {
    itemsCarrito = itemsCarrito.filter(function (i) {
      return i.id !== id;
    });
  }

  guardarCarritoEnStorage();
  actualizarVistaDelCarrito();
}

function obtenerCantidadEnCarrito(productId, sabor) {
  const item = itemsCarrito.find(function (i) {
    return i.productId === productId && i.sabor === (sabor || undefined);
  });
  return item ? item.cantidad : 0;
}

function quitarUnidadDeProductoDelCarrito(productId, sabor) {
  const item = itemsCarrito.find(function (i) {
    return i.productId === productId && i.sabor === (sabor || undefined);
  });
  if (!item) return;
  quitarDelCarrito(item.id);
}

function vaciarCarrito() {
  itemsCarrito = [];
  guardarCarritoEnStorage();
  guardarCodigoPremio(null);
  actualizarVistaDelCarrito();
}

function obtenerCarrito() {
  return itemsCarrito;
}

// código del premio de la ruleta — también en localStorage para que aguante hasta entrega.html
const PREMIO_STORAGE_KEY = 'patricksjk_premio_ruleta';
let codigoPremioActual = localStorage.getItem(PREMIO_STORAGE_KEY) || null;

function guardarCodigoPremio(codigo) {
  codigoPremioActual = codigo || null;
  if (codigoPremioActual) {
    localStorage.setItem(PREMIO_STORAGE_KEY, codigoPremioActual);
  } else {
    localStorage.removeItem(PREMIO_STORAGE_KEY);
  }
}

function obtenerCodigoPremioCarrito() {
  return codigoPremioActual;
}

function calcularSubtotal() {
  return itemsCarrito.reduce(function (suma, item) {
    return suma + item.precio * item.cantidad;
  }, 0);
}

function actualizarVistaDelCarrito(animarBadge) {
  if (typeof renderizarCarrito === 'function') {
    renderizarCarrito();
  }
  if (typeof actualizarBadgeCarrito === 'function') {
    actualizarBadgeCarrito(!!animarBadge);
  }
}

// ---- Pantalla del carrito ----

function crearFilaCartItem(item) {
  const fila = document.createElement('div');
  fila.className = 'cart-item';

  const nombreConSabor = item.nombre + (item.sabor ? ' (' + item.sabor + ')' : '');

  fila.innerHTML =
    '<div class="row1">' +
      '<h3></h3>' +
      '<span class="cart-item-subtotal"></span>' +
    '</div>' +
    '<div class="cart-item-row2">' +
      '<span class="cart-item-unit"></span>' +
      '<div class="qty-controls">' +
        '<button type="button" class="qty-btn qty-minus" aria-label="Quitar una unidad de ' + nombreConSabor + '">−</button>' +
        '<span class="qty-value"></span>' +
        '<button type="button" class="qty-btn qty-plus" aria-label="Agregar una unidad de ' + nombreConSabor + '">+</button>' +
      '</div>' +
    '</div>';

  fila.querySelector('h3').textContent = nombreConSabor;
  fila.querySelector('.cart-item-subtotal').textContent = formatPrice(item.precio * item.cantidad);
  fila.querySelector('.cart-item-unit').textContent = formatPrice(item.precio) + ' c/u';
  fila.querySelector('.qty-value').textContent = item.cantidad;

  fila.querySelector('.qty-minus').addEventListener('click', function () {
    quitarDelCarrito(item.id);
  });
  fila.querySelector('.qty-plus').addEventListener('click', function () {
    agregarAlCarrito({
      id: item.productId || item.id,
      nombre: item.nombre,
      precio: item.precio,
      estado: 'disponible',
      sabor: item.sabor,
    });
  });

  return fila;
}

function renderizarCarrito() {
  const vacio = document.getElementById('carrito-vacio');
  const contenido = document.getElementById('carrito-contenido');
  const lista = document.getElementById('carrito-lista');
  const totalEl = document.getElementById('carrito-total');
  const btnContinuar = document.getElementById('btn-continuar');
  if (!vacio || !contenido || !lista || !totalEl) return;

  const items = obtenerCarrito();

  if (items.length === 0) {
    vacio.hidden = false;
    contenido.hidden = true;
    if (btnContinuar) btnContinuar.disabled = true;
    ocultarSugerencias();
    return;
  }

  vacio.hidden = true;
  contenido.hidden = false;

  lista.innerHTML = '';
  items.forEach(function (item) {
    lista.appendChild(crearFilaCartItem(item));
  });

  totalEl.textContent = formatPrice(calcularSubtotal());
  if (btnContinuar) btnContinuar.disabled = false;

  renderizarSugerencias();
}

// ---- "¿Quieres agregar algo más?" ----
const SUGERENCIAS_PRECIO_MAX = 20000;
const SUGERENCIAS_CANTIDAD = 5;

let productosSugeridosBase = null;

function barajarProductos(arreglo) {
  const resultado = arreglo.slice();
  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temporal = resultado[i];
    resultado[i] = resultado[j];
    resultado[j] = temporal;
  }
  return resultado;
}

function obtenerProductosSugeridos() {
  if (!productosSugeridosBase) {
    const candidatos = (typeof productos !== 'undefined' ? productos : []).filter(function (p) {
      return p.estado === 'disponible' && p.precio < SUGERENCIAS_PRECIO_MAX;
    });
    productosSugeridosBase = barajarProductos(candidatos).slice(0, SUGERENCIAS_CANTIDAD);
  }
  return productosSugeridosBase;
}

function crearTarjetaSugerencia(producto) {
  const wrap = document.createElement('div');
  wrap.className = 'rail-card-wrap';
  wrap.innerHTML =
    '<button class="rail-card" type="button">' +
      '<div class="cupwrap">' +
        '<img src="' + producto.imagen + '" alt="' + producto.nombre + '" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" decoding="async">' +
      '</div>' +
      '<h3></h3>' +
      '<div class="price">' + formatPrice(producto.precio) + '</div>' +
    '</button>' +
    '<button type="button" class="rail-quick-add" aria-label="Agregar ' + producto.nombre + ' al carrito">' +
      '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>' +
    '</button>';

  wrap.querySelector('h3').textContent = producto.nombre;

  wrap.querySelector('.rail-card').addEventListener('click', function () {
    if (typeof abrirFichaProducto === 'function') abrirFichaProducto(producto.id);
  });

  wrap.querySelector('.rail-quick-add').addEventListener('click', function () {
    if (producto.sabores && producto.sabores.length) {
      if (typeof abrirFichaProducto === 'function') abrirFichaProducto(producto.id);
      return;
    }
    agregarAlCarrito(producto);
    if (typeof mostrarToast === 'function') mostrarToast(producto.nombre + ' agregado al carrito');
    renderizarCarrito();
  });

  return wrap;
}

function ocultarSugerencias() {
  const bloque = document.getElementById('sugerencias-bloque');
  if (bloque) bloque.hidden = true;
}

function renderizarSugerencias() {
  const bloque = document.getElementById('sugerencias-bloque');
  const track = document.getElementById('sugerencias-track');
  if (!bloque || !track) return;

  const idsEnCarrito = {};
  obtenerCarrito().forEach(function (item) {
    idsEnCarrito[item.productId] = true;
  });

  const visibles = obtenerProductosSugeridos().filter(function (p) {
    return !idsEnCarrito[p.id];
  });

  if (visibles.length === 0) {
    bloque.hidden = true;
    return;
  }

  bloque.hidden = false;
  track.innerHTML = '';
  visibles.forEach(function (producto) {
    track.appendChild(crearTarjetaSugerencia(producto));
  });
}

// ---- Modal de "Vaciar carrito" ----
let elementoConFocoAntesDelModalVaciar = null;

function abrirModalVaciar() {
  const modal = document.getElementById('modal-vaciar');
  if (!modal) return;

  elementoConFocoAntesDelModalVaciar = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  const btnCancelar = document.getElementById('modal-cancelar');
  if (btnCancelar) btnCancelar.focus();
}

function cerrarModalVaciar() {
  const modal = document.getElementById('modal-vaciar');
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = '';

  if (elementoConFocoAntesDelModalVaciar) elementoConFocoAntesDelModalVaciar.focus();
}

document.addEventListener('DOMContentLoaded', function () {
  renderizarCarrito();

  const btnVaciar = document.getElementById('btn-vaciar-carrito');
  const btnCancelar = document.getElementById('modal-cancelar');
  const btnConfirmar = document.getElementById('modal-confirmar');
  const modal = document.getElementById('modal-vaciar');
  const btnContinuar = document.getElementById('btn-continuar');

  if (btnContinuar) {
    btnContinuar.addEventListener('click', async function () {
      if (obtenerCarrito().length === 0) return;

      const textoOriginal = btnContinuar.textContent;
      btnContinuar.disabled = true;
      btnContinuar.textContent = 'Verificando...';

      try {
        const subtotal = calcularSubtotal();
        const esElegible = await deviceEsElegibleParaRuleta(subtotal);
        if (esElegible) {
          abrirRuleta();
        } else {
          window.location.href = 'entrega.html';
        }
      } catch (error) {
        console.error('No se pudo verificar la elegibilidad para la ruleta, se continúa sin ella:', error);
        window.location.href = 'entrega.html';
      } finally {
        btnContinuar.disabled = false;
        btnContinuar.textContent = textoOriginal;
      }
    });
  }

  if (btnVaciar) btnVaciar.addEventListener('click', abrirModalVaciar);
  if (btnCancelar) btnCancelar.addEventListener('click', cerrarModalVaciar);
  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', function () {
      vaciarCarrito();
      cerrarModalVaciar();
    });
  }
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) cerrarModalVaciar();
    });
  }

  document.addEventListener('keydown', function (e) {
    const caja = document.getElementById('modal-vaciar-caja');
    if (!modal || modal.hidden || !caja) return;

    if (e.key === 'Escape') {
      cerrarModalVaciar();
      return;
    }

    if (e.key !== 'Tab') return;
    const focosPosibles = caja.querySelectorAll('button:not([disabled])');
    if (focosPosibles.length === 0) return;
    const primero = focosPosibles[0];
    const ultimo = focosPosibles[focosPosibles.length - 1];

    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  });
});
