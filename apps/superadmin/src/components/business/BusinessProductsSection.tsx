import React, { useState } from 'react';
import {
  Motorcycle,
  Receipt,
  ForkKnife,
  ShoppingBag,
  Gear,
  ClockCounterClockwise,
  Plus,
  Sliders,
} from '@phosphor-icons/react';
import { Badge } from '../ui/Badge';
import {
  useBusinessProducts,
  BusinessProductType,
} from '../../hooks/useBusinessProducts';
import { BusinessType } from '../../hooks/useBusinesses';
import { formatDateShort } from '../../utils/format';
import { ActivateProductModal } from '../modals/ActivateProductModal';
import { DeactivateProductModal } from '../modals/DeactivateProductModal';
import { ProductAuditLogModal } from '../modals/ProductAuditLogModal';

interface BusinessProductsSectionProps {
  businessId: string;
  businessName: string;
  businessType?: BusinessType;
  businessCommissionRate?: number;
  businessAltCommissionRate?: number;
  businessAltCommissionDistanceKm?: number;
  businessDispatchTimeoutMin?: number;
}

export const BusinessProductsSection: React.FC<BusinessProductsSectionProps> = ({
  businessId,
  businessName,
  businessType = 'NEGOCIO',
  businessCommissionRate,
  businessAltCommissionRate,
  businessAltCommissionDistanceKm,
  businessDispatchTimeoutMin,
}) => {
  const { data: productsData, isLoading } = useBusinessProducts(businessId);

  const [activeModal, setActiveModal] = useState<{
    isOpen: boolean;
    productType: BusinessProductType;
    isCurrentlyActive: boolean;
  } | null>(null);

  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean;
    productType: BusinessProductType;
  } | null>(null);

  const [auditLogModal, setAuditLogModal] = useState<{
    isOpen: boolean;
    productType: BusinessProductType;
  } | null>(null);

  const deliverySub = productsData?.products?.DELIVERY;
  const isDeliveryActive = deliverySub?.status === 'ACTIVE';

  const posSub = productsData?.products?.POS;
  const isPosActive = posSub?.status === 'ACTIVE';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-brand-600" weight="duotone" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Productos Contratados
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestión independiente de suscripciones TrackDeli (Delivery) y Sistema POS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-brand-500 border-t-transparent" />
              <span>Sincronizando...</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div
          className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
            isDeliveryActive
              ? 'border-gray-200/90 bg-white shadow-2xs'
              : 'border-dashed border-gray-200 bg-gray-50/50'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDeliveryActive
                      ? 'bg-amber-500/10 text-amber-800 border border-amber-200/60'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Motorcycle size={22} weight="duotone" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 leading-tight">
                    TrackDeli (Delivery)
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Despacho, rutas y reparto en moto
                  </p>
                </div>
              </div>

              <Badge variant={isDeliveryActive ? 'success' : 'neutral'} dot size="sm">
                {isDeliveryActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-[11px] text-gray-400 pb-1 border-b border-gray-100">
                <span>Fecha de activación</span>
                <span className="font-medium text-gray-700">
                  {deliverySub?.activatedAt
                    ? formatDateShort(deliverySub.activatedAt)
                    : isDeliveryActive
                    ? 'Activado'
                    : 'Sin contratar'}
                </span>
              </div>

              {isDeliveryActive ? (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-medium">Modelo</span>
                    <span className="font-semibold text-gray-900 text-xs">
                      {businessType === 'EMPRESA_RIDERS'
                        ? 'Empresa de Riders'
                        : 'Comercio Común (Membresía)'}
                    </span>
                  </div>

                  {businessType === 'EMPRESA_RIDERS' && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60 text-[11px]">
                      <div>
                        <span className="text-gray-400">Comisión Base: </span>
                        <span className="font-semibold text-gray-900">
                          {(
                            (deliverySub?.commissionRate ?? businessCommissionRate ?? 0.15) * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Distancia Larga: </span>
                        <span className="font-semibold text-gray-900">
                          {(
                            (deliverySub?.altCommissionRate ??
                              businessAltCommissionRate ??
                              0.12) * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Timeout despacho: </span>
                        <span className="font-semibold text-gray-900">
                          {deliverySub?.dispatchTimeoutMin ?? businessDispatchTimeoutMin ?? 3} min
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-3 px-3 rounded-lg bg-gray-100/70 text-gray-500 text-[11px] leading-relaxed">
                  Este negocio no tiene contratado el servicio de Delivery. No se permiten órdenes de reparto.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => setAuditLogModal({ isOpen: true, productType: 'DELIVERY' })}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ClockCounterClockwise size={14} />
              <span>Auditoría</span>
            </button>

            <div className="flex items-center gap-2">
              {isDeliveryActive ? (
                <>
                  <button
                    onClick={() =>
                      setActiveModal({
                        isOpen: true,
                        productType: 'DELIVERY',
                        isCurrentlyActive: true,
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors shadow-2xs"
                  >
                    <Gear size={13} />
                    <span>Configurar</span>
                  </button>
                  <button
                    onClick={() =>
                      setDeactivateModal({ isOpen: true, productType: 'DELIVERY' })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
                  >
                    <span>Desactivar</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    setActiveModal({
                      isOpen: true,
                      productType: 'DELIVERY',
                      isCurrentlyActive: false,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-2xs"
                >
                  <Plus size={13} weight="bold" />
                  <span>Activar Delivery</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
            isPosActive
              ? 'border-gray-200/90 bg-white shadow-2xs'
              : 'border-dashed border-gray-200 bg-gray-50/50'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isPosActive
                      ? 'bg-purple-500/10 text-purple-800 border border-purple-200/60'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Receipt size={22} weight="duotone" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 leading-tight">
                    Sistema POS
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Punto de venta, mesas y caja
                  </p>
                </div>
              </div>

              <Badge variant={isPosActive ? 'success' : 'neutral'} dot size="sm">
                {isPosActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-[11px] text-gray-400 pb-1 border-b border-gray-100">
                <span>Fecha de activación</span>
                <span className="font-medium text-gray-700">
                  {posSub?.activatedAt
                    ? formatDateShort(posSub.activatedAt)
                    : isPosActive
                    ? 'Activado'
                    : 'Sin contratar'}
                </span>
              </div>

              {isPosActive ? (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-medium">Vertical</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-gray-900 text-xs">
                      {posSub?.posVertical === 'RETAIL' ? (
                        <>
                          <ShoppingBag size={13} className="text-purple-600" />
                          <span>Retail / Comercio</span>
                        </>
                      ) : (
                        <>
                          <ForkKnife size={13} className="text-purple-600" />
                          <span>Restaurante / Mesas</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                    <span className="text-gray-400">Tarifa Mensual:</span>
                    <span className="font-semibold text-gray-900 font-mono">
                      {posSub?.posMonthlyFee
                        ? `$${Number(posSub.posMonthlyFee).toFixed(2)} / mes`
                        : 'Sin cuota fija'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-3 px-3 rounded-lg bg-gray-100/70 text-gray-500 text-[11px] leading-relaxed">
                  Este negocio no tiene contratado el Sistema POS. El acceso a terminales de venta en el local está bloqueado.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => setAuditLogModal({ isOpen: true, productType: 'POS' })}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ClockCounterClockwise size={14} />
              <span>Auditoría</span>
            </button>

            <div className="flex items-center gap-2">
              {isPosActive ? (
                <>
                  <button
                    onClick={() =>
                      setActiveModal({
                        isOpen: true,
                        productType: 'POS',
                        isCurrentlyActive: true,
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors shadow-2xs"
                  >
                    <Gear size={13} />
                    <span>Configurar</span>
                  </button>
                  <button
                    onClick={() =>
                      setDeactivateModal({ isOpen: true, productType: 'POS' })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
                  >
                    <span>Desactivar</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    setActiveModal({
                      isOpen: true,
                      productType: 'POS',
                      isCurrentlyActive: false,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-2xs"
                >
                  <Plus size={13} weight="bold" />
                  <span>Activar POS</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeModal?.isOpen && (
        <ActivateProductModal
          isOpen={activeModal.isOpen}
          onClose={() => setActiveModal(null)}
          businessId={businessId}
          businessName={businessName}
          productType={activeModal.productType}
          isCurrentlyActive={activeModal.isCurrentlyActive}
          currentDeliveryConfig={{
            businessType,
            commissionRate: deliverySub?.commissionRate ?? businessCommissionRate,
            altCommissionRate: deliverySub?.altCommissionRate ?? businessAltCommissionRate,
            altCommissionDistanceKm:
              deliverySub?.altCommissionDistanceKm ?? businessAltCommissionDistanceKm,
            dispatchTimeoutMin:
              deliverySub?.dispatchTimeoutMin ?? businessDispatchTimeoutMin,
          }}
          currentPosConfig={{
            posVertical: posSub?.posVertical,
            posMonthlyFee: posSub?.posMonthlyFee,
          }}
        />
      )}

      {deactivateModal?.isOpen && (
        <DeactivateProductModal
          isOpen={deactivateModal.isOpen}
          onClose={() => setDeactivateModal(null)}
          businessId={businessId}
          businessName={businessName}
          productType={deactivateModal.productType}
        />
      )}

      {auditLogModal?.isOpen && (
        <ProductAuditLogModal
          isOpen={auditLogModal.isOpen}
          onClose={() => setAuditLogModal(null)}
          businessId={businessId}
          businessName={businessName}
          productType={auditLogModal.productType}
        />
      )}
    </div>
  );
};
