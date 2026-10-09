import React, { useState, useEffect, useRef } from 'react';
import {
  DownloadSimple,
  WhatsappLogo,
  CheckCircle,
  WindowsLogo,
  Info
} from '@phosphor-icons/react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  animate
} from 'motion/react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ReleaseInfo {
  version: string;
  sizeMB: number;
  downloadUrl: string;
  publishedDate: string;
}

const FALLBACK_RELEASE: ReleaseInfo = {
  version: '1.0.1',
  sizeMB: 85,
  downloadUrl: 'https://github.com/edwin08torres/nexol-pos-releases/releases/latest',
  publishedDate: ''
};

const WHATSAPP_PHONE = '50587140989';
const WHATSAPP_TEST_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, quiero probar TrackDeli POS'
)}`;
const WHATSAPP_QUOTE_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, quiero cotizar TrackDeli POS para mi negocio'
)}`;
const WHATSAPP_SUPPORT_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, tengo una consulta sobre TrackDeli POS'
)}`;

type RubroKey = 'ferreteria' | 'restaurante' | 'farmacia' | 'taller';

interface InventoryItemData {
  name: string;
  fromStock: number;
  toStock: number;
  unit: string;
  decimals?: number;
}

interface TicketRubro {
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

const TICKETS: Record<RubroKey, TicketRubro> = {
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

interface RubroItem {
  id: RubroKey;
  name: string;
  titleLines: string[];
  descLines: string[];
  fullDesc: string;
}

const RUBROS_DATA: RubroItem[] = [
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
const SawtoothDivider: React.FC<{ flip?: boolean; className?: string }> = ({
  flip = false,
  className = ''
}) => (
  <div className={`w-full h-3 overflow-hidden select-none pointer-events-none ${className}`}>
    <svg
      className={`w-full h-full text-[#FAFAF8] fill-current ${flip ? 'rotate-180' : ''}`}
      viewBox="0 0 1120 12"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0,12 L10,0 L20,12 L30,0 L40,12 L50,0 L60,12 L70,0 L80,12 L90,0 L100,12 L110,0 L120,12 L130,0 L140,12 L150,0 L160,12 L170,0 L180,12 L190,0 L200,12 L210,0 L220,12 L230,0 L240,12 L250,0 L260,12 L270,0 L280,12 L290,0 L300,12 L310,0 L320,12 L330,0 L340,12 L350,0 L360,12 L370,0 L380,12 L390,0 L400,12 L410,0 L420,12 L430,0 L440,12 L450,0 L460,12 L470,0 L480,12 L490,0 L500,12 L510,0 L520,12 L530,0 L540,12 L550,0 L560,12 L570,0 L580,12 L590,0 L600,12 L610,0 L620,12 L630,0 L640,12 L650,0 L660,12 L670,0 L680,12 L690,0 L700,12 L710,0 L720,12 L730,0 L740,12 L750,0 L760,12 L770,0 L780,12 L790,0 L800,12 L810,0 L820,12 L830,0 L840,12 L850,0 L860,12 L870,0 L880,12 L890,0 L900,12 L910,0 L920,12 L930,0 L940,12 L950,0 L960,12 L970,0 L980,12 L990,0 L1000,12 L1010,0 L1020,12 L1030,0 L1040,12 L1050,0 L1060,12 L1070,0 L1080,12 L1090,0 L1100,12 L1110,0 L1120,12 L1120,12 L0,12 Z" />
    </svg>
  </div>
);

// Individual countdown item for the thermal ticket inventory
const InventoryCountdownRow: React.FC<{
  item: InventoryItemData;
  delayMs: number;
  reducedMotion: boolean;
}> = ({ item, delayMs, reducedMotion }) => {
  const [val, setVal] = useState(reducedMotion ? item.toStock : item.fromStock);

  useEffect(() => {
    if (reducedMotion) {
      setVal(item.toStock);
      return;
    }
    setVal(item.fromStock);
    let mounted = true;
    const timer = setTimeout(() => {
      const controls = animate(item.fromStock, item.toStock, {
        duration: 0.6,
        ease: 'easeOut',
        onUpdate: (latest) => {
          if (mounted) setVal(latest);
        }
      });
      return () => controls.stop();
    }, delayMs);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [item.fromStock, item.toStock, delayMs, reducedMotion]);

  const formattedInitial =
    item.decimals && item.decimals > 0 ? item.fromStock.toFixed(item.decimals) : item.fromStock;
  const formattedVal =
    item.decimals && item.decimals > 0 ? val.toFixed(item.decimals) : Math.round(val);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: delayMs / 1000 }}
      className="flex justify-between items-baseline text-[#141414]"
    >
      <span className="truncate pr-2">{item.name}</span>
      <span className="font-bold shrink-0 font-mono tracking-tight text-[11px]">
        <span className="text-[#6B6B6B] font-normal mr-1">{formattedInitial} →</span>
        <span className="text-[#141414]">
          {formattedVal} {item.unit}
        </span>
      </span>
    </motion.div>
  );
};

// Reusable Thermal Receipt Ticket Body
const TicketReceiptBody: React.FC<{
  ticket: TicketRubro;
  rubroKey: RubroKey;
  reducedMotion: boolean;
  activeAnimation?: boolean;
}> = ({ ticket, rubroKey, reducedMotion, activeAnimation = true }) => {
  return (
    <div className="bg-[#FFFFFF] border-x border-[#E8E8E4] text-[#141414] font-mono text-xs p-5 shadow-sm space-y-3 select-none relative">
      {/* Header */}
      <div className="text-center space-y-0.5 border-b border-dashed border-[#141414]/30 pb-3">
        <div className="font-bold text-sm tracking-tight text-[#141414]">
          {ticket.businessName}
        </div>
        <div className="text-[11px] text-[#6B6B6B]">{ticket.location}</div>
        <div className="text-[11px] text-[#6B6B6B]">{ticket.dateTime}</div>
        <div className="text-[11px] font-semibold text-[#141414] pt-1">
          {ticket.ticketNumber}
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-1 text-[11px] border-b border-dashed border-[#141414]/30 pb-3">
        {ticket.metadata.map((meta, idx) => (
          <div key={idx} className="flex justify-between">
            <span className="text-[#6B6B6B]">{meta.label}</span>
            <span className="font-semibold text-[#141414]">{meta.value}</span>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-1.5 py-1 text-[11px]">
        {ticket.lines.map((line, idx) => (
          <div key={idx} className="flex justify-between items-start">
            <span className="text-[#141414]">{line.name}</span>
            <span className="font-semibold text-[#141414]">{line.price}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t-2 border-[#141414] pt-2 flex justify-between items-baseline">
        <span className="font-bold text-xs uppercase tracking-wider text-[#141414]">
          TOTAL
        </span>
        <span className="font-bold text-sm text-[#141414]">{ticket.total}</span>
      </div>

      {/* Inventory Block */}
      <div className="mt-4 pt-3 border-t border-dashed border-[#141414]/30 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-[#141414] uppercase tracking-wide">
            Inventario
          </span>
          <motion.span
            initial={reducedMotion ? false : { scale: 2.2, opacity: 0, rotate: -8 }}
            animate={
              reducedMotion
                ? { scale: 1, opacity: 1, rotate: 0 }
                : activeAnimation
                ? { scale: 1, opacity: 1, rotate: 0 }
                : { scale: 2.2, opacity: 0, rotate: -8 }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 420,
                    damping: 18,
                    delay: 0.8
                  }
            }
            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8FD14F] text-[#141414] uppercase tracking-wider"
          >
            descontado
          </motion.span>
        </div>

        <div className="space-y-1 text-[11px]">
          {ticket.inventory.map((inv, idx) => (
            <InventoryCountdownRow
              key={`${rubroKey}-${inv.name}`}
              item={inv}
              delayMs={idx * 140}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>

      <div className="text-center pt-3 text-[10px] text-[#6B6B6B]">
        Gracias por su preferencia
      </div>
    </div>
  );
};

// Foto opcional de pantalla real del POS (archivos en apps/landing/public/screens/).
// Mientras no haya archivo asignado aquí, no se renderiza nada (no se inventan capturas).
// Ejemplo: caja: 'ventas.png', inventario: 'taller.png', reportes: 'backoffice.png'
const AVAILABLE_SCREENS: Record<string, string | undefined> = {};

const ScreenPhoto: React.FC<{ file?: string; alt: string; className?: string }> = ({
  file,
  alt,
  className = ''
}) => {
  const [failed, setFailed] = useState(false);
  if (!file || failed) return null;
  return (
    <div className={`screen-photo overflow-hidden ${className}`}>
      <img
        src={`/screens/${file}`}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="screen-photo-img block w-full h-[115%] object-cover object-top will-change-transform"
      />
    </div>
  );
};

// Ventas por hora (suman C$9,770, igual que el total de la escena Caja)
const REPORT_BARS: Array<{ hour: string; amount: number; peak?: boolean }> = [
  { hour: '8a', amount: 640 },
  { hour: '9a', amount: 910 },
  { hour: '10a', amount: 1240 },
  { hour: '12p', amount: 2350, peak: true },
  { hour: '2p', amount: 1420 },
  { hour: '4p', amount: 1780 },
  { hour: '6p', amount: 1430 }
];
const REPORT_MAX = 2350;

const formatCaja = (v: number) => `C$${Math.round(v).toLocaleString('en-US')}`;
const blendStyle: React.CSSProperties = { color: '#FFFFFF', mixBlendMode: 'difference' };

// Línea de texto enmascarada: sube desde una máscara (overflow hidden con aire para descendentes)
const MaskLine: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className="block overflow-hidden pb-[0.16em] -mb-[0.16em]">
    <span data-in className={`block will-change-transform ${className}`}>
      {children}
    </span>
  </span>
);

// Section 2: "Una venta" as full-screen scenes (pinned on desktop, stacked blocks elsewhere)
const UnaVentaScenes: React.FC<{ pinned: boolean; reduced: boolean }> = ({ pinned, reduced }) => {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (reduced || !root) return;

      const ins = (el: Element | null) => (el ? Array.from(el.querySelectorAll<HTMLElement>('[data-in]')) : []);
      const sc0 = root.querySelector<HTMLElement>('.escena-0');
      const sc1 = root.querySelector<HTMLElement>('.escena-1');
      const sc2 = root.querySelector<HTMLElement>('.escena-2');
      const sc3 = root.querySelector<HTMLElement>('.escena-3');
      if (!sc0 || !sc1 || !sc2 || !sc3) return;

      const totalEl = root.querySelector<HTMLElement>('.escena-total');
      const stockEl = root.querySelector<HTMLElement>('.escena-stock');
      const repTotalEl = root.querySelector<HTMLElement>('.rep-total');
      const cajaObj = { v: 8450 };
      const stockObj = { v: 24 };
      const repObj = { v: 0 };
      const writeTotal = () => {
        if (totalEl) totalEl.textContent = formatCaja(cajaObj.v);
      };
      const writeStock = () => {
        if (stockEl) stockEl.textContent = `${Math.round(stockObj.v)} / 30 LT`;
      };
      const writeRep = () => {
        if (repTotalEl) repTotalEl.textContent = formatCaja(repObj.v);
      };
      writeTotal();
      writeStock();

      const labels = Array.from(root.querySelectorAll<HTMLElement>('.rep-label'));
      const bars = Array.from(root.querySelectorAll<HTMLElement>('.rep-bar'));
      const labelObjs = REPORT_BARS.map(() => ({ v: 0 }));
      // En escritorio el scrub controla las cifras desde cero; en celular se quedan en su valor final
      // hasta que arranca la animación (así nunca se quedan pegadas en "C$0")
      if (pinned) {
        writeRep();
        labels.forEach((el) => {
          el.textContent = 'C$0';
        });
      }
      // Al desmontar o cambiar de modo (escritorio ↔ celular) se dejan los valores finales
      const restore = () => {
        if (totalEl) totalEl.textContent = formatCaja(9770);
        if (stockEl) stockEl.textContent = '19 / 30 LT';
        if (repTotalEl) repTotalEl.textContent = formatCaja(9770);
        labels.forEach((el, i) => {
          el.textContent = formatCaja(REPORT_BARS[i].amount);
        });
      };

      // Entrada de la escena 0 (una sola vez): frase y texto suben desde la máscara; la línea del ticket se "escribe"
      gsap.from(ins(sc0), {
        yPercent: 110,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: root, start: 'top 80%', once: true }
      });
      gsap.fromTo(
        '.una-ticket-in',
        { clipPath: 'inset(0% 100% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1,
          ease: 'power2.inOut',
          delay: 0.35,
          scrollTrigger: { trigger: root, start: 'top 80%', once: true }
        }
      );

      if (pinned) {
        const dots = Array.from(root.querySelectorAll<HTMLElement>('.escena-dot'));
        const T = [1, 2.9, 4.8];
        let active = -2;
        const setActive = (t: number) => {
          const a = t >= T[2] ? 2 : t >= T[1] ? 1 : t >= T[0] ? 0 : -1;
          if (a === active) return;
          active = a;
          dots.forEach((d, i) =>
            gsap.to(d, { opacity: i === a ? 1 : 0.3, scale: i === a ? 1.8 : 1, duration: 0.25, overwrite: true })
          );
        };

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root,
            pin: true,
            start: 'top top',
            end: '+=520%',
            scrub: 1,
            anticipatePin: 1,
            onUpdate: (self) => setActive(self.progress * tl.duration())
          }
        });

        // Escena 0 (salida): la frase crece y sube, la línea del ticket "dispara" y el texto se va
        tl.to('.una-phrase', { scale: 1.35, yPercent: -30, duration: 1.2 }, 0);
        tl.to('.una-ticket', { x: '110vw', ease: 'power2.in', duration: 0.9 }, 0.2);
        tl.to('.una-ticket', { opacity: 0, duration: 0.3 }, 0.8);
        tl.to('.una-cap', { opacity: 0, y: -24, ease: 'power2.in', duration: 0.4 }, 0.3);

        const wipe = (el: Element, from: string, t: number) =>
          tl.fromTo(
            el,
            { clipPath: from },
            { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.8 },
            t
          );
        const rise = (el: Element, t: number) =>
          tl.fromTo(
            ins(el),
            { yPercent: 110 },
            { yPercent: 0, ease: 'power3.out', duration: 0.5, stagger: 0.07 },
            t + 0.4
          );
        const leave = (el: Element, t: number) =>
          tl.to(ins(el), { yPercent: -110, ease: 'power2.in', duration: 0.2, stagger: 0.03 }, t + 1.6);

        // Escena 1: Caja (cortina desde abajo)
        wipe(sc1, 'inset(100% 0% 0% 0%)', T[0]);
        rise(sc1, T[0]);
        tl.fromTo('.escena-1-word', { y: 60 }, { y: -60, duration: 2.2 }, T[0]);
        tl.to(cajaObj, { v: 9770, duration: 0.8, ease: 'power1.out', onUpdate: writeTotal }, T[0] + 0.75);
        leave(sc1, T[0]);

        // Escena 2: Inventario (cortina desde la derecha)
        wipe(sc2, 'inset(0% 0% 0% 100%)', T[1]);
        rise(sc2, T[1]);
        tl.fromTo('.escena-2-word', { y: 60 }, { y: -60, duration: 2.2 }, T[1]);
        tl.fromTo(
          '.inv-bar',
          { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', duration: 0.5 },
          T[1] + 0.45
        );
        tl.fromTo('.inv-row', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, T[1] + 0.5);
        tl.fromTo('.inv-fill', { scaleX: 24 / 30 }, { scaleX: 19 / 30, duration: 0.5, ease: 'power1.inOut' }, T[1] + 0.85);
        tl.to(stockObj, { v: 19, duration: 0.5, ease: 'power1.inOut', onUpdate: writeStock }, T[1] + 0.85);
        tl.fromTo('.inv-fill-amber', { opacity: 0 }, { opacity: 1, duration: 0.08 }, T[1] + 0.85 + 0.4);
        tl.fromTo('.inv-warn', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2 }, T[1] + 1.3);
        tl.to(['.inv-bar', '.inv-row', '.inv-warn'], { opacity: 0, y: -20, ease: 'power2.in', duration: 0.2 }, T[1] + 1.6);
        leave(sc2, T[1]);

        // Escena 3: Reportes (cortina desde arriba) con barras que crecen, cifras que cuentan y una línea de tendencia
        wipe(sc3, 'inset(0% 0% 100% 0%)', T[2]);
        rise(sc3, T[2]);
        tl.fromTo('.escena-3-word', { y: 60 }, { y: -40, duration: 2 }, T[2]);
        tl.to(repObj, { v: 9770, duration: 1.4, ease: 'power1.out', onUpdate: writeRep }, T[2] + 0.5);
        bars.forEach((bar, i) => {
          const start = T[2] + 0.5 + i * 0.09;
          tl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: 'back.out(1.4)' }, start);
          tl.fromTo(labels[i], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25 }, start + 0.35);
          tl.to(
            labelObjs[i],
            {
              v: REPORT_BARS[i].amount,
              duration: 0.5,
              ease: 'power1.out',
              onUpdate: () => {
                labels[i].textContent = formatCaja(labelObjs[i].v);
              }
            },
            start + 0.3
          );
        });
        tl.fromTo(
          '.rep-line',
          { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power1.inOut', duration: 0.95 },
          T[2] + 0.6
        );
        tl.fromTo('.rep-bar-lima', { opacity: 0 }, { opacity: 1, duration: 0.2 }, T[2] + 1.55);
        tl.fromTo(
          '.rep-peak-tag',
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
          T[2] + 1.6
        );

        if (root.querySelector('.screen-photo-img')) {
          tl.fromTo('.screen-photo-img', { yPercent: 0 }, { yPercent: -12, duration: tl.duration() }, 0);
        }
        tl.to({}, { duration: 0.35 }, tl.duration());
        return restore;
      }

      // Celular / tablet: sin pin, cada escena se revela con recorte una sola vez
      const once = (el: Element, start = 'top 80%') => ({ trigger: el, start, once: true });
      const invBar = root.querySelector('.inv-bar') ?? sc2;
      const chart = root.querySelector('.rep-chart') ?? sc3;
      [sc0, sc1, sc2, sc3].forEach((scene) => {
        gsap.fromTo(
          scene,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.9,
            ease: 'power3.inOut',
            scrollTrigger: once(scene, 'top 85%')
          }
        );
      });
      [sc1, sc2, sc3].forEach((scene) => {
        gsap.from(ins(scene), {
          yPercent: 110,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
          delay: 0.35,
          scrollTrigger: once(scene, 'top 85%')
        });
      });

      gsap.to(cajaObj, { v: 9770, duration: 1.2, ease: 'power1.out', delay: 0.6, onUpdate: writeTotal, scrollTrigger: once(sc1, 'top 70%') });

      // Inventario: arranca cuando la barra entra en pantalla (24 → 19, se pone ámbar al cruzar el mínimo)
      const invTrig = once(invBar, 'top 85%');
      gsap.set('.inv-fill', { scaleX: 24 / 30 });
      gsap.set(['.inv-fill-amber', '.inv-warn'], { opacity: 0 });
      gsap.fromTo('.inv-bar', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, delay: 0.2, scrollTrigger: invTrig });
      gsap.fromTo('.inv-row', { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.2, scrollTrigger: invTrig });
      gsap.to('.inv-fill', { scaleX: 19 / 30, duration: 0.9, delay: 0.9, ease: 'power1.inOut', scrollTrigger: invTrig });
      gsap.fromTo(stockObj, { v: 24 }, { v: 19, duration: 0.9, delay: 0.9, ease: 'power1.inOut', immediateRender: false, onUpdate: writeStock, scrollTrigger: invTrig });
      gsap.to('.inv-fill-amber', { opacity: 1, duration: 0.15, delay: 1.65, scrollTrigger: invTrig });
      gsap.to('.inv-warn', { opacity: 1, duration: 0.3, delay: 1.8, scrollTrigger: invTrig });

      // Reportes: el gráfico va atado al scroll (scrub), así se ve crecer siempre que lo recorrés
      // y retrocede si volvés hacia arriba. El total cuenta junto con las barras.
      repObj.v = 0;
      writeRep();
      labels.forEach((el) => {
        el.textContent = 'C$0';
      });
      const repTl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: chart, start: 'top 95%', end: 'bottom 85%', scrub: 0.6 }
      });
      repTl.to(repObj, { v: 9770, duration: 2.1, ease: 'power1.out', onUpdate: writeRep }, 0);
      bars.forEach((bar, i) => {
        const s = i * 0.2;
        repTl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: 'back.out(1.3)' }, s);
        repTl.fromTo(labels[i], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, s + 0.35);
        repTl.to(
          labelObjs[i],
          {
            v: REPORT_BARS[i].amount,
            duration: 0.55,
            ease: 'power1.out',
            onUpdate: () => {
              labels[i].textContent = formatCaja(labelObjs[i].v);
            }
          },
          s + 0.2
        );
      });
      repTl.fromTo('.rep-line', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power1.inOut' }, 0.3);
      repTl.fromTo('.rep-bar-lima', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.5);
      repTl.fromTo('.rep-peak-tag', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' }, 1.65);
      return restore;
    },
    { scope: rootRef, dependencies: [pinned, reduced], revertOnUpdate: true }
  );

  // Escritorio fijado: posiciones absolutas por escena. Celular/tablet: flujo normal (título → cifra → texto), sin huecos
  const sceneBase = pinned ? 'absolute inset-0' : 'relative flex flex-col gap-8 px-[5vw] pt-16 pb-14 sm:pt-24 sm:pb-20';
  const P = (pinnedCls: string, flowCls = '') => (pinned ? pinnedCls : flowCls);
  const bigWord = 'font-serif leading-[1] tracking-[-0.03em] will-change-transform';

  return (
    <section
      id="una-venta"
      ref={rootRef}
      aria-labelledby="una-venta-titulo"
      className={`relative w-full overflow-hidden bg-[#FAFAF8] ${pinned ? 'h-screen' : ''}`}
    >
      {/* Escena 0: Una venta. */}
      <div className={`escena escena-0 ${sceneBase} overflow-hidden bg-[#FAFAF8] text-[#141414]`}>
        <div className={P('absolute inset-x-0 top-[20vh] px-[4vw]')}>
          <h2
            id="una-venta-titulo"
            className={`una-phrase origin-left ${bigWord} ${P('text-[16vw]', 'text-[clamp(64px,20vw,200px)]')}`}
          >
            <MaskLine>Una venta.</MaskLine>
          </h2>
          <p className="una-ticket mt-[3vh] font-mono text-[clamp(11px,1.25vw,18px)] text-[#141414] will-change-transform">
            <span className="una-ticket-in flex items-start gap-2.5">
              <span className="mt-[0.45em] inline-block h-2 w-2 shrink-0 rounded-full bg-[#5FA22B]" aria-hidden="true" />
              <span>Cobro registrado · Ticket #00428 · +C$1,320.00</span>
            </span>
          </p>
        </div>
        <div className={`una-cap max-w-[34ch] text-sm sm:text-base text-[#4A4A4A] ${P('absolute bottom-[6vh] left-[4vw]')}`}>
          <MaskLine>Una sola venta mueve tu caja, tu inventario y tus reportes.</MaskLine>
        </div>
      </div>

      {/* Escena 1: Caja */}
      <div className={`escena escena-1 ${sceneBase} overflow-hidden bg-[#141414] text-[#FAFAF8]`}>
        <ScreenPhoto
          file={AVAILABLE_SCREENS.caja}
          alt="Pantalla de caja del POS"
          className={P('absolute bottom-[10vh] right-[4vw] h-[32vh] w-[34vw]', 'relative order-last h-[36vh] w-full')}
        />
        <h3
          className={`escena-1-word ${bigWord} ${P('absolute left-[4vw] top-[6vh] text-[20vw]', 'text-[clamp(72px,24vw,220px)]')}`}
          style={blendStyle}
        >
          <MaskLine>Caja</MaskLine>
        </h3>
        <div className={P('absolute right-[4vw] top-[34vh] text-right')}>
          <div className="overflow-hidden">
            <span data-in className="mb-2 block text-xs uppercase tracking-wider text-[#A3A3A3]">
              Total del día en caja
            </span>
          </div>
          <MaskLine
            className={`escena-total font-serif leading-[1] tracking-[-0.03em] text-[#8FD14F] ${P('text-[14vw]', 'text-[clamp(52px,17vw,160px)]')}`}
          >
            C$9,770
          </MaskLine>
        </div>
        <div className={`max-w-[34ch] text-sm sm:text-base text-[#D4D4D0] ${P('absolute bottom-[6vh] left-[4vw]')}`}>
          <MaskLine>Cobrás en córdobas o dólares y el total del día se actualiza.</MaskLine>
        </div>
      </div>

      {/* Escena 2: Inventario */}
      <div className={`escena escena-2 ${sceneBase} overflow-hidden bg-[#FAFAF8] text-[#141414]`}>
        <ScreenPhoto
          file={AVAILABLE_SCREENS.inventario}
          alt="Pantalla de inventario del POS"
          className={P('absolute bottom-[8vh] right-[4vw] h-[26vh] w-[30vw]', 'relative order-last h-[32vh] w-full')}
        />
        <h3
          className={`escena-2-word ${bigWord} ${P('absolute left-[4vw] top-[6vh] text-[19vw]', 'text-[clamp(56px,17.5vw,200px)]')}`}
          style={blendStyle}
        >
          <MaskLine>Inventario</MaskLine>
        </h3>
        <div className={P('', 'flex flex-col')}>
          <div className={`inv-row flex items-baseline justify-between ${P('absolute inset-x-[4vw] top-[50vh]', 'mb-3')}`}>
            <span className="text-sm font-medium">Aceite 15W40</span>
            <span className="escena-stock font-mono text-sm font-bold">19 / 30 LT</span>
          </div>
          <div className={`inv-bar bg-[#E8E8E4] ${P('absolute inset-x-0 top-[56vh] h-[8vh]', 'relative -mx-[5vw] h-14')}`}>
            <div
              className="inv-fill absolute inset-0 origin-left will-change-transform"
              style={{ transform: `scaleX(${19 / 30})` }}
            >
              <div className="absolute inset-0 bg-[#141414]" />
              <div className="inv-fill-amber absolute inset-0 bg-[#F59E0B]" />
            </div>
            <div className="absolute -bottom-2 -top-2 w-0.5 bg-[#141414]" style={{ left: '66.667%' }} aria-hidden="true" />
          </div>
          <p className={`inv-warn text-xs font-semibold text-[#B45309] ${P('absolute left-[4vw] top-[67vh]', 'mt-4')}`}>
            Bajo el mínimo
          </p>
        </div>
        <div className={`max-w-[34ch] text-sm sm:text-base text-[#4A4A4A] ${P('absolute bottom-[6vh] left-[4vw]')}`}>
          <MaskLine>Cada venta descuenta lo que gastó y te avisa antes de quedarte sin stock.</MaskLine>
        </div>
      </div>

      {/* Escena 3: Reportes */}
      <div className={`escena escena-3 ${sceneBase} overflow-hidden bg-[#141414] text-[#FAFAF8] ${P('', '!pb-0')}`}>
        <ScreenPhoto
          file={AVAILABLE_SCREENS.reportes}
          alt="Pantalla del backoffice de reportes"
          className={P('absolute right-[4vw] top-[8vh] h-[24vh] w-[28vw]', 'relative h-[30vh] w-full')}
        />
        <h3
          className={`escena-3-word ${bigWord} ${P('absolute left-[4vw] top-[6vh] text-[19vw]', 'text-[clamp(60px,19vw,200px)]')}`}
          style={blendStyle}
        >
          <MaskLine>Reportes</MaskLine>
        </h3>
        <div className={P('absolute right-[4vw] top-[8vh] text-right', '-mt-4')}>
          <div className="overflow-hidden">
            <span data-in className="block text-xs uppercase tracking-wider text-[#A3A3A3]">
              Ventas de hoy
            </span>
          </div>
          <MaskLine
            className={`rep-total font-serif leading-[1] tracking-[-0.02em] text-[#8FD14F] ${P('text-[clamp(32px,6vw,96px)]', 'text-[clamp(44px,12vw,96px)]')}`}
          >
            C$9,770
          </MaskLine>
        </div>
        <div className={`max-w-[34ch] text-sm sm:text-base text-[#D4D4D0] ${P('absolute bottom-[calc(46vh+9vh)] left-[4vw]')}`}>
          <MaskLine>Mirá cómo va tu negocio desde el celular.</MaskLine>
        </div>

        <div className={P('absolute inset-x-0 bottom-0 h-[46vh]', 'rep-chart relative -mx-[5vw] mt-12 h-[clamp(240px,42svh,420px)]')}>
          <div className={`flex h-full items-end ${P('gap-1', 'gap-[3px]')}`}>
            {REPORT_BARS.map((bar) => (
              <div key={bar.hour} className="relative h-full min-w-0 flex-1">
                <div
                  className="absolute bottom-0 w-full"
                  style={{ height: `${(bar.amount / REPORT_MAX) * 100}%` }}
                >
                  <div className="rep-bar absolute inset-0 origin-bottom will-change-transform">
                    <div className="absolute inset-0 bg-[#FAFAF8]/85" />
                    {bar.peak && <div className="rep-bar-lima absolute inset-0 bg-[#8FD14F]" />}
                  </div>
                  <span
                    className={`rep-label absolute left-0 right-0 whitespace-nowrap text-center font-mono text-[#FAFAF8] ${P(
                      '-top-6 text-[11px]',
                      '-top-5 text-[9px] sm:text-[11px]'
                    )}`}
                  >
                    {formatCaja(bar.amount)}
                  </span>
                  {bar.peak && (
                    <span
                      className={`rep-peak-tag absolute left-0 right-0 text-center font-semibold uppercase tracking-wider ${P(
                        '-top-12 text-[11px] text-[#8FD14F]',
                        'top-2 text-[9px] leading-tight text-[#141414] sm:text-[11px]'
                      )}`}
                    >
                      Hora pico
                    </span>
                  )}
                </div>
                <span className="absolute bottom-2 left-0 right-0 z-10 text-center font-mono text-[10px] text-[#141414] sm:left-2 sm:text-left">
                  {bar.hour}
                </span>
              </div>
            ))}
          </div>
          {/* Línea de tendencia: en pantallas angostas chocaría con las cifras, así que solo va de sm para arriba */}
          <svg
            className={`rep-line pointer-events-none absolute inset-0 h-full w-full ${P('', 'hidden sm:block')}`}
            viewBox="0 -3 700 106"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={REPORT_BARS.map((b, i) => `${(i + 0.5) * 100},${100 - (b.amount / REPORT_MAX) * 100}`).join(' ')}
              fill="none"
              stroke="#8FD14F"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>

      {/* Progreso discreto: tres puntos (sin números) */}
      {pinned && (
        <div
          className="pointer-events-none absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3"
          style={{ mixBlendMode: 'difference' }}
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="escena-dot block h-1.5 w-1.5 rounded-full bg-white" style={{ opacity: 0.3 }} />
          ))}
        </div>
      )}
    </section>
  );
};

const RUBRO_DIRS = [
  'inset(100% 0% 0% 0%)',
  'inset(0% 0% 0% 100%)',
  'inset(0% 0% 100% 0%)',
  'inset(0% 100% 0% 0%)'
];

const fmtStock = (inv: InventoryItemData, v: number) =>
  inv.decimals ? v.toFixed(inv.decimals) : Math.round(v).toString();

// Ticket "impreso" de un rubro (valores finales por defecto; GSAP los anima)
const RubroTicket: React.FC<{ ticket: TicketRubro; edgeColor: string }> = ({ ticket, edgeColor }) => (
  <div className="rubro-ticket-wrap w-full max-w-[340px] will-change-transform">
    <div className="rubro-ticket-print will-change-transform">
      <div className="relative z-20 flex h-3.5 w-full items-center justify-center rounded-t-md border-x border-t border-[#3a3a3a] bg-[#262626] px-6">
        <div className="h-[2px] w-full bg-[#141414]" />
      </div>
      <div className="relative z-10 overflow-hidden pt-0.5">
        <div className="relative select-none space-y-3 border-x border-[#E8E8E4] bg-[#FFFFFF] p-5 font-mono text-xs text-[#141414]">
          <div className="space-y-0.5 border-b border-dashed border-[#141414]/30 pb-3 text-center">
            <div className="text-sm font-bold tracking-tight">{ticket.businessName}</div>
            <div className="text-[11px] text-[#6B6B6B]">{ticket.location}</div>
            <div className="text-[11px] text-[#6B6B6B]">{ticket.dateTime}</div>
            <div className="pt-1 text-[11px] font-semibold">{ticket.ticketNumber}</div>
          </div>
          <div className="space-y-1 border-b border-dashed border-[#141414]/30 pb-3 text-[11px]">
            {ticket.metadata.map((meta, mIdx) => (
              <div key={mIdx} className="flex justify-between">
                <span className="text-[#6B6B6B]">{meta.label}</span>
                <span className="font-semibold">{meta.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 py-1 text-[11px]">
            {ticket.lines.map((line, lIdx) => (
              <div key={lIdx} className="flex items-start justify-between">
                <span>{line.name}</span>
                <span className="font-semibold">{line.price}</span>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between border-t-2 border-[#141414] pt-2">
            <span className="text-xs font-bold uppercase tracking-wider">TOTAL</span>
            <span className="text-sm font-bold">{ticket.total}</span>
          </div>
          <div className="mt-4 space-y-2 border-t border-dashed border-[#141414]/30 pt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wide">Inventario</span>
              <span className="rubro-stamp inline-block origin-center rounded bg-[#8FD14F] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#141414]">
                descontado
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              {ticket.inventory.map((inv, invIdx) => (
                <div key={invIdx} className="flex items-baseline justify-between">
                  <span className="truncate pr-2">{inv.name}</span>
                  <span className="shrink-0 font-mono text-[11px] font-bold tracking-tight">
                    <span className="mr-1 font-normal text-[#6B6B6B]">{fmtStock(inv, inv.fromStock)} →</span>
                    <span>
                      <span className="rubro-stock">{fmtStock(inv, inv.toStock)}</span> {inv.unit}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 text-center text-[10px] text-[#6B6B6B]">Gracias por su preferencia</div>
        </div>
      </div>
      <div className="relative h-3 w-full overflow-hidden border-x border-[#E8E8E4] bg-[#FFFFFF]">
        <svg className="h-full w-full fill-current" style={{ color: edgeColor }} viewBox="0 0 340 12" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,12 L10,0 L20,12 L30,0 L40,12 L50,0 L60,12 L70,0 L80,12 L90,0 L100,12 L110,0 L120,12 L130,0 L140,12 L150,0 L160,12 L170,0 L180,12 L190,0 L200,12 L210,0 L220,12 L230,0 L240,12 L250,0 L260,12 L270,0 L280,12 L290,0 L300,12 L310,0 L320,12 L330,0 L340,12 L340,12 L0,12 Z" />
        </svg>
      </div>
    </div>
  </div>
);

// Section 3: "Hecho para cómo trabaja tu negocio" con el mismo lenguaje de escenas
const RubrosSectionGSAP: React.FC<{
  tickets: Record<RubroKey, TicketRubro>;
  lenisRef: React.MutableRefObject<Lenis | null>;
  prefersReducedMotion: boolean;
  pinned: boolean;
}> = ({ tickets, lenisRef, prefersReducedMotion, pinned }) => {
  const rootRef = useRef<HTMLElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const reduced = prefersReducedMotion;
  const STEP = 1.7;

  const scrollToRubro = (idx: number) => {
    const tl = tlRef.current;
    const st = tl?.scrollTrigger;
    if (!tl || !st) return;
    const progress = (1 + idx * STEP + 1.1) / tl.duration();
    const y = st.start + Math.min(1, progress) * (st.end - st.start);
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  useGSAP(
    () => {
      const root = rootRef.current;
      if (reduced || !root) return;

      const intro = root.querySelector<HTMLElement>('.rubro-intro');
      const scenes = Array.from(root.querySelectorAll<HTMLElement>('.rubro-scene'));
      if (!intro || scenes.length !== RUBROS_DATA.length) return;
      const ins = (el: Element) => Array.from(el.querySelectorAll<HTMLElement>('[data-in]'));
      const stocksOf = (scene: HTMLElement) => Array.from(scene.querySelectorAll<HTMLElement>('.rubro-stock'));

      // Valores iniciales de existencia (cuentan hacia atrás hasta el nuevo valor)
      scenes.forEach((scene, i) => {
        const inv = tickets[RUBROS_DATA[i].id].inventory;
        stocksOf(scene).forEach((el, k) => {
          el.textContent = fmtStock(inv[k], inv[k].fromStock);
        });
      });

      // Entrada del título de la sección (una sola vez)
      gsap.from(ins(intro), {
        yPercent: 110,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.09,
        scrollTrigger: { trigger: root, start: 'top 80%', once: true }
      });

      if (pinned) {
        const dots = Array.from(root.querySelectorAll<HTMLElement>('.rubro-dot'));
        let active = -2;
        const setActive = (t: number) => {
          const a = t < 0.9 ? -1 : Math.min(RUBROS_DATA.length - 1, Math.floor((t - 0.9) / STEP));
          if (a === active) return;
          active = a;
          dots.forEach((d, i) => {
            d.setAttribute('aria-current', i === a ? 'true' : 'false');
            gsap.to(d.firstElementChild, { opacity: i === a ? 1 : 0.3, scale: i === a ? 1.8 : 1, duration: 0.25, overwrite: true });
          });
        };

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root,
            pin: true,
            start: 'top top',
            end: '+=700%',
            scrub: 1,
            anticipatePin: 1,
            onUpdate: (self) => setActive(self.progress * tl.duration())
          }
        });
        tlRef.current = tl;

        tl.fromTo('.rubro-progress', { scaleX: 0 }, { scaleX: 1, duration: 7.4 }, 0);
        tl.to('.intro-block', { yPercent: -20, opacity: 0, ease: 'power2.in', duration: 0.35 }, 0.6);

        scenes.forEach((scene, i) => {
          const t = 1 + i * STEP;
          const lines = ins(scene);
          const print = scene.querySelector<HTMLElement>('.rubro-ticket-print');
          const wrap = scene.querySelector<HTMLElement>('.rubro-ticket-wrap');
          const title = scene.querySelector<HTMLElement>('.rubro-title');
          const stamp = scene.querySelector<HTMLElement>('.rubro-stamp');

          tl.fromTo(
            scene,
            { clipPath: RUBRO_DIRS[i % RUBRO_DIRS.length] },
            { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.8 },
            t
          );
          tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.5, stagger: 0.06 }, t + 0.4);
          // Parallax: el texto se mueve un poco más rápido (1.1x) que el ticket (0.85x)
          if (title) tl.fromTo(title, { y: 44 }, { y: -44, duration: STEP + 0.3 }, t);
          if (wrap) tl.fromTo(wrap, { y: 34 }, { y: -34, duration: STEP + 0.3 }, t);
          if (print) {
            tl.fromTo(
              print,
              { y: 160, clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 },
              { y: 0, clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, ease: 'power2.out', duration: 0.6 },
              t + 0.4
            );
          }
          const invData = tickets[RUBROS_DATA[i].id].inventory;
          stocksOf(scene).forEach((el, k) => {
            const obj = { v: invData[k].fromStock };
            tl.to(
              obj,
              {
                v: invData[k].toStock,
                duration: 0.4,
                ease: 'power1.out',
                snap: { v: invData[k].decimals ? 0.01 : 1 },
                onUpdate: () => {
                  el.textContent = fmtStock(invData[k], obj.v);
                }
              },
              t + 0.75
            );
          });
          if (stamp) {
            tl.fromTo(
              stamp,
              { scale: 0, rotation: -12, opacity: 0 },
              { scale: 1, rotation: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
              t + 0.95
            );
          }
          // Salida (menos la última): el texto sube y se esconde, el ticket sube y se inclina
          if (i < scenes.length - 1) {
            tl.to(lines, { yPercent: -110, ease: 'power2.in', duration: 0.2, stagger: 0.02 }, t + 1.4);
            if (print) tl.to(print, { y: -160, rotation: -2.5, opacity: 0, ease: 'power2.in', duration: 0.2 }, t + 1.4);
          }
        });

        tl.to({}, { duration: 0.35 }, tl.duration());
        return;
      }

      // Celular / tablet: sin pin ni parallax; cada bloque se revela una sola vez
      const once = (el: Element) => ({ trigger: el, start: 'top 80%', once: true });
      [intro, ...scenes].forEach((scene) => {
        gsap.fromTo(
          scene,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.inOut', scrollTrigger: once(scene) }
        );
      });
      scenes.forEach((scene, i) => {
        const trig = once(scene);
        gsap.from(ins(scene), { yPercent: 110, duration: 0.7, ease: 'power3.out', stagger: 0.08, delay: 0.35, scrollTrigger: trig });
        const print = scene.querySelector<HTMLElement>('.rubro-ticket-print');
        const stamp = scene.querySelector<HTMLElement>('.rubro-stamp');
        if (print) {
          gsap.fromTo(
            print,
            { y: 80, clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 },
            { y: 0, clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.8, delay: 0.5, ease: 'power2.out', scrollTrigger: trig }
          );
        }
        const inv = tickets[RUBROS_DATA[i].id].inventory;
        stocksOf(scene).forEach((el, k) => {
          const obj = { v: inv[k].fromStock };
          gsap.to(obj, {
            v: inv[k].toStock,
            duration: 0.6,
            delay: 1.1,
            ease: 'power1.out',
            snap: { v: inv[k].decimals ? 0.01 : 1 },
            onUpdate: () => {
              el.textContent = fmtStock(inv[k], obj.v);
            },
            scrollTrigger: trig
          });
        });
        if (stamp) {
          gsap.fromTo(
            stamp,
            { scale: 0, rotation: -12, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.4, delay: 1.4, ease: 'back.out(1.7)', scrollTrigger: trig }
          );
        }
      });
    },
    { scope: rootRef, dependencies: [pinned, reduced, tickets], revertOnUpdate: true }
  );

  const base = pinned ? 'absolute inset-0' : 'relative';
  const stackedCol = pinned ? '' : 'flex flex-col gap-8 px-[5vw] pt-16 pb-16 sm:pt-24 sm:pb-24';

  return (
    <section
      id="rubros-showcase"
      ref={rootRef}
      aria-labelledby="rubros-titulo"
      className={`relative w-full overflow-hidden bg-[#FAFAF8] ${pinned ? 'h-screen' : ''}`}
    >
      {/* Intro: título de la sección */}
      <div className={`rubro-intro ${base} ${stackedCol} overflow-hidden bg-[#FAFAF8] text-[#141414]`}>
        <div className={`intro-block ${pinned ? 'absolute inset-x-0 top-[16vh] px-[4vw]' : ''}`}>
          <h2
            id="rubros-titulo"
            className="font-serif text-[clamp(44px,9.5vw,180px)] leading-[1] tracking-[-0.03em]"
          >
            <MaskLine>Hecho para</MaskLine>
            <MaskLine>cómo trabaja</MaskLine>
            <MaskLine>tu negocio</MaskLine>
          </h2>
          <div className="mt-6 max-w-[40ch] text-sm sm:text-base text-[#4A4A4A]">
            <MaskLine>Adaptado a la dinámica real de tu mostrador, mesa o taller en Nicaragua.</MaskLine>
          </div>
        </div>
      </div>

      {/* Escenas por rubro */}
      {RUBROS_DATA.map((rubro, i) => {
        const dark = i % 2 === 0;
        const ticket = tickets[rubro.id];
        return (
          <div
            key={rubro.id}
            className={`rubro-scene ${base} ${stackedCol} overflow-hidden ${
              dark ? 'bg-[#141414] text-[#FAFAF8]' : 'bg-[#FAFAF8] text-[#141414]'
            }`}
          >
            <h3
              className={`rubro-title font-serif text-[clamp(44px,8.4vw,160px)] leading-[1] tracking-[-0.03em] will-change-transform ${
                pinned ? 'absolute left-[4vw] top-[10vh]' : ''
              }`}
              style={blendStyle}
            >
              {rubro.titleLines.map((line) => (
                <MaskLine key={line}>{line}</MaskLine>
              ))}
            </h3>

            <div
              className={`max-w-[40ch] text-sm sm:text-base ${dark ? 'text-[#D4D4D0]' : 'text-[#4A4A4A]'} ${
                pinned ? 'absolute bottom-[8vh] left-[4vw]' : ''
              }`}
            >
              <MaskLine>{rubro.fullDesc}</MaskLine>
            </div>

            <div className={pinned ? 'absolute right-[6vw] top-1/2 w-full max-w-[340px] -translate-y-1/2' : 'w-full max-w-[340px]'}>
              <RubroTicket ticket={ticket} edgeColor={dark ? '#141414' : '#FAFAF8'} />
            </div>
          </div>
        );
      })}

      {pinned && (
        <>
          <div className="rubro-progress absolute inset-x-0 bottom-0 z-20 h-[3px] origin-left bg-[#8FD14F]" style={{ transform: 'scaleX(0)' }} />
          <div
            className="pointer-events-none absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1"
            style={{ mixBlendMode: 'difference' }}
          >
            {RUBROS_DATA.map((rubro, i) => (
              <button
                key={rubro.id}
                type="button"
                onClick={() => scrollToRubro(i)}
                aria-label={`Ir a ${rubro.name}`}
                aria-current="false"
                className="rubro-dot pointer-events-auto flex h-5 w-5 cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-white"
              >
                <span className="block h-1.5 w-1.5 rounded-full bg-white" style={{ opacity: 0.3 }} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export const App: React.FC = () => {
  const [selectedRubro, setSelectedRubro] = useState<RubroKey>('ferreteria');
  const [release, setRelease] = useState<ReleaseInfo>(FALLBACK_RELEASE);
  const [isWindows, setIsWindows] = useState<boolean>(true);
  const [apiError, setApiError] = useState<boolean>(false);
  const [loadingRelease, setLoadingRelease] = useState<boolean>(true);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'started'>('idle');
  const lenisRef = useRef<Lenis | null>(null);

  // Preference for reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  // Pointer device check (fine vs coarse)
  const [isFinePointer, setIsFinePointer] = useState<boolean>(false);

  // Tilt state for thermal receipt
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number; glareX: number; glareY: number }>({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50
  });

  // Section 4 Price element refs for GSAP
  const priceRef = useRef<HTMLDivElement>(null);
  const priceBgRef = useRef<HTMLDivElement>(null);
  const priceNumberRef = useRef<HTMLSpanElement>(null);

  // Hero wordmark refs
  const heroRef = useRef<HTMLElement>(null);
  const wmFixedRef = useRef<HTMLDivElement>(null);
  const wmStaticRef = useRef<HTMLSpanElement>(null);
  const brandWordRef = useRef<HTMLSpanElement>(null);

  // Desktop width (>= 1024px)
  const [isDesktopW, setIsDesktopW] = useState<boolean>(false);
  // Pinned / scroll-driven layout only on desktop with fine pointer and no reduced motion
  const pinned = !prefersReducedMotion && isDesktopW && isFinePointer;

  // Texture Parallax
  const { scrollY } = useScroll();
  const dotParallax = useTransform(scrollY, [0, 3000], [0, 24]);

  // Detect motion preferences & pointer type
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);
      const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
      setIsFinePointer(pointerQuery.matches);
      const desktopQuery = window.matchMedia('(min-width: 1024px)');
      setIsDesktopW(desktopQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      const handleDesktopChange = (e: MediaQueryListEvent) => setIsDesktopW(e.matches);
      motionQuery.addEventListener('change', handleMotionChange);
      desktopQuery.addEventListener('change', handleDesktopChange);
      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
        desktopQuery.removeEventListener('change', handleDesktopChange);
      };
    }
  }, []);

  // Hero wordmark: desktop = settles into the header logo (scroll 0 -> 400px); mobile = light parallax only
  useGSAP(
    () => {
      if (prefersReducedMotion) return;
      const hero = heroRef.current;
      if (!hero) return;

      if (pinned) {
        const wm = wmFixedRef.current;
        const brand = brandWordRef.current;
        if (!wm || !brand) return;

        const SPAN = 400;
        const ease = gsap.parseEase('power2.inOut');
        const m = { x0: 0, y0: 0, tx: 0, ty: 0, k: 1 };

        const render = () => {
          const s = window.scrollY;
          const p = Math.min(1, Math.max(0, s / SPAN));
          const e = ease(p);
          const yStart = m.y0 - s;
          gsap.set(wm, {
            x: m.x0 + (m.tx - m.x0) * e,
            y: yStart + (m.ty - yStart) * e,
            scale: 1 + (m.k - 1) * e,
            clipPath: `inset(0% 0% ${36 * (1 - e)}% 0%)`,
            zIndex: p >= 0.92 ? 50 : 5
          });
        };

        const measure = () => {
          const w = wm.offsetWidth;
          const h = wm.offsetHeight;
          if (!w || !h) return;
          const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
          const br = brand.getBoundingClientRect();
          m.x0 = (window.innerWidth - w) / 2;
          m.y0 = heroBottom - h * 0.64;
          m.k = br.height / h;
          m.tx = br.left;
          m.ty = br.top;
          gsap.set(wm, { opacity: 1 });
          render();
        };

        measure();
        const st = ScrollTrigger.create({
          start: 0,
          end: SPAN,
          onUpdate: render,
          onLeave: render,
          onLeaveBack: render
        });
        ScrollTrigger.addEventListener('refresh', measure);
        if (typeof document !== 'undefined' && document.fonts) {
          document.fonts.ready.then(measure);
        }
        return () => {
          ScrollTrigger.removeEventListener('refresh', measure);
          st.kill();
        };
      }

      // Celular / tablet: sin acomodo en el logo, solo parallax leve
      const inner = wmStaticRef.current;
      if (inner) {
        gsap.fromTo(
          inner,
          { yPercent: 18 },
          {
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true }
          }
        );
      }
    },
    { dependencies: [pinned, prefersReducedMotion], revertOnUpdate: true }
  );

  // Smooth scroll via Lenis + ScrollTrigger (official integration pattern)
  useEffect(() => {
    if (prefersReducedMotion) return;
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      window.innerWidth >= 1024;
    if (!isDesktop) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5
    });
    lenisRef.current = lenis;

    // 1. lenis.on('scroll', ScrollTrigger.update)
    lenis.on('scroll', ScrollTrigger.update);

    // 2. gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0)
    const tickerUpdate = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerUpdate);
    gsap.ticker.lagSmoothing(0);

    // 3. ScrollTrigger.refresh() on fonts ready and window resize
    const refreshST = () => {
      ScrollTrigger.refresh();
    };
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(refreshST);
    }
    window.addEventListener('resize', refreshST);

    // Intercept anchor clicks
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"]');
      if (target) {
        const href = target.getAttribute('href');
        if (href && href.startsWith('#') && href.length > 1) {
          const el = document.querySelector(href);
          if (el) {
            e.preventDefault();
            lenis.scrollTo(el as HTMLElement, { offset: -20 });
          }
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    return () => {
      window.removeEventListener('resize', refreshST);
      document.removeEventListener('click', handleAnchorClick);
      gsap.ticker.remove(tickerUpdate);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  // General Zara-style entrances (section h2s + $45 price block)
  useGSAP(
    () => {
      if (prefersReducedMotion) return;

      // 1. Zara-style masked line entrance for all section h2s once (start: "top 85%")
      const h2Elements = gsap.utils.toArray<HTMLElement>('.zara-reveal-h2');
      h2Elements.forEach((h2) => {
        gsap.from(h2, {
          yPercent: 110,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: h2,
            start: 'top 85%',
            once: true
          }
        });
      });

      // 2. Price block: scale 1.15 -> 1 (700 ms) and count 0 -> 45
      if (priceRef.current && priceNumberRef.current) {
        const priceObj = { val: 0 };
        const priceTl = gsap.timeline({
          scrollTrigger: {
            trigger: priceRef.current,
            start: 'top 85%',
            once: true
          }
        });

        priceTl.fromTo(
          priceNumberRef.current,
          { scale: 1.15 },
          { scale: 1, duration: 0.7, ease: 'power2.out' },
          0
        );

        priceTl.to(
          priceObj,
          {
            val: 45,
            duration: 0.7,
            ease: 'power2.out',
            snap: { val: 1 },
            onUpdate: () => {
              if (priceNumberRef.current) {
                priceNumberRef.current.textContent = `$${Math.round(priceObj.val)}`;
              }
            }
          },
          0
        );

        if (priceBgRef.current) {
          gsap.fromTo(
            priceBgRef.current,
            { y: 70 },
            {
              y: -70,
              ease: 'none',
              scrollTrigger: {
                trigger: priceRef.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
              }
            }
          );
        }
      }
    },
    { dependencies: [prefersReducedMotion] }
  );

  // Detect OS & fetch release
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isWin = ua.includes('windows') || ua.includes('win32');
      setIsWindows(isWin);
    }

    const fetchLatestRelease = async () => {
      try {
        const res = await fetch(
          'https://api.github.com/repos/edwin08torres/nexol-pos-releases/releases/latest'
        );
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();

        const exeAsset = data.assets?.find(
          (a: any) =>
            typeof a.name === 'string' &&
            a.name.toLowerCase().endsWith('.exe') &&
            !a.name.toLowerCase().endsWith('.blockmap')
        );

        if (exeAsset) {
          const rawVersion = data.tag_name ? data.tag_name.replace(/^v/i, '') : data.name || '1.0.1';
          const sizeMB = exeAsset.size ? Math.round(exeAsset.size / (1024 * 1024)) : 85;
          let pubDate = '';
          if (exeAsset.updated_at || data.published_at) {
            const dateObj = new Date(exeAsset.updated_at || data.published_at);
            pubDate = dateObj.toLocaleDateString('es-NI', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
          }

          setRelease({
            version: rawVersion,
            sizeMB,
            downloadUrl: exeAsset.browser_download_url,
            publishedDate: pubDate
          });
        } else {
          setApiError(true);
        }
      } catch {
        setApiError(true);
      } finally {
        setLoadingRelease(false);
      }
    };

    fetchLatestRelease();
  }, []);

  // 3D Tilt handlers
  const handleTicketMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFinePointer || prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 5;
    const rotateX = -((y - centerY) / centerY) * 5;
    setTilt({
      rotateX,
      rotateY,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100
    });
  };

  const handleTicketMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  // Download button handler
  const handleDownloadClick = (e: React.MouseEvent) => {
    if (!isWindows) {
      e.preventDefault();
      alert('Esta descarga es para computadoras con Windows 10 u 11.');
      return;
    }
    setDownloadState('downloading');
    setTimeout(() => {
      setDownloadState('started');
    }, 1200);
  };

  const activeTicket = TICKETS[selectedRubro];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141414] font-sans relative selection:bg-[#8FD14F] selection:text-[#141414]">
      {/* Subtle Dot Texture with Parallax */}
      <motion.div
        style={{ y: prefersReducedMotion ? 0 : dotParallax }}
        className="pointer-events-none fixed inset-0 z-0 bg-dots-pattern opacity-[0.035]"
        aria-hidden="true"
      />

      {/* Giant wordmark (desktop): follows the hero edge, then settles into the header logo */}
      {pinned && (
        <div
          ref={wmFixedRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[5] select-none whitespace-nowrap font-serif text-[19vw] leading-none"
          style={{
            color: '#FFFFFF',
            mixBlendMode: 'difference',
            opacity: 0,
            transformOrigin: '0 0',
            willChange: 'transform'
          }}
        >
          TrackDeli
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#E8E8E4] bg-[#FAFAF8]/95 backdrop-blur-xs sticky top-0 z-40">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group text-[#141414]">
            <div className="w-8 h-8 rounded-lg bg-[#141414] text-[#FAFAF8] flex items-center justify-center font-bold text-xs tracking-tight">
              TD
            </div>
            <span className="flex items-baseline gap-1.5 text-[#141414]">
              <span
                ref={brandWordRef}
                className={`inline-block font-serif text-2xl leading-none tracking-tight ${pinned ? 'invisible' : ''}`}
              >
                TrackDeli
              </span>
              <span className="text-xs font-semibold tracking-wide text-[#4A4A4A]">POS</span>
            </span>
          </a>

          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <a
              href="#descargar"
              className="text-[#6B6B6B] hover:text-[#141414] transition-colors py-1.5 font-medium"
            >
              Descargar
            </a>
            <motion.a
              href={WHATSAPP_TEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#141414] text-[#FAFAF8] font-medium text-xs sm:text-sm hover:bg-black transition-all cursor-pointer"
            >
              <WhatsappLogo size={16} weight="fill" />
              <span>Pedir prueba</span>
            </motion.a>
          </nav>
        </div>
      </header>

      <main className="relative">
        {/* 1. Hero Section */}
        <section
          ref={heroRef}
          className="relative pt-12 sm:pt-16 pb-[24vw] sm:pb-[18vw] lg:pb-[11vw] border-b border-[#E8E8E4]"
        >
          {/* Wordmark estático (celular/tablet/reduced motion): recortado a la mitad por el borde inferior */}
          {!pinned && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[0.64em] overflow-hidden text-[22vw] leading-none select-none"
            >
              <span
                ref={wmStaticRef}
                className="block whitespace-nowrap text-center font-serif leading-none"
                style={{ color: '#FFFFFF', mixBlendMode: 'difference', willChange: 'transform' }}
              >
                TrackDeli
              </span>
            </div>
          )}
          <div className="relative z-10 max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
              {/* Left Column: Line-by-line Masked Title Reveal */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                <h1 className="font-serif text-[36px] sm:text-[44px] md:text-[56px] lg:text-[68px] leading-[1.05] tracking-[-0.01em] text-[#141414] text-left">
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      initial={prefersReducedMotion ? false : { y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="block"
                    >
                      Cobrás una vez.
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      initial={prefersReducedMotion ? false : { y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="block"
                    >
                      Tu inventario, tu caja
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      initial={prefersReducedMotion ? false : { y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.23, ease: [0.16, 1, 0.3, 1] }}
                      className="block"
                    >
                      y tus reportes se enteran.
                    </motion.span>
                  </span>
                </h1>

                {/* Subtitle fading in place */}
                <motion.p
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.36, ease: 'easeOut' }}
                  className="mt-6 text-[18px] leading-[1.6] text-[#6B6B6B] max-w-[70ch] text-left font-sans"
                >
                  TrackDeli POS es la caja, el inventario y los reportes de tu comercio, restaurante, ferretería, farmacia o taller en Nicaragua.
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.45, ease: 'easeOut' }}
                  className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto"
                >
                  {/* WhatsApp button with single discreet pulse */}
                  <motion.a
                    href={WHATSAPP_TEST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={{ scale: 0.98 }}
                    animate={
                      prefersReducedMotion
                        ? {}
                        : {
                            scale: [1, 1.03, 1]
                          }
                    }
                    transition={{ duration: 0.55, delay: 1.1, ease: 'easeInOut' }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#8FD14F] text-[#141414] font-medium text-base hover:brightness-95 transition-all text-center cursor-pointer shadow-xs"
                  >
                    <WhatsappLogo size={20} weight="fill" />
                    <span>Pedir prueba de 6 horas</span>
                  </motion.a>

                  <motion.a
                    href="#descargar"
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg border border-[#E8E8E4] bg-[#FFFFFF] text-[#141414] font-medium text-base hover:bg-[#F2F2EF] transition-colors text-center cursor-pointer"
                  >
                    <DownloadSimple size={18} weight="bold" />
                    <span>Descargar para Windows</span>
                  </motion.a>
                </motion.div>

                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.52 }}
                  className="mt-6 flex items-center gap-2 text-xs text-[#6B6B6B]"
                >
                  <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                  <span>Prueba de 6 horas, sin compromiso</span>
                </motion.div>
              </div>

              {/* Right Column: Thermal Receipt with 3D Tilt & Printer Emerge */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-end w-full">
                <div
                  onMouseMove={handleTicketMouseMove}
                  onMouseLeave={handleTicketMouseLeave}
                  className="w-full max-w-[340px] relative"
                  style={{
                    perspective: isFinePointer && !prefersReducedMotion ? '1000px' : undefined
                  }}
                >
                  {/* Printer Slot */}
                  <div className="w-full h-3.5 bg-[#141414] rounded-t-md shadow-inner flex items-center justify-center px-6 relative z-20">
                    <div className="w-full h-[2px] bg-[#292929]" />
                  </div>

                  {/* Ticket Container with AnimatePresence for tear-off on switch */}
                  <div className="overflow-hidden relative z-10 pt-0.5">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedRubro}
                        initial={prefersReducedMotion ? false : { y: -340, opacity: 0 }}
                        animate={{
                          y: 0,
                          opacity: 1,
                          rotateX: isFinePointer && !prefersReducedMotion ? tilt.rotateX : 0,
                          rotateY: isFinePointer && !prefersReducedMotion ? tilt.rotateY : 0
                        }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { y: -340, opacity: 0 }}
                        transition={{
                          y: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                          opacity: { duration: 0.3 },
                          rotateX: { duration: 0.15, ease: 'easeOut' },
                          rotateY: { duration: 0.15, ease: 'easeOut' }
                        }}
                        className="relative"
                      >
                        {/* Thermal Paper Sheen Layer (Desktop only) */}
                        {isFinePointer && !prefersReducedMotion && (
                          <div
                            className="pointer-events-none absolute inset-0 z-30 opacity-15"
                            style={{
                              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.9), transparent 60%)`
                            }}
                            aria-hidden="true"
                          />
                        )}

                        <TicketReceiptBody
                          ticket={activeTicket}
                          rubroKey={selectedRubro}
                          reducedMotion={prefersReducedMotion}
                          activeAnimation={true}
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Sawtooth / Serrated Edge */}
                    <div className="w-full h-3 bg-[#FFFFFF] border-x border-[#E8E8E4] relative overflow-hidden">
                      <svg
                        className="w-full h-full text-[#FAFAF8] fill-current"
                        viewBox="0 0 340 12"
                        preserveAspectRatio="none"
                      >
                        <path d="M0,12 L10,0 L20,12 L30,0 L40,12 L50,0 L60,12 L70,0 L80,12 L90,0 L100,12 L110,0 L120,12 L130,0 L140,12 L150,0 L160,12 L170,0 L180,12 L190,0 L200,12 L210,0 L220,12 L230,0 L240,12 L250,0 L260,12 L270,0 L280,12 L290,0 L300,12 L310,0 L320,12 L330,0 L340,12 L340,12 L0,12 Z" />
                      </svg>
                    </div>
                  </div>

                  {/* Segmented Control Selector */}
                  <div
                    role="group"
                    aria-label="Seleccionar rubro del ticket"
                    className="mt-3 p-1 rounded-xl bg-[#F2F2EF] border border-[#E8E8E4] grid grid-cols-4 gap-1 w-full"
                  >
                    {(['ferreteria', 'restaurante', 'farmacia', 'taller'] as RubroKey[]).map((key) => {
                      const isSelected = selectedRubro === key;
                      return (
                        <motion.button
                          key={key}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedRubro(key)}
                          whileTap={{ scale: 0.98 }}
                          className={`py-1.5 px-1 text-[11px] sm:text-xs rounded-lg transition-all font-medium text-center cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[#141414] text-[#FAFAF8] shadow-xs font-semibold'
                              : 'text-[#6B6B6B] hover:text-[#141414]'
                          }`}
                        >
                          {TICKETS[key].label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tactile Sawtooth Transition Divider */}
        <SawtoothDivider />

        {/* 2. Section: Una venta, tres cosas (escenas a pantalla completa) */}
        <UnaVentaScenes pinned={pinned} reduced={prefersReducedMotion} />

        {/* 3. Section: Hecho para cómo trabaja tu negocio (GSAP + ScrollTrigger) */}
        <RubrosSectionGSAP
          tickets={TICKETS}
          lenisRef={lenisRef}
          prefersReducedMotion={prefersReducedMotion}
          pinned={pinned}
        />


        {/* 4. Section: Precio ($45 gigante de fondo + contador) */}
        <section className="relative overflow-hidden py-20 sm:py-32 bg-[#FAFAF8]">
          <div
            ref={priceBgRef}
            aria-hidden="true"
            className="pointer-events-none absolute right-[2vw] bottom-[-5vw] will-change-transform"
          >
            <span
              ref={priceNumberRef}
              className="block origin-right font-serif text-[28vw] leading-[0.8] tracking-[-0.04em] text-[#ECEDE5] select-none"
            >
              {prefersReducedMotion ? '$45' : '$0'}
            </span>
          </div>

          <div ref={priceRef} className="relative z-10 w-full px-4 sm:px-6 lg:px-[4vw] text-left">
            <div className="overflow-hidden pb-2">
              <h2 className="zara-reveal-h2 font-serif text-[clamp(40px,7vw,112px)] leading-[1] tracking-[-0.02em] text-[#141414]">
                Precio claro y sin sorpresas
              </h2>
            </div>
            <p className="sr-only">$45 al mes por negocio</p>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
              <div className="lg:col-span-5 space-y-2">
                <div className="font-serif text-[clamp(28px,3vw,44px)] leading-tight text-[#141414]">al mes</div>
                <div className="text-sm font-medium text-[#4A4A4A] max-w-[34ch]">
                  por negocio · facturación mensual en córdobas o dólares
                </div>
              </div>

              <div className="lg:col-span-6 lg:col-start-7 space-y-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-[#4A4A4A]">
                  Tu suscripción incluye
                </div>
                <ul className="space-y-2.5 text-[15px] sm:text-base text-[#141414]">
                  {[
                    'POS en Windows para tu punto de venta',
                    'Backoffice web de consulta y configuración',
                    'Soporte directo por WhatsApp en Nicaragua',
                    'Actualizaciones continuas automáticas'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <CheckCircle size={18} weight="fill" className="text-[#5FA22B] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-[#141414]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-[#4A4A4A] text-left">
                Cartera de cobro, citas y equipo se cotizan aparte.
              </p>

              <motion.a
                href={WHATSAPP_QUOTE_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-[#141414] text-[#FAFAF8] font-medium text-sm hover:bg-black transition-colors self-start sm:self-auto cursor-pointer"
              >
                <WhatsappLogo size={17} weight="fill" />
                <span>Pedir cotización</span>
              </motion.a>
            </div>
          </div>
        </section>

        {/* 5. Section: Descarga */}
        <section id="descargar" className="relative py-20 sm:py-32 bg-[#141414] text-[#FAFAF8] scroll-mt-10">
          <div className="w-full px-4 sm:px-6 lg:px-[4vw] text-left">
            <div className="overflow-hidden pb-2">
              <h2 className="zara-reveal-h2 font-serif text-[clamp(40px,8vw,128px)] leading-[1] tracking-[-0.02em] text-[#FAFAF8]">
                Descargá TrackDeli POS para Windows
              </h2>
            </div>
            <p className="mt-4 text-[18px] text-[#A3A3A3] max-w-[50ch] font-sans">
              Instalá la aplicación en la computadora de tu negocio y comenzá a facturar.
            </p>

            {/* Mobile / Non-Windows Warning */}
            {!isWindows && (
              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 max-w-xl">
                <Info size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-950">
                    Esta descarga es para computadoras con Windows
                  </p>
                  <p className="mt-0.5 text-amber-800">
                    Estás navegando desde un dispositivo no compatible. Abrí esta página desde la computadora de tu negocio para instalar la aplicación.
                  </p>
                </div>
              </div>
            )}

            {/* Big download button with no-layout-shift confirmation */}
            <div className="mt-10 w-full text-left space-y-4">
              <motion.a
                href={isWindows ? release.downloadUrl : undefined}
                download={isWindows ? true : undefined}
                onClick={handleDownloadClick}
                whileTap={isWindows ? { scale: 0.99 } : undefined}
                className={`inline-flex w-full sm:w-auto items-center justify-center sm:justify-start gap-5 px-8 sm:px-14 py-6 sm:py-8 rounded-none font-medium transition-all ${
                  isWindows
                    ? 'bg-[#8FD14F] hover:brightness-95 text-[#141414] cursor-pointer'
                    : 'bg-[#2A2A2A] text-[#A3A3A3] cursor-not-allowed'
                }`}
                aria-disabled={!isWindows}
              >
                <WindowsLogo size={40} weight="fill" className="shrink-0" />
                <div className="text-left">
                  <div className="text-xl sm:text-3xl font-semibold leading-tight">
                    {downloadState === 'downloading'
                      ? 'Iniciando descarga…'
                      : isWindows
                      ? 'Descargar para Windows'
                      : 'Disponible solo para Windows'}
                  </div>
                  <div className="text-sm font-normal mt-1 opacity-80">
                    {loadingRelease ? (
                      'Consultando versión…'
                    ) : (
                      <>
                        Versión {release.version} · {release.sizeMB} MB
                        {release.publishedDate ? ` · ${release.publishedDate}` : ''}
                      </>
                    )}
                  </div>
                </div>
              </motion.a>

              {/* Inline Download Confirmation (No Layout Shift) */}
              <div className="min-h-[44px] flex items-center max-w-2xl">
                {downloadState === 'started' ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-start gap-2 w-full"
                  >
                    <CheckCircle size={16} weight="fill" className="text-[#5FA22B] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">¡Descarga iniciada!</span> Recordá: si Windows muestra "Windows protegió su PC", tocá <strong>Más información</strong> y luego <strong>Ejecutar de todos modos</strong>.
                    </div>
                  </motion.div>
                ) : (
                  apiError && (
                    <div className="text-xs text-[#A3A3A3] w-full">
                      Si la descarga no inicia,{' '}
                      <a
                        href={WHATSAPP_SUPPORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8FD14F] font-semibold underline underline-offset-2"
                      >
                        escribinos por WhatsApp
                      </a>{' '}
                      y te enviamos el instalador.
                    </div>
                  )
                )}
              </div>

              <div className="pt-3 border-t border-white/15 flex items-center gap-2 text-xs text-[#A3A3A3] max-w-2xl">
                <CheckCircle size={15} weight="fill" className="text-[#8FD14F]" />
                <span>Requisitos: Windows 10 u 11 de 64 bits · internet para iniciar sesión</span>
              </div>
            </div>

            {/* 3 Numbered Steps */}
            <div className="mt-16 space-y-6 max-w-3xl text-left">
              <h3 className="font-serif text-3xl text-[#FAFAF8]">Pasos para instalar</h3>

              <div className="space-y-0">
                <div className="flex items-start gap-4 py-4 border-t border-white/15">
                  <div className="w-7 h-7 rounded-full bg-[#8FD14F] text-[#141414] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-sm leading-[1.6] text-[#FAFAF8]">
                    <strong>Descargá y abrí el instalador</strong> en tu computadora. La instalación se realiza en segundos.
                  </div>
                </div>

                <div className="flex items-start gap-4 py-4 border-t border-white/15">
                  <div className="w-7 h-7 rounded-full bg-[#8FD14F] text-[#141414] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-sm leading-[1.6] text-[#FAFAF8]">
                    Si Windows muestra la pantalla "Windows protegió su PC", tocá <strong>Más información</strong> y luego <strong>Ejecutar de todos modos</strong>. Es una verificación normal de Windows en versiones nuevas de software.
                  </div>
                </div>

                <div className="flex items-start gap-4 py-4 border-t border-white/15">
                  <div className="w-7 h-7 rounded-full bg-[#8FD14F] text-[#141414] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-sm leading-[1.6] text-[#FAFAF8]">
                    <strong>Iniciá sesión</strong> con el usuario y la clave que te dio NEXOL para comenzar a registrar tus ventas e inventario.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Tactile Sawtooth Transition Divider above Footer */}
      <SawtoothDivider />

      {/* Footer */}
      <footer className="py-12 bg-[#FAFAF8] text-left relative z-10">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-[#E8E8E4]">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#141414] text-[#FAFAF8] flex items-center justify-center font-bold text-xs">
                  TD
                </div>
                <span className="font-semibold text-base tracking-tight text-[#141414]">
                  TrackDeli POS
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B]">NEXOL · Managua, Nicaragua</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 text-xs text-[#6B6B6B]">
              <a
                href={WHATSAPP_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-[#141414] transition-colors"
              >
                <WhatsappLogo size={16} weight="fill" className="text-[#141414]" />
                <span>WhatsApp: +505 8714 0989</span>
              </a>

              <a href="mailto:soporte@nexol.com.ni" className="hover:text-[#141414] transition-colors">
                soporte@nexol.com.ni
              </a>
            </div>
          </div>

          <div className="pt-6 text-xs text-[#6B6B6B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>© {new Date().getFullYear()} NEXOL. Todos los derechos reservados.</div>
            <div>Punto de venta y facturación para negocios locales.</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
