// Pestañas «Carta local» y «Tienda online» del panel.
// Las dos funcionan igual pero cada una edita su propia tabla de Supabase,
// porque los precios del local y los de domicilio son distintos:
//   carta  → productos_local     (carta.html, la del QR)
//   tienda → productos_domicilio (home, menú, carrito: la tienda online)
import { supabase } from './supabase-cliente.js';

const CATALOGOS = {
  carta: {
    tabla: 'productos_local',
    nombre: 'Carta del local',
    destacadoTexto: '★ Recomendado de la casa (sale de primero en la carta)',
    idDeTexto: false,
  },
  tienda: {
    tabla: 'productos_domicilio',
    nombre: 'Tienda online',
    destacadoTexto: '★ Destacado en «Más pedidos» de Inicio',
    idDeTexto: true, // la tienda usa ids de texto (los guarda el carrito)
  },
};

const BUCKET_FOTOS = 'productos';
const LADO_MAX_FOTO = 800;

const estado = {
  carta: { productos: [], filtro: 'Todas', busqueda: '', eventos: false },
  tienda: { productos: [], filtro: 'Todas', busqueda: '', eventos: false },
};
let editor = { tipo: null, producto: null };
let editorListo = false;

function el(id) {
  return document.getElementById(id);
}

function elDe(tipo, sufijo) {
  return document.getElementById(tipo + '-admin-' + sufijo);
}

function formatoPrecio(valor) {
  return '$' + Number(valor || 0).toLocaleString('es-CO');
}

function normalizar(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function contar(n, singular, plural) {
  return n + ' ' + (n === 1 ? singular : plural);
}

function miniatura(ruta) {
  if (!ruta) return '';
  if (/^https?:\/\//.test(ruta)) return ruta;
  return ruta.replace(/^productos\/(.+)\.(webp|png)$/, 'productos/mini/$1.webp');
}

// Si no se eligió foto, la carta del local busca la del catálogo de domicilio con el mismo nombre.
function fotoAutomatica(producto) {
  if (typeof productos === 'undefined') return '';
  const igual = productos.find(function (p) {
    return p.categoria === producto.categoria && normalizar(p.nombre) === normalizar(producto.nombre);
  });
  return igual && igual.imagen ? igual.imagen : '';
}

function avisar(texto, esError) {
  const mensaje = el('admin-mensaje');
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.className = 'admin-mensaje' + (esError ? ' es-error' : ' es-exito');
  mensaje.hidden = false;
  clearTimeout(avisar.t);
  avisar.t = setTimeout(function () { mensaje.hidden = true; }, 3000);
}

function categoriasDe(tipo) {
  const lista = [];
  estado[tipo].productos.forEach(function (p) {
    if (lista.indexOf(p.categoria) === -1) lista.push(p.categoria);
  });
  return lista;
}

// ---- Cargar ----
export async function cargarCatalogo(tipo) {
  prepararEventos(tipo);
  prepararEditor();
  const cargando = elDe(tipo, 'cargando');
  const lista = elDe(tipo, 'lista');
  cargando.hidden = false;
  lista.innerHTML = '';

  const { data, error } = await supabase
    .from(CATALOGOS[tipo].tabla)
    .select('*')
    .order('orden', { ascending: true })
    .order('id', { ascending: true });

  cargando.hidden = true;
  if (error) {
    console.error('No se pudo cargar ' + CATALOGOS[tipo].tabla + ':', error);
    const p = document.createElement('p');
    p.className = 'ofertas-vacio';
    p.textContent = 'No se pudieron cargar los productos. Revisa tu conexión e inténtalo de nuevo.';
    lista.appendChild(p);
    return;
  }

  estado[tipo].productos = data || [];
  pintarFiltros(tipo);
  pintarLista(tipo);
}

// ---- Pintar ----
function pintarFiltros(tipo) {
  const st = estado[tipo];
  const contenedor = elDe(tipo, 'categorias');
  contenedor.innerHTML = '';
  const categorias = ['Todas'].concat(categoriasDe(tipo));
  if (categorias.indexOf(st.filtro) === -1) st.filtro = 'Todas';

  categorias.forEach(function (categoria) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = categoria;
    boton.classList.toggle('active', categoria === st.filtro);
    boton.addEventListener('click', function () {
      st.filtro = categoria;
      pintarFiltros(tipo);
      pintarLista(tipo);
    });
    contenedor.appendChild(boton);
  });
}

function insignia(texto, clase) {
  const span = document.createElement('span');
  span.className = 'carta-admin-insignia ' + clase;
  span.textContent = texto;
  return span;
}

function boton(texto, clase, accion) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'carta-admin-btn' + (clase ? ' ' + clase : '');
  b.textContent = texto;
  b.addEventListener('click', accion);
  return b;
}

function crearFila(tipo, producto) {
  const fila = document.createElement('div');
  fila.className = 'carta-admin-fila' + (!producto.visible ? ' es-oculto' : '');

  const foto = document.createElement('div');
  foto.className = 'carta-admin-foto';
  const ruta = producto.imagen || (tipo === 'carta' ? fotoAutomatica(producto) : '');
  if (ruta) {
    const img = document.createElement('img');
    img.src = miniatura(ruta);
    img.alt = '';
    img.loading = 'lazy';
    foto.appendChild(img);
  } else {
    foto.textContent = '—';
  }

  const info = document.createElement('div');
  info.className = 'carta-admin-info';
  const nombre = document.createElement('b');
  nombre.textContent = producto.nombre;
  const detalle = document.createElement('span');
  detalle.className = 'carta-admin-detalle';
  detalle.textContent = producto.categoria +
    (producto.sabores && producto.sabores.length ? ' · ' + producto.sabores.join(', ') : '') +
    (producto.descripcion ? ' · ' + producto.descripcion : '');
  const insignias = document.createElement('div');
  insignias.className = 'carta-admin-insignias';
  if (!producto.disponible) insignias.appendChild(insignia('Agotado', 'agotado'));
  if (!producto.visible) insignias.appendChild(insignia('Oculto', 'oculto'));
  if (producto.destacado) insignias.appendChild(insignia(tipo === 'carta' ? '★ Recomendado' : '★ Destacado', 'recomendado'));
  info.appendChild(nombre);
  info.appendChild(detalle);
  if (insignias.childNodes.length) info.appendChild(insignias);

  const precio = document.createElement('b');
  precio.className = 'carta-admin-precio';
  precio.textContent = formatoPrecio(producto.precio);

  const acciones = document.createElement('div');
  acciones.className = 'carta-admin-acciones';
  acciones.appendChild(boton('Editar', 'principal', function () { abrirEditor(tipo, producto); }));
  acciones.appendChild(boton(producto.disponible ? 'Marcar agotado' : 'Hay de nuevo', '', function () {
    cambioRapido(tipo, producto, { disponible: !producto.disponible },
      producto.disponible ? producto.nombre + ' quedó agotado.' : producto.nombre + ' está disponible.');
  }));
  acciones.appendChild(boton(producto.destacado ? '★ Quitar' : '☆ Destacar', producto.destacado ? 'activo' : '', function () {
    cambioRapido(tipo, producto, { destacado: !producto.destacado },
      producto.destacado ? 'Ya no está destacado.' : producto.nombre + ' ahora está destacado.');
  }));

  fila.appendChild(foto);
  fila.appendChild(info);
  fila.appendChild(precio);
  fila.appendChild(acciones);
  return fila;
}

function pintarLista(tipo) {
  const st = estado[tipo];
  const lista = elDe(tipo, 'lista');
  lista.innerHTML = '';
  const consulta = normalizar(st.busqueda);

  const visibles = st.productos.filter(function (p) {
    if (st.filtro !== 'Todas' && p.categoria !== st.filtro) return false;
    if (!consulta) return true;
    return normalizar(p.nombre + ' ' + p.categoria + ' ' + (p.sabores || []).join(' ')).indexOf(consulta) !== -1;
  });

  elDe(tipo, 'vacio').hidden = visibles.length > 0;
  const agotados = st.productos.filter(function (p) { return !p.disponible; }).length;
  const destacados = st.productos.filter(function (p) { return p.destacado; }).length;
  elDe(tipo, 'resumen').textContent =
    contar(st.productos.length, 'producto', 'productos') + ' · ' +
    contar(agotados, 'agotado', 'agotados') + ' · ' +
    contar(destacados, 'destacado', 'destacados');

  visibles.forEach(function (p) { lista.appendChild(crearFila(tipo, p)); });
}

// ---- Cambios rápidos (agotado / destacado) ----
async function cambioRapido(tipo, producto, cambios, textoExito) {
  const { data, error } = await supabase.from(CATALOGOS[tipo].tabla).update(cambios).eq('id', producto.id).select();
  if (error || !data || !data.length) {
    console.error('No se pudo actualizar el producto:', error);
    avisar('No se pudo guardar el cambio.', true);
    return;
  }
  Object.assign(producto, data[0]);
  pintarLista(tipo);
  avisar(textoExito, false);
}

// ---- Editor ----
function rutasDeFotos(tipo, actual) {
  const rutas = [];
  function sumar(ruta) {
    if (ruta && rutas.indexOf(ruta) === -1) rutas.push(ruta);
  }
  if (typeof productos !== 'undefined') productos.forEach(function (p) { sumar(p.imagen); });
  estado.carta.productos.concat(estado.tienda.productos).forEach(function (p) { sumar(p.imagen); });
  sumar(actual);
  return rutas.sort(function (a, b) {
    // las fotos subidas (URLs) van al final
    return (/^https?:/.test(a) - /^https?:/.test(b)) || a.localeCompare(b);
  });
}

function nombreDeFoto(ruta) {
  if (/^https?:/.test(ruta)) return 'Foto subida · ' + ruta.split('/').pop().replace(/^\d+-/, '').replace(/\.\w+$/, '');
  return ruta.replace(/^productos\//, '').replace(/\.(webp|png)$/, '').replace(/-/g, ' ');
}

function opcionesDeFoto(tipo, actual) {
  const select = el('editor-imagen');
  select.innerHTML = '';
  const ninguna = document.createElement('option');
  ninguna.value = '';
  ninguna.textContent = tipo === 'carta' ? 'Automática (por nombre) o iniciales' : 'Sin foto (sale el logo)';
  select.appendChild(ninguna);
  rutasDeFotos(tipo, actual).forEach(function (ruta) {
    const opcion = document.createElement('option');
    opcion.value = ruta;
    opcion.textContent = nombreDeFoto(ruta);
    select.appendChild(opcion);
  });
  select.value = actual || '';
  previsualizarFoto();
}

function previsualizarFoto() {
  const ruta = el('editor-imagen').value;
  const vista = el('editor-vista');
  vista.hidden = !ruta;
  if (ruta) vista.src = miniatura(ruta);
}

function abrirEditor(tipo, producto) {
  const cfg = CATALOGOS[tipo];
  const st = estado[tipo];
  editor = { tipo: tipo, producto: producto };

  el('editor-titulo').textContent = producto ? 'Editar producto' : 'Nuevo producto';
  el('editor-donde').textContent = cfg.nombre;
  el('editor-nombre').value = producto ? producto.nombre : '';
  el('editor-categoria').value = producto ? producto.categoria : (st.filtro !== 'Todas' ? st.filtro : '');
  el('editor-precio').value = producto ? Number(producto.precio).toLocaleString('es-CO') : '';
  el('editor-sabores').value = producto && producto.sabores ? producto.sabores.join(', ') : '';
  el('editor-descripcion').value = producto && producto.descripcion ? producto.descripcion : '';
  el('editor-orden').value = producto ? producto.orden : siguienteOrden(tipo);
  el('editor-disponible').checked = producto ? producto.disponible : true;
  el('editor-visible').checked = producto ? producto.visible : true;
  el('editor-destacado').checked = producto ? producto.destacado : false;
  el('editor-destacado-texto').textContent = cfg.destacadoTexto;
  el('editor-borrar').hidden = !producto;
  el('editor-error').hidden = true;
  el('editor-subiendo').hidden = true;

  const lista = el('editor-categorias-lista');
  lista.innerHTML = '';
  categoriasDe(tipo).forEach(function (categoria) {
    const opcion = document.createElement('option');
    opcion.value = categoria;
    lista.appendChild(opcion);
  });

  opcionesDeFoto(tipo, producto ? producto.imagen : '');

  el('editor-modal').hidden = false;
  document.body.style.overflow = 'hidden';
  el('editor-nombre').focus();
}

function cerrarEditor() {
  el('editor-modal').hidden = true;
  document.body.style.overflow = '';
  editor = { tipo: null, producto: null };
}

function siguienteOrden(tipo) {
  return estado[tipo].productos.reduce(function (max, p) { return Math.max(max, p.orden || 0); }, 0) + 10;
}

function errorEditor(texto) {
  const error = el('editor-error');
  error.textContent = texto;
  error.hidden = false;
}

function slug(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'producto';
}

function idNuevo(tipo, categoria, nombre) {
  const base = slug(categoria + '-' + nombre);
  const usados = {};
  estado[tipo].productos.forEach(function (p) { usados[p.id] = true; });
  let id = base;
  let n = 2;
  while (usados[id]) {
    id = base + '-' + n;
    n += 1;
  }
  return id;
}

async function guardarEditor(e) {
  e.preventDefault();
  const tipo = editor.tipo;
  if (!tipo) return;
  const cfg = CATALOGOS[tipo];

  const nombre = el('editor-nombre').value.trim();
  const categoria = el('editor-categoria').value.trim();
  const precioTexto = el('editor-precio').value.replace(/[^\d]/g, '');
  const precio = precioTexto ? parseInt(precioTexto, 10) : NaN;

  if (!nombre) return errorEditor('Escribe el nombre del producto.');
  if (!categoria) return errorEditor('Escribe o elige una categoría.');
  if (!Number.isFinite(precio)) return errorEditor('Escribe el precio (solo números, ej: 12000).');

  const datos = {
    nombre: nombre,
    categoria: categoria,
    precio: precio,
    sabores: el('editor-sabores').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    descripcion: el('editor-descripcion').value.trim() || null,
    imagen: el('editor-imagen').value || null,
    orden: parseInt(el('editor-orden').value, 10) || 0,
    disponible: el('editor-disponible').checked,
    visible: el('editor-visible').checked,
    destacado: el('editor-destacado').checked,
  };

  const esNuevo = !editor.producto;
  if (esNuevo && cfg.idDeTexto) datos.id = idNuevo(tipo, categoria, nombre);

  const botonGuardar = el('editor-guardar');
  botonGuardar.disabled = true;
  const consulta = esNuevo
    ? supabase.from(cfg.tabla).insert(datos).select()
    : supabase.from(cfg.tabla).update(datos).eq('id', editor.producto.id).select();
  const { data, error } = await consulta;
  botonGuardar.disabled = false;

  if (error || !data || !data.length) {
    console.error('No se pudo guardar el producto:', error);
    return errorEditor('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
  }

  cerrarEditor();
  avisar(esNuevo ? 'Producto agregado a ' + cfg.nombre.toLowerCase() + '.' : 'Cambios guardados.', false);
  cargarCatalogo(tipo);
}

async function borrarDesdeEditor() {
  const tipo = editor.tipo;
  const producto = editor.producto;
  if (!tipo || !producto) return;
  const confirmado = window.confirm(
    '¿Borrar «' + producto.nombre + '» de ' + CATALOGOS[tipo].nombre.toLowerCase() + '? Esto no se puede deshacer.\n\n' +
    'Si solo no hay por ahora, mejor márcalo como agotado u ocúltalo.'
  );
  if (!confirmado) return;

  const { data, error } = await supabase.from(CATALOGOS[tipo].tabla).delete().eq('id', producto.id).select();
  if (error || !data || !data.length) {
    console.error('No se pudo borrar el producto:', error);
    return errorEditor('No se pudo borrar el producto.');
  }
  cerrarEditor();
  avisar('Producto borrado.', false);
  cargarCatalogo(tipo);
}

// ---- Subir foto (se achica a 800 px y se guarda como WebP para que cargue rápido) ----
function achicarFoto(archivo) {
  return new Promise(function (resolver, rechazar) {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = function () {
      const escala = Math.min(1, LADO_MAX_FOTO / Math.max(img.width, img.height));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(img.width * escala);
      lienzo.height = Math.round(img.height * escala);
      lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
      URL.revokeObjectURL(url);
      lienzo.toBlob(function (blob) {
        if (blob) resolver(blob);
        else rechazar(new Error('No se pudo convertir la foto.'));
      }, 'image/webp', 0.82);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      rechazar(new Error('El archivo no es una imagen válida.'));
    };
    img.src = url;
  });
}

async function subirFoto(e) {
  const archivo = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!archivo || !editor.tipo) return;

  const subiendo = el('editor-subiendo');
  subiendo.hidden = false;
  el('editor-error').hidden = true;
  try {
    const blob = await achicarFoto(archivo);
    const nombre = el('editor-nombre').value.trim() || archivo.name;
    const ruta = editor.tipo + '/' + Date.now() + '-' + slug(nombre) + '.webp';
    const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;
    const urlPublica = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl;
    opcionesDeFoto(editor.tipo, urlPublica);
    avisar('Foto subida. Toca «Guardar» para dejarla en el producto.', false);
  } catch (error) {
    console.error('No se pudo subir la foto:', error);
    errorEditor('No se pudo subir la foto. Prueba con otra imagen (JPG o PNG).');
  } finally {
    subiendo.hidden = true;
  }
}

// ---- Eventos ----
function prepararEventos(tipo) {
  const st = estado[tipo];
  if (st.eventos) return;
  st.eventos = true;

  elDe(tipo, 'buscar').addEventListener('input', function (e) {
    st.busqueda = e.target.value;
    pintarLista(tipo);
  });
  elDe(tipo, 'agregar').addEventListener('click', function () { abrirEditor(tipo, null); });
}

function prepararEditor() {
  if (editorListo) return;
  editorListo = true;

  el('editor-form').addEventListener('submit', guardarEditor);
  el('editor-cancelar').addEventListener('click', cerrarEditor);
  el('editor-borrar').addEventListener('click', borrarDesdeEditor);
  el('editor-imagen').addEventListener('change', previsualizarFoto);
  el('editor-archivo').addEventListener('change', subirFoto);
  el('editor-precio').addEventListener('blur', function (e) {
    const limpio = e.target.value.replace(/[^\d]/g, '');
    if (limpio) e.target.value = parseInt(limpio, 10).toLocaleString('es-CO');
  });
  el('editor-modal').addEventListener('click', function (e) {
    if (e.target === el('editor-modal')) cerrarEditor();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el('editor-modal').hidden) cerrarEditor();
  });
}
