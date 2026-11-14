import { useEffect } from 'react';

export type ReceiptLinkDocumentKind = 'SALE' | 'QUOTE';

export type QuotePublicDisplayStatus =
  | 'VALID'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'UNAVAILABLE';

export interface PublicReceiptData {
  documentKind?: ReceiptLinkDocumentKind;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'UNAVAILABLE';
  available?: boolean;
  code?: string;
  message?: string;
  businessName: string;
  folio: string;
  quoteNumber?: string;
  saleDate?: string;
  issuedAt?: string;
  validUntil?: string | null;
  validUntilLabel?: string | null;
  total?: number;
  currency?: string;
  expiresAt?: string;
  quoteStatus?: string;
  displayStatus?: QuotePublicDisplayStatus;
  displayStatusLabel?: string;
  pdfUrl?: string;
}

const rawBase = import.meta.env.VITE_API_URL || '/api/v1';

export const PUBLIC_API_BASE = rawBase.endsWith('/api/v1')
  ? rawBase
  : `${rawBase.replace(/\/+$/, '')}/api/v1`;

export function buildPublicReceiptEndpoint(token: string): string {
  return `${PUBLIC_API_BASE}/public/receipts/${encodeURIComponent(token)}`;
}

export function formatPublicCurrency(amount?: number | null, currency?: string): string {
  const curr = (currency || 'NIO').toUpperCase();
  const symbol = curr === 'USD' || curr === '$' ? '$' : 'C$';
  const formatted = Number(amount || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

export function formatPublicDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('es-NI', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function formatPublicExpiresDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-NI', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function useNoIndexRobotsMeta(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let createdMeta = false;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
      createdMeta = true;
    }
    const prevContent = metaRobots.content;
    metaRobots.content = 'noindex, nofollow';

    return () => {
      if (createdMeta && metaRobots && metaRobots.parentNode) {
        metaRobots.parentNode.removeChild(metaRobots);
      } else if (metaRobots) {
        metaRobots.content = prevContent;
      }
    };
  }, []);
}

