import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

export type LabelSizeKey = '50x25' | '40x30' | '58_continuous';

export interface LabelSizeSpec {
  key: LabelSizeKey;
  label: string;
  description: string;
  widthMm: number;
  heightMm: number;
  isContinuous?: boolean;
}

export const LABEL_SIZE_SPECS: Record<LabelSizeKey, LabelSizeSpec> = {
  '50x25': {
    key: '50x25',
    label: '50 × 25 mm',
    description: 'Etiqueta estándar adhesiva (50 × 25 mm)',
    widthMm: 50,
    heightMm: 25,
  },
  '40x30': {
    key: '40x30',
    label: '40 × 30 mm',
    description: 'Etiqueta adhesiva compacta (40 × 30 mm)',
    widthMm: 40,
    heightMm: 30,
  },
  '58_continuous': {
    key: '58_continuous',
    label: 'Rollo de 58 mm',
    description: 'Rollo térmico continuo de 58 mm (58 × 30 mm por etiqueta)',
    widthMm: 58,
    heightMm: 30,
    isContinuous: true,
  },
};

export interface BarcodeLabelPrintItem {
  id: string;
  name: string;
  priceFormatted: string;
  barcode: string;
  copies: number;
}

export interface BuildLabelsParams {
  items: BarcodeLabelPrintItem[];
  sizeKey: LabelSizeKey;
  showPrice: boolean;
}

export function isValidEan13(code: string): boolean {
  const clean = (code || '').trim();
  if (!/^\d{13}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = clean.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? d : d * 3;
  }
  const expected = (10 - (sum % 10)) % 10;
  return Number(clean[12]) === expected;
}

export function formatBarcodeDisplay(code: string): string {
  const clean = (code || '').trim();
  if (/^\d{13}$/.test(clean)) {
    return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7, 13)}`;
  }
  return clean;
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Genera el SVG de barras usando la librería jsbarcode ya instalada en apps/admin.
 * Usa EAN13 cuando el código es un EAN-13 válido de 13 dígitos y CODE128 como respaldo.
 */
export function renderBarcodeSvgString(
  code: string,
  options?: { heightPx?: number; widthPx?: number },
): string {
  const clean = (code || '').trim();
  if (!clean) return '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const format = isValidEan13(clean) ? 'EAN13' : 'CODE128';

  try {
    JsBarcode(svg, clean, {
      format,
      displayValue: false,
      margin: 0,
      width: options?.widthPx ?? 2,
      height: options?.heightPx ?? 60,
      background: '#ffffff',
      lineColor: '#000000',
    });
  } catch {
    JsBarcode(svg, clean, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: options?.widthPx ?? 2,
      height: options?.heightPx ?? 60,
      background: '#ffffff',
      lineColor: '#000000',
    });
  }

  svg.setAttribute('preserveAspectRatio', 'none');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return new XMLSerializer().serializeToString(svg);
}

function renderBarcodeCanvasDataUrl(code: string): string {
  const clean = (code || '').trim();
  const canvas = document.createElement('canvas');
  const format = isValidEan13(clean) ? 'EAN13' : 'CODE128';

  try {
    JsBarcode(canvas, clean, {
      format,
      displayValue: false,
      margin: 0,
      width: 3,
      height: 90,
      background: '#ffffff',
      lineColor: '#000000',
    });
  } catch {
    JsBarcode(canvas, clean, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: 3,
      height: 90,
      background: '#ffffff',
      lineColor: '#000000',
    });
  }

  return canvas.toDataURL('image/png');
}

function getTypographyForSpec(spec: LabelSizeSpec, showPrice: boolean) {
  const isCompact40 = spec.key === '40x30';
  const nameFontMm = isCompact40 ? 2.5 : spec.heightMm === 25 ? 2.5 : 2.8;
  const priceFontMm = isCompact40 ? 3.3 : spec.heightMm === 25 ? 3.2 : 3.6;
  const codeFontMm = isCompact40 ? 2.1 : 2.2;
  const barcodeHeightMm = showPrice
    ? isCompact40
      ? 11.2
      : spec.heightMm === 25
      ? 9.2
      : 12.2
    : isCompact40
    ? 14.5
    : spec.heightMm === 25
    ? 12.2
    : 15.2;

  return { nameFontMm, priceFontMm, codeFontMm, barcodeHeightMm };
}

export function buildLabelsPrintHtml(params: BuildLabelsParams): string {
  const spec = LABEL_SIZE_SPECS[params.sizeKey] || LABEL_SIZE_SPECS['50x25'];
  const { widthMm, heightMm } = spec;
  const { nameFontMm, priceFontMm, codeFontMm, barcodeHeightMm } = getTypographyForSpec(
    spec,
    params.showPrice,
  );

  const expandedPages: Array<{
    name: string;
    priceFormatted: string;
    displayDigits: string;
    svg: string;
  }> = [];

  for (const item of params.items) {
    const copies = Math.max(0, Math.min(500, Math.floor(Number(item.copies) || 0)));
    const cleanCode = (item.barcode || '').trim();
    if (!cleanCode || copies <= 0) continue;
    const svg = renderBarcodeSvgString(cleanCode, { heightPx: 60 });
    const displayDigits = formatBarcodeDisplay(cleanCode);
    for (let c = 0; c < copies; c++) {
      expandedPages.push({
        name: item.name,
        priceFormatted: item.priceFormatted,
        displayDigits,
        svg,
      });
    }
  }

  const labelsHtml = expandedPages
    .map(
      (page, idx) => `
      <div class="label-page${idx < expandedPages.length - 1 ? ' page-break' : ''}">
        <div class="label-name">${escapeHtml(page.name)}</div>
        ${
          params.showPrice
            ? `<div class="label-price">${escapeHtml(page.priceFormatted)}</div>`
            : ''
        }
        <div class="label-barcode-wrap">
          <div class="label-barcode-svg">${page.svg}</div>
          <div class="label-barcode-digits">${escapeHtml(page.displayDigits)}</div>
        </div>
      </div>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Etiquetas de códigos de barras</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      width: ${widthMm}mm;
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      color: #000000;
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    }
    .label-page {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      padding: 1.4mm 2.2mm 1.2mm 2.2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      overflow: hidden;
      background: #FFFFFF;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .label-name {
      width: 100%;
      font-size: ${nameFontMm}mm;
      font-weight: 600;
      line-height: 1.15;
      max-height: ${Number((nameFontMm * 2.35).toFixed(2))}mm;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
      color: #000000;
    }
    .label-price {
      width: 100%;
      font-size: ${priceFontMm}mm;
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.01em;
      color: #000000;
      margin-top: 0.2mm;
    }
    .label-barcode-wrap {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding: 0 1.2mm;
    }
    .label-barcode-svg {
      width: 100%;
      height: ${barcodeHeightMm}mm;
      display: flex;
      align-items: stretch;
      justify-content: center;
    }
    .label-barcode-svg svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .label-barcode-digits {
      width: 100%;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: ${codeFontMm}mm;
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: 0.18mm;
      color: #000000;
      margin-top: 0.35mm;
      white-space: nowrap;
    }
  </style>
</head>
<body>
${labelsHtml}
</body>
</html>`;
}

/**
 * Abre el diálogo de impresión del navegador usando un iframe oculto con @page exacto.
 */
export function printLabelsViaBrowser(params: BuildLabelsParams): void {
  const html = buildLabelsPrintHtml(params);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('No se pudo preparar la vista de impresión.');
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 500);
  };

  setTimeout(() => {
    try {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      win.focus();
      win.onafterprint = cleanup;
      win.print();
    } catch {
      cleanup();
    }
  }, 150);
}

/**
 * Genera y descarga un PDF con tamaño de página exacto igual al tamaño de etiqueta
 * (una etiqueta por página, sin márgenes).
 */
export function downloadLabelsPdf(params: BuildLabelsParams, filename?: string): void {
  const spec = LABEL_SIZE_SPECS[params.sizeKey] || LABEL_SIZE_SPECS['50x25'];
  const { widthMm, heightMm } = spec;
  const { nameFontMm, priceFontMm, codeFontMm, barcodeHeightMm } = getTypographyForSpec(
    spec,
    params.showPrice,
  );

  const mmToPt = (mm: number) => mm * 2.83465;

  const expandedPages: Array<{
    name: string;
    priceFormatted: string;
    barcode: string;
    displayDigits: string;
    dataUrl: string;
  }> = [];

  for (const item of params.items) {
    const copies = Math.max(0, Math.min(500, Math.floor(Number(item.copies) || 0)));
    const cleanCode = (item.barcode || '').trim();
    if (!cleanCode || copies <= 0) continue;
    const dataUrl = renderBarcodeCanvasDataUrl(cleanCode);
    const displayDigits = formatBarcodeDisplay(cleanCode);
    for (let c = 0; c < copies; c++) {
      expandedPages.push({
        name: item.name,
        priceFormatted: item.priceFormatted,
        barcode: cleanCode,
        displayDigits,
        dataUrl,
      });
    }
  }

  if (expandedPages.length === 0) return;

  const pdf = new jsPDF({
    orientation: widthMm >= heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true,
  });

  const padX = 2.2;
  const maxTextW = widthMm - padX * 2;

  expandedPages.forEach((page, idx) => {
    if (idx > 0) {
      pdf.addPage([widthMm, heightMm], widthMm >= heightMm ? 'landscape' : 'portrait');
    }

    // Fondo blanco
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, widthMm, heightMm, 'F');
    pdf.setTextColor(0, 0, 0);

    // 1. Nombre del producto (máximo 2 líneas)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(mmToPt(nameFontMm));
    const rawLines = pdf.splitTextToSize(page.name, maxTextW) as string[];
    const lines = rawLines.slice(0, 2);
    if (rawLines.length > 2 && lines[1]) {
      lines[1] = `${lines[1].slice(0, Math.max(1, lines[1].length - 1))}…`;
    }

    const lineHeightMm = nameFontMm * 1.15;
    let cursorY = 1.6 + nameFontMm * 0.85;
    lines.forEach((line, lineIdx) => {
      pdf.text(line, widthMm / 2, cursorY + lineIdx * lineHeightMm, { align: 'center' });
    });

    // 2. Precio en negrita (opcional)
    if (params.showPrice) {
      const priceY =
        lines.length === 1
          ? 1.6 + lineHeightMm + priceFontMm * 0.95
          : 1.6 + lineHeightMm * 2 + priceFontMm * 0.8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(mmToPt(priceFontMm));
      pdf.text(page.priceFormatted, widthMm / 2, priceY, { align: 'center' });
    }

    // 3. Código de barras + dígitos debajo
    const digitsBottomY = heightMm - 1.3;
    const barcodeW = widthMm - 6.0;
    const barcodeX = (widthMm - barcodeW) / 2;
    const barcodeY = digitsBottomY - codeFontMm - 0.6 - barcodeHeightMm;

    pdf.addImage(page.dataUrl, 'PNG', barcodeX, Math.max(barcodeY, 6.2), barcodeW, barcodeHeightMm);

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(mmToPt(codeFontMm));
    pdf.text(page.displayDigits, widthMm / 2, digitsBottomY, { align: 'center' });
  });

  pdf.save(filename || `etiquetas-${spec.key}.pdf`);
}
