import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getCustomerHistory,
  getCustomerCreditAccounts,
  type Customer,
  type CustomerHistorySale,
  type CustomerHistoryOrder,
} from 'api-client';
import {
  X,
  CircleNotch,
  MapPin,
  PencilSimple,
  UserMinus,
  UserCheck,
  WhatsappLogo,
  Copy,
  ArrowSquareOut,
  Wallet,
  Coins,
  Receipt,
  Package,
  CalendarCheck,
  Clock,
  Motorcycle,
  IdentificationCard,
  EnvelopeSimple,
  Buildings,
  Note,
} from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';
import { StatusBadge } from '../StatusBadge';
import { formatRelative, formatDateTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate } from '../../utils/dateManagua';
import { RegisterCreditPaymentModal } from '../finances/RegisterCreditPaymentModal';
import { CreditAccountDetailModal } from '../finances/CreditAccountDetailModal';

const formatPhoneDisplay = (phone?: string | null): string => {
  const clean = (phone ?? '').trim();
  if (!clean) return 'Sin teléfono';
  if (clean.startsWith('+') || clean.startsWith('505')) return clean;
  return `+505 ${clean}`;
};

const getWhatsAppUrl = (phone?: string | null): string | null => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (digits.length === 8) return `https://wa.me/505${digits}`;
  return `https://wa.me/${digits}`;
};

const getSaleStatusLabel = (status?: string): string => {
  switch (String(status || '').toUpperCase()) {
    case 'COMPLETED':
      return 'Completada';
    case 'VOIDED':
      return 'Anulada';
    case 'PARTIAL_RETURN':
      return 'Devolución parcial';
    case 'RETURNED':
      return 'Devuelta';
    default:
      return status || 'Completada';
  }
};

export interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  hasCarteraCobro: boolean;
  isDeliveryActive: boolean;
  isCitasActive: boolean;
  isPosManager: boolean;
  onEdit: (customer: Customer) => void;
  onDeactivate: (customer: Customer) => void;
  onReactivate: (customer: Customer) => void;
  isReactivating?: boolean;
}

type HistoryTab = 'sales' | 'credits' | 'orders' | 'appointments';

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  hasCarteraCobro,
  isDeliveryActive,
  isCitasActive,
  isPosManager,
  onEdit,
  onDeactivate,
  onReactivate,
  isReactivating = false,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<HistoryTab>('sales');
  const [selectedCreditAccountForPayment, setSelectedCreditAccountForPayment] = useState<any | null>(
    null,
  );
  const [selectedCreditAccountIdForDetail, setSelectedCreditAccountIdForDetail] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('sales');
    }
  }, [isOpen, customer?.id]);

  // Historial del cliente desde GET /businesses/me/customers/:id/history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['customer-history', customer?.id],
    queryFn: () => (customer ? getCustomerHistory(customer.id) : null),
    enabled: Boolean(isOpen && customer?.id),
  });

  const showCartera = Boolean(
    (hasCarteraCobro || historyData?.products?.carteraCobro) && isPosManager,
  );
  const showCitas = Boolean(isCitasActive || historyData?.products?.citas);

  // Cuentas de crédito detalladas (solo cuando el negocio tiene Cartera de Cobro y el rol es encargado)
  const { data: customerCreditData, refetch: refetchCustomerCredit } = useQuery({
    queryKey: ['pos', 'customers', customer?.id, 'credit-accounts'],
    queryFn: () => (customer ? getCustomerCreditAccounts(customer.id) : null),
    enabled: Boolean(isOpen && customer?.id && showCartera),
  });

  if (!isOpen || !customer) return null;

  const mergedCustomer: Customer = {
    ...customer,
    ...(historyData?.customer || {}),
  };

  const isInactive = mergedCustomer.isActive === false;
  const waUrl = getWhatsAppUrl(mergedCustomer.phone);

  const sales: CustomerHistorySale[] = historyData?.sales || [];
  const orders: CustomerHistoryOrder[] = historyData?.orders || [];
  const appointments: any[] = historyData?.appointments || [];
  const creditAccounts: any[] =
    customerCreditData?.accounts || historyData?.creditAccounts || [];

  // Resumen de crédito (los montos los da el API)
  const rawCreditLimit =
    customerCreditData?.summary?.creditLimit !== undefined
      ? customerCreditData.summary.creditLimit
      : mergedCustomer.creditLimit;
  const hasCreditLimit = rawCreditLimit !== null && rawCreditLimit !== undefined;

  const rawPendingBalance =
    customerCreditData?.summary?.totalDebt !== undefined
      ? customerCreditData.summary.totalDebt
      : mergedCustomer.currentBalance !== undefined && mergedCustomer.currentBalance !== null
      ? mergedCustomer.currentBalance
      : mergedCustomer.balance ?? 0;

  const rawAvailableCredit = customerCreditData?.summary?.availableCredit;
  const hasAvailableCredit =
    rawAvailableCredit !== null && rawAvailableCredit !== undefined;

  const copyToClipboard = (text?: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const initials = mergedCustomer.name
    ? mergedCustomer.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'CL';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        <div className="relative w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="text-base font-semibold text-gray-900 leading-tight flex flex-wrap items-center gap-2">
                  <span className="break-words">{mergedCustomer.name}</span>
                  {isInactive ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                      Inactivo
                    </span>
                  ) : mergedCustomer.isBlocked ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      Bloqueado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activo
                    </span>
                  )}
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                  <span className="font-mono text-gray-700">
                    {formatPhoneDisplay(mergedCustomer.phone)}
                  </span>
                  {mergedCustomer.phone && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mergedCustomer.phone)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="Copiar teléfono"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <WhatsappLogo size={14} weight="fill" /> WhatsApp
                    </a>
                  )}
                  {mergedCustomer.ruc && (
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <IdentificationCard size={13} className="text-gray-400" />
                      <span>Cédula/RUC: {mergedCustomer.ruc}</span>
                    </span>
                  )}
                  {mergedCustomer.email && (
                    <span className="inline-flex items-center gap-1 text-gray-600 break-all">
                      <EnvelopeSimple size={13} className="text-gray-400" />
                      <span>{mergedCustomer.email}</span>
                    </span>
                  )}
                </div>

                {(mergedCustomer.group?.name || mergedCustomer.externalCode) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {mergedCustomer.group?.name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <Buildings size={12} />
                        <span>{mergedCustomer.group.name}</span>
                      </span>
                    )}
                    {mergedCustomer.externalCode && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-gray-100 text-gray-700">
                        Carnet: {mergedCustomer.externalCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onEdit(mergedCustomer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <PencilSimple size={14} weight="bold" />
                <span>Editar</span>
              </button>

              {isPosManager && (
                isInactive ? (
                  <button
                    type="button"
                    onClick={() => onReactivate(mergedCustomer)}
                    disabled={isReactivating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isReactivating ? (
                      <CircleNotch size={14} className="animate-spin" />
                    ) : (
                      <UserCheck size={14} weight="bold" />
                    )}
                    <span>Reactivar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDeactivate(mergedCustomer)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-800 border border-gray-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <UserMinus size={14} weight="bold" />
                    <span>Desactivar</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Location & Notes Card */}
            <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-600" />
                  <span>Ubicación guardada</span>
                </span>
                {mergedCustomer.lastConfirmedAt && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Confirmada {formatRelative(mergedCustomer.lastConfirmedAt)}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-gray-800 font-medium">
                {mergedCustomer.lastAddressText || 'Sin dirección de entrega registrada'}
              </p>

              {mergedCustomer.deliveryReference && (
                <p className="text-xs text-gray-700">
                  <span className="font-semibold text-gray-900">Punto de referencia:</span>{' '}
                  {mergedCustomer.deliveryReference}
                </p>
              )}

              {mergedCustomer.notes && (
                <p className="text-xs text-gray-700 flex items-start gap-1.5 pt-1">
                  <Note size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-gray-900">Notas:</strong>{' '}
                    {mergedCustomer.notes}
                  </span>
                </p>
              )}

              {mergedCustomer.lastLatitude && mergedCustomer.lastLongitude ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-gray-200/50">
                  <span className="text-gray-500 text-xs">
                    Coordenadas: {Number(mergedCustomer.lastLatitude).toFixed(5)},{' '}
                    {Number(mergedCustomer.lastLongitude).toFixed(5)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${mergedCustomer.lastLatitude},${mergedCustomer.lastLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium text-xs"
                  >
                    <ArrowSquareOut size={13} />
                    <span>Abrir en Google Maps</span>
                  </a>
                </div>
              ) : null}
            </div>

            {/* Credit Summary Bar (solo si el negocio tiene Cartera de Cobro y el rol es ENCARGADO/SUPERADMIN) */}
            {showCartera && (
              <div
                data-testid="customer-credit-summary"
                className={`grid grid-cols-1 ${
                  hasAvailableCredit ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                } gap-3`}
              >
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-xs text-gray-500 block">Límite de crédito</span>
                  <span className="text-sm font-bold font-mono text-gray-900 mt-0.5 block">
                    {hasCreditLimit ? formatCurrency(Number(rawCreditLimit)) : 'Sin límite'}
                  </span>
                </div>

                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
                  <span className="text-xs text-amber-800 block">Saldo pendiente</span>
                  <span className="text-sm font-bold font-mono text-amber-900 mt-0.5 block">
                    {formatCurrency(Number(rawPendingBalance || 0))}
                  </span>
                </div>

                {hasAvailableCredit && (
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                    <span className="text-xs text-emerald-800 block">Crédito disponible</span>
                    <span className="text-sm font-bold font-mono text-emerald-900 mt-0.5 block">
                      {formatCurrency(Number(rawAvailableCredit))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tabs Navigation */}
            <div className="flex flex-wrap border-b border-gray-200 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className={`inline-flex items-center gap-1.5 py-2.5 px-3.5 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'sales'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Receipt size={15} weight={activeTab === 'sales' ? 'bold' : 'regular'} />
                <span>Compras ({sales.length})</span>
              </button>

              {showCartera && (
                <button
                  type="button"
                  onClick={() => setActiveTab('credits')}
                  className={`inline-flex items-center gap-1.5 py-2.5 px-3.5 font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'credits'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Wallet size={15} weight={activeTab === 'credits' ? 'bold' : 'regular'} />
                  <span>Créditos ({creditAccounts.length})</span>
                </button>
              )}

              {isDeliveryActive && (
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`inline-flex items-center gap-1.5 py-2.5 px-3.5 font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'orders'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Package size={15} weight={activeTab === 'orders' ? 'bold' : 'regular'} />
                  <span>Pedidos ({orders.length})</span>
                </button>
              )}

              {showCitas && (
                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className={`inline-flex items-center gap-1.5 py-2.5 px-3.5 font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'appointments'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <CalendarCheck
                    size={15}
                    weight={activeTab === 'appointments' ? 'bold' : 'regular'}
                  />
                  <span>Citas ({appointments.length})</span>
                </button>
              )}
            </div>

            {/* Tab Content */}
            {isLoadingHistory ? (
              <div className="py-12 text-center text-xs text-gray-400">
                <CircleNotch size={24} className="animate-spin mx-auto mb-2 text-gray-400" />
                <p>Cargando historial del cliente...</p>
              </div>
            ) : (
              <>
                {/* 1. COMPRAS (Ventas del POS) */}
                {activeTab === 'sales' && (
                  <div className="space-y-2.5">
                    {sales.length === 0 ? (
                      <div className="py-10 text-center bg-gray-50/50 rounded-xl border border-gray-100 text-gray-400 space-y-1">
                        <Receipt size={26} className="mx-auto text-gray-300" />
                        <p className="text-xs font-semibold text-gray-600">
                          Todavía no tiene compras
                        </p>
                      </div>
                    ) : (
                      sales.map((sale) => {
                        const isDomicilio =
                          String(sale.channel || '').toUpperCase() === 'DOMICILIO';
                        const itemsList = sale.items || [];
                        const itemsSummary =
                          itemsList.length > 0
                            ? itemsList
                                .map((it) => `${it.quantity}x ${it.productName || 'Producto'}`)
                                .slice(0, 3)
                                .join(', ') +
                              (itemsList.length > 3 ? ` y ${itemsList.length - 3} más` : '')
                            : null;

                        return (
                          <div
                            key={sale.id}
                            className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-gray-900">
                                  {sale.invoiceNumber
                                    ? `Comprobante #${sale.invoiceNumber}`
                                    : `Venta #${sale.id.slice(0, 8)}`}
                                </span>

                                {sale.status && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                    {getSaleStatusLabel(sale.status)}
                                  </span>
                                )}

                                {isDomicilio && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Motorcycle size={13} weight="bold" />
                                    <span>A domicilio</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                                  <Clock size={13} className="text-gray-400" />
                                  <span>
                                    {formatDateTime(sale.createdAt || sale.invoiceDate || '')}
                                  </span>
                                </span>
                                {itemsSummary && (
                                  <>
                                    <span>•</span>
                                    <span className="text-gray-600">{itemsSummary}</span>
                                  </>
                                )}
                              </div>

                              {isDomicilio &&
                                (sale.deliveryAddress ||
                                  sale.deliveryReference ||
                                  sale.deliveryDriverName) && (
                                  <div className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 space-y-0.5">
                                    {sale.deliveryAddress && (
                                      <p>
                                        <strong className="text-gray-800">Dirección:</strong>{' '}
                                        {sale.deliveryAddress}
                                      </p>
                                    )}
                                    {sale.deliveryReference && (
                                      <p>
                                        <strong className="text-gray-800">Referencia:</strong>{' '}
                                        {sale.deliveryReference}
                                      </p>
                                    )}
                                    {sale.deliveryDriverName && (
                                      <p>
                                        <strong className="text-gray-800">Repartidor:</strong>{' '}
                                        {sale.deliveryDriverName}
                                      </p>
                                    )}
                                  </div>
                                )}
                            </div>

                            <div className="text-right sm:self-center shrink-0">
                              <div className="font-bold font-mono text-gray-900 text-sm">
                                {formatCurrency(Number(sale.total || 0))}
                              </div>
                              <div className="text-xs text-gray-500">Total cobrado</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 2. CRÉDITOS */}
                {activeTab === 'credits' && showCartera && (
                  <div className="space-y-2.5">
                    {creditAccounts.length === 0 ? (
                      <div className="py-10 text-center bg-gray-50/50 rounded-xl border border-gray-100 text-gray-400 space-y-1">
                        <Wallet size={26} className="mx-auto text-gray-300" />
                        <p className="text-xs font-semibold text-gray-600">
                          Todavía no tiene cuentas de crédito
                        </p>
                      </div>
                    ) : (
                      creditAccounts.map((acc: any) => {
                        const balance = Number(acc.balance ?? acc.currentBalance ?? 0);
                        return (
                          <div
                            key={acc.id}
                            className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-xs text-gray-900">
                                    {acc.sale?.invoiceNumber
                                      ? `Comprobante #${acc.sale.invoiceNumber}`
                                      : `Crédito #${acc.id.slice(-6)}`}
                                  </span>
                                  {balance <= 0.005 ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Saldada
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      Pendiente
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  Emisión: {formatManaguaDate(acc.createdAt || acc.sale?.createdAt)}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-xs text-gray-600 block uppercase">Saldo</span>
                                <span className="text-sm font-bold font-mono text-gray-900 whitespace-nowrap tabular-nums">
                                  {formatCurrency(balance)}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedCreditAccountIdForDetail(acc.id)}
                                className="h-9 px-3 rounded-lg border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                Ver detalle
                              </button>
                              {balance > 0.005 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedCreditAccountForPayment({
                                      ...acc,
                                      customer: {
                                        id: mergedCustomer.id,
                                        name: mergedCustomer.name,
                                        phone: mergedCustomer.phone ?? '',
                                      },
                                    })
                                  }
                                  className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Coins size={15} weight="bold" />
                                  <span>Abonar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 3. PEDIDOS (Solo con Delivery) */}
                {activeTab === 'orders' && isDeliveryActive && (
                  <div className="space-y-2.5">
                    {orders.length === 0 ? (
                      <div className="py-10 text-center bg-gray-50/50 rounded-xl border border-gray-100 text-gray-400 space-y-1">
                        <Package size={26} className="mx-auto text-gray-300" />
                        <p className="text-xs font-semibold text-gray-600">
                          Todavía no tiene pedidos registrados
                        </p>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div
                          key={order.id}
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="p-3 bg-white hover:bg-gray-50/80 rounded-xl border border-gray-100 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-900">
                                #{order.id.slice(0, 8)}
                              </span>
                              <StatusBadge status={order.status as any} />
                              {(order.originBusinessName ||
                                order.originBusinessClient?.name) && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  De:{' '}
                                  {order.originBusinessName ||
                                    order.originBusinessClient?.name}
                                </span>
                              )}
                            </div>
                            {order.destinationAddress && (
                              <p className="text-xs text-gray-600 truncate max-w-sm">
                                {order.destinationAddress}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-gray-900 block">
                              {formatCurrency(Number(order.deliveryFee || 0))}
                            </span>
                            <span className="text-xs text-brand-600 flex items-center gap-0.5 justify-end mt-1">
                              <span>Ver</span> <ArrowSquareOut size={12} />
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 4. CITAS (Solo con Citas) */}
                {activeTab === 'appointments' && showCitas && (
                  <div className="space-y-2.5">
                    {appointments.length === 0 ? (
                      <div className="py-10 text-center bg-gray-50/50 rounded-xl border border-gray-100 text-gray-400 space-y-1">
                        <CalendarCheck size={26} className="mx-auto text-gray-300" />
                        <p className="text-xs font-semibold text-gray-600">
                          Todavía no tiene citas registradas
                        </p>
                      </div>
                    ) : (
                      appointments.map((apt: any) => (
                        <div
                          key={apt.id}
                          className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-gray-800">
                              {apt.service?.name || 'Servicio de cita'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {apt.scheduledAt ? formatDateTime(apt.scheduledAt) : 'Sin fecha'}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {apt.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalle de Cuenta de Crédito */}
      <CreditAccountDetailModal
        accountId={selectedCreditAccountIdForDetail}
        isOpen={Boolean(selectedCreditAccountIdForDetail)}
        onClose={() => {
          setSelectedCreditAccountIdForDetail(null);
          refetchCustomerCredit();
        }}
      />

      {/* Modal de Registro de Abono */}
      {selectedCreditAccountForPayment && (
        <RegisterCreditPaymentModal
          isOpen={Boolean(selectedCreditAccountForPayment)}
          onClose={() => setSelectedCreditAccountForPayment(null)}
          account={selectedCreditAccountForPayment}
          onSuccess={() => {
            setSelectedCreditAccountForPayment(null);
            refetchCustomerCredit();
            queryClient.invalidateQueries({ queryKey: ['customer-history', customer.id] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
          }}
        />
      )}
    </>
  );
};
