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

// Section 3: Rubros Showcase with GSAP + ScrollTrigger (Zara / Lenis style)
const RubrosSectionGSAP: React.FC<{
  tickets: Record<RubroKey, TicketRubro>;
  lenisRef: React.MutableRefObject<Lenis | null>;
  prefersReducedMotion: boolean;
}> = ({ tickets, lenisRef, prefersReducedMotion }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const textColRef = useRef<HTMLDivElement>(null);
  const ticketColRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const masterTlRef = useRef<gsap.core.Timeline | null>(null);

  const [activeRubroIdx, setActiveRubroIdx] = useState<number>(0);

  // Jump to specific rubro using lenis
  const scrollToRubro = (index: number) => {
    const st = masterTlRef.current?.scrollTrigger;
    if (!st) return;
    const progressTargets = [0.08, 0.375, 0.625, 0.875];
    const targetY = st.start + progressTargets[index] * (st.end - st.start);
    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetY, { duration: 1.1 });
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // 1. DESKTOP (>= 1024px with fine pointer) & NOT reduced motion
      mm.add(
        '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
        () => {
          if (!sectionRef.current) return;

          const masterTl = gsap.timeline({
            scrollTrigger: {
              trigger: sectionRef.current,
              pin: true,
              start: 'top top',
              end: '+=400%',
              scrub: 1,
              anticipatePin: 1,
              onUpdate: (self) => {
                const p = self.progress;
                const idx = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3;
                setActiveRubroIdx(idx);
              }
            }
          });
          masterTlRef.current = masterTl;

          // Background color interpolation: #FAFAF8 -> #141414 -> #FAFAF8
          masterTl.to(
            sectionRef.current,
            {
              backgroundColor: '#141414',
              color: '#FAFAF8',
              duration: 0.35,
              ease: 'power1.inOut'
            },
            0
          );
          masterTl.to(
            '.gsap-section-sub',
            {
              color: '#A3A3A3',
              duration: 0.35,
              ease: 'power1.inOut'
            },
            0
          );
          masterTl.to(
            sectionRef.current,
            {
              backgroundColor: '#FAFAF8',
              color: '#141414',
              duration: 0.35,
              ease: 'power1.inOut'
            },
            3.65
          );
          masterTl.to(
            '.gsap-section-sub',
            {
              color: '#6B6B6B',
              duration: 0.35,
              ease: 'power1.inOut'
            },
            3.65
          );

          // Parallax depth: text column moves slightly faster (28 -> -28), ticket column moves slightly slower (-28 -> 28)
          if (textColRef.current && ticketColRef.current) {
            masterTl.fromTo(textColRef.current, { y: 28 }, { y: -28, ease: 'none', duration: 4 }, 0);
            masterTl.fromTo(ticketColRef.current, { y: -28 }, { y: 28, ease: 'none', duration: 4 }, 0);
          }

          // Progress bar line: scaleY 0 -> 1 over 0 -> 4
          if (progressBarRef.current) {
            masterTl.fromTo(progressBarRef.current, { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: 4 }, 0);
          }

          // Inventory countdown helper for the timeline
          const setupInventoryCountdown = (rubroIdx: number, ticketKey: RubroKey, timeAt: number) => {
            const ticket = tickets[ticketKey];
            ticket.inventory.forEach((inv, invIdx) => {
              const el = containerRef.current?.querySelector(`.gsap-stock-${rubroIdx}-${invIdx}`);
              if (!el) return;
              const stockObj = { val: inv.fromStock };
              masterTl.to(
                stockObj,
                {
                  val: inv.toStock,
                  duration: 0.35,
                  ease: 'power1.out',
                  snap: inv.decimals ? { val: 0.01 } : { val: 1 },
                  onUpdate: () => {
                    el.textContent = inv.decimals
                      ? stockObj.val.toFixed(inv.decimals)
                      : Math.round(stockObj.val).toString();
                  }
                },
                timeAt
              );
            });
          };

          // Initial stock setup & stamp for Rubro 0
          setupInventoryCountdown(0, 'ferreteria', 0.2);
          masterTl.fromTo(
            '.gsap-stamp-0',
            { scale: 0, rotation: -12, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
            0.25
          );

          // Transition 0 -> 1 (t = 1.0)
          masterTl.to('.gsap-title-line-0', { yPercent: -110, duration: 0.3, ease: 'power2.in' }, 0.85);
          masterTl.to('.gsap-desc-line-0', { yPercent: -110, duration: 0.25, ease: 'power2.in' }, 0.85);
          masterTl.to('.gsap-rubro-btn-0', { opacity: 0.25, duration: 0.25 }, 0.85);
          masterTl.set('.gsap-desc-wrap-0', { display: 'none' }, 1.1);
          masterTl.to('.gsap-ticket-0', { y: -160, rotation: -2.5, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.85);

          masterTl.to('.gsap-rubro-btn-1', { opacity: 1, duration: 0.25 }, 1.0);
          masterTl.set('.gsap-desc-wrap-1', { display: 'block', opacity: 1 }, 1.0);
          masterTl.fromTo(
            '.gsap-title-line-1',
            { yPercent: 110 },
            { yPercent: 0, duration: 0.45, ease: 'power2.out', stagger: 0.04 },
            1.0
          );
          masterTl.fromTo(
            '.gsap-desc-line-1',
            { yPercent: 110 },
            { yPercent: 0, duration: 0.4, ease: 'power2.out', stagger: 0.04 },
            1.08
          );
          masterTl.fromTo(
            '.gsap-ticket-1',
            { y: 160, clipPath: 'inset(100% 0 0 0)', opacity: 0 },
            { y: 0, clipPath: 'inset(0% 0 0 0)', opacity: 1, duration: 0.55, ease: 'power2.out' },
            1.0
          );
          setupInventoryCountdown(1, 'restaurante', 1.15);
          masterTl.fromTo(
            '.gsap-stamp-1',
            { scale: 0, rotation: -12, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
            1.2
          );

          // Transition 1 -> 2 (t = 2.0)
          masterTl.to('.gsap-title-line-1', { yPercent: -110, duration: 0.3, ease: 'power2.in' }, 1.85);
          masterTl.to('.gsap-desc-line-1', { yPercent: -110, duration: 0.25, ease: 'power2.in' }, 1.85);
          masterTl.to('.gsap-rubro-btn-1', { opacity: 0.25, duration: 0.25 }, 1.85);
          masterTl.set('.gsap-desc-wrap-1', { display: 'none' }, 2.1);
          masterTl.to('.gsap-ticket-1', { y: -160, rotation: -2.5, opacity: 0, duration: 0.4, ease: 'power2.in' }, 1.85);

          masterTl.to('.gsap-rubro-btn-2', { opacity: 1, duration: 0.25 }, 2.0);
          masterTl.set('.gsap-desc-wrap-2', { display: 'block', opacity: 1 }, 2.0);
          masterTl.fromTo(
            '.gsap-title-line-2',
            { yPercent: 110 },
            { yPercent: 0, duration: 0.45, ease: 'power2.out', stagger: 0.04 },
            2.0
          );
          masterTl.fromTo(
            '.gsap-desc-line-2',
            { yPercent: 110 },
            { yPercent: 0, duration: 0.4, ease: 'power2.out', stagger: 0.04 },
            2.08
          );
          masterTl.fromTo(
            '.gsap-ticket-2',
            { y: 160, clipPath: 'inset(100% 0 0 0)', opacity: 0 },
            { y: 0, clipPath: 'inset(0% 0 0 0)', opacity: 1, duration: 0.55, ease: 'power2.out' },
            2.0
          );
          setupInventoryCountdown(2, 'taller', 2.15);
          masterTl.fromTo(
            '.gsap-stamp-2',
            { scale: 0, rotation: -12, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
            2.2
          );

          // Transition 2 -> 3 (t = 3.0)
          masterTl.to('.gsap-title-line-2', { yPercent: -110, duration: 0.3, ease: 'power2.in' }, 2.85);
          masterTl.to('.gsap-desc-line-2', { yPercent: -110, duration: 0.25, ease: 'power2.in' }, 2.85);
          masterTl.to('.gsap-rubro-btn-2', { opacity: 0.25, duration: 0.25 }, 2.85);
          masterTl.set('.gsap-desc-wrap-2', { display: 'none' }, 3.1);
          masterTl.to('.gsap-ticket-2', { y: -160, rotation: -2.5, opacity: 0, duration: 0.4, ease: 'power2.in' }, 2.85);

          masterTl.to('.gsap-rubro-btn-3', { opacity: 1, duration: 0.25 }, 3.0);
          masterTl.set('.gsap-desc-wrap-3', { display: 'block', opacity: 1 }, 3.0);
          masterTl.fromTo(
            '.gsap-title-line-3',
            { yPercent: 110 },
            { yPercent: 0, duration: 0.45, ease: 'power2.out', stagger: 0.04 },
            3.0
          );
          masterTl.fromTo(
            '.gsap-desc-line-3',
            { yPercent: 110 },
            { yPercent: 0, duration: 0.4, ease: 'power2.out', stagger: 0.04 },
            3.08
          );
          masterTl.fromTo(
            '.gsap-ticket-3',
            { y: 160, clipPath: 'inset(100% 0 0 0)', opacity: 0 },
            { y: 0, clipPath: 'inset(0% 0 0 0)', opacity: 1, duration: 0.55, ease: 'power2.out' },
            3.0
          );
          setupInventoryCountdown(3, 'farmacia', 3.15);
          masterTl.fromTo(
            '.gsap-stamp-3',
            { scale: 0, rotation: -12, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
            3.2
          );
        }
      );

      // 2. MOBILE / TABLET (< 1024px) & NOT reduced motion
      mm.add(
        '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
        () => {
          const blocks = gsap.utils.toArray<HTMLElement>('.mobile-rubro-block');
          blocks.forEach((block, bIdx) => {
            const titleLine = block.querySelector('.mobile-title-line');
            const ticket = block.querySelector('.mobile-ticket-wrap');
            const stamp = block.querySelector('.mobile-stamp');

            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: block,
                start: 'top 85%',
                once: true
              }
            });

            if (titleLine) {
              tl.from(titleLine, {
                yPercent: 110,
                duration: 0.65,
                ease: 'power3.out'
              });
            }

            if (ticket) {
              tl.fromTo(
                ticket,
                { y: 80, clipPath: 'inset(100% 0 0 0)', opacity: 0 },
                { y: 0, clipPath: 'inset(0% 0 0 0)', opacity: 1, duration: 0.7, ease: 'power2.out' },
                '-=0.25'
              );
            }

            const rubroData = RUBROS_DATA[bIdx];
            if (rubroData) {
              const ticketData = tickets[rubroData.id];
              ticketData.inventory.forEach((inv, invIdx) => {
                const el = block.querySelector(`.mobile-stock-${bIdx}-${invIdx}`);
                if (!el) return;
                const stockObj = { val: inv.fromStock };
                tl.to(
                  stockObj,
                  {
                    val: inv.toStock,
                    duration: 0.45,
                    ease: 'power1.out',
                    snap: inv.decimals ? { val: 0.01 } : { val: 1 },
                    onUpdate: () => {
                      el.textContent = inv.decimals
                        ? stockObj.val.toFixed(inv.decimals)
                        : Math.round(stockObj.val).toString();
                    }
                  },
                  '-=0.3'
                );
              });
            }

            if (stamp) {
              tl.fromTo(
                stamp,
                { scale: 0, rotation: -12, opacity: 0 },
                { scale: 1, rotation: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' },
                '-=0.2'
              );
            }
          });
        }
      );
    },
    { scope: containerRef, dependencies: [prefersReducedMotion, tickets] }
  );

  return (
    <div ref={containerRef}>
      {/* 1. Desktop pinned section (>= 1024px) */}
      {!prefersReducedMotion && (
        <div className="hidden lg:block">
          <section
            id="rubros-showcase"
            ref={sectionRef}
            className="relative w-full overflow-hidden bg-[#FAFAF8] will-change-transform border-b border-[#E8E8E4]"
          >
            <div className="w-full h-screen flex flex-col justify-between py-8 lg:py-10 px-4 sm:px-6 lg:px-8 max-w-[1120px] mx-auto relative select-none">
              {/* Header */}
              <div className="text-left w-full pt-2">
                <div className="overflow-hidden pb-1">
                  <h2 className="zara-reveal-h2 font-serif text-[32px] lg:text-[40px] leading-[1.1] text-inherit">
                    Hecho para cómo trabaja tu negocio
                  </h2>
                </div>
                <p className="gsap-section-sub mt-2 text-[16px] lg:text-[18px] text-[#A3A3A3] max-w-[70ch] font-sans">
                  Adaptado a la dinámica real de tu mostrador, mesa o taller en Nicaragua.
                </p>
              </div>

              {/* Center 2-column showcase */}
              <div className="w-full flex-1 grid grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
                {/* Left Column: Titles */}
                <div ref={textColRef} className="col-span-7 flex gap-6 lg:gap-8 items-stretch will-change-transform">
                  {/* Vertical lime line */}
                  <div className="w-[3px] bg-white/10 rounded-full relative overflow-hidden shrink-0 self-stretch my-2">
                    <div
                      ref={progressBarRef}
                      className="w-full bg-[#8FD14F] rounded-full origin-top"
                      style={{ height: '100%', transform: 'scaleY(0)', transformOrigin: 'top' }}
                    />
                  </div>

                  {/* Rubro buttons column */}
                  <div className="flex flex-col justify-center space-y-3 lg:space-y-5 flex-1">
                    {RUBROS_DATA.map((rubro, idx) => {
                      const isActive = activeRubroIdx === idx;
                      return (
                        <div key={rubro.id} className="relative text-left">
                          <button
                            type="button"
                            onClick={() => scrollToRubro(idx)}
                            aria-current={isActive ? 'true' : 'false'}
                            className={`gsap-rubro-btn-${idx} group text-left transition-opacity duration-300 focus-visible:ring-2 focus-visible:ring-[#8FD14F] focus-visible:outline-none rounded-lg p-1 block w-full cursor-pointer ${
                              idx === 0 ? 'opacity-100' : 'opacity-25 hover:opacity-50'
                            }`}
                          >
                            <h3
                              style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}
                              className="font-serif leading-[1.06] tracking-tight text-[#FAFAF8]"
                            >
                              {rubro.titleLines.map((line, lIdx) => (
                                <span key={lIdx} className="block overflow-hidden pb-0.5">
                                  <span
                                    className={`gsap-title-line-${idx} block will-change-transform`}
                                    style={{
                                      transform: idx === 0 ? 'translateY(0%)' : 'translateY(110%)'
                                    }}
                                  >
                                    {line}
                                  </span>
                                </span>
                              ))}
                            </h3>
                            <span className="sr-only">: {rubro.fullDesc}</span>
                          </button>

                          {/* Description lines in overflow-hidden masks */}
                          <div
                            className={`gsap-desc-wrap-${idx} overflow-hidden font-sans text-left mt-1 mb-2`}
                            style={{
                              display: idx === 0 ? 'block' : 'none',
                              opacity: idx === 0 ? 1 : 0
                            }}
                          >
                            {rubro.descLines.map((line, dIdx) => (
                              <div key={dIdx} className="overflow-hidden pb-0.5">
                                <span
                                  className={`gsap-desc-line-${idx} block text-[17px] lg:text-[18px] text-[#A3A3A3] leading-[1.45] max-w-[48ch] will-change-transform`}
                                  style={{
                                    transform: idx === 0 ? 'translateY(0%)' : 'translateY(110%)'
                                  }}
                                >
                                  {line}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Ticket */}
                <div ref={ticketColRef} className="col-span-5 flex justify-end will-change-transform">
                  <div className="w-full max-w-[340px] relative">
                    {/* Printer Slot */}
                    <div className="w-full h-3.5 bg-[#262626] rounded-t-md border-t border-x border-[#3a3a3a] flex items-center justify-center px-6 relative z-20 shadow-inner">
                      <div className="w-full h-[2px] bg-[#141414]" />
                    </div>

                    {/* Ticket Viewport */}
                    <div className="relative overflow-hidden z-10 pt-0.5" style={{ height: '440px' }}>
                      {RUBROS_DATA.map((rubro, idx) => {
                        const ticket = tickets[rubro.id];
                        return (
                          <div
                            key={rubro.id}
                            className={`gsap-ticket-${idx} absolute inset-x-0 top-0 will-change-transform`}
                            style={{
                              zIndex: 10 + idx,
                              clipPath: idx === 0 ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)',
                              opacity: idx === 0 ? 1 : 0,
                              transform: idx === 0 ? 'none' : 'translateY(160px)'
                            }}
                          >
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
                                {ticket.metadata.map((meta, mIdx) => (
                                  <div key={mIdx} className="flex justify-between">
                                    <span className="text-[#6B6B6B]">{meta.label}</span>
                                    <span className="font-semibold text-[#141414]">{meta.value}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Items */}
                              <div className="space-y-1.5 py-1 text-[11px]">
                                {ticket.lines.map((line, lIdx) => (
                                  <div key={lIdx} className="flex justify-between items-start">
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

                              {/* Inventory block */}
                              <div className="mt-4 pt-3 border-t border-dashed border-[#141414]/30 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-[#141414] uppercase tracking-wide">
                                    Inventario
                                  </span>
                                  <span
                                    className={`gsap-stamp-${idx} inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8FD14F] text-[#141414] uppercase tracking-wider origin-center`}
                                    style={{
                                      transform: 'scale(0)',
                                      opacity: 0
                                    }}
                                  >
                                    descontado
                                  </span>
                                </div>

                                <div className="space-y-1 text-[11px]">
                                  {ticket.inventory.map((inv, invIdx) => (
                                    <div key={invIdx} className="flex justify-between items-baseline text-[#141414]">
                                      <span className="truncate pr-2">{inv.name}</span>
                                      <span className="font-bold shrink-0 font-mono tracking-tight text-[11px]">
                                        <span className="text-[#6B6B6B] font-normal mr-1">
                                          {inv.decimals ? inv.fromStock.toFixed(inv.decimals) : inv.fromStock} →
                                        </span>
                                        <span className="text-[#141414]">
                                          <span className={`gsap-stock-${idx}-${invIdx}`}>
                                            {inv.decimals ? inv.fromStock.toFixed(inv.decimals) : inv.fromStock}
                                          </span>{' '}
                                          {inv.unit}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="text-center pt-2 text-[10px] text-[#6B6B6B]">
                                Gracias por su preferencia
                              </div>
                            </div>
                            {/* Jagged / Sawtooth torn paper bottom */}
                            <div className="w-full h-3 bg-[#FFFFFF] border-x border-[#E8E8E4] relative overflow-hidden">
                              <svg
                                className="w-full h-full text-[#141414] fill-current"
                                viewBox="0 0 340 12"
                                preserveAspectRatio="none"
                              >
                                <path d="M0,12 L10,0 L20,12 L30,0 L40,12 L50,0 L60,12 L70,0 L80,12 L90,0 L100,12 L110,0 L120,12 L130,0 L140,12 L150,0 L160,12 L170,0 L180,12 L190,0 L200,12 L210,0 L220,12 L230,0 L240,12 L250,0 L260,12 L270,0 L280,12 L290,0 L300,12 L310,0 L320,12 L330,0 L340,12 L340,12 L0,12 Z" />
                              </svg>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom clickable dots */}
              <div className="flex items-center gap-2.5 pb-2">
                <span className="text-xs text-[#A3A3A3] font-medium mr-2">Rubros:</span>
                {RUBROS_DATA.map((rubro, idx) => (
                  <button
                    key={rubro.id}
                    type="button"
                    onClick={() => scrollToRubro(idx)}
                    aria-label={`Ir a ${rubro.name}`}
                    className={`h-2.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#8FD14F] focus-visible:outline-none cursor-pointer ${
                      activeRubroIdx === idx ? 'w-8 bg-[#8FD14F]' : 'w-2.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 2. Mobile & Tablet view (< 1024px) */}
      {!prefersReducedMotion && (
        <div className="block lg:hidden">
          <section className="py-16 sm:py-24 border-b border-[#E8E8E4]">
            <div className="max-w-[1120px] mx-auto px-4 sm:px-6 text-left">
              <div className="overflow-hidden pb-1">
                <h2 className="zara-reveal-h2 font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414]">
                  Hecho para cómo trabaja tu negocio
                </h2>
              </div>
              <p className="mt-3 text-[17px] sm:text-[18px] text-[#6B6B6B] max-w-[70ch] font-sans">
                Adaptado a la dinámica real de tu mostrador, mesa o taller en Nicaragua.
              </p>

              <div className="mt-12 space-y-16">
                {RUBROS_DATA.map((rubro, bIdx) => {
                  const ticket = tickets[rubro.id];
                  return (
                    <div
                      key={rubro.id}
                      className="mobile-rubro-block grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-left"
                    >
                      <div className="md:col-span-6 space-y-3">
                        <div className="overflow-hidden pb-1">
                          <h3 className="mobile-title-line font-serif text-[28px] sm:text-[34px] leading-tight text-[#141414] will-change-transform">
                            {rubro.name}
                          </h3>
                        </div>
                        <p className="text-[16px] sm:text-[17px] leading-[1.6] text-[#6B6B6B]">
                          {rubro.fullDesc}
                        </p>
                      </div>

                      <div className="md:col-span-6 flex justify-start md:justify-end">
                        <div className="mobile-ticket-wrap w-full max-w-[320px] will-change-transform">
                          {/* Slot */}
                          <div className="w-full h-3 bg-[#141414] rounded-t-md flex items-center justify-center px-4 relative z-20">
                            <div className="w-full h-[1.5px] bg-[#292929]" />
                          </div>

                          <div className="overflow-hidden relative z-10 pt-0.5">
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
                                {ticket.metadata.map((meta, mIdx) => (
                                  <div key={mIdx} className="flex justify-between">
                                    <span className="text-[#6B6B6B]">{meta.label}</span>
                                    <span className="font-semibold text-[#141414]">{meta.value}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Items */}
                              <div className="space-y-1.5 py-1 text-[11px]">
                                {ticket.lines.map((line, lIdx) => (
                                  <div key={lIdx} className="flex justify-between items-start">
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

                              {/* Inventory block */}
                              <div className="mt-4 pt-3 border-t border-dashed border-[#141414]/30 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-[#141414] uppercase tracking-wide">
                                    Inventario
                                  </span>
                                  <span className="mobile-stamp inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8FD14F] text-[#141414] uppercase tracking-wider origin-center">
                                    descontado
                                  </span>
                                </div>

                                <div className="space-y-1 text-[11px]">
                                  {ticket.inventory.map((inv, invIdx) => (
                                    <div key={invIdx} className="flex justify-between items-baseline text-[#141414]">
                                      <span className="truncate pr-2">{inv.name}</span>
                                      <span className="font-bold shrink-0 font-mono tracking-tight text-[11px]">
                                        <span className="text-[#6B6B6B] font-normal mr-1">
                                          {inv.decimals ? inv.fromStock.toFixed(inv.decimals) : inv.fromStock} →
                                        </span>
                                        <span className="text-[#141414]">
                                          <span className={`mobile-stock-${bIdx}-${invIdx}`}>
                                            {inv.decimals ? inv.fromStock.toFixed(inv.decimals) : inv.fromStock}
                                          </span>{' '}
                                          {inv.unit}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="text-center pt-2 text-[10px] text-[#6B6B6B]">
                                Gracias por su preferencia
                              </div>
                            </div>
                          </div>
                          {/* Jagged / Sawtooth torn paper bottom */}
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 3. Prefers Reduced Motion view */}
      {prefersReducedMotion && (
        <section className="py-16 sm:py-24 border-b border-[#E8E8E4]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <h2 className="font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414]">
              Hecho para cómo trabaja tu negocio
            </h2>
            <p className="mt-3 text-[18px] text-[#6B6B6B] max-w-[70ch] font-sans">
              Adaptado a la dinámica real de tu mostrador, mesa o taller en Nicaragua.
            </p>

            <div className="mt-12 space-y-16">
              {RUBROS_DATA.map((rubro) => {
                const ticket = tickets[rubro.id];
                return (
                  <div
                    key={rubro.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-left"
                  >
                    <div className="md:col-span-6 space-y-3">
                      <h3 className="font-serif text-[28px] sm:text-[34px] leading-tight text-[#141414]">
                        {rubro.name}
                      </h3>
                      <p className="text-[16px] sm:text-[17px] leading-[1.6] text-[#6B6B6B]">
                        {rubro.fullDesc}
                      </p>
                    </div>

                    <div className="md:col-span-6 flex justify-start md:justify-end">
                      <div className="w-full max-w-[320px]">
                        <div className="w-full h-3 bg-[#141414] rounded-t-md flex items-center justify-center px-4 relative z-20">
                          <div className="w-full h-[1.5px] bg-[#292929]" />
                        </div>

                        <div className="overflow-hidden relative z-10 pt-0.5">
                          <TicketReceiptBody
                            ticket={ticket}
                            rubroKey={rubro.id}
                            reducedMotion={true}
                            activeAnimation={false}
                          />
                        </div>
                        <SawtoothDivider flip className="text-[#FFFFFF] relative z-20 -mt-0.5 drop-shadow-xs" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
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

  // Section 2 scroll animation tracking
  const updateSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: section2Scroll } = useScroll({
    target: updateSectionRef,
    offset: ['start 85%', 'end 30%']
  });

  // Section 4 Price element refs for GSAP
  const priceRef = useRef<HTMLDivElement>(null);
  const priceNumberRef = useRef<HTMLSpanElement>(null);

  // Texture Parallax
  const { scrollY } = useScroll();
  const dotParallax = useTransform(scrollY, [0, 3000], [0, 24]);

  // Animated values for Section 2 (Una venta, tres cosas que se actualizan)
  const cajaTotal = useTransform(section2Scroll, [0.15, 0.75], [8450, 9770]);
  const inventarioStock = useTransform(section2Scroll, [0.15, 0.75], [24, 19]);
  const barProgress1 = useTransform(section2Scroll, [0.15, 0.35], [10, 40]);
  const barProgress2 = useTransform(section2Scroll, [0.25, 0.5], [15, 65]);
  const barProgress3 = useTransform(section2Scroll, [0.35, 0.65], [20, 95]);
  const barProgress4 = useTransform(section2Scroll, [0.45, 0.75], [15, 55]);
  const barProgress5 = useTransform(section2Scroll, [0.55, 0.85], [20, 75]);

  // Reactive state for transformed scroll numbers
  const [currentCaja, setCurrentCaja] = useState<number>(8450);
  const [currentStock, setCurrentStock] = useState<number>(24);
  const [barH, setBarH] = useState<number[]>([40, 65, 95, 55, 75]);

  useEffect(() => {
    const unsub1 = cajaTotal.on('change', (v) => setCurrentCaja(Math.round(v)));
    const unsub2 = inventarioStock.on('change', (v) => setCurrentStock(Math.round(v)));
    const unsubB1 = barProgress1.on('change', (v) => setBarH((prev) => [v, prev[1], prev[2], prev[3], prev[4]]));
    const unsubB2 = barProgress2.on('change', (v) => setBarH((prev) => [prev[0], v, prev[2], prev[3], prev[4]]));
    const unsubB3 = barProgress3.on('change', (v) => setBarH((prev) => [prev[0], prev[1], v, prev[3], prev[4]]));
    const unsubB4 = barProgress4.on('change', (v) => setBarH((prev) => [prev[0], prev[1], prev[2], v, prev[4]]));
    const unsubB5 = barProgress5.on('change', (v) => setBarH((prev) => [prev[0], prev[1], prev[2], prev[3], v]));

    return () => {
      unsub1();
      unsub2();
      unsubB1();
      unsubB2();
      unsubB3();
      unsubB4();
      unsubB5();
    };
  }, [cajaTotal, inventarioStock, barProgress1, barProgress2, barProgress3, barProgress4, barProgress5]);

  // Detect motion preferences & pointer type
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);
      const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
      setIsFinePointer(pointerQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      motionQuery.addEventListener('change', handleMotionChange);
      return () => motionQuery.removeEventListener('change', handleMotionChange);
    }
  }, []);

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

      {/* Header */}
      <header className="border-b border-[#E8E8E4] bg-[#FAFAF8]/95 backdrop-blur-xs sticky top-0 z-40">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group text-[#141414]">
            <div className="w-8 h-8 rounded-lg bg-[#141414] text-[#FAFAF8] flex items-center justify-center font-bold text-xs tracking-tight">
              TD
            </div>
            <span className="font-semibold text-base tracking-tight text-[#141414]">
              TrackDeli POS
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

      <main className="relative z-10">
        {/* 1. Hero Section */}
        <section className="pt-12 sm:pt-16 pb-16 sm:pb-24 border-b border-[#E8E8E4]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
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

        {/* 2. Section: Una venta, tres cosas que se actualizan (Scroll-Linked) */}
        <section
          ref={updateSectionRef}
          className="py-16 sm:py-24 border-b border-[#E8E8E4] relative overflow-hidden"
        >
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <div className="overflow-hidden pb-1">
              <h2 className="zara-reveal-h2 font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414] text-left">
                Una venta, tres cosas que se actualizan
              </h2>
            </div>
            <p className="mt-3 text-[18px] text-[#6B6B6B] max-w-[70ch] text-left font-sans">
              El sistema vincula cada cobro con tus existencias y los números del día en una sola acción.
            </p>

            {/* Connecting Ticket Sale Strip & Animated Path */}
            <div className="mt-8 flex flex-col items-center">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#FFFFFF] border border-[#E8E8E4] shadow-2xs text-xs font-mono text-[#141414]"
              >
                <span className="w-2 h-2 rounded-full bg-[#5FA22B] animate-pulse" />
                <span className="font-semibold">Cobro registrado:</span>
                <span className="text-[#6B6B6B]">Ticket #00428</span>
                <span className="font-bold text-[#141414]">+C$ 1,320.00</span>
              </motion.div>

              {/* Connecting animated dashed SVG line */}
              <div className="w-full h-8 relative flex justify-center overflow-hidden">
                <svg className="w-full h-full text-[#141414]" viewBox="0 0 400 32" fill="none">
                  <motion.path
                    d="M200,0 L200,16 M200,16 L65,32 M200,16 L200,32 M200,16 L335,32"
                    stroke="#141414"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.35 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                </svg>
              </div>
            </div>

            {/* Asymmetric blocks on #F2F2EF surface */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Block 1: Caja (5 cols) */}
              <div className="lg:col-span-5 bg-[#F2F2EF] border border-[#E8E8E4] rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-left relative overflow-hidden">
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#141414]">Caja</h3>
                  <p className="text-[15px] sm:text-base leading-[1.6] text-[#6B6B6B]">
                    Cobro ágil en córdobas o dólares con cálculo de vuelto al instante. Aceptá efectivo, transferencias y tarjetas. Al terminar el turno, realizá el arqueo con cierre ciego para evitar descuadres.
                  </p>
                </div>

                {/* Animated Cash Counter */}
                <div className="mt-6 pt-4 border-t border-[#E8E8E4] space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B6B6B] block">
                    Total del día en caja
                  </span>
                  <div className="font-serif text-3xl sm:text-4xl text-[#141414] tracking-tight">
                    C$ {prefersReducedMotion ? '9,770' : currentCaja.toLocaleString('en-US')}.00
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#141414]">
                    <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                    <span>Córdobas y dólares simultáneos</span>
                  </div>
                </div>
              </div>

              {/* Block 2: Inventario (4 cols) */}
              <div className="lg:col-span-4 bg-[#F2F2EF] border border-[#E8E8E4] rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-left relative overflow-hidden">
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#141414]">Inventario</h3>
                  <p className="text-[15px] sm:text-base leading-[1.6] text-[#6B6B6B]">
                    Manejo exacto de decimales para libras, litros y metros. Configurá servicios y platos con receta que descuentan repuestos o ingredientes al vender. Alertas antes de quedarte sin stock.
                  </p>
                </div>

                {/* Animated Stock Depletion Bar with Amber Alert */}
                <div className="mt-6 pt-4 border-t border-[#E8E8E4] space-y-2">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-medium text-[#141414]">Aceite 15W40</span>
                    <span className="font-mono font-bold text-[#141414]">
                      {prefersReducedMotion ? '19' : currentStock} LT / 30 LT
                    </span>
                  </div>

                  {/* Stock Bar */}
                  <div className="w-full h-2.5 bg-[#E8E8E4] rounded-full overflow-hidden relative">
                    <motion.div
                      className={`h-full rounded-full transition-colors duration-300 ${
                        (prefersReducedMotion ? 19 : currentStock) < 20 ? 'bg-amber-500' : 'bg-[#141414]'
                      }`}
                      style={{
                        width: `${((prefersReducedMotion ? 19 : currentStock) / 30) * 100}%`
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    {(prefersReducedMotion ? 19 : currentStock) < 20 ? (
                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                        <span>⚠️ Bajo mínimo (umbral: 20 LT)</span>
                      </span>
                    ) : (
                      <span className="text-[#6B6B6B]">Mínimo sugerido: 20 LT</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-[#141414] pt-1">
                    <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                    <span>Recetas con descuento de insumos</span>
                  </div>
                </div>
              </div>

              {/* Block 3: Reportes (3 cols) */}
              <div className="lg:col-span-3 bg-[#F2F2EF] border border-[#E8E8E4] rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-left relative overflow-hidden">
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#141414]">Reportes</h3>
                  <p className="text-[15px] sm:text-base leading-[1.6] text-[#6B6B6B]">
                    Ventas del día, productos con mayor rotación y totales en vivo. Consultá el estado de tu negocio desde tu celular en modo solo lectura sin interrumpir a los cajeros.
                  </p>
                </div>

                {/* Animated Hourly Sales Bars */}
                <div className="mt-6 pt-4 border-t border-[#E8E8E4] space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B6B6B] block">
                    Ventas por hora
                  </span>

                  {/* 5 Rising Bars */}
                  <div className="h-16 flex items-end justify-between gap-1.5 pt-2">
                    {[
                      { hour: '8a', val: barH[0] },
                      { hour: '10a', val: barH[1] },
                      { hour: '12p', val: barH[2], peak: true },
                      { hour: '2p', val: barH[3] },
                      { hour: '4p', val: barH[4] }
                    ].map((slot, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          className={`w-full rounded-t-sm transition-all duration-200 ${
                            slot.peak ? 'bg-[#5FA22B]' : 'bg-[#141414]/70'
                          }`}
                          style={{
                            height: prefersReducedMotion ? (slot.peak ? '95%' : '55%') : `${slot.val}%`
                          }}
                        />
                        <span className="text-[9px] text-[#6B6B6B] font-mono">{slot.hour}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-[#141414] pt-1">
                    <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                    <span>Consulta remota en celular</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section: Hecho para cómo trabaja tu negocio (GSAP + ScrollTrigger) */}
        <RubrosSectionGSAP
          tickets={TICKETS}
          lenisRef={lenisRef}
          prefersReducedMotion={prefersReducedMotion}
        />


        {/* 4. Section: Precio ($45 Animated Counter + Staggered List) */}
        <section className="py-16 sm:py-24 border-b border-[#E8E8E4]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <div className="overflow-hidden pb-1">
              <h2 className="zara-reveal-h2 font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414] text-left">
                Precio claro y sin sorpresas
              </h2>
            </div>

            <div
              ref={priceRef}
              className="mt-10 bg-[#F2F2EF] border border-[#E8E8E4] rounded-2xl p-8 sm:p-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left: Price in big serif counting 0 -> 45 once */}
                <div className="lg:col-span-5 space-y-2 text-left">
                  <div className="font-serif text-[44px] sm:text-[56px] leading-[1.05] text-[#141414] tracking-tight">
                    <span ref={priceNumberRef} className="inline-block origin-left will-change-transform">
                      {prefersReducedMotion ? '$45' : '$0'}
                    </span>{' '}
                    al mes
                  </div>
                  <div className="text-sm font-medium text-[#6B6B6B]">
                    por negocio · facturación mensual en córdobas o dólares
                  </div>
                </div>

                {/* Right: What is included with short stagger */}
                <div className="lg:col-span-7 space-y-3.5 text-left">
                  <div className="text-xs uppercase tracking-wider font-semibold text-[#6B6B6B]">
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

              {/* Bottom line and button */}
              <div className="mt-8 pt-6 border-t border-[#E8E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs sm:text-sm text-[#6B6B6B] text-left">
                  Cartera de cobro, citas y equipo se cotizan aparte.
                </p>

                <motion.a
                  href={WHATSAPP_QUOTE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#141414] text-[#FAFAF8] font-medium text-sm hover:bg-black transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <WhatsappLogo size={17} weight="fill" />
                  <span>Pedir cotización</span>
                </motion.a>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Section: Descarga */}
        <section id="descargar" className="py-16 sm:py-24 border-b border-[#E8E8E4] scroll-mt-10">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <div className="overflow-hidden pb-1">
              <h2 className="zara-reveal-h2 font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414] text-left">
                Descargá TrackDeli POS para Windows
              </h2>
            </div>
            <p className="mt-3 text-[18px] text-[#6B6B6B] max-w-[70ch] text-left font-sans">
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

            {/* Download Card with No-Layout-Shift Confirmation */}
            <div className="mt-8 p-6 sm:p-8 bg-[#FFFFFF] border border-[#E8E8E4] rounded-2xl max-w-xl text-left space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <motion.a
                  href={isWindows ? release.downloadUrl : undefined}
                  download={isWindows ? true : undefined}
                  onClick={handleDownloadClick}
                  whileTap={isWindows ? { scale: 0.98 } : undefined}
                  className={`inline-flex items-center gap-3.5 px-6 py-4 rounded-xl font-medium transition-all ${
                    isWindows
                      ? 'bg-[#141414] hover:bg-black text-[#FAFAF8] cursor-pointer shadow-sm'
                      : 'bg-[#E8E8E4] text-[#6B6B6B] cursor-not-allowed opacity-75'
                  }`}
                  aria-disabled={!isWindows}
                >
                  <WindowsLogo size={24} weight="fill" className="shrink-0" />
                  <div className="text-left">
                    <div className="text-base font-semibold leading-tight">
                      {downloadState === 'downloading'
                        ? 'Iniciando descarga…'
                        : isWindows
                        ? 'Descargar para Windows'
                        : 'Disponible solo para Windows'}
                    </div>
                    <div className="text-xs text-[#FAFAF8]/80 font-normal mt-1">
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
              </div>

              {/* Inline Download Confirmation (No Layout Shift) */}
              <div className="min-h-[44px] flex items-center">
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
                    <div className="text-xs text-[#6B6B6B] w-full">
                      Si la descarga no inicia,{' '}
                      <a
                        href={WHATSAPP_SUPPORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5FA22B] font-semibold underline underline-offset-2"
                      >
                        escribinos por WhatsApp
                      </a>{' '}
                      y te enviamos el instalador.
                    </div>
                  )
                )}
              </div>

              <div className="pt-3 border-t border-[#E8E8E4] flex items-center gap-2 text-xs text-[#6B6B6B]">
                <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                <span>Requisitos: Windows 10 u 11 de 64 bits · internet para iniciar sesión</span>
              </div>
            </div>

            {/* 3 Numbered Steps */}
            <div className="mt-14 space-y-6 max-w-2xl text-left">
              <h3 className="font-serif text-2xl text-[#141414]">Pasos para instalar</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#F2F2EF] border border-[#E8E8E4]">
                  <div className="w-7 h-7 rounded-full bg-[#141414] text-[#FAFAF8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-sm leading-[1.6] text-[#141414]">
                    <strong>Descargá y abrí el instalador</strong> en tu computadora. La instalación se realiza en segundos.
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#F2F2EF] border border-[#E8E8E4]">
                  <div className="w-7 h-7 rounded-full bg-[#141414] text-[#FAFAF8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-sm leading-[1.6] text-[#141414]">
                    Si Windows muestra la pantalla "Windows protegió su PC", tocá <strong>Más información</strong> y luego <strong>Ejecutar de todos modos</strong>. Es una verificación normal de Windows en versiones nuevas de software.
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#F2F2EF] border border-[#E8E8E4]">
                  <div className="w-7 h-7 rounded-full bg-[#141414] text-[#FAFAF8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-sm leading-[1.6] text-[#141414]">
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
