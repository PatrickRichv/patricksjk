// Lógica compartida: estado abierto/cerrado, tab activa y swipe entre pantallas.

// domicilios 24/7, así que el indicador siempre dice "Abierto"
function pintarEstadoAbierto() {
  var pill = document.querySelector('.openpill');
  if (!pill) return;
  pill.classList.remove('openpill-closed');
  var texto = pill.querySelector('.estado-texto');
  if (texto) texto.textContent = 'Abierto';
}

function marcarTabActiva() {
  var pagina = window.PAGINA_ACTUAL;
  var botones = document.querySelectorAll('.tabbar a[data-tab]');
  botones.forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.tab === pagina);
  });
}

// ---- Toast ----
var idTimeoutToast = null;

function mostrarToast(mensaje) {
  var toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.querySelector('.app').appendChild(toast);
  }

  toast.textContent = mensaje;
  toast.classList.add('toast-visible');

  clearTimeout(idTimeoutToast);
  idTimeoutToast = setTimeout(function () {
    toast.classList.remove('toast-visible');
  }, 1600);
}

// ---- Swipe entre pantallas ----
var SWIPE_THRESHOLD = 50;
var DIRECTION_RATIO = 1.5;

var TAB_ORDER = ['inicio', 'menu', 'ofertas', 'carrito'];
var TAB_URLS = { inicio: 'tienda1.html', menu: 'menu.html', ofertas: 'ofertas.html', carrito: 'carrito.html' };

function irAPantallaAdyacente(paso) {
  var indiceActual = TAB_ORDER.indexOf(window.PAGINA_ACTUAL);
  if (indiceActual === -1) return;
  var siguiente = TAB_ORDER[indiceActual + paso];
  if (siguiente) window.location.href = TAB_URLS[siguiente];
}

function agregarSwipeHandlers(elemento, opciones) {
  var inicioToque = null;

  elemento.addEventListener(
    'touchstart',
    function (e) {
      if ((opciones.estaDeshabilitado && opciones.estaDeshabilitado()) || e.target.closest('[data-no-swipe]')) {
        inicioToque = null;
        return;
      }
      var touch = e.touches[0];
      inicioToque = { x: touch.clientX, y: touch.clientY };
    },
    { passive: true },
  );

  elemento.addEventListener(
    'touchend',
    function (e) {
      if (!inicioToque) return;
      var touch = e.changedTouches[0];
      var dx = touch.clientX - inicioToque.x;
      var dy = touch.clientY - inicioToque.y;
      inicioToque = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;

      if (dx < 0) {
        if (opciones.onSwipeLeft) opciones.onSwipeLeft();
      } else if (opciones.onSwipeRight) {
        opciones.onSwipeRight();
      }
    },
    { passive: true },
  );

  elemento.addEventListener('touchcancel', function () {
    inicioToque = null;
  });
}

function hayAlgunModalAbierto() {
  var overlaysAbiertos = document.querySelectorAll(
    '.modal-backdrop:not([hidden]), .ficha-overlay:not([hidden])',
  );
  return overlaysAbiertos.length > 0;
}

function configurarSwipeDePantalla() {
  var main = document.querySelector('main');
  if (main) {
    agregarSwipeHandlers(main, {
      estaDeshabilitado: hayAlgunModalAbierto,
      onSwipeLeft: function () {
        if (typeof avanzarCategoria === 'function' && avanzarCategoria()) return;
        irAPantallaAdyacente(1);
      },
      onSwipeRight: function () {
        if (typeof retrocederCategoria === 'function' && retrocederCategoria()) return;
        irAPantallaAdyacente(-1);
      },
    });
  }

  var tabbar = document.querySelector('.tabbar');
  if (tabbar) {
    agregarSwipeHandlers(tabbar, {
      onSwipeLeft: function () {
        irAPantallaAdyacente(1);
      },
      onSwipeRight: function () {
        irAPantallaAdyacente(-1);
      },
    });
  }
}

// ---- Insignia del carrito ----
function calcularCantidadTotalCarrito() {
  if (typeof obtenerCarrito !== 'function') return 0;
  return obtenerCarrito().reduce(function (total, item) {
    return total + item.cantidad;
  }, 0);
}

function actualizarBadgeCarrito(animar) {
  var badge = document.getElementById('tab-carrito-badge');
  if (!badge) return;

  var cantidad = calcularCantidadTotalCarrito();
  badge.textContent = cantidad > 99 ? '99+' : String(cantidad);
  badge.hidden = cantidad === 0;

  if (animar && cantidad > 0) {
    badge.classList.remove('tab-badge-animar');
    void badge.offsetWidth;
    badge.classList.add('tab-badge-animar');
  }
}

// ---- Slot de promoción en Inicio (ruleta / oferta destacada) ----
var promoChecksPendientes = 2;
function marcarPromoCheckListo() {
  promoChecksPendientes -= 1;
  if (promoChecksPendientes > 0) return;
  var skeleton = document.getElementById('promo-skeleton');
  if (skeleton) skeleton.hidden = true;
}

document.addEventListener('DOMContentLoaded', function () {
  pintarEstadoAbierto();
  marcarTabActiva();
  configurarSwipeDePantalla();
  actualizarBadgeCarrito(false);
});
