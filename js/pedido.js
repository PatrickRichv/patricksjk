// Arma el mensaje de WhatsApp del pedido y abre el chat con el bar.

const NUMERO_WHATSAPP_BAR = '573127191715';

function escaparHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function construirMensajePedido(datosEntrega, itemsCarrito, subtotal) {
  const lineas = [];

  lineas.push("🧾 *Nuevo pedido — Patrick's JK*");
  lineas.push('');
  lineas.push('👤 Nombre: ' + datosEntrega.nombre);
  lineas.push('📱 Celular: ' + datosEntrega.celular);
  lineas.push('📍 Dirección: ' + datosEntrega.direccion);
  lineas.push('');
  lineas.push('🛒 Productos:');

  itemsCarrito.forEach(function (item) {
    const subtotalLinea = item.precio * item.cantidad;
    const nombreConSabor = item.nombre + (item.sabor ? ' (' + item.sabor + ')' : '');
    lineas.push(
      '- ' + item.cantidad + 'x ' + nombreConSabor +
      ' — ' + formatPrice(item.precio) + ' c/u = ' + formatPrice(subtotalLinea)
    );
  });

  lineas.push('');

  const codigoPremio = obtenerCodigoPremioCarrito();
  if (codigoPremio) {
    lineas.push('🎡 Premio de la ruleta: ' + codigoPremio);
    lineas.push('');
  }

  lineas.push('💰 Total: ' + formatPrice(subtotal));

  return lineas.join('\n');
}

function abrirWhatsAppConPedido(datosEntrega, itemsCarrito, subtotal) {
  const mensaje = construirMensajePedido(datosEntrega, itemsCarrito, subtotal);
  const mensajeCodificado = encodeURIComponent(mensaje);
  const link = 'https://wa.me/' + NUMERO_WHATSAPP_BAR + '?text=' + mensajeCodificado;
  window.open(link, '_blank', 'noopener,noreferrer');
}
