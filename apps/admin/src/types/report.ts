export type ReportTone = 'default' | 'positive' | 'negative' | 'warning' | 'accent';

export interface ReportBusinessHeader {
  businessName: string;
  branchName?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  headerLines?: string[];
  logoImage?: string | null;
  showLogo?: boolean;
  showBusinessName?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showTaxId?: boolean;
}

export interface ReportPeriodInfo {
  label?: string;
  fromFormatted: string;
  toFormatted: string;
  fromSlug: string;
  toSlug: string;
}

export interface ReportKeyValueRow {
  label: string;
  value: string;
  sublabel?: string;
  comparisonText?: string;
  indent?: boolean;
  isTotal?: boolean;
  doubleHeight?: boolean;
  tone?: ReportTone;
}

export interface ReportTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  mono?: boolean;
}

export interface ReportTableSubRow {
  left: string;
  right?: string;
  tone?: ReportTone;
}

export interface ReportTableRow {
  cells: Record<string, string>;
  subRows?: ReportTableSubRow[];
  highlight?: boolean;
}

export interface ReportKeyValueSection {
  type: 'keyValue';
  title?: string;
  subtitle?: string;
  notice?: string;
  rows: ReportKeyValueRow[];
  emptyMessage?: string;
}

export interface ReportTableSection {
  type: 'table';
  title?: string;
  subtitle?: string;
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  totalsRows?: ReportKeyValueRow[];
  emptyMessage?: string;
}

export interface ReportChartTableRow {
  label: string;
  count?: string;
  value: string;
  extra?: string;
}

export interface ReportChartTableSection {
  type: 'chartTable';
  title: string;
  subtitle?: string;
  headers: {
    label: string;
    countLabel?: string;
    valueLabel: string;
    extraLabel?: string;
  };
  rows: ReportChartTableRow[];
  totalsRow?: ReportChartTableRow;
  emptyMessage?: string;
}

export type ReportSection =
  | ReportKeyValueSection
  | ReportTableSection
  | ReportChartTableSection;

export interface ReportDocument {
  reportKey: string;
  reportSlug: string;
  title: string;
  business: ReportBusinessHeader;
  period: ReportPeriodInfo;
  filtersText: string;
  printedBy: string;
  printedAt: string;
  rowCount: number;
  sections: ReportSection[];
  footerText?: string;
}

export interface ReportModalOption {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

