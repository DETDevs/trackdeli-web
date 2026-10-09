export interface ReleaseInfo {
  version: string;
  sizeMB: number;
  downloadUrl: string;
  publishedDate: string;
}

export const FALLBACK_RELEASE: ReleaseInfo = {
  version: '1.0.1',
  sizeMB: 85,
  downloadUrl: 'https://github.com/edwin08torres/nexol-pos-releases/releases/latest',
  publishedDate: ''
};

export const WHATSAPP_PHONE = '50587140989';
export const WHATSAPP_TEST_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, quiero probar Nexol POS'
)}`;
export const WHATSAPP_QUOTE_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, quiero cotizar Nexol POS para mi negocio'
)}`;
export const WHATSAPP_SUPPORT_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, tengo una consulta sobre Nexol POS'
)}`;

export type RubroKey = 'ferreteria' | 'restaurante' | 'farmacia' | 'taller';

export interface InventoryItemData {
  name: string;
  fromStock: number;
  toStock: number;
  unit: string;
  decimals?: number;
}

export interface TicketRubro {
  label: string;
  businessName: string;
  location: string;
  dateTime: string;
  ticketNumber: string;
  metadata: Array<{ label: string; value: string }>;
  lines: Array<{ name: string; price: string }>;
  total: string;
  inventory: InventoryItemData[];
}

export const TICKETS: Record<RubroKey, TicketRubro> = {
  ferreteria: {
    label: 'Ferretería',
    businessName: 'FERRETERÍA EL MAESTRO',
    location: 'Managua, Nicaragua',
    dateTime: '08/10/2026 · 09:15 AM',
    ticketNumber: 'Ticket #01842',
    metadata: [{ label: 'Cliente:', value: 'Juan Carlos Ortiz' }],
    lines: [
      { name: 'Clavos 2½ pulg · 3 LB', price: 'C$105.00' },
      { name: 'Pintura blanca · 1 GAL', price: 'C$680.00' },
      { name: 'Cinta métrica · 1 UND', price: 'C$175.00' }
    ],
    total: 'C$960.00',
    inventory: [
      { name: 'Clavos', fromStock: 48, toStock: 45, unit: 'LB' },
      { name: 'Pintura', fromStock: 12, toStock: 11, unit: 'GAL' },
      { name: 'Cinta métrica', fromStock: 20, toStock: 19, unit: 'UND' }
    ]
  },
  restaurante: {
    label: 'Restaurante',
    businessName: 'CAFETERÍA LA ESQUINA',
    location: 'Managua, Nicaragua',
    dateTime: '08/10/2026 · 01:30 PM',
    ticketNumber: 'Ticket #00319',
    metadata: [
      { label: 'Mesa:', value: 'Mesa 4' },
      { label: 'Mesero:', value: 'Sofía Navarro' }
    ],
    lines: [
      { name: 'Hamburguesa clásica ×2', price: 'C$480.00' },
      { name: 'Refresco natural ×2', price: 'C$110.00' }
    ],
    total: 'C$590.00',
    inventory: [
      { name: 'Pan', fromStock: 30, toStock: 28, unit: 'UND' },
      { name: 'Carne', fromStock: 25, toStock: 23, unit: 'UND' },
      { name: 'Queso', fromStock: 18, toStock: 16, unit: 'UND' },
      { name: 'Fruta', fromStock: 5.0, toStock: 4.6, unit: 'KG', decimals: 2 }
    ]
  },
  farmacia: {
    label: 'Farmacia',
    businessName: 'FARMACIA SANTA LUCÍA',
    location: 'Managua, Nicaragua',
    dateTime: '08/10/2026 · 11:10 AM',
    ticketNumber: 'Ticket #02105',
    metadata: [{ label: 'Cliente:', value: 'Doña Martha Rivas' }],
    lines: [
      { name: 'Acetaminofén 500 mg ×2', price: 'C$40.00' },
      { name: 'Alcohol 70% ×1', price: 'C$85.00' }
    ],
    total: 'C$125.00',
    inventory: [
      { name: 'Acetaminofén', fromStock: 40, toStock: 38, unit: 'UND' },
      { name: 'Alcohol', fromStock: 15, toStock: 14, unit: 'UND' }
    ]
  },
  taller: {
    label: 'Taller',
    businessName: 'TALLER LOS PINOS',
    location: 'Managua, Nicaragua',
    dateTime: '08/10/2026 · 10:45 AM',
    ticketNumber: 'Ticket #00428',
    metadata: [
      { label: 'Cliente:', value: 'Carlos Mendoza' },
      { label: 'Vehículo:', value: 'M123456 · Toyota Hilux' },
      { label: 'Técnico:', value: 'Roberto Gómez' }
    ],
    lines: [
      { name: 'Cambio de aceite', price: 'C$1,100.00' },
      { name: 'Aceite extra 1 LT', price: 'C$220.00' }
    ],
    total: 'C$1,320.00',
    inventory: [
      { name: 'Aceite 15W40', fromStock: 24, toStock: 19, unit: 'LT' },
      { name: 'Filtro de aceite', fromStock: 8, toStock: 7, unit: 'UND' }
    ]
  }
};

export interface RubroItem {
  id: RubroKey;
  name: string;
  titleLines: string[];
  descLines: string[];
  fullDesc: string;
}

export const RUBROS_DATA: RubroItem[] = [
  {
    id: 'ferreteria',
    name: 'Comercios y ferreterías',
    titleLines: ['Comercios y', 'ferreterías'],
    descLines: [
      'Vendé rápido con código de barras, controlá el inventario',
      'por unidad, litro, galón, kilo o libra, y enterate cuando un producto baja de su mínimo.'
    ],
    fullDesc:
      'Vendé rápido con código de barras, controlá el inventario por unidad, litro, galón, kilo o libra, y enterate cuando un producto baja de su mínimo.'
  },
  {
    id: 'restaurante',
    name: 'Restaurantes y cafeterías',
    titleLines: ['Restaurantes y', 'cafeterías'],
    descLines: [
      'Mesas y comandas con tu equipo de meseros.',
      'Cada plato puede descontar sus ingredientes del inventario al venderse.'
    ],
    fullDesc:
      'Mesas y comandas con tu equipo de meseros. Cada plato puede descontar sus ingredientes del inventario al venderse.'
  },
  {
    id: 'taller',
    name: 'Talleres',
    titleLines: ['Talleres'],
    descLines: [
      'Recibí cada vehículo por placa, con cliente y técnico,',
      'y cobrá servicios que descuentan los repuestos del inventario.'
    ],
    fullDesc:
      'Recibí cada vehículo por placa, con cliente y técnico, y cobrá servicios que descuentan los repuestos del inventario.'
  },
  {
    id: 'farmacia',
    name: 'Farmacias',
    titleLines: ['Farmacias'],
    descLines: [
      'Vendé en mostrador con inventario por producto,',
      'existencias en tiempo real y compras de mercadería registradas.'
    ],
    fullDesc:
      'Vendé en mostrador con inventario por producto, existencias en tiempo real y compras de mercadería registradas.'
  }
];

// Reusable Serrated Edge (Sawtooth)

export const AVAILABLE_SCREENS: Record<string, string | undefined> = {};

export const REPORT_BARS: Array<{ hour: string; amount: number; peak?: boolean }> = [
  { hour: '8a', amount: 640 },
  { hour: '9a', amount: 910 },
  { hour: '10a', amount: 1240 },
  { hour: '12p', amount: 2350, peak: true },
  { hour: '2p', amount: 1420 },
  { hour: '4p', amount: 1780 },
  { hour: '6p', amount: 1430 }
];
export const REPORT_MAX = 2350;

export const formatCaja = (v: number) => `C$${Math.round(v).toLocaleString('en-US')}`;
export const blendStyle: React.CSSProperties = { color: '#FFFFFF', mixBlendMode: 'difference' };

export const RUBRO_DIRS = [
  'inset(100% 0% 0% 0%)',
  'inset(0% 0% 0% 100%)',
  'inset(0% 0% 100% 0%)',
  'inset(0% 100% 0% 0%)'
];

export const fmtStock = (inv: InventoryItemData, v: number) =>
  inv.decimals ? v.toFixed(inv.decimals) : Math.round(v).toString();
