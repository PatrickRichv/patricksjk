// Premios de la ruleta. Dos ruletas de 12 casillas (A y B), se sortea 50/50 cuál toca.
// El código de 3 letras es el que se manda por WhatsApp en vez del texto completo.
export const PREMIOS_RULETA_A = [
  { id: 'a1', texto: 'Ganaste 1 Poker', codigo: '1PK' },
  { id: 'a2', texto: 'Perdiste', codigo: null },
  { id: 'a3', texto: 'Ganaste $10.000 redimible en punto físico', codigo: '10K' },
  { id: 'a4', texto: 'Sigue intentando', codigo: null },
  { id: 'a5', texto: 'Ganaste un bombón', codigo: 'BOM' },
  { id: 'a6', texto: 'Perdiste', codigo: null },
  { id: 'a7', texto: '10% en el total de la cuenta', codigo: '10C' },
  { id: 'a8', texto: 'Ganaste 1 Poker', codigo: '1PK' },
  { id: 'a9', texto: 'Ganaste $30.000', codigo: '30K', raro: true },
  { id: 'a10', texto: 'Ganaste un bombón', codigo: 'BOM' },
  { id: 'a11', texto: '10% en el total de la cuenta', codigo: '10C' },
  { id: 'a12', texto: 'Ganaste $10.000 redimible en punto físico', codigo: '10K' },
];

export const PREMIOS_RULETA_B = [
  { id: 'b1', texto: 'Ganaste un premio sorpresa', codigo: 'SOR' },
  { id: 'b2', texto: 'Perdiste', codigo: null },
  { id: 'b3', texto: '10% descuento en un producto seleccionado', codigo: '10P' },
  { id: 'b4', texto: 'Sigue intentando', codigo: null },
  { id: 'b5', texto: 'Ganaste un agua', codigo: 'AGU' },
  { id: 'b6', texto: 'Perdiste', codigo: null },
  { id: 'b7', texto: '5% en el total de la cuenta', codigo: '5TC' },
  { id: 'b8', texto: 'Ganaste un premio sorpresa', codigo: 'SOR' },
  { id: 'b9', texto: 'Ganaste 1 Six', codigo: '1SX', raro: true },
  { id: 'b10', texto: 'Ganaste un agua', codigo: 'AGU' },
  { id: 'b11', texto: '5% en el total de la cuenta', codigo: '5TC' },
  { id: 'b12', texto: '10% descuento en un producto seleccionado', codigo: '10P' },
];
