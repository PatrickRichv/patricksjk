// Pantalla pública de Ofertas + la oferta destacada de Inicio.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config-supabase.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CODIGO_RULETA = 'ruleta';

function crearTarjetaOferta(oferta) {
  const tarjeta = document.createElement('div');
  tarjeta.className = 'oferta-card';
  tarjeta.innerHTML =
    '<svg class="ico oferta-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
      '<path d="M20.6 12.3 12.7 20.2a1.5 1.5 0 0 1-2.1 0L3.8 13.4a1.5 1.5 0 0 1 0-2.1l7.9-7.9c.3-.3.7-.5 1.1-.5h6a1.5 1.5 0 0 1 1.5 1.5v6c0 .4-.2.8-.5 1.1Z" />' +
      '<circle cx="15.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />' +
    '</svg>' +
    '<div class="oferta-texto">' +
      '<h3></h3>' +
      '<p></p>' +
    '</div>';
  tarjeta.querySelector('h3').textContent = oferta.titulo;
  const descripcionEl = tarjeta.querySelector('p');
  if (oferta.descripcion) {
    descripcionEl.textContent = oferta.descripcion;
  } else {
    descripcionEl.remove();
  }
  return tarjeta;
}

function pintarListaOfertas(activas) {
  const lista = document.getElementById('ofertas-lista');
  const vacio = document.getElementById('ofertas-vacio');
  const cargando = document.getElementById('ofertas-cargando');
  if (!lista || !vacio || !cargando) return;

  cargando.hidden = true;

  if (activas.length === 0) {
    vacio.hidden = false;
    return;
  }

  vacio.hidden = true;
  const ordenadas = activas.slice().sort(function (a, b) {
    const fechaA = a.creado_en || a.created_at || '';
    const fechaB = b.creado_en || b.created_at || '';
    return fechaB < fechaA ? -1 : fechaB > fechaA ? 1 : 0;
  });
  ordenadas.forEach(function (oferta) {
    lista.appendChild(crearTarjetaOferta(oferta));
  });
}

// pinta en Inicio la oferta destacada que eligió el admin (si la ruleta está
// activa, gana su propio banner y esta tarjeta se queda oculta)
async function pintarOfertaDestacada(activas, ruletaActiva) {
  const contenedor = document.getElementById('oferta-destacada');
  if (!contenedor) return;

  if (ruletaActiva) {
    contenedor.hidden = true;
    return;
  }

  const candidatas = activas.filter(function (o) {
    return o.codigo !== CODIGO_RULETA;
  });

  let oferta = candidatas.find(function (o) {
    return o.destacada === true;
  }) || null;

  if (!oferta && candidatas.length > 0) {
    const ordenadas = candidatas.slice().sort(function (a, b) {
      const fechaA = a.creado_en || a.created_at || '';
      const fechaB = b.creado_en || b.created_at || '';
      return fechaA < fechaB ? -1 : fechaA > fechaB ? 1 : 0;
    });
    oferta = ordenadas[0];
  }

  if (!oferta) {
    contenedor.hidden = true;
    return;
  }

  contenedor.querySelector('.oferta-destacada-titulo').textContent = oferta.titulo;
  const descripcionEl = contenedor.querySelector('.oferta-destacada-desc');
  if (oferta.descripcion) {
    descripcionEl.hidden = false;
    descripcionEl.textContent = oferta.descripcion;
  } else {
    descripcionEl.hidden = true;
  }
  contenedor.hidden = false;
}

// una sola consulta a Supabase alimenta tanto la lista de Ofertas como la
// tarjeta destacada de Inicio, en vez de que cada una pida lo mismo por su lado
async function cargarOfertas() {
  const contenedorDestacada = document.getElementById('oferta-destacada');
  const vacio = document.getElementById('ofertas-vacio');
  const cargando = document.getElementById('ofertas-cargando');

  try {
    const { data, error } = await supabase.from('ofertas').select('*').eq('activa', true);

    if (error) {
      console.error('No se pudieron cargar las ofertas:', error);
      if (cargando) cargando.hidden = true;
      if (vacio) {
        vacio.hidden = false;
        vacio.textContent = 'No se pudieron cargar las ofertas en este momento. Intenta de nuevo más tarde.';
      }
      if (contenedorDestacada) contenedorDestacada.hidden = true;
      return;
    }

    const activas = data || [];
    const ruletaActiva = activas.some(function (o) {
      return o.codigo === CODIGO_RULETA;
    });

    pintarListaOfertas(activas);
    pintarOfertaDestacada(activas, ruletaActiva);
  } finally {
    if (typeof marcarPromoCheckListo === 'function') marcarPromoCheckListo();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  cargarOfertas();
});
