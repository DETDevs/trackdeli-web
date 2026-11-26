import React, { useEffect, useState } from 'react';
import {
  DotsThreeVertical,
  Plus,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import {
  useBusinessProducts,
  BusinessProductType,
} from '../../hooks/useBusinessProducts';
import { useBusinessMemberships } from '../../hooks/useMemberships';
import { BusinessAccountType, BusinessType } from '../../hooks/useBusinesses';
import { ActivateProductModal } from '../modals/ActivateProductModal';
import { DeactivateProductModal } from '../modals/DeactivateProductModal';
import { ProductAuditLogModal } from '../modals/ProductAuditLogModal';
import { CancelRenewalModal } from '../modals/CancelRenewalModal';
import { DeactivateNowModal } from '../modals/DeactivateNowModal';
import { formatDateShort } from '../../utils/format';

interface BusinessProductsSectionProps {
  businessId: string;
  businessName: string;
  accountType?: BusinessAccountType;
  businessType?: BusinessType;
  businessCommissionRate?: number;
  businessAltCommissionRate?: number;
  businessAltCommissionDistanceKm?: number;
  businessDispatchTimeoutMin?: number;
  salonProfile?: 'RESTAURANTE' | 'TALLER' | null;
  maxDevices?: number | null;
  activeDevices?: number;
  onRegisterPaymentClick?: (productType: BusinessProductType) => void;
}

export const BusinessProductsSection: React.FC<BusinessProductsSectionProps> = ({
  businessId,
  businessName,
  accountType = 'CLIENTE',
  businessType = 'NEGOCIO',
  businessCommissionRate,
  businessAltCommissionRate,
  businessAltCommissionDistanceKm,
  businessDispatchTimeoutMin,
  salonProfile,
  maxDevices,
  activeDevices,
  onRegisterPaymentClick,
}) => {
  const { data: productsData, isLoading } = useBusinessProducts(businessId);
  const { data: memberships = [] } = useBusinessMemberships(businessId);

  const [openMenuType, setOpenMenuType] = useState<BusinessProductType | null>(null);

  useEffect(() => {
    if (!openMenuType) return;
    const close = () => setOpenMenuType(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openMenuType]);

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
  const posSub = productsData?.products?.POS;
  const carteraSub = productsData?.products?.CARTERA_COBRO;
  const citasSub = productsData?.products?.CITAS;

  const isNonBilling = accountType === 'DEMO' || accountType === 'INTERNO';

  const allProductDefs: Array<{
    type: BusinessProductType;
    label: string;
    shortAddLabel: string;
    isActive: boolean;
    activatedAt?: string | null;
    autoRenew: boolean;
    isMembershipProduct: boolean;
    detail: string;
    feeLabel: string;
  }> = [
    {
      type: 'POS',
      label: 'Sistema POS',
      shortAddLabel: 'Sistema POS',
      isActive: posSub?.status === 'ACTIVE',
      activatedAt: posSub?.activatedAt,
      autoRenew: posSub?.autoRenew ?? true,
      isMembershipProduct: true,
      detail: [
        posSub?.posVertical === 'RETAIL' ? 'Retail' : 'Restaurante',
        salonProfile === 'TALLER' || posSub?.salonProfile === 'TALLER' ? 'Taller' : null,
        maxDevices === null || (maxDevices === undefined && posSub?.maxDevices === null)
          ? 'Computadoras ilimitadas'
          : `${activeDevices ?? 0}/${maxDevices ?? posSub?.maxDevices ?? 1} computadoras`,
      ]
        .filter(Boolean)
        .join(' · '),
      feeLabel: isNonBilling
        ? 'Sin cobro'
        : posSub?.posMonthlyFee
        ? `$${Number(posSub.posMonthlyFee).toFixed(2)} / mes`
        : 'Sin cuota fija',
    },
    {
      type: 'DELIVERY',
      label: 'TrackDeli (Delivery)',
      shortAddLabel: 'Delivery',
      isActive: deliverySub?.status === 'ACTIVE',
      activatedAt: deliverySub?.activatedAt,
      autoRenew: deliverySub?.autoRenew ?? true,
      isMembershipProduct: businessType !== 'EMPRESA_RIDERS',
      detail:
        businessType === 'EMPRESA_RIDERS'
          ? `Comisión ${Math.round(((deliverySub?.commissionRate ?? businessCommissionRate ?? 0.15) as number) * 100)}%`
          : 'Despacho y reparto en moto',
      feeLabel: isNonBilling
        ? 'Sin cobro'
        : businessType === 'EMPRESA_RIDERS'
        ? 'Por comisión'
        : deliverySub?.deliveryMonthlyFee
        ? `$${Number(deliverySub.deliveryMonthlyFee).toFixed(2)} / mes`
        : 'Sin cuota fija',
    },
    {
      type: 'CARTERA_COBRO',
      label: 'Finanzas',
      shortAddLabel: 'Finanzas',
      isActive: carteraSub?.status === 'ACTIVE',
      activatedAt: carteraSub?.activatedAt,
      autoRenew: carteraSub?.autoRenew ?? true,
      isMembershipProduct: true,
      detail: 'Cuentas por pagar, gastos y cartera de cobro',
      feeLabel: isNonBilling
        ? 'Sin cobro'
        : carteraSub?.carteraMonthlyFee
        ? `$${Number(carteraSub.carteraMonthlyFee).toFixed(2)} / mes`
        : 'Sin cuota fija',
    },
    {
      type: 'CITAS',
      label: 'Citas',
      shortAddLabel: 'Citas',
      isActive: citasSub?.status === 'ACTIVE',
      activatedAt: citasSub?.activatedAt,
      autoRenew: citasSub?.autoRenew ?? true,
      isMembershipProduct: true,
      detail: 'Reservas en línea y agenda',
      feeLabel: isNonBilling
        ? 'Sin cobro'
        : citasSub?.citasMonthlyFee
        ? `$${Number(citasSub.citasMonthlyFee).toFixed(2)} / mes`
        : 'Sin cuota fija',
    },
  ];

  const contracted = allProductDefs.filter((p) => p.isActive);
  const uncontracted = allProductDefs.filter((p) => !p.isActive);

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Productos contratados</h3>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Módulos activos en este negocio y sus tarifas vigentes
          </p>
        </div>
        {isLoading && <span className="text-xs text-gray-400">Sincronizando...</span>}
      </div>

      {contracted.length === 0 ? (
        <p className="text-xs text-gray-500 py-2">
          Este negocio no tiene productos activos en este momento.
        </p>
      ) : (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {contracted.map((item) => (
            <div
              key={item.type}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                  {item.activatedAt && (
                    <span className="text-xs text-gray-500">
                      · Desde {formatDateShort(item.activatedAt)}
                    </span>
                  )}
                  {!item.autoRenew && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      Renovación cancelada
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-gray-500">{item.detail}</p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <span className="text-xs sm:text-sm font-semibold text-gray-900 font-mono">
                  {item.feeLabel}
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuType((prev) => (prev === item.type ? null : item.type))
                    }
                    className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center justify-center cursor-pointer"
                    title={`Acciones de ${item.label}`}
                    aria-label={`Acciones de ${item.label}`}
                  >
                    <DotsThreeVertical size={16} weight="bold" />
                  </button>

                  {openMenuType === item.type && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenMenuType(null)}
                      />
                      <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white shadow-lg border border-gray-200/80 py-1.5 z-50 text-left">
                        {!isNonBilling && item.isMembershipProduct && onRegisterPaymentClick && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuType(null);
                              onRegisterPaymentClick(item.type);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            Registrar pago
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuType(null);
                            setActiveModal({
                              isOpen: true,
                              productType: item.type,
                              isCurrentlyActive: true,
                            });
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Configurar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuType(null);
                            setAuditLogModal({ isOpen: true, productType: item.type });
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Auditoría
                        </button>
                        {item.isMembershipProduct && item.autoRenew && !isNonBilling && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuType(null);
                              setCancelRenewalModal({
                                isOpen: true,
                                productType: item.type,
                                coverageEndDate: getProductCoverageEndDate(item.type),
                              });
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50 cursor-pointer"
                          >
                            Cancelar renovación
                          </button>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuType(null);
                            if (item.isMembershipProduct) {
                              setDeactivateNowModal({ isOpen: true, productType: item.type });
                            } else {
                              setDeactivateModal({ isOpen: true, productType: item.type });
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          Desactivar ahora
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No contratados como botones "+ Producto" con su Registrar pago y Auditoría */}
      {uncontracted.length > 0 && (
        <div className="pt-3 border-t border-gray-100 space-y-2.5">
          <p className="text-[13px] font-medium text-gray-500">No contratados</p>
          <div className="flex flex-wrap items-center gap-2">
            {uncontracted.map((item) => (
              <div
                key={item.type}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isNonBilling || (item.type === 'DELIVERY' && businessType === 'EMPRESA_RIDERS')) {
                      setActiveModal({
                        isOpen: true,
                        productType: item.type,
                        isCurrentlyActive: false,
                      });
                    } else {
                      onRegisterPaymentClick?.(item.type);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
                  title={
                    isNonBilling
                      ? `Activar ${item.shortAddLabel}`
                      : `Contratar o registrar pago de ${item.shortAddLabel}`
                  }
                >
                  <Plus size={13} weight="bold" />
                  <span>{item.shortAddLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuditLogModal({ isOpen: true, productType: item.type })}
                  className="px-2 py-1.5 border-l border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 inline-flex items-center gap-1 cursor-pointer"
                  title={`Auditoría de ${item.label}`}
                >
                  <ClockCounterClockwise size={13} />
                  <span>Auditoría</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
