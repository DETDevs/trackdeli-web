import React, { useState } from 'react';
import {
  Handshake,
  Plus,
  PencilSimple,
  WarningOctagon,
  Paperclip,
  Wrench,
  CheckCircle,
  Clock,
  Prohibit,
} from '@phosphor-icons/react';
import { Badge, BadgeVariant } from '../ui/Badge';
import { StatCard } from '../ui/StatCard';
import {
  CommercialEquipment,
  CommercialInstallmentStatus,
  CommercialPayment,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_TYPE_LABELS,
  PAYMENT_KIND_LABELS,
  SALE_MODALITY_LABELS,
  useCommercial,
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
  'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap';

export const BusinessCommercialSection: React.FC<Props> = ({ businessId, businessName }) => {
  const { data, isLoading, isError } = useCommercial(businessId);

  const [agreementOpen, setAgreementOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<CommercialPayment | null>(null);
  const [equipmentModal, setEquipmentModal] = useState<{ open: boolean; item: CommercialEquipment | null }>({
    open: false,
    item: null,
  });

  const header = (actions?: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
          <Handshake size={18} weight="duotone" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Acuerdo comercial</h3>
          <p className="text-xs text-gray-500">Cómo se vendió, qué pagó, qué se entregó y el mantenimiento</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
        {header()}
        <p className="text-xs text-gray-500">Cargando acuerdo comercial…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
        {header()}
        <p className="text-xs text-red-700">No se pudo cargar el acuerdo comercial.</p>
      </div>
    );
  }

  // ── Sin acuerdo ──
  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
        {header()}
        <div className="py-6 px-4 rounded-xl border border-dashed border-gray-200 text-center space-y-3">
          <p className="text-xs text-gray-500">Este negocio todavía no tiene un acuerdo comercial registrado.</p>
          <button
            type="button"
            onClick={() => setAgreementOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Crear acuerdo comercial</span>
          </button>
        </div>
        <CommercialAgreementModal
          isOpen={agreementOpen}
          onClose={() => setAgreementOpen(false)}
          businessId={businessId}
          businessName={businessName}
          existing={null}
        />
      </div>
    );
  }

  const { agreement, installments, payments, equipment, summary } = data;
  const isCredit = agreement.paymentType === 'CREDITO';
  const m = summary.maintenance;
  const equipmentSum = equipment
    .filter((e) => e.status !== 'RETIRADO')
    .reduce((acc, e) => acc + (e.price ?? 0), 0);
  const hasOverdue = summary.overdueInstallments > 0 || installments.some((i) => i.status === 'VENCIDA');

  const maintenanceText =
    m.status === 'INCLUIDO' && m.endsAt
      ? `Incluido hasta el ${formatDateShort(m.endsAt)}${
          m.daysLeft != null ? (m.daysLeft >= 0 ? ` (faltan ${m.daysLeft} días)` : ' (en gracia)') : ''
        }`
      : m.status === 'EN_COBRO'
      ? `En cobro: ${formatCurrency(m.feeNio, 'NIO')} al mes`
      : 'No aplica';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-xs space-y-5">
      {header(
        <>
          <button type="button" onClick={() => setAgreementOpen(true)} className={btnSecondary}>
            <PencilSimple size={14} />
            <span>Editar acuerdo</span>
          </button>
          {summary.balance > 0 && (
            <button
              type="button"
              onClick={() => setPaymentOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} weight="bold" />
              <span>Registrar pago</span>
            </button>
          )}
        </>,
      )}

      {/* Avisos */}
      {(summary.coverage.blocked || hasOverdue) && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900">
          <WarningOctagon size={20} weight="fill" className="shrink-0 text-red-600 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-sm">
              {summary.coverage.blocked ? 'Negocio bloqueado por cuota vencida' : 'Hay una cuota vencida'}
            </p>
            <p>
              {summary.overdueInstallments > 0
                ? `${summary.overdueInstallments} ${summary.overdueInstallments === 1 ? 'cuota vencida' : 'cuotas vencidas'} por ${formatCurrency(summary.overdueAmount)}. `
                : ''}
              {summary.coverage.blocked
                ? 'El negocio no puede operar hasta que se registre el pago.'
                : 'Registrá el pago antes de que termine la gracia.'}
            </p>
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total acordado" value={formatCurrency(agreement.totalPrice)} subtitle={SALE_MODALITY_LABELS[agreement.saleModality]} />
        <StatCard
          title="Pagado"
          value={formatCurrency(summary.totalPaid)}
          subtitle={agreement.status === 'LIQUIDADO' ? 'Acuerdo liquidado' : undefined}
        />
        <StatCard
          title="Saldo"
          value={<span className={summary.balance > 0 ? 'text-gray-900' : 'text-emerald-700'}>{formatCurrency(summary.balance)}</span>}
          subtitle={
            summary.nextInstallment
              ? `Próxima cuota: ${formatDateShort(summary.nextInstallment.dueDate)}`
              : summary.balance <= 0
              ? 'Sin saldo pendiente'
              : undefined
          }
        />
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-100 text-xs">
        <div>
          <dt className="text-gray-500">Modalidad</dt>
          <dd className="font-medium text-gray-900">{SALE_MODALITY_LABELS[agreement.saleModality]}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Forma de pago</dt>
          <dd className="font-medium text-gray-900">
            {isCredit
              ? `Crédito: ${formatCurrency(agreement.downPayment)} de adelanto y ${agreement.installmentsCount} ${agreement.installmentsCount === 1 ? 'cuota' : 'cuotas'}`
              : 'Contado'}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Activación</dt>
          <dd className="font-medium text-gray-900">{formatDateShort(agreement.activatedAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-500 flex items-center gap-1">
            <Wrench size={12} /> Mantenimiento
          </dt>
          <dd className={`font-medium ${m.status === 'EN_COBRO' ? 'text-amber-700' : 'text-gray-900'}`}>{maintenanceText}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Instalación</dt>
          <dd className="font-medium flex items-center gap-1">
            {agreement.installationDoneAt ? (
              <>
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span className="text-gray-900">Hecha el {formatDateShort(agreement.installationDoneAt)}</span>
              </>
            ) : (
              <>
                <Clock size={14} className="text-amber-600" />
                <span className="text-amber-700">Pendiente</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Capacitación</dt>
          <dd className="font-medium flex items-center gap-1">
            {agreement.trainingDoneAt ? (
              <>
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span className="text-gray-900">Hecha el {formatDateShort(agreement.trainingDoneAt)}</span>
              </>
            ) : (
              <>
                <Clock size={14} className="text-amber-600" />
                <span className="text-amber-700">Pendiente</span>
              </>
            )}
          </dd>
        </div>
      </dl>

      {/* Plan de cuotas */}
      {isCredit && installments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-700">Plan de cuotas</h4>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs text-left min-w-[520px]">
              <thead className="bg-gray-50/70 text-gray-500">
                <tr>
                  <th className="py-2 px-3 font-medium">Cuota</th>
                  <th className="py-2 px-3 font-medium">Vence</th>
                  <th className="py-2 px-3 font-medium text-right">Monto</th>
                  <th className="py-2 px-3 font-medium text-right">Abonado</th>
                  <th className="py-2 px-3 font-medium text-right">Pendiente</th>
                  <th className="py-2 px-3 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {installments.map((i) => {
                  const b = INSTALLMENT_BADGE[i.status];
                  return (
                    <tr key={i.id} className={i.status === 'VENCIDA' ? 'bg-red-50/60' : ''}>
                      <td className="py-2 px-3 font-medium text-gray-900">{i.installmentNumber}</td>
                      <td className={`py-2 px-3 whitespace-nowrap ${i.status === 'VENCIDA' ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>
                        {formatDateShort(i.dueDate)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(i.amount)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatCurrency(i.paidAmount)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(i.pendingAmount)}</td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant={b.variant}>{b.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de pagos */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700">Historial de pagos ({payments.length})</h4>
        {payments.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">Todavía no hay pagos registrados para este acuerdo.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs text-left min-w-[640px]">
              <thead className="bg-gray-50/70 text-gray-500">
                <tr>
                  <th className="py-2 px-3 font-medium">Fecha</th>
                  <th className="py-2 px-3 font-medium">Tipo</th>
                  <th className="py-2 px-3 font-medium text-right">Monto</th>
                  <th className="py-2 px-3 font-medium">Método</th>
                  <th className="py-2 px-3 font-medium">Referencia</th>
                  <th className="py-2 px-3 font-medium">Comprobante</th>
                  <th className="py-2 px-3 font-medium text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const voided = !!p.voidedAt;
                  const strike = voided ? 'line-through text-gray-400' : '';
                  return (
                    <tr key={p.id} className={voided ? 'bg-gray-50/60' : ''}>
                      <td className={`py-2 px-3 whitespace-nowrap align-top ${strike || 'text-gray-700'}`}>{formatDateShort(p.paidAt)}</td>
                      <td className="py-2 px-3 align-top">
                        <span className={strike || 'text-gray-900'}>{PAYMENT_KIND_LABELS[p.kind]}</span>
                        {voided && (
                          <p className="text-xs text-red-700 mt-0.5 no-underline">Anulado: {p.voidReason}</p>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right align-top whitespace-nowrap">
                        <span className={`font-mono font-semibold ${strike || 'text-gray-900'}`}>{formatCurrency(p.amount)}</span>
                        {p.paidAmountNio != null && (
                          <p className={`text-xs ${voided ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                            {formatCurrency(p.paidAmountNio, 'NIO')}
                            {p.exchangeRate ? ` a ${p.exchangeRate}` : ''}
                          </p>
                        )}
                      </td>
                      <td className={`py-2 px-3 align-top ${strike || 'text-gray-700'}`}>{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td>
                      <td className={`py-2 px-3 align-top ${strike || 'text-gray-700'}`}>{p.referenceNumber || '—'}</td>
                      <td className="py-2 px-3 align-top">
                        {p.paymentProofUrl ? (
                          <a
                            href={p.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
                          >
                            <Paperclip size={12} />
                            <span>{p.paymentProofUrl.toLowerCase().endsWith('.pdf') ? 'Ver PDF' : 'Ver imagen'}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right align-top">
                        {!voided && (
                          <button
                            type="button"
                            onClick={() => setVoidTarget(p)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            <Prohibit size={12} />
                            <span>Anular</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Equipo entregado */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-gray-700">Equipo entregado ({equipment.length})</h4>
          <button type="button" onClick={() => setEquipmentModal({ open: true, item: null })} className={btnSecondary}>
            <Plus size={14} weight="bold" />
            <span>Agregar equipo</span>
          </button>
        </div>
        {equipment.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">No hay equipo registrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs text-left min-w-[640px]">
              <thead className="bg-gray-50/70 text-gray-500">
                <tr>
                  <th className="py-2 px-3 font-medium">Tipo</th>
                  <th className="py-2 px-3 font-medium">Marca y modelo</th>
                  <th className="py-2 px-3 font-medium">Serie</th>
                  <th className="py-2 px-3 font-medium text-right">Precio</th>
                  <th className="py-2 px-3 font-medium">Estado</th>
                  <th className="py-2 px-3 font-medium">Entrega</th>
                  <th className="py-2 px-3 font-medium text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.map((e) => (
                  <tr key={e.id} className={e.status === 'RETIRADO' ? 'text-gray-400' : 'text-gray-700'}>
                    <td className="py-2 px-3">{EQUIPMENT_TYPE_LABELS[e.equipmentType]}</td>
                    <td className="py-2 px-3">
                      {e.brand} {e.model}
                    </td>
                    <td className="py-2 px-3 font-mono">{e.serialNumber || '—'}</td>
                    <td className="py-2 px-3 text-right font-mono">{e.price != null ? formatCurrency(e.price) : '—'}</td>
                    <td className="py-2 px-3">
                      <Badge variant={e.status === 'ENTREGADO' ? 'success' : e.status === 'RETIRADO' ? 'neutral' : 'warning'}>
                        {EQUIPMENT_STATUS_LABELS[e.status]}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{e.deliveredAt ? formatDateShort(e.deliveredAt) : '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEquipmentModal({ open: true, item: e })}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
                      >
                        <PencilSimple size={12} />
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-1 sm:gap-6 text-xs text-gray-600 pt-1">
          <span>
            Suma de los equipos (sin retirados): <strong className="font-mono text-gray-900">{formatCurrency(equipmentSum)}</strong>
          </span>
          <span>
            Total acordado: <strong className="font-mono text-gray-900">{formatCurrency(agreement.totalPrice)}</strong>
          </span>
        </div>
      </div>

      <CommercialAgreementModal
        isOpen={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        businessId={businessId}
        businessName={businessName}
        existing={data}
      />
      <CommercialPaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        businessId={businessId}
        businessName={businessName}
        data={data}
      />
      <VoidCommercialPaymentModal
        isOpen={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        businessId={businessId}
        payment={voidTarget}
      />
      <CommercialEquipmentModal
        isOpen={equipmentModal.open}
        onClose={() => setEquipmentModal({ open: false, item: null })}
        businessId={businessId}
        agreementId={agreement.id}
        equipment={equipmentModal.item}
      />
    </div>
  );
};

