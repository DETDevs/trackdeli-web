import React, { useState } from 'react';
import {
  Motorcycle,
  Receipt,
  ForkKnife,
  ShoppingBag,
  Sliders,
  Wallet,
  CreditCard,
  CalendarBlank,
} from '@phosphor-icons/react';
import {
  useBusinessProducts,
  BusinessProductType,
} from '../../hooks/useBusinessProducts';
import { useBusinessMemberships } from '../../hooks/useMemberships';
import { BusinessType } from '../../hooks/useBusinesses';
import { ProductCard } from './ProductCard';
import { ActivateProductModal } from '../modals/ActivateProductModal';
import { DeactivateProductModal } from '../modals/DeactivateProductModal';
import { ProductAuditLogModal } from '../modals/ProductAuditLogModal';
import { CancelRenewalModal } from '../modals/CancelRenewalModal';
import { DeactivateNowModal } from '../modals/DeactivateNowModal';

interface BusinessProductsSectionProps {
  businessId: string;
  businessName: string;
  businessType?: BusinessType;
  businessCommissionRate?: number;
  businessAltCommissionRate?: number;
  businessAltCommissionDistanceKm?: number;
  businessDispatchTimeoutMin?: number;
  onRegisterPaymentClick?: (productType: BusinessProductType) => void;
}

export const BusinessProductsSection: React.FC<BusinessProductsSectionProps> = ({
  businessId,
  businessName,
  businessType = 'NEGOCIO',
  businessCommissionRate,
  businessAltCommissionRate,
  businessAltCommissionDistanceKm,
  businessDispatchTimeoutMin,
  onRegisterPaymentClick,
}) => {
  const { data: productsData, isLoading } = useBusinessProducts(businessId);
  const { data: memberships = [] } = useBusinessMemberships(businessId);

  const [activeModal, setActiveModal] = useState<{
    isOpen: boolean;
    productType: BusinessProductType;
    isCurrentlyActive: boolean;
  } | null>(null);

  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean;
    productType: BusinessProductType;
  } | null>(null);

  const [cancelRenewalModal, setCancelRenewalModal] = useState<{
    isOpen: boolean;
    productType: BusinessProductType;
    coverageEndDate?: string | null;
  } | null>(null);

  const [deactivateNowModal, setDeactivateNowModal] = useState<{
    isOpen: boolean;
    productType: BusinessProductType;
  } | null>(null);

  const [auditLogModal, setAuditLogModal] = useState<{
    isOpen: boolean;
    productType: BusinessProductType;
  } | null>(null);

  const getProductCoverageEndDate = (type: BusinessProductType): string | null => {
    const activeForProduct = memberships.find((m) => {
      if (m.status !== 'ACTIVE') return false;
      const end = new Date(m.endDate);
      if (end < new Date()) return false;
      if (!m.products || m.products.length === 0) return true;
      return m.products.some((p) => p.productType === type);
    });
    return activeForProduct?.endDate || (memberships.length > 0 ? memberships[0].endDate : null);
  };

  const deliverySub = productsData?.products?.DELIVERY;
  const isDeliveryActive = deliverySub?.status === 'ACTIVE';

  const posSub = productsData?.products?.POS;
  const isPosActive = posSub?.status === 'ACTIVE';

  const carteraSub = productsData?.products?.CARTERA_COBRO;
  const isCarteraActive = carteraSub?.status === 'ACTIVE';

  const citasSub = productsData?.products?.CITAS;
  const isCitasActive = citasSub?.status === 'ACTIVE';

  const activeCount = [isDeliveryActive, isPosActive, isCarteraActive, isCitasActive].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <Sliders size={20} className="text-brand-600" weight="duotone" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Productos Contratados
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {activeCount} de 4 activos
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestión independiente de suscripciones TrackDeli (Delivery), Sistema POS, Cartera de Cobro y Citas.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* TrackDeli (Delivery) Card */}
        <ProductCard
          productType="DELIVERY"
          title="TrackDeli (Delivery)"
          subtitle="Despacho, rutas y reparto en moto"
          activateButtonLabel="Activar Delivery"
          icon={<Motorcycle size={22} weight="duotone" />}
          iconActiveThemeClass="bg-amber-500/10 text-amber-800 border border-amber-200/60"
          isActive={!!isDeliveryActive}
          autoRenew={deliverySub?.autoRenew ?? true}
          renewalCanceledAt={deliverySub?.renewalCanceledAt}
          coverageEndDate={getProductCoverageEndDate('DELIVERY')}
          activatedAt={deliverySub?.activatedAt}
          deactivatedAt={deliverySub?.deactivatedAt}
          isMembershipProduct={businessType !== 'EMPRESA_RIDERS'}
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
          onCancelRenewalClick={() =>
            setCancelRenewalModal({
              isOpen: true,
              productType: 'DELIVERY',
              coverageEndDate: getProductCoverageEndDate('DELIVERY'),
            })
          }
          onDeactivateNowClick={() =>
            setDeactivateNowModal({ isOpen: true, productType: 'DELIVERY' })
          }
          onActivateClick={() =>
            setActiveModal({
              isOpen: true,
              productType: 'DELIVERY',
              isCurrentlyActive: false,
            })
          }
          onRegisterPaymentClick={() => onRegisterPaymentClick?.('DELIVERY')}
        >
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 font-medium">Modelo</span>
              <span className="font-semibold text-gray-900 text-xs">
                {businessType === 'EMPRESA_RIDERS'
                  ? 'Empresa de Riders'
                  : 'Comercio Común (Membresía)'}
              </span>
            </div>

            {businessType === 'EMPRESA_RIDERS' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-xs">
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

            {businessType !== 'EMPRESA_RIDERS' && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/60 text-xs">
                <span className="text-gray-400 font-medium">Tarifa Mensual:</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {deliverySub?.deliveryMonthlyFee
                    ? `$${Number(deliverySub.deliveryMonthlyFee).toFixed(2)} / mes`
                    : 'Sin cuota fija'}
                </span>
              </div>
            )}
          </div>
        </ProductCard>

        {/* Sistema POS Card */}
        <ProductCard
          productType="POS"
          title="Sistema POS"
          subtitle="Punto de venta, mesas y caja"
          icon={<Receipt size={22} weight="duotone" />}
          iconActiveThemeClass="bg-purple-500/10 text-purple-800 border border-purple-200/60"
          isActive={!!isPosActive}
          autoRenew={posSub?.autoRenew ?? true}
          renewalCanceledAt={posSub?.renewalCanceledAt}
          coverageEndDate={getProductCoverageEndDate('POS')}
          activatedAt={posSub?.activatedAt}
          deactivatedAt={posSub?.deactivatedAt}
          isMembershipProduct={true}
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
          onCancelRenewalClick={() =>
            setCancelRenewalModal({
              isOpen: true,
              productType: 'POS',
              coverageEndDate: getProductCoverageEndDate('POS'),
            })
          }
          onDeactivateNowClick={() =>
            setDeactivateNowModal({ isOpen: true, productType: 'POS' })
          }
          onRegisterPaymentClick={() => onRegisterPaymentClick?.('POS')}
        >
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 font-medium">Vertical</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 text-xs">
                {posSub?.posVertical === 'RETAIL' ? (
                  <>
                    <ShoppingBag size={14} className="text-purple-600" />
                    <span>Retail / Comercio</span>
                  </>
                ) : (
                  <>
                    <ForkKnife size={14} className="text-purple-600" />
                    <span>Restaurante / Mesas</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/60 text-xs">
              <span className="text-gray-400 font-medium">Tarifa Mensual:</span>
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
          icon={<Wallet size={22} weight="duotone" />}
          iconActiveThemeClass="bg-emerald-500/10 text-emerald-800 border border-emerald-200/60"
          isActive={!!isCarteraActive}
          autoRenew={carteraSub?.autoRenew ?? true}
          renewalCanceledAt={carteraSub?.renewalCanceledAt}
          coverageEndDate={getProductCoverageEndDate('CARTERA_COBRO')}
          activatedAt={carteraSub?.activatedAt}
          deactivatedAt={carteraSub?.deactivatedAt}
          isMembershipProduct={true}
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
          onCancelRenewalClick={() =>
            setCancelRenewalModal({
              isOpen: true,
              productType: 'CARTERA_COBRO',
              coverageEndDate: getProductCoverageEndDate('CARTERA_COBRO'),
            })
          }
          onDeactivateNowClick={() =>
            setDeactivateNowModal({ isOpen: true, productType: 'CARTERA_COBRO' })
          }
          onRegisterPaymentClick={() => onRegisterPaymentClick?.('CARTERA_COBRO')}
        >
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 font-medium">Módulo</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 text-xs">
                <CreditCard size={14} className="text-emerald-600" />
                <span>Crédito y Cobranza POS</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/60 text-xs">
              <span className="text-gray-400 font-medium">Tarifa Mensual:</span>
              <span className="font-semibold text-gray-900 font-mono">
                {carteraSub?.carteraMonthlyFee
                  ? `$${Number(carteraSub.carteraMonthlyFee).toFixed(2)} / mes`
                  : 'Sin cuota fija'}
              </span>
            </div>
          </div>
        </ProductCard>

        {/* Citas Card */}
        <ProductCard
          productType="CITAS"
          title="Citas"
          subtitle="Reservas online, agenda y gestión de citas"
          icon={<CalendarBlank size={22} weight="duotone" />}
          iconActiveThemeClass="bg-sky-500/10 text-sky-800 border border-sky-200/60"
          isActive={!!isCitasActive}
          autoRenew={citasSub?.autoRenew ?? true}
          renewalCanceledAt={citasSub?.renewalCanceledAt}
          coverageEndDate={getProductCoverageEndDate('CITAS')}
          activatedAt={citasSub?.activatedAt}
          deactivatedAt={citasSub?.deactivatedAt}
          isMembershipProduct={true}
          inactiveDescription="Este negocio no tiene contratado el servicio de Citas. La página pública de reservas y la agenda están deshabilitadas."
          onAuditClick={() => setAuditLogModal({ isOpen: true, productType: 'CITAS' })}
          onConfigureClick={() =>
            setActiveModal({
              isOpen: true,
              productType: 'CITAS',
              isCurrentlyActive: true,
            })
          }
          onDeactivateClick={() =>
            setDeactivateModal({ isOpen: true, productType: 'CITAS' })
          }
          onCancelRenewalClick={() =>
            setCancelRenewalModal({
              isOpen: true,
              productType: 'CITAS',
              coverageEndDate: getProductCoverageEndDate('CITAS'),
            })
          }
          onDeactivateNowClick={() =>
            setDeactivateNowModal({ isOpen: true, productType: 'CITAS' })
          }
          onRegisterPaymentClick={() => onRegisterPaymentClick?.('CITAS')}
        >
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 font-medium">Módulo</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 text-xs">
                <CalendarBlank size={14} className="text-sky-600" />
                <span>Reservas y Agenda</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/60 text-xs">
              <span className="text-gray-400 font-medium">Tarifa Mensual:</span>
              <span className="font-semibold text-gray-900 font-mono">
                {citasSub?.citasMonthlyFee
                  ? `$${Number(citasSub.citasMonthlyFee).toFixed(2)} / mes`
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
            deliveryMonthlyFee: deliverySub?.deliveryMonthlyFee,
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
          currentCitasConfig={{
            citasMonthlyFee: citasSub?.citasMonthlyFee,
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

      {cancelRenewalModal?.isOpen && (
        <CancelRenewalModal
          isOpen={cancelRenewalModal.isOpen}
          onClose={() => setCancelRenewalModal(null)}
          businessId={businessId}
          businessName={businessName}
          productType={cancelRenewalModal.productType}
          coverageEndDate={cancelRenewalModal.coverageEndDate}
        />
      )}

      {deactivateNowModal?.isOpen && (
        <DeactivateNowModal
          isOpen={deactivateNowModal.isOpen}
          onClose={() => setDeactivateNowModal(null)}
          businessId={businessId}
          businessName={businessName}
          productType={deactivateNowModal.productType}
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

