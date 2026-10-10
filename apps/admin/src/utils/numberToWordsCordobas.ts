/**
 * Convierte un monto numérico a su representación en letras en Córdobas (Nicaragua)
 * Formato requerido: "Son: [letras] córdoba(s) con xx/100"
 *
 * Ejemplos:
 * - 31,960.50 -> "Son: treinta y un mil novecientos sesenta córdobas con 50/100"
 * - 1,000.00 -> "Son: un mil córdobas con 00/100"
 * - 1,100.99 -> "Son: un mil cien córdobas con 99/100"
 * - 0.50     -> "Son: cero córdobas con 50/100"
 * - 1.00     -> "Son: un córdoba con 00/100"
 */

const UNITS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const TEENS = [
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
];
const TENS = [
  '',
  'diez',
  'veinte',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
];
const HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

function convertGroup(n: number): string {
  let output = '';
  if (n === 100) return 'cien';

  const h = Math.floor(n / 100);
  const remainder = n % 100;

  if (h > 0) {
    output += HUNDREDS[h] + ' ';
  }

  if (remainder > 0) {
    if (remainder < 10) {
      output += UNITS[remainder];
    } else if (remainder >= 10 && remainder < 20) {
      output += TEENS[remainder - 10];
    } else if (remainder === 20) {
      output += 'veinte';
    } else if (remainder > 20 && remainder < 30) {
      const u = remainder - 20;
      if (u === 1) output += 'veintiún';
      else if (u === 2) output += 'veintidós';
      else if (u === 3) output += 'veintitrés';
      else if (u === 6) output += 'veintiséis';
      else output += 'veinti' + UNITS[u];
    } else {
      const t = Math.floor(remainder / 10);
      const u = remainder % 10;
      if (u === 0) {
        output += TENS[t];
      } else if (u === 1) {
        output += TENS[t] + ' y un';
      } else {
        output += TENS[t] + ' y ' + UNITS[u];
      }
    }
  }

  return output.trim();
}

export function numberToWordsCordobas(amount: number): string {
  const rounded = Math.round(Math.abs(amount || 0) * 100) / 100;
  const intPart = Math.floor(rounded);
  const cents = Math.round((rounded - intPart) * 100);
  const centsStr = cents.toString().padStart(2, '0');

  let text = '';
  if (intPart === 0) {
    text = 'cero';
  } else if (intPart === 1) {
    return `Son: un córdoba con ${centsStr}/100`;
  } else {
    const millions = Math.floor(intPart / 1000000);
    const thousands = Math.floor((intPart % 1000000) / 1000);
    const rest = intPart % 1000;

    if (millions > 0) {
      if (millions === 1) text += 'un millón ';
      else text += `${convertGroup(millions)} millones `;
    }

    if (thousands > 0) {
      if (thousands === 1) text += 'un mil ';
      else text += `${convertGroup(thousands)} mil `;
    }

    if (rest > 0) {
      text += convertGroup(rest) + ' ';
    }
    text = text.trim();
  }

  const currencyWord = intPart === 1 ? 'córdoba' : 'córdobas';
  return `Son: ${text} ${currencyWord} con ${centsStr}/100`;
}
