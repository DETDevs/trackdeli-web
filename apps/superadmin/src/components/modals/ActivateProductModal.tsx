import React, { useState, useEffect } from 'react';
import {
  Motorcycle,
  Storefront,
  Coins,
  Receipt,
  ForkKnife,
  ShoppingBag,
  Sparkle,
  Wallet,
  CalendarBlank,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  useActivateProduct,
  BusinessProductType,
  PosVertical,
  getProductLabel,
} from '../../hooks/useBusinessProducts';
import { BusinessType } from '../../hooks/useBusinesses';

interface ActivateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  productType: BusinessProductType;
  isCurrentlyActive?: boolean;
  currentDeliveryConfig?: {
    businessType?: BusinessType;
    commissionRate?: number;
    altCommissionRate?: number;
    altCommissionDistanceKm?: number;
    dispatchTimeoutMin?: number;
  };
  currentPosConfig?: {
    posVertical?: PosVertical | null;
    posMonthlyFee?: number | null;
  };
  currentCarteraConfig?: {
    carteraMonthlyFee?: number | null;
  };
  currentCitasConfig?: {
    citasMonthlyFee?: number | null;
  };
}

export const ActivateProductModal: React.FC<ActivateProductModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  productType,
  isCurrentlyActive = false,
  currentDeliveryConfig,
  currentPosConfig,
  currentCarteraConfig,
  currentCitasConfig,
}) => {
  const activateMutation = useActivateProduct();

  const [businessType, setBusinessType] = useState<BusinessType>('NEGOCIO');
  const [commissionRate, setCommissionRate] = useState('15');
  const [altCommissionRate, setAltCommissionRate] = useState('12');
  const [altCommissionDistanceKm, setAltCommissionDistanceKm] = useState('40');
  const [dispatchTimeoutMin, setDispatchTimeoutMin] = useState('3');

  const [posVertical, setPosVertical] = useState<PosVertical>('RESTAURANTE');
  const [posMonthlyFee, setPosMonthlyFee] = useState('');

  const [carteraMonthlyFee, setCarteraMonthlyFee] = useState('');
  const [citasMonthlyFee, setCitasMonthlyFee] = useState('');

  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (productType === 'DELIVERY') {
        setBusinessType(currentDeliveryConfig?.businessType || 'NEGOCIO');
        setCommissionRate(
          currentDeliveryConfig?.commissionRate !== undefined
            ? String(Math.round(currentDeliveryConfig.commissionRate * 100))
            : '15'
        );
        setAltCommissionRate(
          currentDeliveryConfig?.altCommissionRate !== undefined
            ? String(Math.round(currentDeliveryConfig.altCommissionRate * 100))
            : '12'
        );
        setAltCommissionDistanceKm(
          String(currentDeliveryConfig?.altCommissionDistanceKm ?? 40)
        );
        setDispatchTimeoutMin(String(currentDeliveryConfig?.dispatchTimeoutMin ?? 3));
      } else if (productType === 'POS') {
        setPosVertical(currentPosConfig?.posVertical || 'RESTAURANTE');
        setPosMonthlyFee(
          currentPosConfig?.posMonthlyFee !== null && currentPosConfig?.posMonthlyFee !== undefined
            ? String(currentPosConfig.posMonthlyFee)
            : ''
        );
      } else if (productType === 'CARTERA_COBRO') {
        setCarteraMonthlyFee(
          currentCarteraConfig?.carteraMonthlyFee !== null &&
            currentCarteraConfig?.carteraMonthlyFee !== undefined
            ? String(currentCarteraConfig.carteraMonthlyFee)
            : ''
        );
      } else if (productType === 'CITAS') {
        setCitasMonthlyFee(
          currentCitasConfig?.citasMonthlyFee !== null &&
            currentCitasConfig?.citasMonthlyFee !== undefined
            ? String(currentCitasConfig.citasMonthlyFee)
            : ''
        );
      }
      setReason('');
    }
  }, [isOpen, productType, currentDeliveryConfig, currentPosConfig, currentCarteraConfig, currentCitasConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dto =
      productType === 'DELIVERY'
        ? {
            commissionRate:
              businessType === 'EMPRESA_RIDERS'
                ? Number(commissionRate) / 100 || 0.15
                : 0.15,
            altCommissionRate:
              businessType === 'EMPRESA_RIDERS'
                ? Number(altCommissionRate) / 100 || 0.12
                : 0.12,
            altCommissionDistanceKm:
              businessType === 'EMPRESA_RIDERS'
                ? Number(altCommissionDistanceKm) || 40
                : 40,
            dispatchTimeoutMin:
              businessType === 'EMPRESA_RIDERS'
                ? Number(dispatchTimeoutMin) || 3
                : 3,
            reason: reason.trim() || undefined,
          }
        : productType === 'POS'
        ? {
            posVertical,
            posMonthlyFee: posMonthlyFee ? Number(posMonthlyFee) : undefined,
            reason: reason.trim() || undefined,
          }
        : productType === 'CARTERA_COBRO'
        ? {
            carteraMonthlyFee: carteraMonthlyFee ? Number(carteraMonthlyFee) : undefined,
            reason: reason.trim() || undefined,
          }
        : {
            citasMonthlyFee: citasMonthlyFee ? Number(citasMonthlyFee) : undefined,
            reason: reason.trim() || undefined,
          };

    activateMutation.mutate(
      {
        businessId,
        productType,
        dto,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const isDelivery = productType === 'DELIVERY';
  const isPos = productType === 'POS';
  const isCartera = productType === 'CARTERA_COBRO';
  const isCitas = productType === 'CITAS';
  const title = `${isCurrentlyActive ? 'Configurar' : 'Activar'} ${getProductLabel(productType)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`Gestión de suscripción para ${businessName}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0">
            {isDelivery ? (
              <Motorcycle size={18} />
            ) : isPos ? (
              <Receipt size={18} />
            ) : isCartera ? (
              <Wallet size={18} />
            ) : (
              <CalendarBlank size={18} />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">
              {isDelivery
                ? 'Plataforma de Despacho y Asignación de Repartidores'
                : isPos
                ? 'Punto de Venta para Operaciones en Local'
                : isCartera
                ? 'Módulo de Créditos a Clientes y Cuentas por Cobrar'
                : 'Plataforma de Reservas Online y Gestión de Citas'}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              {isDelivery
                ? 'Permite a los repartidores recibir órdenes, calcular comisiones y gestionar rutas.'
                : isPos
                ? 'Habilita comanderas, apertura de cajas, gestión de mesas y emisión de tickets/facturas.'
                : isCartera
                ? 'Permite ventas a crédito en terminales POS, registro de abonos parciales, seguimiento de saldos y control de cartera vencida.'
                : 'Habilita la página pública de reservas para clientes, sincronización de agenda por barbero/profesional y confirmaciones automáticas.'}
            </p>
          </div>
        </div>

        {isDelivery && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Modelo Operativo de Delivery *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setBusinessType('NEGOCIO')}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                    businessType === 'NEGOCIO'
                      ? 'border-gray-900 bg-gray-50/70 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`p-1.5 rounded-lg ${
                        businessType === 'NEGOCIO'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Storefront size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-900">Comercio Común</p>
                      <p className="text-[10px] text-gray-500">Membresía mensual</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Despacha pedidos propios pagando cuota periódica.
                  </p>
                </div>

                <div
                  onClick={() => setBusinessType('EMPRESA_RIDERS')}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                    businessType === 'EMPRESA_RIDERS'
                      ? 'border-gray-900 bg-gray-50/70 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`p-1.5 rounded-lg ${
                        businessType === 'EMPRESA_RIDERS'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Motorcycle size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-900">Empresa de Riders</p>
                      <p className="text-[10px] text-gray-500">Comisión por envío</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Flota centralizada con liquidación por porcentaje.
                  </p>
                </div>
              </div>
            </div>

            {businessType === 'EMPRESA_RIDERS' && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={15} className="text-amber-700" />
                  <span>Configuración de Tasas y Tiempos</span>
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Comisión Base (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="15"
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Estándar: 15%</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Comisión Distancia Larga (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={altCommissionRate}
                      onChange={(e) => setAltCommissionRate(e.target.value)}
                      placeholder="12"
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Para &ge;{altCommissionDistanceKm || '40'} km
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Umbral Distancia (km)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={altCommissionDistanceKm}
                      onChange={(e) => setAltCommissionDistanceKm(e.target.value)}
                      placeholder="40"
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Timeout Despacho (min)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="60"
                      value={dispatchTimeoutMin}
                      onChange={(e) => setDispatchTimeoutMin(e.target.value)}
                      placeholder="3"
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isPos && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Vertical de Punto de Venta *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setPosVertical('RESTAURANTE')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                    posVertical === 'RESTAURANTE'
                      ? 'border-gray-900 bg-gray-50/70 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`p-1.5 rounded-lg ${
                        posVertical === 'RESTAURANTE'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <ForkKnife size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-900">Restaurante</p>
                      <p className="text-[10px] text-gray-500">Gastronomía & Bares</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Gestión de mesas, comanderas de cocina, cuentas divididas y propinas.
                  </p>
                </div>

                <div
                  onClick={() => setPosVertical('RETAIL')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                    posVertical === 'RETAIL'
                      ? 'border-gray-900 bg-gray-50/70 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`p-1.5 rounded-lg ${
                        posVertical === 'RETAIL'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <ShoppingBag size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-900">Retail</p>
                      <p className="text-[10px] text-gray-500">Comercio General</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Venta directa por código de barras, control de stock y caja rápida.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tarifa Mensual POS en USD (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={posMonthlyFee}
                  onChange={(e) => setPosMonthlyFee(e.target.value)}
                  placeholder="25.00"
                  className="w-full h-10 pl-7 pr-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Dejar vacío si no se aplica tarifa fija mensual para este negocio.
              </p>
            </div>
          </div>
        )}

        {isCartera && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tarifa Mensual Cartera de Cobro en USD (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={carteraMonthlyFee}
                  onChange={(e) => setCarteraMonthlyFee(e.target.value)}
                  placeholder="29.99"
                  className="w-full h-10 pl-7 pr-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Dejar vacío si no se aplica tarifa fija mensual para este servicio.
              </p>
            </div>
          </div>
        )}

        {isCitas && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tarifa Mensual Citas en USD (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={citasMonthlyFee}
                  onChange={(e) => setCitasMonthlyFee(e.target.value)}
                  placeholder="25.00"
                  className="w-full h-10 pl-7 pr-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Dejar vacío si no se aplica tarifa fija mensual para este servicio.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Motivo del cambio (opcional, para auditoría)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isCurrentlyActive
                ? 'Ej: Actualización de tarifas acordada con el negocio'
                : 'Ej: Contratación inicial de producto'
            }
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={activateMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-2xs"
          >
            <Sparkle size={14} />
            <span>
              {activateMutation.isPending
                ? 'Guardando...'
                : isCurrentlyActive
                ? 'Actualizar Configuración'
                : 'Confirmar Activación'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
