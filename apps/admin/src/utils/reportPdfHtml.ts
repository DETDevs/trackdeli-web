import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ReportChartTableSection,
  ReportDocument,
  ReportKeyValueRow,
  ReportKeyValueSection,
  ReportSection,
  ReportTableSection,
  ReportTone,
} from '../types/report';
import {
  buildSuggestedReportPdfName,
  DEFAULT_REPORT_FOOTER_TEXT,
  sanitizeForbiddenPrintTerms,
} from './reportHelpers';

if (typeof window !== 'undefined') {
  (window as any).html2canvas = html2canvas;
}

function stripNonWinAnsiEmojis(text: string): string {
  return text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toneClass(tone?: ReportTone): string {
  switch (tone) {
    case 'positive':
      return 'tone-positive';
    case 'negative':
      return 'tone-negative';
    case 'warning':
      return 'tone-warning';
    case 'accent':
      return 'tone-accent';
    default:
      return '';
  }
}

function renderKeyValueRowsHtml(rows: ReportKeyValueRow[]): string {
  return rows
    .map((row) => {
      const classes = [
        'kv-row',
        row.isTotal ? 'kv-total' : '',
        row.doubleHeight ? 'kv-grand-total' : '',
        row.indent ? 'kv-indent' : '',
      ]
        .filter(Boolean)
        .join(' ');

      const valClasses = ['kv-value', toneClass(row.tone)].filter(Boolean).join(' ');

      return `
        <div class="${classes}">
          <div class="kv-left">
            <div class="kv-label">${escapeHtml(sanitizeForbiddenPrintTerms(row.label))}</div>
            ${row.sublabel ? `<div class="kv-sublabel">${escapeHtml(sanitizeForbiddenPrintTerms(row.sublabel))}</div>` : ''}
            ${row.comparisonText ? `<div class="kv-comparison">${escapeHtml(sanitizeForbiddenPrintTerms(row.comparisonText))}</div>` : ''}
          </div>
          <div class="${valClasses}">${escapeHtml(row.value)}</div>
        </div>
      `;
    })
    .join('');
}

function renderKeyValueSectionHtml(section: ReportKeyValueSection): string {
  return `
    <section class="report-section">
      ${section.title ? `<h2 class="section-title">${escapeHtml(sanitizeForbiddenPrintTerms(section.title))}</h2>` : ''}
      ${section.subtitle ? `<p class="section-subtitle">${escapeHtml(sanitizeForbiddenPrintTerms(section.subtitle))}</p>` : ''}
      ${section.notice ? `<div class="section-notice">${escapeHtml(sanitizeForbiddenPrintTerms(section.notice))}</div>` : ''}
      ${
        !section.rows || section.rows.length === 0
          ? `<p class="empty-msg">${escapeHtml(section.emptyMessage || 'Sin datos en el período')}</p>`
          : `<div class="kv-list">${renderKeyValueRowsHtml(section.rows)}</div>`
      }
    </section>
  `;
}

function renderTableSectionHtml(section: ReportTableSection): string {
  const colCount = Math.max(1, section.columns.length);

  const theadHtml = `
    <thead>
      <tr>
        ${section.columns
          .map((col) => {
            const align = col.align || 'left';
            const style = col.width ? ` style="width: ${escapeHtml(col.width)};"` : '';
            return `<th class="align-${align}"${style}>${escapeHtml(sanitizeForbiddenPrintTerms(col.label))}</th>`;
          })
          .join('')}
      </tr>
    </thead>
  `;

  const tbodyRowsHtml =
    !section.rows || section.rows.length === 0
      ? `<tr><td colspan="${colCount}" class="empty-cell">${escapeHtml(
          section.emptyMessage || 'Sin datos en el período'
        )}</td></tr>`
      : section.rows
          .map((row) => {
            const mainCells = section.columns
              .map((col) => {
                const align = col.align || 'left';
                const mono = col.mono ? ' cell-mono' : '';
                const val = sanitizeForbiddenPrintTerms(row.cells[col.key] ?? '');
                return `<td class="align-${align}${mono}">${escapeHtml(val)}</td>`;
              })
              .join('');

            const subRowsHtml =
              row.subRows && row.subRows.length > 0
                ? `
                  <tr class="sub-row-container">
                    <td colspan="${colCount}" class="sub-row-cell">
                      <div class="sub-row-box">
                        ${row.subRows
                          .map((sr) => {
                            const srTone = toneClass(sr.tone);
                            return `
                              <div class="sub-row-line">
                                <span class="sub-row-left">${escapeHtml(sanitizeForbiddenPrintTerms(sr.left))}</span>
                                ${
                                  sr.right
                                    ? `<span class="sub-row-right ${srTone}">${escapeHtml(sr.right)}</span>`
                                    : ''
                                }
                              </div>
                            `;
                          })
                          .join('')}
                      </div>
                    </td>
                  </tr>
                `
                : '';

            return `<tr class="data-row${row.highlight ? ' row-highlight' : ''}">${mainCells}</tr>${subRowsHtml}`;
          })
          .join('');

  const totalsHtml =
    section.totalsRows && section.totalsRows.length > 0
      ? `<div class="table-totals-box">${renderKeyValueRowsHtml(section.totalsRows)}</div>`
      : '';

  return `
    <section class="report-section">
      ${section.title ? `<h2 class="section-title">${escapeHtml(sanitizeForbiddenPrintTerms(section.title))}</h2>` : ''}
      ${section.subtitle ? `<p class="section-subtitle">${escapeHtml(sanitizeForbiddenPrintTerms(section.subtitle))}</p>` : ''}
      <table class="report-table">
        ${theadHtml}
        <tbody>
          ${tbodyRowsHtml}
        </tbody>
      </table>
      ${totalsHtml}
    </section>
  `;
}

function renderChartTableSectionHtml(section: ReportChartTableSection): string {
  const hasCount = Boolean(section.headers.countLabel);
  const hasExtra = Boolean(section.headers.extraLabel);
  const colCount = 2 + (hasCount ? 1 : 0) + (hasExtra ? 1 : 0);

  return `
    <section class="report-section">
      <h2 class="section-title">${escapeHtml(sanitizeForbiddenPrintTerms(section.title))}</h2>
      ${section.subtitle ? `<p class="section-subtitle">${escapeHtml(sanitizeForbiddenPrintTerms(section.subtitle))}</p>` : ''}
      <table class="report-table">
        <thead>
          <tr>
            <th class="align-left">${escapeHtml(sanitizeForbiddenPrintTerms(section.headers.label))}</th>
            ${hasCount ? `<th class="align-right">${escapeHtml(sanitizeForbiddenPrintTerms(section.headers.countLabel))}</th>` : ''}
            <th class="align-right">${escapeHtml(sanitizeForbiddenPrintTerms(section.headers.valueLabel))}</th>
            ${hasExtra ? `<th class="align-right">${escapeHtml(sanitizeForbiddenPrintTerms(section.headers.extraLabel))}</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${
            !section.rows || section.rows.length === 0
              ? `<tr><td colspan="${colCount}" class="empty-cell">${escapeHtml(
                  section.emptyMessage || 'Sin datos en el período'
                )}</td></tr>`
              : section.rows
                  .map(
                    (r) => `
                <tr class="data-row">
                  <td class="align-left">${escapeHtml(sanitizeForbiddenPrintTerms(r.label))}</td>
                  ${hasCount ? `<td class="align-right cell-mono">${escapeHtml(r.count || '0')}</td>` : ''}
                  <td class="align-right cell-mono">${escapeHtml(r.value)}</td>
                  ${hasExtra ? `<td class="align-right">${escapeHtml(r.extra || '')}</td>` : ''}
                </tr>
              `
                  )
                  .join('')
          }
          ${
            section.totalsRow
              ? `
            <tr class="data-row row-highlight">
              <td class="align-left"><strong>${escapeHtml(sanitizeForbiddenPrintTerms(section.totalsRow.label))}</strong></td>
              ${
                hasCount
                  ? `<td class="align-right cell-mono"><strong>${escapeHtml(
                      section.totalsRow.count || ''
                    )}</strong></td>`
                  : ''
              }
              <td class="align-right cell-mono"><strong>${escapeHtml(section.totalsRow.value)}</strong></td>
              ${hasExtra ? `<td class="align-right"><strong>${escapeHtml(section.totalsRow.extra || '')}</strong></td>` : ''}
            </tr>
          `
              : ''
          }
        </tbody>
      </table>
    </section>
  `;
}

function renderSectionHtml(section: ReportSection): string {
  if (section.type === 'keyValue') return renderKeyValueSectionHtml(section);
  if (section.type === 'table') return renderTableSectionHtml(section);
  return renderChartTableSectionHtml(section);
}

/**
 * Construye el documento HTML completo para hoja carta vertical (Letter portrait, márgenes 15 mm).
 */
export function buildReportPdfHtml(doc: ReportDocument): string {
  const b = doc.business;
  const footerLegend = doc.footerText || DEFAULT_REPORT_FOOTER_TEXT;

  const metaDetails: string[] = [];
  if (b.branchName) metaDetails.push(`Sucursal: ${escapeHtml(b.branchName)}`);
  if (b.showTaxId !== false && b.taxId) metaDetails.push(`RUC: ${escapeHtml(b.taxId)}`);
  if (b.showPhone !== false && b.phone) metaDetails.push(`Tel: ${escapeHtml(b.phone)}`);

  const headerLinesHtml =
    b.headerLines && b.headerLines.length > 0
      ? b.headerLines
          .filter((l) => Boolean(l && l.trim()))
          .map((l) => `<div class="biz-extra">${escapeHtml(l)}</div>`)
          .join('')
      : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(buildSuggestedReportPdfName(doc).replace(/\.pdf$/, ''))}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.42;
      color: #111827;
      background: #FFFFFF;
      padding: 0;
      margin: 0;
    }
    .doc-container {
      width: 100%;
      max-width: 100%;
    }
    .doc-header {
      border-bottom: 2px solid #111827;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .biz-block {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      max-width: 58%;
    }
    .biz-logo {
      max-height: 48px;
      max-width: 80px;
      object-fit: contain;
    }
    .biz-name {
      font-size: 15px;
      font-weight: 700;
      color: #0F0F0F;
      margin-bottom: 2px;
      line-height: 1.2;
    }
    .biz-meta, .biz-extra {
      font-size: 10.5px;
      color: #4B5563;
      line-height: 1.35;
    }
    .report-meta-block {
      text-align: right;
      max-width: 42%;
    }
    .report-title {
      font-size: 15px;
      font-weight: 700;
      color: #0F0F0F;
      margin-bottom: 3px;
      line-height: 1.2;
    }
    .report-period {
      font-size: 10.5px;
      color: #1F2937;
      font-weight: 600;
    }
    .report-printed {
      font-size: 10px;
      color: #6B7280;
      margin-top: 2px;
    }
    .filters-bar {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 14px;
      font-size: 10px;
      color: #374151;
    }
    .filters-bar strong {
      color: #111827;
    }
    .report-section {
      margin-bottom: 16px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #111827;
      border-bottom: 1px solid #D1D5DB;
      padding-bottom: 4px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .section-subtitle {
      font-size: 10px;
      color: #6B7280;
      margin-bottom: 6px;
    }
    .section-notice {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      color: #92400E;
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 10px;
      margin-bottom: 8px;
    }
    .kv-list {
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      overflow: hidden;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 5px 10px;
      border-bottom: 1px solid #F3F4F6;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .kv-row:last-child {
      border-bottom: none;
    }
    .kv-indent {
      padding-left: 20px;
      background: #FCFCFD;
    }
    .kv-total {
      background: #F3F4F6;
      border-top: 1px solid #D1D5DB;
      font-weight: 700;
    }
    .kv-grand-total {
      background: #EEF2FF;
      border-top: 1.5px solid #111827;
      font-size: 12px;
      font-weight: 700;
      padding: 7px 10px;
    }
    .kv-left {
      flex: 1;
      min-width: 0;
    }
    .kv-label {
      color: #111827;
    }
    .kv-sublabel {
      font-size: 9.5px;
      color: #6B7280;
      margin-top: 1px;
    }
    .kv-comparison {
      font-size: 9.5px;
      color: #4B5563;
      margin-top: 1px;
    }
    .kv-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      white-space: nowrap;
      text-align: right;
      color: #111827;
    }
    .tone-positive { color: #047857; }
    .tone-negative { color: #B91C1C; }
    .tone-warning { color: #B45309; }
    .tone-accent { color: #6D28D9; }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      table-layout: auto;
    }
    .report-table thead {
      display: table-header-group;
    }
    .report-table tfoot {
      display: table-footer-group;
    }
    .report-table th {
      background: #F3F4F6;
      color: #111827;
      font-weight: 700;
      padding: 6px 7px;
      border-top: 1px solid #D1D5DB;
      border-bottom: 1.5px solid #9CA3AF;
    }
    .report-table td {
      padding: 5px 7px;
      border-bottom: 1px solid #E5E7EB;
      vertical-align: top;
      color: #1F2937;
    }
    .report-table tr.data-row {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .report-table tr.row-highlight td {
      background: #F9FAFB;
      font-weight: 700;
    }
    .sub-row-container {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sub-row-cell {
      padding: 0 7px 5px 18px !important;
      background: #FAFAFA;
      border-bottom: 1px solid #D1D5DB !important;
    }
    .sub-row-box {
      border-left: 2px solid #D1D5DB;
      padding-left: 8px;
      padding-top: 3px;
    }
    .sub-row-line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 9.5px;
      color: #4B5563;
      padding: 1px 0;
    }
    .sub-row-right {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: nowrap;
    }
    .table-totals-box {
      margin-top: 8px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .align-left { text-align: left; }
    .align-right { text-align: right; }
    .align-center { text-align: center; }
    .cell-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .empty-msg, .empty-cell {
      text-align: center;
      color: #6B7280;
      font-style: italic;
      padding: 12px;
    }
    .doc-footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #6B7280;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media screen {
      body {
        padding: 18px 20px;
      }
    }
    @media print {
      body {
        background: transparent !important;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <header class="doc-header">
      <div class="biz-block">
        ${
          b.showLogo && b.logoImage
            ? `<img src="${b.logoImage}" alt="Logo" class="biz-logo" />`
            : ''
        }
        <div>
          ${
            b.showBusinessName !== false && b.businessName
              ? `<div class="biz-name">${escapeHtml(b.businessName)}</div>`
              : ''
          }
          ${metaDetails.length > 0 ? `<div class="biz-meta">${metaDetails.join(' · ')}</div>` : ''}
          ${
            b.showAddress !== false && b.address
              ? `<div class="biz-meta">${escapeHtml(b.address)}</div>`
              : ''
          }
          ${headerLinesHtml}
        </div>
      </div>

      <div class="report-meta-block">
        <div class="report-title">${escapeHtml(sanitizeForbiddenPrintTerms(doc.title))}</div>
        ${
          doc.period.label
            ? `<div class="report-period">Período: ${escapeHtml(doc.period.label)}</div>`
            : ''
        }
        <div class="report-meta biz-meta">
          Desde ${escapeHtml(doc.period.fromFormatted)} hasta ${escapeHtml(doc.period.toFormatted)} (Managua)
        </div>
        <div class="report-printed">
          Impreso por ${escapeHtml(doc.printedBy)} el ${escapeHtml(doc.printedAt)}
        </div>
      </div>
    </header>

    <div class="filters-bar">
      <strong>Filtros aplicados:</strong> ${escapeHtml(sanitizeForbiddenPrintTerms(doc.filtersText || '—'))}
    </div>

    <main>
      ${doc.sections.map(renderSectionHtml).join('\n')}
    </main>

    <footer class="doc-footer">
      <span>${escapeHtml(footerLegend)}</span>
      <span class="page-legend">Página 1</span>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Abre el diálogo de impresión nativo del navegador de forma aislada e instantánea mediante un iframe oculto.
 */
export function printReportHtmlViaIframe(html: string, title?: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    let settled = false;
    let removeTimer: ReturnType<typeof setTimeout> | null = null;
    const removeIframe = () => {
      if (removeTimer) {
        clearTimeout(removeTimer);
        removeTimer = null;
      }
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const scheduleSafeCleanup = () => {
      // En móviles/Android cw.print() es asíncrono y el spooler de impresión lee el iframe
      // durante varios segundos; evitar destruirlo a los 500ms.
      removeTimer = setTimeout(removeIframe, 60000);
      setTimeout(resolveOnce, 400);
    };

    const triggerPrint = () => {
      try {
        const cw = iframe.contentWindow;
        if (!cw) {
          removeIframe();
          resolveOnce();
          return;
        }

        if (title && cw.document) {
          cw.document.title = title;
        }

        cw.addEventListener('afterprint', removeIframe, { once: true });
        cw.focus();
        cw.print();
        scheduleSafeCleanup();
      } catch (err) {
        console.error('[printReportHtmlViaIframe] Error al invocar print:', err);
        removeIframe();
        resolveOnce();
      }
    };

    iframe.onload = triggerPrint;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      removeIframe();
      resolveOnce();
    }
  });
}

function buildIsolatedReportDom(html: string, targetPx: number): {
  wrapper: HTMLDivElement;
  container: HTMLDivElement;
} {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const styleEl = parsed.querySelector('style');
  let scopedCss = styleEl ? styleEl.textContent || '' : '';

  // Encapsular estilos al contenedor para evitar fugas CSS hacia/desde Tailwind
  scopedCss = scopedCss
    .replace(/@page\s*\{[\s\S]*?\}/g, '')
    .replace(/(^|[\s,}])body(?=[\s,{:])/gi, '$1.report-pdf-root')
    .replace(/^\s*\*\s*\{/gm, '.report-pdf-root, .report-pdf-root * {');

  // El HTML incluye .doc-footer ("Página 1") para ventana de impresión del navegador;
  // en PDF generado por jsPDF estampamos el paginado real ("Página X de Y") en cada hoja.
  // Usar Arial/Helvetica en .report-pdf-root coincide métricamente con las fuentes estándar de jsPDF
  // para evitar palabras pegadas en negrita o recortes en texto alineado a la derecha.
  scopedCss += `
    .report-pdf-root {
      width: ${targetPx - 8}px;
      background: #FFFFFF;
      color: #111827;
      padding: 0 4px 0 0 !important;
      margin: 0 !important;
      font-family: Arial, Helvetica, sans-serif !important;
    }
    .report-pdf-root .kv-value,
    .report-pdf-root .cell-mono,
    .report-pdf-root .sub-row-right {
      font-family: 'Courier New', Courier, monospace !important;
    }
    .report-pdf-root .doc-footer {
      display: none !important;
    }
  `;

  // Contenedor anclado dentro del viewport (nunca left:-9999px, porque html2canvas clona
  // estilos computados del nodo y desplazaría todo el contenido fuera del lienzo -> PDF blanco).
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = `${targetPx}px`;
  wrapper.style.height = '0';
  wrapper.style.overflow = 'hidden';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '-1';
  wrapper.style.background = '#FFFFFF';

  const container = document.createElement('div');
  container.className = 'report-pdf-root';
  container.innerHTML = `<style>${scopedCss}</style>${parsed.body.innerHTML}`;

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  return { wrapper, container };
}

async function waitForReportImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) return;

  await Promise.all(
    imgs.map((img) => {
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
        // Reasignar src fuerza recarga CORS si ya estaba en caché sin CORS headers
        img.src = src;
      }

      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          resolve();
        }, 4000);
        img.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          // Evitar que una imagen fallida rompa la captura de html2canvas
          img.style.display = 'none';
          resolve();
        };
      });
    })
  );
}

/**
 * Genera el Blob PDF en hoja carta usando jsPDF + html2canvas desde un DOM aislado.
 * Pagina el documento y estampa "Página X de Y" y la leyenda institucional en cada hoja.
 */
export async function generateReportPdfBlob(doc: ReportDocument): Promise<Blob> {
  if (typeof window !== 'undefined' && !(window as any).html2canvas) {
    (window as any).html2canvas = html2canvas;
  }

  const html = buildReportPdfHtml(doc);
  const targetPx = 794; // 794px ≈ 210mm a 96 DPI; escala limpia para hoja carta
  const { wrapper, container } = buildIsolatedReportDom(html, targetPx);

  try {
    await waitForReportImages(container);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginTop = 14;
    const marginRight = 14;
    const marginBottom = 18;
    const marginLeft = 14;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const footerText = stripNonWinAnsiEmojis(doc.footerText || DEFAULT_REPORT_FOOTER_TEXT);

    const blob = await new Promise<Blob>((resolve, reject) => {
      pdf.html(container, {
        margin: [marginTop, marginRight, marginBottom, marginLeft],
        width: contentWidth,
        windowWidth: targetPx,
        autoPaging: 'text',
        html2canvas: {
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#FFFFFF',
          logging: false,
        },
        callback: (generatedPdf) => {
          try {
            const totalPages = generatedPdf.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
              generatedPdf.setPage(i);
              generatedPdf.setFontSize(8);
              generatedPdf.setTextColor(107, 114, 128); // #6B7280

              // Pie de página institucional y numeración Página X de Y
              const footerY = pageHeight - 9;
              generatedPdf.text(footerText, marginLeft, footerY);
              generatedPdf.text(
                `Página ${i} de ${totalPages}`,
                pageWidth - marginRight,
                footerY,
                { align: 'right' }
              );
            }
            resolve(generatedPdf.output('blob'));
          } catch (e) {
            reject(e);
          }
        },
      });
    });

    return blob;
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}

/**
 * Genera y descarga el archivo PDF en hoja carta usando jsPDF.
 * Pagina el documento y estampa "Página X de Y" y la leyenda institucional en cada hoja.
 */
export async function downloadReportPdfDocument(
  doc: ReportDocument,
  _previewElement?: HTMLElement | null
): Promise<void> {
  const filename = buildSuggestedReportPdfName(doc);
  const blob = await generateReportPdfBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

