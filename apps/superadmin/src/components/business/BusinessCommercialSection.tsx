import React, { useState } from 'react';
import {
  Handshake,
  Plus,
  PencilSimple,
  WarningOctagon,
  Paperclip,
  Wrench,
  Check,
  X,
} from '@phosphor-icons/react';
import { Badge, BadgeVariant } from '../ui/Badge';
import { StatCard } from '../ui/StatCard';
import {
  CommercialEquipment,
  CommercialInstallmentStatus,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_TYPE_LABELS,
  PAYMENT_KIND_LABELS,
  useAccountStatement,
  useSaveCommercialEquipment,
} from '../../hooks/useCommercial';
import { formatCurrency, formatDateShort } from '../../utils/format';
import { CommercialAgreementModal } from '../modals/CommercialAgreementModal';
import { CommercialPaymentModal } from '../modals/CommercialPaymentModal';
import { VoidCommercialPaymentModal } from '../modals/VoidCommercialPaymentModal';
import { CommercialEquipmentModal } from '../modals/CommercialEquipmentModal';

interface Props {
  businessId: string;
  businessName: string;
}

const INSTALLMENT_BADGE: Record<CommercialInstallmentStatus, { label: string; variant: BadgeVariant }> = {
  PAGADA: { label: 'Pagada', variant: 'success' },
  PARCIAL: { label: 'Parcial', variant: 'warning' },
  PENDIENTE: { label: 'Pendiente', variant: 'neutral' },
  VENCIDA: { label: 'Vencida', variant: 'danger' },
};

const METHOD_LABELS: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  PAYPAL: 'PayPal',
  BINANCE: 'Binance',
  ALTA_INICIAL: 'Alta inicial',
  AUTOMATICO: 'Automático',
  OTRO: 'Otro',
};

const btnSecondary =
  'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap';

export const BusinessCommercialSection: React.FC<Props> = ({ businessId, businessName }) => {
  const { data: statement, isLoading, isError } = useAccountStatement(businessId);

  const [agreementOpen, setAgreementOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState<{
    open: boolean;
    initialKind?: any;
    initialInstallmentId?: string;
  }>({ open: false });
  const [voidTarget, setVoidTarget] = useState<any | null>(null);
  const [equipmentModal, setEquipmentModal] = useState<{ open: boolean; item: CommercialEquipment | null }>({
    open: false,
    item: null,
  });

  // Edición inline de número de serie
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [serialInput, setSerialInput] = useState('');
  const saveEquipmentMutation = useSaveCommercialEquipment(businessId);

  const handleStartEditSerial = (eq: CommercialEquipment) => {
    setEditingSerialId(eq.id);
    setSerialInput(eq.serialNumber || '');
  };

  const handleSaveSerial = (eq: CommercialEquipment) => {
    saveEquipmentMutation.mutate(
      {
        equipmentId: eq.id,
        input: {
          equipmentType: eq.equipmentType,
          brand: eq.brand,
          model: eq.model,
          serialNumber: serialInput.trim(),
          status: eq.status,
          price: eq.price ?? undefined,
        },
      },
      {
        onSuccess: () => setEditingSerialId(null),
      }
    );
  };

  const header = (actions?: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
          <Handshake size={18} weight="duotone" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Cuenta del cliente</h3>
          <p className="text-xs text-gray-500">Forma de venta, estado de pagos, cuotas y equipos entregados</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-2xs space-y-4">
        {header()}
        <p className="text-xs text-gray-500">Cargando estado de cuenta del cliente…</p>
      </div>
    );
  }

  if (isError || !statement) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-2xs space-y-4">
        {header()}
        <p className="text-xs text-rose-700">No se pudo cargar el estado de cuenta.</p>
      </div>
    );
  }

  const isMembership = statement.saleModality === 'MEMBRESIA';
  const isCredit = statement.paymentType === 'CREDITO';
  const m = statement.maintenance;
  const isBlocked = statement.billingStatus?.isBlocked || statement.billingStatus?.isCommercialBlocked;
  const installments = statement.installments || [];
  const pendingInstallments = statement.upcomingInstallments || [];
  const payments = statement.payments || [];
  const equipment = statement.equipment || [];

  const maintenanceText =
    m.status === 'INCLUIDO' && m.includedUntil
      ? `Incluido hasta el ${formatDateShort(m.includedUntil)}`
      : m.status === 'EN_COBRO'
      ? `Próximo cobro: C$ ${m.monthlyAmount || 555} NIO al mes`
      : 'No aplica';

  const saleModalityDisplay =
    statement.saleModality === 'MEMBRESIA'
      ? 'Membresía mensual'
      : statement.saleModality === 'SOLO_SISTEMA'
      ? 'Solo sistema (pago único)'
      : statement.saleModality === 'COMBO_COMPLETO'
      ? 'Combo completo'
      : statement.saleModality === 'COMBO_PARCIAL'
      ? 'Combo parcial'
      : statement.saleModality;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-2xs space-y-5">
      {header(
        <>
          {statement.agreementId && (
            <button
              type="button"
              onClick={() => setAgreementOpen(true)}
              className={btnSecondary}
            >
              <PencilSimple size={14} />
              <span>Editar acuerdo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setPaymentModalState({ open: true })}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <Plus size={14} weight="bold" />
            <span>Registrar pago</span>
          </button>
        </>
      )}

      {/* Alerta de bloqueo comercial o vencimiento */}
      {isBlocked && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
          <WarningOctagon size={20} weight="fill" className="shrink-0 text-rose-600 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-sm">Negocio bloqueado</p>
            <p>
              {statement.billingStatus?.blockMessage ||
                statement.billingStatus?.blockReason ||
                'Este negocio se encuentra bloqueado por cuota o mantenimiento vencido. Registrá el pago para desbloquearlo.'}
            </p>
          </div>
        </div>
      )}

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Total acordado"
          value={
            isMembership
              ? formatCurrency(statement.totalPaid, statement.currency)
              : formatCurrency(statement.totalPrice || 0, statement.currency)
          }
          subtitle={saleModalityDisplay}
        />
        <StatCard
          title="Pagado"
          value={
            <span className={statement.totalPaid > 0 ? 'text-emerald-700' : 'text-gray-900'}>
              {formatCurrency(statement.totalPaid, statement.currency)}
            </span>
          }
          subtitle={statement.balance <= 0 && !isMembership ? 'Acuerdo liquidado' : undefined}
        />
        <StatCard
          title="Saldo pendiente"
          value={
            <span className={statement.balance > 0 ? 'text-gray-900 font-bold' : 'text-emerald-700'}>
              {formatCurrency(statement.balance, statement.currency)}
            </span>
          }
          subtitle={
            pendingInstallments.length > 0
              ? `Próxima cuota: ${formatDateShort(pendingInstallments[0].dueDate)}`
              : statement.balance <= 0
              ? 'Sin saldo pendiente'
              : undefined
          }
        />
      </div>

      {/* Detalles del contrato */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50/60 border border-gray-100 text-xs">
        <div>
          <dt className="text-gray-500 font-medium">Forma de venta</dt>
          <dd className="font-bold text-gray-900 mt-0.5">{saleModalityDisplay}</dd>
        </div>
        <div>
          <dt className="text-gray-500 font-medium">Modalidad de pago</dt>
          <dd className="font-bold text-gray-900 mt-0.5">
            {isCredit
              ? `Crédito: prima ${formatCurrency(statement.downPayment, statement.currency)} y ${installments.length} cuotas`
              : isMembership
              ? 'Mensual'
              : 'Contado'}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 font-medium">Fecha de registro</dt>
          <dd className="font-bold text-gray-900 mt-0.5">{statement.saleDate || '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500 font-medium flex items-center gap-1">
            <Wrench size={13} />
            <span>Mantenimiento</span>
          </dt>
          <dd className={`font-bold mt-0.5 ${m.status === 'EN_COBRO' ? 'text-amber-800' : 'text-gray-900'}`}>
            {maintenanceText}
          </dd>
        </div>
      </dl>

      {/* Plan de cuotas (si es venta a crédito) */}
      {isCredit && installments.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Plan de cuotas ({installments.length})
            </h4>
            <span className="text-xs text-gray-500">
              {pendingInstallments.length === 0
                ? 'Todas las cuotas pagadas'
                : `${pendingInstallments.length} cuota(s) pendiente(s)`}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs text-left min-w-[540px]">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Cuota</th>
                  <th className="py-2.5 px-3 font-semibold">Vencimiento</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Abonado</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Pendiente</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {installments.map((inst) => {
                  const b = INSTALLMENT_BADGE[inst.status] || { label: inst.status, variant: 'neutral' };
                  const isPaid = inst.status === 'PAGADA';
                  return (
                    <tr key={inst.id} className={inst.status === 'VENCIDA' ? 'bg-rose-50/40' : ''}>
                      <td className="py-2.5 px-3 font-bold text-gray-900">Cuota #{inst.installmentNumber}</td>
                      <td className={`py-2.5 px-3 ${inst.status === 'VENCIDA' ? 'text-rose-700 font-bold' : 'text-gray-700'}`}>
                        {formatDateShort(inst.dueDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">
                        {formatCurrency(inst.amount, statement.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                        {formatCurrency(inst.paidAmount, statement.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-900">
                        {formatCurrency(inst.pendingAmount, statement.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={b.variant}>{b.label}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() =>
                              setPaymentModalState({
                                open: true,
                                initialKind: 'CUOTA',
                                initialInstallmentId: inst.id,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 cursor-pointer"
                          >
                            <span>Pagar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipos entregados */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Equipo entregado ({equipment.length})
            </h4>
          </div>
          {statement.agreementId && (
            <button
              type="button"
              onClick={() => setEquipmentModal({ open: true, item: null })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              <Plus size={13} weight="bold" />
              <span>Agregar pieza</span>
            </button>
          )}
        </div>

        {equipment.length === 0 ? (
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 text-center text-xs text-gray-500">
            No hay equipos entregados registrados para este negocio.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs text-left min-w-[560px]">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Pieza</th>
                  <th className="py-2.5 px-3 font-semibold">Marca / Modelo</th>
                  <th className="py-2.5 px-3 font-semibold">Número de serie</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {equipment.map((eq) => {
                  const isEditingSerial = editingSerialId === eq.id;
                  const typeLabel = EQUIPMENT_TYPE_LABELS[eq.equipmentType] || eq.equipmentType;
                  return (
                    <tr key={eq.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-gray-900 block">{eq.description || typeLabel}</span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-700">
                        {eq.brand} {eq.model ? `· ${eq.model}` : ''}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {isEditingSerial ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={serialInput}
                              onChange={(e) => setSerialInput(e.target.value)}
                              placeholder="N.º de serie"
                              className="h-7 px-2 border border-purple-300 rounded text-xs bg-white text-gray-900 w-36 font-mono"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSerial(eq)}
                              disabled={saveEquipmentMutation.isPending}
                              className="p-1 rounded bg-purple-700 text-white hover:bg-purple-800 cursor-pointer"
                              title="Guardar serie"
                            >
                              <Check size={12} weight="bold" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSerialId(null)}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 cursor-pointer"
                              title="Cancelar"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span className={eq.serialNumber ? 'text-gray-900 font-semibold' : 'text-gray-400 italic'}>
                              {eq.serialNumber || 'Sin serie registrada'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEditSerial(eq)}
                              className="opacity-0 group-hover:opacity-100 text-purple-700 hover:text-purple-900 p-0.5 cursor-pointer transition-opacity"
                              title="Editar número de serie"
                            >
                              <PencilSimple size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            eq.status === 'ENTREGADO'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : eq.status === 'RETIRADO'
                              ? 'bg-gray-100 text-gray-600 border border-gray-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              eq.status === 'ENTREGADO'
                                ? 'bg-emerald-500'
                                : eq.status === 'RETIRADO'
                                ? 'bg-gray-400'
                                : 'bg-amber-500'
                            }`}
                          />
                          {EQUIPMENT_STATUS_LABELS[eq.status] || eq.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEquipmentModal({ open: true, item: eq })}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                          title="Editar detalles del equipo"
                        >
                          <PencilSimple size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de pagos */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Historial de pagos ({payments.length})
          </h4>
        </div>

        {payments.length === 0 ? (
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 text-center text-xs text-gray-500">
            No hay pagos registrados para este negocio.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs text-left min-w-[540px]">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Fecha</th>
                  <th className="py-2.5 px-3 font-semibold">Concepto</th>
                  <th className="py-2.5 px-3 font-semibold">Método</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Comprobante</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {payments.map((p) => {
                  const voided = !!p.voidedAt;
                  const kindLabel =
                    PAYMENT_KIND_LABELS[p.kind as keyof typeof PAYMENT_KIND_LABELS] ||
                    (p.kind === 'MANTENIMIENTO'
                      ? 'Mantenimiento'
                      : p.kind === 'MEMBRESIA'
                      ? 'Membresía mensual'
                      : p.kind);

                  return (
                    <tr key={p.id} className={voided ? 'bg-gray-50/60 opacity-60' : 'hover:bg-gray-50/40 transition-colors'}>
                      <td className="py-2.5 px-3 font-medium text-gray-700 whitespace-nowrap">
                        {p.paidAt ? formatDateShort(p.paidAt) : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold text-gray-900 block ${voided ? 'line-through' : ''}`}>
                          {kindLabel}
                        </span>
                        {p.notes && <span className="text-[11px] text-gray-500 block truncate max-w-xs">{p.notes}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700">
                        {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                        {p.referenceNumber && <span className="text-[11px] text-gray-400 block font-mono">Ref: {p.referenceNumber}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        <span className={voided ? 'line-through text-gray-400' : 'text-emerald-700'}>
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.paymentProofUrl ? (
                          <a
                            href={p.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900"
                          >
                            <Paperclip size={13} />
                            <span>Ver</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {voided ? (
                          <span className="text-[11px] text-rose-600 font-semibold">Anulado</span>
                        ) : p.source === 'COMMERCIAL' ? (
                          <button
                            type="button"
                            onClick={() => setVoidTarget(p)}
                            className="text-[11px] text-gray-400 hover:text-rose-600 cursor-pointer"
                          >
                            Anular
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Acuerdo comercial */}
      {agreementOpen && (
        <CommercialAgreementModal
          isOpen={agreementOpen}
          onClose={() => setAgreementOpen(false)}
          businessId={businessId}
          businessName={businessName}
          existing={null}
        />
      )}

      {/* Modal: Registrar pago */}
      {paymentModalState.open && (
        <CommercialPaymentModal
          isOpen={paymentModalState.open}
          onClose={() => setPaymentModalState({ open: false })}
          businessId={businessId}
          businessName={businessName}
          data={statement}
          initialKind={paymentModalState.initialKind}
          initialInstallmentId={paymentModalState.initialInstallmentId}
        />
      )}

      {/* Modal: Equipo */}
      {equipmentModal.open && (
        <CommercialEquipmentModal
          isOpen={equipmentModal.open}
          onClose={() => setEquipmentModal({ open: false, item: null })}
          businessId={businessId}
          agreementId={statement.agreementId || ''}
          equipment={equipmentModal.item}
        />
      )}

      {/* Modal: Anular pago */}
      {voidTarget && (
        <VoidCommercialPaymentModal
          isOpen={!!voidTarget}
          onClose={() => setVoidTarget(null)}
          businessId={businessId}
          payment={voidTarget}
        />
      )}
    </div>
  );
};
