// Carta del punto físico (carta.html).
// Los productos y precios salen de la tabla productos_local de Supabase, que se
// edita desde el panel (pestaña «Carta local»). Si Supabase no responde, se usa
// la última carta guardada en el celular y, si no hay, productos-estanco.js.
// De productos.js se toman las fotos (por nombre y categoría) y formatPrice.

var CLAVE_CACHE_CARTA = 'pjk-carta-local-v1';
var TIEMPO_MAX_ESPERA_MS = 2500;
var CATEGORIA_RECOMENDADOS = 'Recomendados';

var ICONOS_CATEGORIA = {
  Recomendados: '★',
  Alcohol: '🥃',
  Cervezas: '🍺',
  Aperitivos: '🍹',
  Bebidas: '🥤',
  Mecato: '🍿',
};

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function idDeCategoria(categoria) {
  return 'cat-' + normalizarTexto(categoria).replace(/[^a-z0-9]+/g, '-');
}

// Foto de cada producto: la que se eligió en el panel o, si no, la del catálogo
// de domicilio con el mismo nombre.
var fotosPorNombre = {};
if (typeof productos !== 'undefined') {
  productos.forEach(function (p) {
    if (p.imagen) fotosPorNombre[p.categoria + '|' + normalizarTexto(p.nombre)] = p.imagen;
  });
}

// Usa la miniatura liviana (productos/mini/, 160 px) para que la carta cargue rápido.
function fotoDe(producto) {
  var original = producto.imagen || fotosPorNombre[producto.categoria + '|' + normalizarTexto(producto.nombre)];
  if (!original) return '';
  if (/^https?:\/\//.test(original)) return original;
  return original.replace(/^productos\/(.+)\.(webp|png)$/, 'productos/mini/$1.webp');
}

function iniciales(nombre) {
  return nombre
    .replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function (palabra) { return palabra.charAt(0).toUpperCase(); })
    .join('');
}

function etiqueta(texto, clase) {
  var span = document.createElement('span');
  span.className = 'carta-etiqueta ' + clase;
  span.textContent = texto;
  return span;
}

function crearTarjeta(producto) {
  var agotado = producto.disponible === false;
  var tarjeta = document.createElement('article');
  tarjeta.className = 'carta-item' + (agotado ? ' agotado' : '');

  var foto = fotoDe(producto);
  var media = document.createElement('div');
  media.className = 'carta-item-foto';
  if (foto) {
    var img = document.createElement('img');
    img.src = foto;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 72;
    img.height = 72;
    img.addEventListener('error', function () {
      media.classList.add('sin-foto');
      media.textContent = iniciales(producto.nombre);
    });
    media.appendChild(img);
  } else {
    media.classList.add('sin-foto');
    media.textContent = iniciales(producto.nombre);
  }

  var info = document.createElement('div');
  info.className = 'carta-item-info';

  var nombre = document.createElement('h3');
  nombre.className = 'carta-item-nombre';
  nombre.textContent = producto.nombre;
  info.appendChild(nombre);

  if (agotado || producto.destacado) {
    var etiquetas = document.createElement('div');
    etiquetas.className = 'carta-item-etiquetas';
    if (producto.destacado && !agotado) etiquetas.appendChild(etiqueta('★ Recomendado', 'recomendado'));
    if (agotado) etiquetas.appendChild(etiqueta('Agotado', 'agotado'));
    info.appendChild(etiquetas);
  }

  if (producto.descripcion) {
    var desc = document.createElement('p');
    desc.className = 'carta-item-desc';
    desc.textContent = producto.descripcion;
    info.appendChild(desc);
  }

  if (producto.sabores && producto.sabores.length) {
    var sabores = document.createElement('ul');
    sabores.className = 'carta-item-sabores';
    sabores.setAttribute('aria-label', 'Sabores');
    producto.sabores.forEach(function (sabor) {
      var li = document.createElement('li');
      li.textContent = sabor;
      sabores.appendChild(li);
    });
    info.appendChild(sabores);
  }

  var precio = document.createElement('p');
  precio.className = 'carta-item-precio';
  precio.textContent = formatPrice(producto.precio);

  tarjeta.appendChild(media);
  tarjeta.appendChild(info);
  tarjeta.appendChild(precio);

  tarjeta.dataset.busqueda = normalizarTexto(
    [producto.nombre, producto.categoria, producto.descripcion || '', (producto.sabores || []).join(' ')].join(' ')
  );
  return tarjeta;
}

function categoriasDe(lista) {
  var categorias = [];
  lista.forEach(function (p) {
    if (categorias.indexOf(p.categoria) === -1) categorias.push(p.categoria);
  });
  return categorias;
}

function pintarCarta(listaProductos) {
  var main = document.getElementById('carta-main');
  var chips = document.getElementById('carta-chips');
  if (!main || !chips) return;

  main.innerHTML = '';
  chips.innerHTML = '';

  var grupos = [];
  var destacados = listaProductos.filter(function (p) { return p.destacado && p.disponible !== false; });
  if (destacados.length) {
    grupos.push({ categoria: CATEGORIA_RECOMENDADOS, items: destacados, especial: true });
  }
  categoriasDe(listaProductos).forEach(function (categoria) {
    grupos.push({
      categoria: categoria,
      items: listaProductos.filter(function (p) { return p.categoria === categoria; }),
    });
  });

  grupos.forEach(function (grupo, indice) {
    var categoria = grupo.categoria;
    var items = grupo.items;

    var seccion = document.createElement('section');
    seccion.className = 'carta-seccion' + (grupo.especial ? ' carta-seccion-especial' : '');
    seccion.id = idDeCategoria(categoria);
    seccion.dataset.categoria = categoria;
    if (grupo.especial) seccion.dataset.especial = 'true';

    var cabecera = document.createElement('div');
    cabecera.className = 'carta-seccion-cabecera';
    var titulo = document.createElement('h2');
    titulo.textContent = grupo.especial ? 'Recomendados de la casa' : categoria;
    var cuenta = document.createElement('span');
    cuenta.className = 'carta-seccion-cuenta';
    cuenta.textContent = grupo.especial
      ? 'Los favoritos del bar'
      : items.length + (items.length === 1 ? ' producto' : ' productos');
    cabecera.appendChild(titulo);
    cabecera.appendChild(cuenta);
    seccion.appendChild(cabecera);

    var lista = document.createElement('div');
    lista.className = 'carta-lista';
    items.forEach(function (p) { lista.appendChild(crearTarjeta(p)); });
    seccion.appendChild(lista);
    main.appendChild(seccion);

    var chip = document.createElement('a');
    chip.className = 'carta-chip' + (indice === 0 ? ' activo' : '');
    chip.href = '#' + seccion.id;
    chip.dataset.categoria = categoria;
    chip.innerHTML = '<span aria-hidden="true"></span>';
    chip.firstChild.textContent = ICONOS_CATEGORIA[categoria] || '•';
    chip.appendChild(document.createTextNode(' ' + categoria));
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      limpiarBusqueda();
      irASeccion(seccion);
      marcarChip(categoria);
    });
    chips.appendChild(chip);
  });
}

function alturaSticky() {
  var sticky = document.getElementById('carta-sticky');
  return sticky ? sticky.offsetHeight : 0;
}

function irASeccion(seccion) {
  var y = seccion.getBoundingClientRect().top + window.pageYOffset - alturaSticky() - 8;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

var chipBloqueadoHasta = 0;
function marcarChip(categoria) {
  chipBloqueadoHasta = Date.now() + 1200;
  actualizarChipActivo(categoria);
}

function actualizarChipActivo(categoria) {
  document.querySelectorAll('.carta-chip').forEach(function (chip) {
    var activo = chip.dataset.categoria === categoria;
    chip.classList.toggle('activo', activo);
    if (activo) {
      chip.setAttribute('aria-current', 'true');
      // Desplaza solo la fila de chips (nunca la página) para que el activo se vea.
      var barra = chip.parentNode;
      var destino = chip.offsetLeft - (barra.clientWidth - chip.offsetWidth) / 2;
      barra.scrollTo({ left: Math.max(0, destino), behavior: 'smooth' });
    } else {
      chip.removeAttribute('aria-current');
    }
  });
}

// Marca la categoría que se está viendo mientras se baja por la carta.
function seguirScroll() {
  var ticking = false;
  var botonArriba = document.getElementById('carta-arriba');

  function revisar() {
    ticking = false;
    if (botonArriba) botonArriba.hidden = window.pageYOffset < 600;
    if (Date.now() < chipBloqueadoHasta) return;

    var limite = alturaSticky() + 24;
    var actual = null;
    var secciones = document.querySelectorAll('.carta-seccion:not([hidden])');
    var alFinal = window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 4;
    secciones.forEach(function (s) {
      if (s.getBoundingClientRect().top - limite <= 0) actual = s;
    });
    // Al llegar al final, la última categoría no alcanza a subir: se marca igual.
    if (alFinal && secciones.length) actual = secciones[secciones.length - 1];
    if (!actual) actual = document.querySelector('.carta-seccion:not([hidden])');
    if (actual) {
      var chipActivo = document.querySelector('.carta-chip.activo');
      if (!chipActivo || chipActivo.dataset.categoria !== actual.dataset.categoria) {
        actualizarChipActivo(actual.dataset.categoria);
      }
    }
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(revisar);
    }
  }, { passive: true });

  if (botonArriba) {
    botonArriba.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// ---- Buscador ----
function filtrar(termino) {
  var consulta = normalizarTexto(termino);
  var palabras = consulta.split(/\s+/).filter(Boolean);
  var total = 0;

  document.querySelectorAll('.carta-seccion').forEach(function (seccion) {
    // Los recomendados repiten productos de otras categorías: se esconden mientras se busca.
    if (seccion.dataset.especial) {
      seccion.hidden = palabras.length > 0;
      return;
    }
    var visibles = 0;
    seccion.querySelectorAll('.carta-item').forEach(function (item) {
      var coincide = palabras.every(function (p) { return item.dataset.busqueda.indexOf(p) !== -1; });
      item.hidden = !coincide;
      if (coincide) visibles += 1;
    });
    seccion.hidden = visibles === 0;
    total += visibles;
  });

  document.querySelectorAll('.carta-chip').forEach(function (chip) {
    var seccion = document.getElementById(idDeCategoria(chip.dataset.categoria));
    chip.classList.toggle('apagado', Boolean(seccion && seccion.hidden));
  });

  var vacio = document.getElementById('carta-sin-resultados');
  document.getElementById('carta-termino').textContent = termino.trim();
  vacio.hidden = palabras.length === 0 || total > 0;
  document.getElementById('carta-limpiar').hidden = consulta === '';
}

function limpiarBusqueda() {
  var input = document.getElementById('carta-buscar');
  if (input && input.value) {
    input.value = '';
    filtrar('');
  }
}

function configurarBuscador() {
  var input = document.getElementById('carta-buscar');
  var limpiar = document.getElementById('carta-limpiar');
  if (!input) return;

  input.addEventListener('input', function () {
    filtrar(input.value);
    if (input.value.trim()) {
      var hero = document.querySelector('.carta-hero');
      var tope = hero ? hero.offsetHeight : 0;
      if (window.pageYOffset > tope) window.scrollTo({ top: tope });
    }
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { limpiarBusqueda(); input.blur(); }
  });
  limpiar.addEventListener('click', function () {
    limpiarBusqueda();
    input.focus();
  });
}

// ---- Origen de los datos: Supabase → caché del celular → productos-estanco.js ----
var firmaPintada = '';

function mostrarProductos(lista) {
  var firma = JSON.stringify(lista);
  if (firma === firmaPintada) return;
  firmaPintada = firma;
  pintarCarta(lista);
  var input = document.getElementById('carta-buscar');
  if (input && input.value) filtrar(input.value);
}

function leerCache() {
  try {
    var guardado = JSON.parse(localStorage.getItem(CLAVE_CACHE_CARTA) || 'null');
    return guardado && Array.isArray(guardado.productos) && guardado.productos.length ? guardado.productos : null;
  } catch (e) {
    return null;
  }
}

function guardarCache(lista) {
  try {
    localStorage.setItem(CLAVE_CACHE_CARTA, JSON.stringify({ guardado: Date.now(), productos: lista }));
  } catch (e) {
    // Modo incógnito o sin espacio: la carta funciona igual, solo no queda guardada.
  }
}

function productosDeRespaldo() {
  return productosEstanco.map(function (p) {
    return {
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      sabores: p.sabores || [],
      descripcion: p.descripcion || null,
      imagen: null,
      disponible: true,
      destacado: false,
    };
  });
}

function pedirCartaSupabase() {
  var config = window.PJK_SUPABASE;
  if (!config || !window.fetch) return Promise.reject(new Error('sin configuración de Supabase'));

  var controlador = window.AbortController ? new AbortController() : null;
  var temporizador = setTimeout(function () { if (controlador) controlador.abort(); }, 8000);
  var url = config.url + '/rest/v1/productos_local' +
    '?select=nombre,categoria,precio,sabores,descripcion,imagen,disponible,destacado' +
    '&visible=eq.true&order=orden.asc,id.asc';

  return fetch(url, {
    headers: { apikey: config.key, Accept: 'application/json' },
    signal: controlador ? controlador.signal : undefined,
  }).then(function (respuesta) {
    clearTimeout(temporizador);
    if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
    return respuesta.json();
  }).then(function (lista) {
    if (!Array.isArray(lista) || !lista.length) throw new Error('la carta en Supabase está vacía');
    return lista.map(function (p) {
      p.sabores = p.sabores || [];
      return p;
    });
  });
}

function iniciarCarta() {
  var cache = leerCache();
  if (cache) mostrarProductos(cache);

  // Si Supabase tarda, se muestra la lista de respaldo para no dejar la carta en blanco.
  var espera = cache ? null : setTimeout(function () {
    if (!firmaPintada) mostrarProductos(productosDeRespaldo());
  }, TIEMPO_MAX_ESPERA_MS);

  pedirCartaSupabase()
    .then(function (lista) {
      clearTimeout(espera);
      guardarCache(lista);
      mostrarProductos(lista);
    })
    .catch(function (error) {
      clearTimeout(espera);
      if (!firmaPintada) mostrarProductos(productosDeRespaldo());
      if (window.console) console.warn('Carta: se usa la lista guardada (' + error.message + ').');
    });
}

// carta.html carga config-supabase.js como módulo y deja los datos en window.PJK_SUPABASE.
// Los módulos se ejecutan antes de DOMContentLoaded, así que aquí ya están listos.
document.addEventListener('DOMContentLoaded', function () {
  configurarBuscador();
  seguirScroll();
  iniciarCarta();
});
