import type { PosProductPresentation } from 'api-client';

export const BASE_UNIT_PRESETS = [
  'Tableta',
  'Cápsula',
  'Unidad',
  'Sobre',
  'Mililitro',
] as const;

const IRREGULAR_PLURALS: Record<string, string> = {
  blister: 'blísters',
  blíster: 'blísters',
  unidad: 'unidades',
  tableta: 'tabletas',
  capsula: 'cápsulas',
  cápsula: 'cápsulas',
  sobre: 'sobres',
  mililitro: 'mililitros',
  caja: 'cajas',
  frasco: 'frascos',
  ampolla: 'ampollas',
  paquete: 'paquetes',
  saco: 'sacos',
  bolsa: 'bolsas',
  rollo: 'rollos',
  docena: 'docenas',
  par: 'pares',
  libra: 'libras',
  kilo: 'kilos',
  litro: 'litros',
  galón: 'galones',
  galon: 'galones',
  metro: 'metros',
};

/**
 * Pluraliza en español una unidad o el nombre corto de una forma de venta.
 */
export function pluralizeUnitName(name: string, count: number): string {
  const clean = (name || 'unidad').trim();
  if (!clean) return count === 1 ? 'unidad' : 'unidades';
  const lower = clean.toLowerCase();
  if (Math.abs(count) === 1) return lower;
  if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower];
  if (lower.endsWith('s') || lower.endsWith('x')) return lower;
  if (/[aeiouáéíóú]$/.test(lower)) return `${lower}s`;
  if (lower.endsWith('z')) return `${lower.slice(0, -1)}ces`;
  return `${lower}es`;
}

/**
 * Extrae el sustantivo corto de una forma de venta (ej. "Blíster x10" -> "blísters", "Caja x100" -> "cajas").
 */
export function pluralizePresentationName(presName: string, count: number): string {
  const clean = (presName || '').trim();
  if (!clean) return count === 1 ? 'forma' : 'formas';
  // Si el nombre tiene sufijo "x10", "x 100", "de 24", etc., tomamos la primera palabra para equivalencias limpias
  const match = clean.match(/^([^\s]+)\s+(?:x\s*\d+|de\s+\d+|\(\d+.*\))/i);
  if (match) {
    return pluralizeUnitName(match[1], count);
  }
  const firstWord = clean.split(/\s+/)[0];
  if (clean.split(/\s+/).length === 1) {
    return pluralizeUnitName(firstWord, count);
  }
  return count === 1 ? clean.toLowerCase() : `${pluralizeUnitName(firstWord, count)} ${clean.slice(firstWord.length).trim()}`;
}

export function getBaseUnitDisplayName(product?: {
  baseUnitName?: string | null;
  unit?: string;
} | null): string {
  const explicit = product?.baseUnitName?.trim();
  if (explicit) return explicit;
  const u = (product?.unit || 'UND').trim().toUpperCase();
  switch (u) {
    case 'LB':
      return 'Libra';
    case 'KG':
      return 'Kilo';
    case 'LT':
      return 'Litro';
    case 'GAL':
      return 'Galón';
    case 'MT':
      return 'Metro';
    case 'ROLLO':
      return 'Rollo';
    case 'DOC':
      return 'Docena';
    case 'PAR':
      return 'Par';
    case 'CAJA':
      return 'Caja';
    case 'UND':
    default:
      return 'Unidad';
  }
}

/**
 * Usa `availableUnits` del API (306a) cuando viene disponible; si no, calcula floor(stock / factor).
 */
export function getPresentationAvailableUnits(
  pres: Pick<PosProductPresentation, 'factor' | 'availableUnits'>,
  productStock: number,
): number {
  if (typeof pres.availableUnits === 'number' && Number.isFinite(pres.availableUnits)) {
    return Math.max(0, Math.floor(pres.availableUnits));
  }
  const factor = Number(pres.factor) || 1;
  if (factor <= 0) return 0;
  return Math.max(0, Math.floor((Number(productStock) || 0) / factor));
}

function formatCleanNumber(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * Genera la línea de equivalencia debajo del stock:
 * Ej. "250 tabletas = 25 blísters = 2 cajas y 50 tabletas sueltas"
 */
export function formatStockEquivalenceLine(
  stock: number,
  baseUnitName: string,
  presentations: Array<Pick<PosProductPresentation, 'name' | 'factor' | 'isActive'>>,
): string | null {
  const active = (presentations || [])
    .filter((p) => p.isActive !== false && Number(p.factor) > 0)
    .sort((a, b) => Number(a.factor) - Number(b.factor));

  if (active.length === 0) return null;

  const stockVal = Math.max(0, Number(stock) || 0);
  const baseLabel = pluralizeUnitName(baseUnitName, stockVal);
  const parts: string[] = [`${formatCleanNumber(stockVal)} ${baseLabel}`];

  for (const pres of active) {
    const factor = Number(pres.factor);
    const full = Math.floor(stockVal / factor);
    const rem = Math.round((stockVal - full * factor) * 1000) / 1000;
    const presLabel = pluralizePresentationName(pres.name, full);
    if (rem > 0) {
      const remBaseLabel = pluralizeUnitName(baseUnitName, rem);
      const looseWord = rem === 1 ? 'suelta' : 'sueltas';
      parts.push(`${full} ${presLabel} y ${formatCleanNumber(rem)} ${remBaseLabel} ${looseWord}`);
    } else {
      parts.push(`${full} ${presLabel}`);
    }
  }

  return parts.join(' = ');
}

/**
 * Formato compacto de existencia para catálogo, inventario y tarjeta de venta:
 * Ej. "250 tabletas (25 blísters)" usando `availableUnits` del API.
 */
export function formatCatalogStockWithForms(
  stock: number,
  product: {
    baseUnitName?: string | null;
    unit?: string;
    presentations?: PosProductPresentation[];
  },
): string {
  const active = (product.presentations || [])
    .filter((p) => p.isActive !== false && Number(p.factor) > 0)
    .sort((a, b) => Number(a.factor) - Number(b.factor));

  const stockVal = Number(stock) || 0;
  const baseUnit = getBaseUnitDisplayName(product);
  const baseText = `${formatCleanNumber(stockVal)} ${pluralizeUnitName(baseUnit, stockVal)}`;

  if (active.length === 0) return baseText;

  const primary = active[0];
  const avail = getPresentationAvailableUnits(primary, stockVal);
  return `${baseText} (${avail} ${pluralizePresentationName(primary.name, avail)})`;
}

/**
 * Formato de línea en comprobante e historial (306c #8):
 * Ej. "2 × Blíster x10 Acetaminofén 500 mg"
 */
export function formatReceiptPresentationLine(
  quantity: number,
  productName: string,
  presentationName?: string | null,
): string | null {
  const pres = (presentationName || '').trim();
  if (!pres) return null;
  let cleanProduct = (productName || 'Producto').trim();
  // Quitar sufijo " · Blíster x10" o " (Blíster x10)" si ya venía incrustado en productName
  const escapedPres = pres.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  cleanProduct = cleanProduct
    .replace(new RegExp(`\\s*[·\\-]\\s*${escapedPres}$`, 'i'), '')
    .replace(new RegExp(`\\s*\\(${escapedPres}\\)$`, 'i'), '')
    .trim();
  const qtyStr = formatCleanNumber(Number(quantity) || 1);
  return `${qtyStr} × ${pres} ${cleanProduct}`.trim();
}
