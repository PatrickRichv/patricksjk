// Formulario de entrega: valida, abre WhatsApp con el pedido y guarda en Supabase.

document.addEventListener('DOMContentLoaded', function () {
  if (obtenerCarrito().length === 0) {
    window.location.href = 'menu.html';
    return;
  }

  const form = document.getElementById('form-entrega');
  form.addEventListener('submit', manejarEnvioFormulario);
});

// no es async: Safari puede bloquear el window.open() de WhatsApp en
// silencio si se llama dentro de una función async, así que esta parte
// queda 100% síncrona y lo que sí espera (Supabase) va aparte.
function manejarEnvioFormulario(e) {
  e.preventDefault();

  const campoNombre = document.getElementById('entrega-nombre');
  const campoCelular = document.getElementById('entrega-celular');
  const campoDireccion = document.getElementById('entrega-direccion');

  const nombre = campoNombre.value.trim();
  const celular = campoCelular.value.trim();
  const direccion = campoDireccion.value.trim();

  const errorNombre = validarNombre(nombre);
  const errorCelular = validarCelular(celular);
  const errorDireccion = validarDireccion(direccion);

  mostrarErrorCampo('entrega-nombre', errorNombre);
  mostrarErrorCampo('entrega-celular', errorCelular);
  mostrarErrorCampo('entrega-direccion', errorDireccion);

  if (errorNombre || errorCelular || errorDireccion) return;

  const datosEntrega = {
    nombre: escaparHtml(nombre),
    celular: celular,
    direccion: escaparHtml(direccion),
  };

  const items = obtenerCarrito();
  const subtotal = calcularSubtotal();
  const codigoPremio = obtenerCodigoPremioCarrito();

  abrirWhatsAppConPedido(datosEntrega, items, subtotal);
  vaciarCarrito();

  manejarGuardadoYRedireccion(datosEntrega, items, subtotal, codigoPremio);
}

async function manejarGuardadoYRedireccion(datosEntrega, items, subtotal, codigoPremio) {
  let guardadoOk = true;
  if (typeof guardarPedidoSupabase === 'function') {
    try {
      guardadoOk = await guardarPedidoSupabase({
        nombre: datosEntrega.nombre,
        celular: datosEntrega.celular,
        direccion: datosEntrega.direccion,
        productos: items,
        subtotal: subtotal,
        codigoPremio: codigoPremio,
      });
    } catch (error) {
      console.error('No se pudo guardar el pedido en Supabase:', error);
      guardadoOk = false;
    }
  }

  window.location.href = 'tienda1.html?pedido=enviado' + (guardadoOk ? '' : '&guardado=no');
}

function validarNombre(valor) {
  if (!valor) return 'Escribe tu nombre completo.';
  return '';
}

function validarCelular(valor) {
  if (!valor) return 'Escribe tu celular.';
  if (!/^[0-9 ]+$/.test(valor)) return 'El celular solo puede tener números y espacios.';
  const soloDigitos = valor.replace(/\s/g, '');
  if (soloDigitos.length < 10) return 'El celular debe tener al menos 10 dígitos.';
  return '';
}

function validarDireccion(valor) {
  if (!valor) return 'Escribe la dirección de entrega.';
  return '';
}

function mostrarErrorCampo(idCampo, mensajeError) {
  const input = document.getElementById(idCampo);
  const errorEl = document.getElementById(idCampo + '-error');
  if (!input || !errorEl) return;

  errorEl.textContent = mensajeError;
  input.setAttribute('aria-invalid', mensajeError ? 'true' : 'false');
}
