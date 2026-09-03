import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useToasterStore, resolveValue } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  WarningCircle,
  Warning,
  Info,
  CircleNotch,
} from '@phosphor-icons/react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface DisplayToast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

export const DynamicIslandToaster: React.FC = () => {
  const { toasts } = useToasterStore();
  const [activeToast, setActiveToast] = useState<DisplayToast | null>(null);
  
  // Refs para mantener estado síncrono en callbacks y temporizadores
  const activeToastRef = useRef<DisplayToast | null>(null);
  const queueRef = useRef<DisplayToast[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantener activeToastRef sincronizado
  useEffect(() => {
    activeToastRef.current = activeToast;
  }, [activeToast]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showNext = useCallback(() => {
    clearTimer();
    const nextToast = queueRef.current.shift();
    if (nextToast) {
      setActiveToast(nextToast);
      timerRef.current = setTimeout(() => {
        showNext();
      }, nextToast.duration);
    } else {
      setActiveToast(null);
    }
  }, [clearTimer]);

  const handleDismissActive = useCallback(() => {
    showNext();
  }, [showNext]);

  // Procesar nuevos toasts que ingresan por react-hot-toast
  useEffect(() => {
    if (!toasts || toasts.length === 0) return;

    // Buscar toasts que aún no hayamos procesado
    for (const t of toasts) {
      if (processedIdsRef.current.has(t.id)) continue;
      processedIdsRef.current.add(t.id);

      const rawMsg = resolveValue(t.message, t);
      const message = typeof rawMsg === 'string' ? rawMsg : String(rawMsg || '');

      let type: ToastType = 'info';
      if (t.type === 'success') {
        type = 'success';
      } else if (t.type === 'error') {
        type = 'error';
      } else if (t.type === 'loading') {
        type = 'loading';
      } else if (
        message.toLowerCase().includes('advertencia') ||
        message.toLowerCase().includes('atención') ||
        message.toLowerCase().includes('cuidado')
      ) {
        type = 'warning';
      }

      // Duración: errores tienen 4000ms, éxito/info 3500ms
      const duration = t.duration && t.duration > 0 ? t.duration : type === 'error' ? 4000 : 3500;
      const newToast: DisplayToast = {
        id: t.id,
        type,
        message,
        duration,
      };

      const current = activeToastRef.current;

      if (!current) {
        // Nada en pantalla: mostrar de inmediato
        clearTimer();
        setActiveToast(newToast);
        timerRef.current = setTimeout(() => {
          showNext();
        }, newToast.duration);
      } else if (current.type === 'error') {
        // Caso: El toast actual es un ERROR
        if (newToast.type === 'error') {
          // Otro error: reemplaza inmediatamente y resetea temporizador
          clearTimer();
          setActiveToast(newToast);
          timerRef.current = setTimeout(() => {
            showNext();
          }, newToast.duration);
        } else {
          // Toast de éxito/info: NO reemplaza al error, se encola para mostrarse después
          queueRef.current.push(newToast);
        }
      } else {
        // Caso: El toast actual es éxito, info o loading
        if (newToast.type === 'error') {
          // Un error SIEMPRE interrumpe de inmediato a uno no-crítico
          clearTimer();
          setActiveToast(newToast);
          timerRef.current = setTimeout(() => {
            showNext();
          }, newToast.duration);
        } else {
          // Entre dos toasts no-críticos (ej. 2 éxitos): reemplaza inmediatamente
          clearTimer();
          setActiveToast(newToast);
          timerRef.current = setTimeout(() => {
            showNext();
          }, newToast.duration);
        }
      }
    }
  }, [toasts, clearTimer, showNext]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={17} weight="regular" className="text-[#22C55E] shrink-0" />;
      case 'error':
        return <WarningCircle size={17} weight="regular" className="text-[#EF4444] shrink-0" />;
      case 'warning':
        return <Warning size={17} weight="regular" className="text-[#F59E0B] shrink-0" />;
      case 'loading':
        return <CircleNotch size={17} weight="regular" className="animate-spin text-white/70 shrink-0" />;
      case 'info':
      default:
        // Design system: #6B7280 (gray-500) para info
        return <Info size={17} weight="regular" className="text-[#6B7280] shrink-0" />;
    }
  };

  return (
    <div
      className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center max-w-[92vw]"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {activeToast && (
          <motion.div
            key={activeToast.id}
            initial={{ y: -24, opacity: 0, scale: 0.88 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.88 }}
            transition={{
              type: 'spring',
              damping: 26,
              stiffness: 380,
              mass: 0.6,
            }}
            onClick={handleDismissActive}
            className="pointer-events-auto cursor-pointer flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0F0F0F] text-white border border-white/10 shadow-sm max-w-[90vw] sm:max-w-md select-none transition-colors hover:border-white/20 active:scale-[0.98]"
            title="Tocar para cerrar"
          >
            {renderIcon(activeToast.type)}
            <span className="text-xs sm:text-[13px] font-normal text-white/95 truncate">
              {activeToast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
