import {
  ReportBusinessHeader,
  ReportDocument,
  ReportPeriodInfo,
} from '../types/report';
import { formatCurrency } from './formatters';
import { formatManaguaDate, formatManaguaDateTime } from './dateManagua';

export const DEFAULT_REPORT_FOOTER_TEXT =
  'Documento interno. No es un comprobante de venta.';

/**
 * Sanitiza términos prohibidos según las reglas de los comprobantes y reportes:
 * - "comprobante", nunca "factura"
 * - "Costo de lo vendido", nunca "COGS"
 * - Sin la palabra "reposición"
 * - Sin términos en inglés como "PRODUCT", "BATCH"
 */
export function sanitizeForbiddenPrintTerms(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw)
    .replace(/\bfacturas\b/gi, 'comprobantes')
    .replace(/\bfactura\b/gi, 'comprobante')
    .replace(/\bCOGS\b/gi, 'Costo de lo vendido')
    .replace(/costo de reposici[oó]n/gi, 'costo actual')
    .replace(/\breposici[oó]n\b/gi, 'abastecimiento')
    .replace(/\bPRODUCT\b/gi, 'PRODUCTO')
    .replace(/\bBATCH\b/gi, 'LOTE')
    .replace(/\bSUPPLIER\b/gi, 'PROVEEDOR')
    .replace(/\bCUSTOMER\b/gi, 'CLIENTE');
}

/**
 * Convierte un número decimal a centavos enteros para evitar errores de coma flotante.
 */
export function toCents(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Formatea centavos enteros a moneda (C$).
 */
export function formatCordobasFromCents(cents: number, currency = 'NIO'): string {
  return formatCurrency(cents / 100, currency);
}

/**
 * Construye el encabezado del negocio a partir de la información disponible
 */
export function buildReportBusinessHeader(
  business: any,
  branchName?: string | null,
  _user?: any
): ReportBusinessHeader {
  const businessName =
    business?.name?.trim() ||
    'Negocio';

  const resolvedBranchName =
    branchName?.trim() ||
    'Sucursal principal';

  const taxId =
    business?.taxId?.trim() ||
    null;

  const address =
    business?.posAddress?.trim() ||
    business?.address?.trim() ||
    null;

  const phone =
    business?.posPhone?.trim() ||
    business?.whatsappNumber?.trim() ||
    business?.phone?.trim() ||
    null;

  const logoImage = business?.logoUrl || null;

  return {
    businessName,
    branchName: resolvedBranchName,
    taxId,
    address,
    phone,
    logoImage,
    showLogo: Boolean(logoImage),
    showBusinessName: true,
    showAddress: Boolean(address),
    showPhone: Boolean(phone),
    showTaxId: Boolean(taxId),
  };
}

/**
 * Arma la estructura de período para un rango de fechas ISO
 */
export function buildPeriodFromIsoRange(
  fromIso: string,
  toIso: string,
  label?: string
): ReportPeriodInfo {
  const fromFormatted = formatManaguaDateTime(fromIso);
  const toFormatted = formatManaguaDateTime(toIso);
  const fromYmd = fromIso.slice(0, 10);
  const toYmd = toIso.slice(0, 10);

  return {
    label,
    fromFormatted,
    toFormatted,
    fromSlug: fromYmd,
    toSlug: toYmd,
  };
}

/**
 * Arma la estructura de período para un rango de fechas 'YYYY-MM-DD'
 */
export function buildPeriodFromYmdRange(
  fromYmd: string,
  toYmd: string,
  label?: string
): ReportPeriodInfo {
  const fromFormatted = formatManaguaDate(fromYmd);
  const toFormatted = formatManaguaDate(toYmd);

  return {
    label,
    fromFormatted,
    toFormatted,
    fromSlug: fromYmd,
    toSlug: toYmd,
  };
}

/**
 * Limpia una cadena para usarla en nombres de archivo seguros
 */
export function slugifyFilename(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Genera el nombre de archivo sugerido: `<Reporte>_<negocio>_<desde>_<hasta>.pdf`
 */
export function buildSuggestedReportPdfName(doc: ReportDocument): string {
  const repSlug = slugifyFilename(doc.reportSlug || doc.title || 'Reporte');
  const bizSlug = slugifyFilename(doc.business.businessName || 'Negocio');
  const fromSlug = slugifyFilename(doc.period.fromSlug || 'inicio');
  const toSlug = slugifyFilename(doc.period.toSlug || 'fin');

  return `${repSlug}_${bizSlug}_${fromSlug}_${toSlug}.pdf`;
}
