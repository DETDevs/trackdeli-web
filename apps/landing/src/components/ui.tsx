import React, { useState, useEffect } from 'react';
import { motion, animate } from 'motion/react';
import { InventoryItemData, TicketRubro, RubroKey, fmtStock } from '../data/constants';

export const SawtoothDivider: React.FC<{ flip?: boolean; className?: string }> = ({
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
export const InventoryCountdownRow: React.FC<{
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
export const TicketReceiptBody: React.FC<{
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


export const ScreenPhoto: React.FC<{ file?: string; alt: string; className?: string }> = ({
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






// Línea de texto enmascarada: sube desde una máscara (overflow hidden con aire para descendentes)
export const MaskLine: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className="block overflow-hidden pb-[0.16em] -mb-[0.16em]">
    <span data-in className={`block will-change-transform ${className}`}>
      {children}
    </span>
  </span>
);

// Section 2: "Una venta" as full-screen scenes (pinned on desktop, stacked blocks elsewhere)

export const RubroTicket: React.FC<{ ticket: TicketRubro; edgeColor: string }> = ({ ticket, edgeColor }) => (
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
