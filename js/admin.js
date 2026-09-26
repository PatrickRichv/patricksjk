// Panel de administrador — Ofertas, Pedidos e Información.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config-supabase.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CODIGO_RULETA = 'ruleta';

let filtroPedidosActual = 'semana';
let filtroInfoActual = 'semana';
let filtroEstadoPedidosActual = 'pendiente';

function calcularFechaDesdeFiltro(filtro) {
  const ahora = new Date();
  if (filtro === 'hoy') {
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }
  if (filtro === 'semana') {
    return new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (filtro === 'mes') {
    return new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

// ---- Cambiar entre Ofertas, Pedidos e Información ----
const TITULOS_SECCION = { ofertas: 'Ofertas', pedidos: 'Pedidos', info: 'Información' };

function cambiarSeccion(seccion) {
  document.getElementById('admin-seccion-ofertas').hidden = seccion !== 'ofertas';
  document.getElementById('admin-seccion-pedidos').hidden = seccion !== 'pedidos';
  document.getElementById('admin-seccion-info').hidden = seccion !== 'info';
  document.getElementById('admin-titulo-pantalla').textContent = TITULOS_SECCION[seccion] || '';

  document.querySelectorAll('#admin-subtabs button').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.seccion === seccion);
  });

  if (seccion === 'pedidos') cargarPedidos();
  if (seccion === 'info') cargarInformacion();
}

// ---- Ofertas ----
function crearFilaOferta(oferta) {
  const esRuleta = oferta.codigo === CODIGO_RULETA;

  const fila = document.createElement('div');
  fila.className = 'admin-oferta-row';

  fila.innerHTML =
    '<div class="admin-oferta-info">' +
      '<div class="admin-oferta-top">' +
        '<h3></h3>' +
        '<span class="oferta-badge"></span>' +
      '</div>' +
      '<p></p>' +
    '</div>' +
    '<div class="admin-oferta-acciones">' +
      '<button type="button" class="admin-destacar-btn">★ Destacar en Inicio</button>' +
      '<button type="button" class="admin-toggle-btn"></button>' +
      '<button type="button" class="admin-borrar-btn" aria-label="Borrar oferta">' +
        '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
          '<path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />' +
          '<path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /><path d="M10 11v6M14 11v6" />' +
        '</svg>' +
      '</button>' +
    '</div>';

  fila.querySelector('h3').textContent = oferta.titulo + (esRuleta ? ' 🎡' : '');
  const descripcionEl = fila.querySelector('p');
  if (oferta.descripcion) {
    descripcionEl.textContent = oferta.descripcion;
  } else {
    descripcionEl.remove();
  }

  const estaActiva = oferta.activa === true;
  const badge = fila.querySelector('.oferta-badge');
  badge.textContent = estaActiva ? 'Activa' : 'Inactiva';
  badge.className = 'oferta-badge' + (estaActiva ? ' es-activa' : '');

  const botonToggle = fila.querySelector('.admin-toggle-btn');
  botonToggle.textContent = estaActiva ? 'Desactivar' : 'Activar';
  botonToggle.className = 'admin-toggle-btn ' + (estaActiva ? 'es-desactivar' : 'es-activar');
  botonToggle.addEventListener('click', function () {
    alternarOferta(oferta.id, !estaActiva);
  });

  const botonBorrar = fila.querySelector('.admin-borrar-btn');
  const botonDestacar = fila.querySelector('.admin-destacar-btn');

  // la ruleta también puede ser la destacada, como cualquier otra oferta
  botonDestacar.disabled = oferta.destacada === true;
  botonDestacar.textContent = oferta.destacada ? '★ Destacada' : 'Destacar en Inicio';
  botonDestacar.addEventListener('click', function () {
    destacarOferta(oferta.id);
  });

  if (esRuleta) {
    botonBorrar.disabled = true;
    botonBorrar.setAttribute('aria-label', 'La oferta de la ruleta no se puede borrar');
    botonBorrar.title = 'La ruleta no se puede borrar — solo activar o desactivar';
  } else {
    botonBorrar.addEventListener('click', function () {
      borrarOferta(oferta.id, oferta.titulo);
    });
  }

  return fila;
}

async function cargarOfertas() {
  const lista = document.getElementById('admin-ofertas-lista');
  const vacio = document.getElementById('admin-ofertas-vacio');
  if (!lista || !vacio) return;

  const { data, error } = await supabase.from('ofertas').select('*');

  if (error) {
    console.error('No se pudieron cargar las ofertas:', error);
    mostrarMensaje('No se pudieron cargar las ofertas. Revisa la consola.', true);
    return;
  }

  lista.innerHTML = '';
  if (!data || data.length === 0) {
    vacio.hidden = false;
    return;
  }
  vacio.hidden = true;

  const ordenadas = data.slice().sort(function (a, b) {
    const fechaA = a.creado_en || a.created_at || '';
    const fechaB = b.creado_en || b.created_at || '';
    return fechaB < fechaA ? -1 : fechaB > fechaA ? 1 : 0;
  });

  ordenadas.forEach(function (oferta) {
    lista.appendChild(crearFilaOferta(oferta));
  });
}

async function alternarOferta(id, nuevaActiva) {
  const { data, error } = await supabase.from('ofertas').update({ activa: nuevaActiva }).eq('id', id).select();

  if (error) {
    console.error('No se pudo actualizar la oferta:', error);
    mostrarMensaje('No se pudo actualizar la oferta. Revisa la consola.', true);
    return;
  }
  if (!data || data.length === 0) {
    mostrarMensaje('Supabase no dejó actualizar esta oferta — revisa que exista la política de UPDATE en la tabla ofertas.', true);
    return;
  }

  // al apagar la ruleta se reinicia dispositivos_ruleta para que todos puedan volver a jugar
  const ofertaActualizada = data[0];
  if (ofertaActualizada.codigo === CODIGO_RULETA && !nuevaActiva) {
    const { error: errorReinicio } = await supabase.from('dispositivos_ruleta').delete().not('device_id', 'is', null);
    if (errorReinicio) {
      console.error('No se pudo reiniciar dispositivos_ruleta:', errorReinicio);
      mostrarMensaje('La ruleta se desactivó, pero no se pudo reiniciar la lista de quiénes ya jugaron. Revisa la consola.', true);
    }
  }

  cargarOfertas();
}

async function destacarOferta(id) {
  const { error: errorLimpiar } = await supabase.from('ofertas').update({ destacada: false }).neq('id', id);
  if (errorLimpiar) {
    console.error('No se pudo quitar el destacado de las demás ofertas:', errorLimpiar);
    mostrarMensaje('No se pudo destacar la oferta. Revisa la consola.', true);
    return;
  }

  const { data, error } = await supabase.from('ofertas').update({ destacada: true }).eq('id', id).select();
  if (error) {
    console.error('No se pudo destacar la oferta:', error);
    mostrarMensaje('No se pudo destacar la oferta. Revisa la consola.', true);
    return;
  }
  if (!data || data.length === 0) {
    mostrarMensaje('Supabase no dejó destacar esta oferta — revisa que exista la política de UPDATE en la tabla ofertas.', true);
    return;
  }
  cargarOfertas();
}

async function borrarOferta(id, titulo) {
  const confirmado = window.confirm('¿Borrar la oferta "' + titulo + '"? Esta acción no se puede deshacer.');
  if (!confirmado) return;

  const { data, error } = await supabase.from('ofertas').delete().eq('id', id).select();

  if (error) {
    console.error('No se pudo borrar la oferta:', error);
    mostrarMensaje('No se pudo borrar la oferta. Revisa la consola.', true);
    return;
  }
  if (!data || data.length === 0) {
    mostrarMensaje('Supabase no dejó borrar esta oferta — revisa que exista la política de DELETE en la tabla ofertas.', true);
    return;
  }
  cargarOfertas();
}

// ---- Pedidos ----
function formatearFecha(fechaTexto) {
  if (!fechaTexto) return '';
  const fecha = new Date(fechaTexto);
  if (isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function obtenerProductosPedido(pedido) {
  if (Array.isArray(pedido.productos)) return pedido.productos;
  if (typeof pedido.productos === 'string') {
    try {
      const parseado = JSON.parse(pedido.productos);
      if (Array.isArray(parseado)) return parseado;
    } catch (error) {
      console.error('No se pudo interpretar la columna productos de un pedido:', error);
    }
  }
  return [];
}

function lineasProductosHtml(productos) {
  return productos
    .map(function (item) {
      const nombreConSabor = item.nombre + (item.sabor ? ' (' + item.sabor + ')' : '');
      return '<div class="pedido-producto-linea">' + item.cantidad + 'x ' + nombreConSabor + '</div>';
    })
    .join('');
}

function crearFilaPedido(pedido) {
  const fila = document.createElement('div');
  fila.className = 'pedido-card';

  fila.innerHTML =
    '<div class="pedido-top">' +
      '<h3></h3>' +
      '<span class="pedido-badge"></span>' +
    '</div>' +
    '<p class="pedido-meta"></p>' +
    '<p class="pedido-fecha"></p>' +
    '<div class="pedido-total"><span>Total</span><b></b></div>' +
    '<button type="button" class="pedido-ver-btn">Ver pedido</button>' +
    '<div class="pedido-acciones">' +
      '<button type="button" class="admin-desactivar-btn pedido-confirmar-btn">Confirmar pedido</button>' +
      '<button type="button" class="admin-activar-btn pedido-pendiente-btn">Marcar pendiente</button>' +
      '<button type="button" class="admin-borrar-btn pedido-borrar-btn" aria-label="Borrar pedido">' +
        '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
          '<path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />' +
          '<path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /><path d="M10 11v6M14 11v6" />' +
        '</svg>' +
      '</button>' +
    '</div>';

  fila.querySelector('h3').textContent = pedido.nombre || '(sin nombre)';
  fila.querySelector('.pedido-meta').textContent = (pedido.celular || '') + ' · ' + (pedido.direccion || '');
  fila.querySelector('.pedido-fecha').textContent = formatearFecha(pedido.created_at || pedido.creado_en || pedido.fecha);
  fila.querySelector('.pedido-total b').textContent = formatPrice(pedido.subtotal || pedido.total || 0);

  fila.querySelector('.pedido-ver-btn').addEventListener('click', function () {
    abrirDetallePedido(pedido);
  });

  const confirmado = pedido.confirmado === true;
  const badge = fila.querySelector('.pedido-badge');
  badge.textContent = confirmado ? 'Confirmado' : 'Pendiente';
  badge.className = 'pedido-badge' + (confirmado ? ' es-confirmado' : '');

  const botonConfirmar = fila.querySelector('.pedido-confirmar-btn');
  const botonPendiente = fila.querySelector('.pedido-pendiente-btn');
  botonConfirmar.disabled = confirmado;
  botonPendiente.disabled = !confirmado;
  botonConfirmar.addEventListener('click', function () {
    alternarConfirmacionPedido(pedido.id, true);
  });
  botonPendiente.addEventListener('click', function () {
    alternarConfirmacionPedido(pedido.id, false);
  });

  fila.querySelector('.pedido-borrar-btn').addEventListener('click', function () {
    borrarPedido(pedido.id, pedido.nombre || '(sin nombre)');
  });

  return fila;
}

async function cargarPedidos() {
  const lista = document.getElementById('admin-pedidos-lista');
  const vacio = document.getElementById('admin-pedidos-vacio');
  const cargando = document.getElementById('admin-pedidos-cargando');
  if (!lista || !vacio || !cargando) return;

  cargando.hidden = false;
  vacio.hidden = true;

  let consulta = supabase.from('pedidos').select('*');
  const desde = calcularFechaDesdeFiltro(filtroPedidosActual);
  if (desde) {
    consulta = consulta.gte('creado_en', desde.toISOString());
  }
  if (filtroEstadoPedidosActual !== 'todos') {
    consulta = consulta.eq('confirmado', filtroEstadoPedidosActual === 'confirmado');
  }
  const { data, error } = await consulta;

  cargando.hidden = true;

  if (error) {
    console.error('No se pudieron cargar los pedidos:', error);
    mostrarMensaje('No se pudieron cargar los pedidos. Revisa la consola.', true);
    return;
  }

  lista.innerHTML = '';
  if (!data || data.length === 0) {
    const textoEstado = filtroEstadoPedidosActual === 'pendiente'
      ? 'pendientes'
      : filtroEstadoPedidosActual === 'confirmado'
        ? 'confirmados'
        : '';
    vacio.textContent = filtroPedidosActual === 'todos' && filtroEstadoPedidosActual === 'todos'
      ? 'Todavía no hay pedidos.'
      : 'No hay pedidos ' + (textoEstado ? textoEstado + ' ' : '') + 'en este rango de fechas.';
    vacio.hidden = false;
    return;
  }

  const ordenados = data.slice().sort(function (a, b) {
    const fechaA = a.created_at || a.creado_en || a.fecha || '';
    const fechaB = b.created_at || b.creado_en || b.fecha || '';
    return fechaB < fechaA ? -1 : fechaB > fechaA ? 1 : 0;
  });

  ordenados.forEach(function (pedido) {
    lista.appendChild(crearFilaPedido(pedido));
  });
}

async function alternarConfirmacionPedido(id, nuevoConfirmado) {
  const { data, error } = await supabase.from('pedidos').update({ confirmado: nuevoConfirmado }).eq('id', id).select();

  if (error) {
    console.error('No se pudo actualizar el pedido:', error);
    mostrarMensaje('No se pudo actualizar el pedido. Revisa la consola.', true);
    return;
  }
  if (!data || data.length === 0) {
    mostrarMensaje('Supabase no dejó actualizar este pedido — revisa que exista la política de UPDATE en la tabla pedidos.', true);
    return;
  }
  cargarPedidos();
}

async function borrarPedido(id, nombre) {
  const confirmado = window.confirm('¿Borrar el pedido de "' + nombre + '"? Esta acción no se puede deshacer.');
  if (!confirmado) return;

  const { data, error } = await supabase.from('pedidos').delete().eq('id', id).select();

  if (error) {
    console.error('No se pudo borrar el pedido:', error);
    mostrarMensaje('No se pudo borrar el pedido. Revisa la consola.', true);
    return;
  }
  if (!data || data.length === 0) {
    mostrarMensaje('Supabase no dejó borrar este pedido — revisa que exista la política de DELETE en la tabla pedidos.', true);
    return;
  }
  cargarPedidos();
}

// ---- Información (ventas confirmadas) ----
async function cargarInformacion() {
  const cargando = document.getElementById('admin-info-cargando');
  const vacio = document.getElementById('admin-info-vacio');
  const contenido = document.getElementById('admin-info-contenido');
  if (!cargando || !vacio || !contenido) return;

  cargando.hidden = false;
  vacio.hidden = true;
  contenido.hidden = true;

  let consulta = supabase.from('pedidos').select('*').eq('confirmado', true);
  const desde = calcularFechaDesdeFiltro(filtroInfoActual);
  if (desde) {
    consulta = consulta.gte('creado_en', desde.toISOString());
  }
  const { data, error } = await consulta;

  cargando.hidden = true;

  if (error) {
    console.error('No se pudo cargar la información de ventas:', error);
    mostrarMensaje('No se pudo cargar la información de ventas. Revisa la consola.', true);
    return;
  }

  if (!data || data.length === 0) {
    vacio.hidden = false;
    return;
  }

  const totalVentas = data.length;
  const totalVendido = data.reduce(function (suma, pedido) {
    return suma + Number(pedido.total || pedido.subtotal || 0);
  }, 0);
  const conOferta = data.filter(function (pedido) {
    return !!pedido.codigo_premio;
  }).length;

  const unidadesPorProducto = {};
  let totalUnidades = 0;
  data.forEach(function (pedido) {
    obtenerProductosPedido(pedido).forEach(function (item) {
      const etiqueta = item.nombre + (item.sabor ? ' (' + item.sabor + ')' : '');
      const cantidad = Number(item.cantidad) || 0;
      unidadesPorProducto[etiqueta] = (unidadesPorProducto[etiqueta] || 0) + cantidad;
      totalUnidades += cantidad;
    });
  });

  document.getElementById('info-ventas').textContent = String(totalVentas);
  document.getElementById('info-total').textContent = formatPrice(totalVendido);
  document.getElementById('info-con-oferta').textContent = conOferta + ' de ' + totalVentas;
  document.getElementById('info-unidades').textContent = String(totalUnidades);

  const listaProductos = document.getElementById('info-productos-lista');
  listaProductos.innerHTML = '';
  Object.keys(unidadesPorProducto)
    .sort(function (a, b) {
      return unidadesPorProducto[b] - unidadesPorProducto[a];
    })
    .forEach(function (etiqueta) {
      const fila = document.createElement('div');
      fila.className = 'info-producto-fila';
      fila.innerHTML = '<span class="info-producto-nombre"></span><span class="info-producto-cantidad"></span>';
      fila.querySelector('.info-producto-nombre').textContent = etiqueta;
      fila.querySelector('.info-producto-cantidad').textContent = unidadesPorProducto[etiqueta] + ' und.';
      listaProductos.appendChild(fila);
    });

  contenido.hidden = false;
}

// ---- Detalle de un pedido ----
let elementoConFocoAntesDelDetalle = null;

function abrirDetallePedido(pedido) {
  const modal = document.getElementById('pedido-detalle-modal');
  if (!modal) return;

  document.getElementById('pedido-detalle-nombre').textContent = pedido.nombre || '(sin nombre)';
  document.getElementById('pedido-detalle-meta').textContent = (pedido.celular || '') + ' · ' + (pedido.direccion || '');
  document.getElementById('pedido-detalle-fecha').textContent = formatearFecha(pedido.created_at || pedido.creado_en || pedido.fecha);
  document.getElementById('pedido-detalle-total').textContent = formatPrice(pedido.subtotal || pedido.total || 0);

  const productos = obtenerProductosPedido(pedido);
  const contenedorProductos = document.getElementById('pedido-detalle-productos');
  contenedorProductos.innerHTML = productos.length > 0
    ? lineasProductosHtml(productos)
    : '<div class="pedido-producto-linea">No se guardaron los productos de este pedido.</div>';

  const premioEl = document.getElementById('pedido-detalle-premio');
  if (pedido.codigo_premio) {
    premioEl.hidden = false;
    premioEl.textContent = '🎡 Jugó la ruleta — código de premio: ' + pedido.codigo_premio;
  } else {
    premioEl.hidden = true;
  }

  elementoConFocoAntesDelDetalle = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('pedido-detalle-cerrar').focus();
}

function cerrarDetallePedido() {
  const modal = document.getElementById('pedido-detalle-modal');
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = '';

  if (elementoConFocoAntesDelDetalle) elementoConFocoAntesDelDetalle.focus();
}

// ---- Utilidades ----
function mostrarMensaje(texto, esError) {
  const mensaje = document.getElementById('admin-mensaje');
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.className = 'admin-mensaje' + (esError ? ' es-error' : ' es-exito');
  mensaje.hidden = false;
  setTimeout(function () {
    mensaje.hidden = true;
  }, 3000);
}

document.addEventListener('DOMContentLoaded', function () {
  cargarOfertas();

  document.querySelectorAll('#admin-subtabs button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      cambiarSeccion(btn.dataset.seccion);
    });
  });

  document.querySelectorAll('#admin-pedidos-filtros button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.filtro === filtroPedidosActual) return;
      filtroPedidosActual = btn.dataset.filtro;
      document.querySelectorAll('#admin-pedidos-filtros button').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      cargarPedidos();
    });
  });

  document.querySelectorAll('#admin-pedidos-filtros-estado button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.filtroEstado === filtroEstadoPedidosActual) return;
      filtroEstadoPedidosActual = btn.dataset.filtroEstado;
      document.querySelectorAll('#admin-pedidos-filtros-estado button').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      cargarPedidos();
    });
  });

  document.querySelectorAll('#admin-info-filtros button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.filtro === filtroInfoActual) return;
      filtroInfoActual = btn.dataset.filtro;
      document.querySelectorAll('#admin-info-filtros button').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      cargarInformacion();
    });
  });

  const modalDetalle = document.getElementById('pedido-detalle-modal');
  const botonCerrarDetalle = document.getElementById('pedido-detalle-cerrar');
  if (botonCerrarDetalle) botonCerrarDetalle.addEventListener('click', cerrarDetallePedido);
  if (modalDetalle) {
    modalDetalle.addEventListener('click', function (e) {
      if (e.target === modalDetalle) cerrarDetallePedido();
    });
  }

  document.addEventListener('keydown', function (e) {
    const caja = document.getElementById('pedido-detalle-caja');
    if (!modalDetalle || modalDetalle.hidden || !caja) return;

    if (e.key === 'Escape') {
      cerrarDetallePedido();
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

  const form = document.getElementById('admin-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const campoTitulo = document.getElementById('admin-oferta-titulo');
    const campoDescripcion = document.getElementById('admin-descripcion');
    const titulo = campoTitulo.value.trim();
    const descripcion = campoDescripcion.value.trim();

    if (!titulo) {
      mostrarMensaje('Escribe un título para la oferta.', true);
      campoTitulo.focus();
      return;
    }

    const botonPublicar = document.getElementById('admin-publicar-btn');
    botonPublicar.disabled = true;

    const { error } = await supabase.from('ofertas').insert({
      titulo: titulo,
      descripcion: descripcion || null,
      activa: true,
    });

    botonPublicar.disabled = false;

    if (error) {
      console.error('No se pudo publicar la oferta:', error);
      mostrarMensaje('No se pudo publicar la oferta. Revisa la consola.', true);
      return;
    }

    campoTitulo.value = '';
    campoDescripcion.value = '';
    mostrarMensaje('Oferta publicada.', false);
    cargarOfertas();
  });
});
