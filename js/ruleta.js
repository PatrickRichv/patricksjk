// Ruleta de descuentos + conexión a Supabase.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config-supabase.js';
import { PREMIOS_RULETA_A, PREMIOS_RULETA_B } from './premiosRuleta.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- reglas de negocio ----

export const RULETA_MIN_SUBTOTAL = 70000;

const DEVICE_ID_KEY = 'device_id';
const SIGUE_INTENTANDO = 'Sigue intentando';

export function obtenerDeviceId() {
  const existente = localStorage.getItem(DEVICE_ID_KEY);
  if (existente) return existente;

  const nuevo = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, nuevo);
  return nuevo;
}

export async function verificarSiYaJugo() {
  const deviceId = obtenerDeviceId();
  const { data, error } = await supabase
    .from('dispositivos_ruleta')
    .select('device_id')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) {
    console.error('No se pudo verificar si el dispositivo ya jugó la ruleta:', error);
    return false;
  }

  return data !== null;
}

export async function ruletaEstaActiva() {
  const { data, error } = await supabase.from('ofertas').select('activa').eq('codigo', 'ruleta').maybeSingle();

  if (error) {
    console.error('No se pudo verificar si la promoción de la ruleta está activa:', error);
    return false;
  }
  if (!data) return false;
  return data.activa === true;
}

export async function deviceEsElegibleParaRuleta(subtotal) {
  if (subtotal < RULETA_MIN_SUBTOTAL) return false;
  const activa = await ruletaEstaActiva();
  if (!activa) return false;
  const yaJugo = await verificarSiYaJugo();
  return !yaJugo;
}

export function elegirRuletaAleatoria() {
  return Math.random() < 0.5 ? PREMIOS_RULETA_A : PREMIOS_RULETA_B;
}

// los premios "raros" solo se mantienen 1 de cada 5 veces que caen
const PROBABILIDAD_MANTENER_RARO = 0.2;

function elegirIndiceObjetivo(lista) {
  const indice = Math.floor(Math.random() * lista.length);
  if (!lista[indice].raro || Math.random() < PROBABILIDAD_MANTENER_RARO) {
    return indice;
  }
  const indicesNoRaros = lista.map(function (_, i) { return i; }).filter(function (i) {
    return !lista[i].raro;
  });
  return indicesNoRaros[Math.floor(Math.random() * indicesNoRaros.length)];
}

export function sortearPremio(lista) {
  const indice = elegirIndiceObjetivo(lista);
  return { indice: indice, premio: lista[indice] };
}

function extraerPorcentaje(texto) {
  const match = texto.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : 0;
}

const MAX_JUGADAS_RULETA = 5;

export async function registrarGiro(premio) {
  const deviceId = obtenerDeviceId();
  const { error } = await supabase.from('dispositivos_ruleta').insert({
    device_id: deviceId,
    premio: premio.texto,
    porcentaje: extraerPorcentaje(premio.texto),
  });

  if (error) {
    console.error('No se pudo registrar el giro de la ruleta en Supabase:', error);
    return;
  }
  await desactivarRuletaSiLlegoAlMaximo();
}

async function desactivarRuletaSiLlegoAlMaximo() {
  const { count, error } = await supabase
    .from('dispositivos_ruleta')
    .select('device_id', { count: 'exact', head: true });

  if (error) {
    console.error('No se pudo contar cuántas veces se ha jugado la ruleta:', error);
    return;
  }
  if (count === null || count < MAX_JUGADAS_RULETA) return;

  const { error: errorDesactivar } = await supabase.from('ofertas').update({ activa: false }).eq('codigo', 'ruleta');
  if (errorDesactivar) {
    console.error('No se pudo desactivar automáticamente la ruleta al llegar al máximo de jugadas:', errorDesactivar);
    return;
  }

  const { error: errorReinicio } = await supabase.from('dispositivos_ruleta').delete().not('device_id', 'is', null);
  if (errorReinicio) {
    console.error('No se pudo reiniciar dispositivos_ruleta después de apagar la ruleta automáticamente:', errorReinicio);
  }
}

// Código corto para el mensaje de WhatsApp: DD-PJK{codigo}-MM-XX
export function generarCodigoPremio(codigo, fecha) {
  if (!codigo) return null;
  fecha = fecha || new Date();
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const xx = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return dd + '-PJK' + codigo + '-' + mm + '-' + xx;
}

export async function guardarPedidoSupabase(datosPedido) {
  const { error } = await supabase.from('pedidos').insert({
    device_id: obtenerDeviceId(),
    nombre: datosPedido.nombre,
    celular: datosPedido.celular,
    direccion: datosPedido.direccion,
    productos: datosPedido.productos,
    subtotal: datosPedido.subtotal,
    total: datosPedido.subtotal,
    codigo_premio: datosPedido.codigoPremio || null,
  });

  if (error) {
    console.error('No se pudo guardar el pedido en Supabase:', error);
    return false;
  }
  return true;
}

// ---- ruleta visual (el modal en carrito.html) ----

const EXTRA_SPINS = 5;
const SPIN_DURATION_MS = 4000;
const SEGMENT_COLORS = ['var(--cream-dim)', 'var(--amber)', 'var(--teal)'];

const TEXTO_CORTO_RUEDA = {
  'Ganaste 1 Poker': '1 Poker',
  'Ganaste $30.000': '$30.000',
  'Ganaste $10.000 redimible en punto físico': '$10.000 en punto físico',
  '10% en el total de la cuenta': '10% en la cuenta',
  'Ganaste un bombón': 'Un bombón',
  '10% descuento en un producto seleccionado': '10% en un producto',
  'Ganaste 1 Six': '1 Six',
  'Ganaste un agua': 'Un agua',
  '5% en el total de la cuenta': '5% en la cuenta',
  'Ganaste un premio sorpresa': 'Premio sorpresa',
};

function textoCortoParaRueda(texto) {
  return TEXTO_CORTO_RUEDA[texto] || texto;
}

let estadoRuleta = null;
let elementoConFocoAntesDeLaRuleta = null;

function elementosModal() {
  return {
    overlay: document.getElementById('ruleta-overlay'),
    sheet: document.getElementById('ruleta-sheet'),
    wheel: document.getElementById('ruleta-wheel'),
    cerrar: document.getElementById('ruleta-cerrar'),
    btnAccion: document.getElementById('ruleta-btn-accion'),
    resultado: document.getElementById('ruleta-resultado'),
  };
}

function construirFondoConic(lista) {
  const segmentDeg = 360 / lista.length;
  const partes = lista.map(function (_, i) {
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    return color + ' ' + i * segmentDeg + 'deg ' + (i + 1) * segmentDeg + 'deg';
  });
  return 'conic-gradient(' + partes.join(', ') + ')';
}

function pintarRueda(lista, wheel) {
  const segmentDeg = 360 / lista.length;
  wheel.style.background = construirFondoConic(lista);
  wheel.innerHTML = '';

  lista.forEach(function (premio, i) {
    const anguloDiv = (i * segmentDeg + segmentDeg / 2 + 180) % 360;
    const volteado = anguloDiv > 90 && anguloDiv < 270;

    const label = document.createElement('div');
    label.className = 'ruleta-label';
    label.style.transform = 'rotate(' + anguloDiv + 'deg)';

    const span = document.createElement('span');
    span.textContent = textoCortoParaRueda(premio.texto);
    if (volteado) span.style.transform = 'rotate(180deg)';

    label.appendChild(span);
    wheel.appendChild(label);
  });
}

function calcularRotacion(rotacionActual, targetIndex, segmentDeg) {
  const centroSegmento = targetIndex * segmentDeg + segmentDeg / 2;
  const moduloObjetivo = (360 - centroSegmento + 360) % 360;
  const moduloActual = ((rotacionActual % 360) + 360) % 360;
  let delta = moduloObjetivo - moduloActual;
  if (delta <= 0) delta += 360;
  return rotacionActual + EXTRA_SPINS * 360 + delta;
}

export function abrirRuleta() {
  const els = elementosModal();
  if (!els.overlay) return;

  const lista = elegirRuletaAleatoria();
  estadoRuleta = { fase: 'listo', lista: lista, targetIndex: null, rotacionActual: 0 };

  pintarRueda(lista, els.wheel);
  els.wheel.style.transition = 'none';
  els.wheel.style.transform = 'rotate(0deg)';
  void els.wheel.offsetHeight;
  els.wheel.style.transition = '';

  els.resultado.textContent = '';
  els.btnAccion.textContent = 'Girar';
  els.btnAccion.disabled = false;
  els.cerrar.disabled = false;

  elementoConFocoAntesDeLaRuleta = document.activeElement;
  els.overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  els.cerrar.focus();
}

function cerrarRuleta() {
  if (estadoRuleta && estadoRuleta.fase === 'girando') return;

  const els = elementosModal();
  if (els.overlay) els.overlay.hidden = true;
  document.body.style.overflow = '';

  if (elementoConFocoAntesDeLaRuleta) elementoConFocoAntesDeLaRuleta.focus();
}

function girar() {
  if (!estadoRuleta || estadoRuleta.fase === 'girando') return;
  const els = elementosModal();
  const segmentDeg = 360 / estadoRuleta.lista.length;
  const sorteo = sortearPremio(estadoRuleta.lista);

  estadoRuleta.targetIndex = sorteo.indice;
  estadoRuleta.fase = 'girando';
  estadoRuleta.rotacionActual = calcularRotacion(estadoRuleta.rotacionActual, sorteo.indice, segmentDeg);

  els.resultado.textContent = '';
  els.btnAccion.disabled = true;
  els.btnAccion.textContent = 'Girando...';
  els.cerrar.disabled = true;

  els.wheel.style.transition = 'transform ' + SPIN_DURATION_MS + 'ms cubic-bezier(0.12, 0.67, 0.16, 1)';
  els.wheel.style.transform = 'rotate(' + estadoRuleta.rotacionActual + 'deg)';
}

function manejarFinDeGiro(e) {
  const els = elementosModal();
  if (e.target !== els.wheel || e.propertyName !== 'transform') return;
  if (!estadoRuleta || estadoRuleta.fase !== 'girando') return;

  const premio = estadoRuleta.lista[estadoRuleta.targetIndex];
  els.cerrar.disabled = false;

  if (premio.texto === SIGUE_INTENTANDO) {
    estadoRuleta.fase = 'sigue';
    els.resultado.textContent = premio.texto;
    els.btnAccion.disabled = false;
    els.btnAccion.textContent = 'Girar de nuevo';
    return;
  }

  estadoRuleta.fase = 'resultado';
  els.resultado.textContent = premio.texto;
  els.btnAccion.disabled = false;
  els.btnAccion.textContent = 'Continuar';

  if (premio.codigo) {
    const codigoGenerado = generarCodigoPremio(premio.codigo);
    guardarCodigoPremio(codigoGenerado);
  }

  registrarGiro(premio);
}

function manejarClickBotonAccion() {
  if (!estadoRuleta) return;
  if (estadoRuleta.fase === 'listo' || estadoRuleta.fase === 'sigue') {
    girar();
  } else if (estadoRuleta.fase === 'resultado') {
    window.location.href = 'entrega.html';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const els = elementosModal();
  if (!els.overlay) return;

  els.wheel.addEventListener('transitionend', manejarFinDeGiro);
  els.btnAccion.addEventListener('click', manejarClickBotonAccion);
  els.cerrar.addEventListener('click', cerrarRuleta);

  els.overlay.addEventListener('click', function (e) {
    if (e.target === els.overlay) cerrarRuleta();
  });

  document.addEventListener('keydown', function (e) {
    if (els.overlay.hidden) return;

    if (e.key === 'Escape') {
      cerrarRuleta();
      return;
    }

    if (e.key !== 'Tab') return;
    const focosPosibles = els.sheet.querySelectorAll('button:not([disabled])');
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

window.deviceEsElegibleParaRuleta = deviceEsElegibleParaRuleta;
window.ruletaEstaActiva = ruletaEstaActiva;
window.abrirRuleta = abrirRuleta;
window.guardarPedidoSupabase = guardarPedidoSupabase;
