// Ficha de producto: se abre al tocar una tarjeta en Inicio o Menú.

const FICHA_FEEDBACK_MS = 450;

let productoAbiertoEnFicha = null;
let saborSeleccionadoEnFicha = null;
let cantidadElegidaEnFicha = 1;
let elementoConFocoAntesDeLaFicha = null;

function elementosFicha() {
  return {
    overlay: document.getElementById('ficha-overlay'),
    sheet: document.getElementById('ficha-sheet'),
    cerrar: document.getElementById('ficha-cerrar'),
    imagen: document.getElementById('ficha-imagen'),
    nombre: document.getElementById('ficha-nombre'),
    estadoTexto: document.getElementById('ficha-estado-texto'),
    estadoSpan: document.getElementById('ficha-estado'),
    categoria: document.getElementById('ficha-categoria'),
    saboresGrupo: document.getElementById('ficha-sabores-grupo'),
    saborHint: document.getElementById('ficha-sabor-hint'),
    optRow: document.getElementById('ficha-opt-row'),
    precio: document.getElementById('ficha-precio'),
    agregarBtn: document.getElementById('ficha-agregar-btn'),
    qtyMenos: document.getElementById('ficha-qty-menos'),
    qtyValor: document.getElementById('ficha-qty-valor'),
    qtyMas: document.getElementById('ficha-qty-mas'),
  };
}

function pintarFicha(producto) {
  const els = elementosFicha();
  const disponible = producto.estado === 'disponible';
  const requiereSabor = Boolean(producto.sabores && producto.sabores.length);

  els.imagen.src = producto.imagen || '';
  els.imagen.alt = producto.nombre;
  els.nombre.textContent = producto.nombre;
  els.categoria.textContent = producto.categoria;
  els.precio.textContent = formatPrice(producto.precio * cantidadElegidaEnFicha);

  els.estadoTexto.textContent = disponible ? 'Disponible' : 'Agotado';
  els.estadoSpan.className = 'status' + (disponible ? ' ok' : '');

  if (requiereSabor) {
    els.saboresGrupo.hidden = false;
    els.saborHint.hidden = Boolean(saborSeleccionadoEnFicha);

    els.optRow.innerHTML = '';
    producto.sabores.forEach(function (sabor) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'ficha-opt' + (saborSeleccionadoEnFicha ? '' : ' ficha-opt-brillante');
      boton.setAttribute('role', 'radio');
      boton.setAttribute('aria-checked', String(sabor === saborSeleccionadoEnFicha));
      boton.textContent = sabor;
      boton.addEventListener('click', function () {
        saborSeleccionadoEnFicha = sabor;
        cantidadElegidaEnFicha = 1;
        pintarFicha(producto);
      });
      els.optRow.appendChild(boton);
    });
  } else {
    els.saboresGrupo.hidden = true;
  }

  const faltaElegirSabor = requiereSabor && !saborSeleccionadoEnFicha;
  const controlesHabilitados = disponible && !faltaElegirSabor;

  els.qtyMenos.disabled = !controlesHabilitados || cantidadElegidaEnFicha <= 1;
  els.qtyMas.disabled = !controlesHabilitados;
  els.qtyValor.textContent = String(cantidadElegidaEnFicha);

  els.agregarBtn.disabled = !controlesHabilitados;
  els.agregarBtn.textContent = !disponible ? 'Agotado' : 'Agregar al carrito';
}

function abrirFichaProducto(productId) {
  const els = elementosFicha();
  if (!els.overlay) return;

  const producto = productos.find(function (p) {
    return p.id === productId;
  });
  if (!producto) return;

  productoAbiertoEnFicha = producto;
  saborSeleccionadoEnFicha = null;
  cantidadElegidaEnFicha = 1;
  pintarFicha(producto);

  elementoConFocoAntesDeLaFicha = document.activeElement;
  els.overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  els.cerrar.focus();
}

function cerrarFichaProducto() {
  const els = elementosFicha();
  if (!els.overlay) return;

  els.overlay.hidden = true;
  document.body.style.overflow = '';
  productoAbiertoEnFicha = null;

  if (elementoConFocoAntesDeLaFicha) elementoConFocoAntesDeLaFicha.focus();
}

function faltaElegirSaborAhora() {
  const requiereSabor = Boolean(productoAbiertoEnFicha.sabores && productoAbiertoEnFicha.sabores.length);
  return requiereSabor && !saborSeleccionadoEnFicha;
}

function manejarSumarCantidadFicha() {
  if (!productoAbiertoEnFicha || productoAbiertoEnFicha.estado === 'agotado' || faltaElegirSaborAhora()) return;
  cantidadElegidaEnFicha += 1;
  pintarFicha(productoAbiertoEnFicha);
}

function manejarRestarCantidadFicha() {
  if (!productoAbiertoEnFicha || cantidadElegidaEnFicha <= 1) return;
  cantidadElegidaEnFicha -= 1;
  pintarFicha(productoAbiertoEnFicha);
}

function manejarAgregarDesdeFicha() {
  if (!productoAbiertoEnFicha) return;
  const requiereSabor = Boolean(productoAbiertoEnFicha.sabores && productoAbiertoEnFicha.sabores.length);
  if (productoAbiertoEnFicha.estado === 'agotado') return;
  if (faltaElegirSaborAhora()) return;

  const productoAgregado = productoAbiertoEnFicha;
  const cantidadAgregada = cantidadElegidaEnFicha;

  agregarAlCarrito({
    id: productoAgregado.id,
    nombre: productoAgregado.nombre,
    precio: productoAgregado.precio,
    estado: productoAgregado.estado,
    sabor: requiereSabor ? saborSeleccionadoEnFicha : undefined,
  }, cantidadAgregada);

  if (typeof mostrarToast === 'function') {
    mostrarToast(
      (cantidadAgregada > 1 ? cantidadAgregada + ' × ' : '') +
      productoAgregado.nombre + ' agregado al carrito'
    );
  }

  cantidadElegidaEnFicha = 1;
  const els = elementosFicha();
  els.agregarBtn.disabled = true;
  els.agregarBtn.textContent = '¡Agregado!';

  setTimeout(function () {
    if (productoAbiertoEnFicha === productoAgregado) pintarFicha(productoAgregado);
  }, FICHA_FEEDBACK_MS);
}

document.addEventListener('DOMContentLoaded', function () {
  const els = elementosFicha();
  if (!els.overlay) return;

  els.cerrar.addEventListener('click', cerrarFichaProducto);
  els.agregarBtn.addEventListener('click', manejarAgregarDesdeFicha);
  if (els.qtyMas) els.qtyMas.addEventListener('click', manejarSumarCantidadFicha);
  if (els.qtyMenos) els.qtyMenos.addEventListener('click', manejarRestarCantidadFicha);

  els.overlay.addEventListener('click', function (e) {
    if (e.target === els.overlay) cerrarFichaProducto();
  });

  document.addEventListener('keydown', function (e) {
    if (els.overlay.hidden) return;

    if (e.key === 'Escape') {
      cerrarFichaProducto();
      return;
    }

    if (e.key !== 'Tab') return;
    const focosPosibles = els.sheet.querySelectorAll('button:not([disabled]), a[href]');
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
