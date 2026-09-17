import React, { useState } from 'react';
import {
  Motorcycle,
  Receipt,
  ForkKnife,
  ShoppingBag,
  Sliders,
  Wallet,
  CreditCard,
} from '@phosphor-icons/react';
import {
  useBusinessProducts,
  BusinessProductType,
} from '../../hooks/useBusinessProducts';
import { BusinessType } from '../../hooks/useBusinesses';
import { ProductCard } from './ProductCard';
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

  const carteraSub = productsData?.products?.CARTERA_COBRO;
  const isCarteraActive = carteraSub?.status === 'ACTIVE';

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
            Gestión independiente de suscripciones TrackDeli (Delivery), Sistema POS y Cartera de Cobro.
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* TrackDeli (Delivery) Card */}
        <ProductCard
          productType="DELIVERY"
          title="TrackDeli (Delivery)"
          subtitle="Despacho, rutas y reparto en moto"
          activateButtonLabel="Activar Delivery"
          icon={<Motorcycle size={22} weight="duotone" />}
          iconActiveThemeClass="bg-amber-500/10 text-amber-800 border border-amber-200/60"
          isActive={!!isDeliveryActive}
          activatedAt={deliverySub?.activatedAt}
          inactiveDescription="Este negocio no tiene contratado el servicio de Delivery. No se permiten órdenes de reparto."
          onAuditClick={() => setAuditLogModal({ isOpen: true, productType: 'DELIVERY' })}
          onConfigureClick={() =>
            setActiveModal({
              isOpen: true,
              productType: 'DELIVERY',
              isCurrentlyActive: true,
            })
          }
          onDeactivateClick={() =>
            setDeactivateModal({ isOpen: true, productType: 'DELIVERY' })
          }
          onActivateClick={() =>
            setActiveModal({
              isOpen: true,
              productType: 'DELIVERY',
              isCurrentlyActive: false,
            })
          }
        >
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
        </ProductCard>

        {/* Sistema POS Card */}
        <ProductCard
          productType="POS"
          title="Sistema POS"
          subtitle="Punto de venta, mesas y caja"
          activateButtonLabel="Activar POS"
          icon={<Receipt size={22} weight="duotone" />}
          iconActiveThemeClass="bg-purple-500/10 text-purple-800 border border-purple-200/60"
          isActive={!!isPosActive}
          activatedAt={posSub?.activatedAt}
          inactiveDescription="Este negocio no tiene contratado el Sistema POS. El acceso a terminales de venta en el local está bloqueado."
          onAuditClick={() => setAuditLogModal({ isOpen: true, productType: 'POS' })}
          onConfigureClick={() =>
            setActiveModal({
              isOpen: true,
              productType: 'POS',
              isCurrentlyActive: true,
            })
          }
          onDeactivateClick={() =>
            setDeactivateModal({ isOpen: true, productType: 'POS' })
          }
          onActivateClick={() =>
            setActiveModal({
              isOpen: true,
              productType: 'POS',
              isCurrentlyActive: false,
            })
          }
        >
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
        </ProductCard>

        {/* Cartera de Cobro Card */}
        <ProductCard
          productType="CARTERA_COBRO"
          title="Cartera de Cobro"
          subtitle="Ventas a crédito, abonos y cartera vencida"
          activateButtonLabel="Activar Cartera"
          icon={<Wallet size={22} weight="duotone" />}
          iconActiveThemeClass="bg-emerald-500/10 text-emerald-800 border border-emerald-200/60"
          isActive={!!isCarteraActive}
          activatedAt={carteraSub?.activatedAt}
          inactiveDescription="Este negocio no tiene contratada la Cartera de Cobro. El registro de ventas a crédito y control de saldos está deshabilitado."
          onAuditClick={() => setAuditLogModal({ isOpen: true, productType: 'CARTERA_COBRO' })}
          onConfigureClick={() =>
            setActiveModal({
              isOpen: true,
              productType: 'CARTERA_COBRO',
              isCurrentlyActive: true,
            })
          }
          onDeactivateClick={() =>
            setDeactivateModal({ isOpen: true, productType: 'CARTERA_COBRO' })
          }
          onActivateClick={() =>
            setActiveModal({
              isOpen: true,
              productType: 'CARTERA_COBRO',
              isCurrentlyActive: false,
            })
          }
        >
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500 font-medium">Módulo</span>
              <span className="inline-flex items-center gap-1 font-semibold text-gray-900 text-xs">
                <CreditCard size={13} className="text-emerald-600" />
                <span>Crédito y Cobranza POS</span>
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
              <span className="text-gray-400">Tarifa Mensual:</span>
              <span className="font-semibold text-gray-900 font-mono">
                {carteraSub?.carteraMonthlyFee
                  ? `$${Number(carteraSub.carteraMonthlyFee).toFixed(2)} / mes`
                  : 'Sin cuota fija'}
              </span>
            </div>
          </div>
        </ProductCard>
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
          currentCarteraConfig={{
            carteraMonthlyFee: carteraSub?.carteraMonthlyFee,
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
