import React, { useState, useEffect } from 'react';
import {
  CalendarBlank,
  CurrencyDollar,
  FileImage,
  FloppyDisk,
  WarningCircle,
  X,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  MembershipItem,
  useUpdateMembership,
  useUploadPaymentProof,
} from '../../hooks/useMemberships';
import { parseDateClean } from '../../utils/membershipDates';
import { format, addMonths } from 'date-fns';

interface EditMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  membership: MembershipItem | null;
  businessId: string;
  businessName: string;
}

export const EditMembershipModal: React.FC<EditMembershipModalProps> = ({
  isOpen,
  onClose,
  membership,
  businessId,
  businessName,
}) => {
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [paidAtStr, setPaidAtStr] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFERENCIA');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateMutation = useUpdateMembership(businessId);
  const uploadProofMutation = useUploadPaymentProof();

  useEffect(() => {
    if (!membership || !isOpen) {
      setProofFile(null);
      setProofPreview(null);
      setErrorMsg(null);
      return;
    }

    const sDate = parseDateClean(membership.startDate);
    const eDate = parseDateClean(membership.endDate);
    const pDate = parseDateClean(membership.paidAt) || sDate || new Date();

    setStartDateStr(sDate ? format(sDate, 'yyyy-MM-dd') : '');
    setEndDateStr(eDate ? format(eDate, 'yyyy-MM-dd') : '');
    setPaidAtStr(pDate ? format(pDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

    const numAmt = typeof membership.amount === 'number'
      ? membership.amount
      : parseFloat(String(membership.amount || '0')) || 0;
    setAmount(numAmt);
    setCurrency(membership.currency || 'USD');
    setPaymentMethod(membership.paymentMethod || 'TRANSFERENCIA');
    setNotes(membership.notes || '');
    setProofFile(null);
    setProofPreview(null);
    setErrorMsg(null);
  }, [membership, isOpen]);

  if (!membership) return null;

  const handleSetToday = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    setStartDateStr(todayStr);
    setPaidAtStr(todayStr);

    const nextM = addMonths(today, 1);
    setEndDateStr(format(nextM, 'yyyy-MM-dd'));
  };

  const handleStartDateChange = (val: string) => {
    setStartDateStr(val);
    if (val) {
      const parsed = parseDateClean(val);
      if (parsed) {
        const nextM = addMonths(parsed, 1);
        setEndDateStr(format(nextM, 'yyyy-MM-dd'));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('El comprobante no debe superar los 5 MB.');
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!startDateStr || !endDateStr) {
      setErrorMsg('Las fechas de inicio y vencimiento son obligatorias.');
      return;
    }

    const sDate = new Date(`${startDateStr}T12:00:00.000Z`);
    const eDate = new Date(`${endDateStr}T12:00:00.000Z`);

    if (eDate <= sDate) {
      setErrorMsg('La fecha de vencimiento debe ser posterior a la fecha de inicio.');
      return;
    }

    if (amount < 0) {
      setErrorMsg('El monto no puede ser negativo.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: membership.id,
        data: {
          startDate: sDate.toISOString(),
          endDate: eDate.toISOString(),
          paidAt: paidAtStr ? new Date(`${paidAtStr}T12:00:00.000Z`).toISOString() : undefined,
          amount,
          currency,
          paymentMethod,
          notes: notes.trim() || undefined,
        },
      });

      if (proofFile) {
        await uploadProofMutation.mutateAsync({
          id: membership.id,
          file: proofFile,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Error al guardar los cambios de la membresía.'
      );
    }
  };

  const isSaving = updateMutation.isPending || uploadProofMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Membresía"
      subtitle={`Negocio: ${businessName}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <WarningCircle size={16} className="text-red-500 shrink-0 mt-0.5" weight="bold" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Banner de ayuda rápida */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
          <div>
            <p className="font-semibold">¿Ajustar período a partir de hoy?</p>
            <p className="text-blue-700 text-[11px]">
              Si diste prueba gratis y el pago oficial es hoy, tocá este botón para cambiar automáticamente el período al mes en curso.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSetToday}
            className="shrink-0 h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowClockwise size={14} weight="bold" />
            <span>Iniciar hoy</span>
          </button>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <CalendarBlank size={14} className="text-gray-500" />
              Fecha de Inicio *
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-black focus:outline-none bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <CalendarBlank size={14} className="text-gray-500" />
              Fecha de Vencimiento *
            </label>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-black focus:outline-none bg-white"
              required
            />
          </div>
        </div>

        {/* Pago y fecha de cobro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <CurrencyDollar size={14} className="text-gray-500" />
              Monto Pagado
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full h-11 px-3 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-black focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Moneda
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-black focus:outline-none bg-white"
            >
              <option value="USD">USD ($)</option>
              <option value="NIO">NIO (C$)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Fecha de Pago
            </label>
            <input
              type="date"
              value={paidAtStr}
              onChange={(e) => setPaidAtStr(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-black focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Método de Pago
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full h-11 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-black focus:outline-none bg-white"
          >
            <option value="TRANSFERENCIA">Transferencia bancaria</option>
            <option value="BAC">BAC Credomatic</option>
            <option value="BANPRO">Banpro</option>
            <option value="LAFISE">Lafise</option>
            <option value="FICOHSA">Ficohsa</option>
            <option value="BDF">BDF</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta de crédito/débito</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        {/* Comprobante de pago */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <FileImage size={14} className="text-gray-500" />
              Comprobante de Pago
            </span>
            {membership.paymentProofUrl && !proofPreview && (
              <a
                href={membership.paymentProofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline"
              >
                Ver comprobante actual ↗
              </a>
            )}
          </label>
          <div className="border border-dashed border-gray-300 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3 bg-gray-50/60">
            {proofPreview ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-white">
                <img
                  src={proofPreview}
                  alt="Vista previa"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProofFile(null);
                    setProofPreview(null);
                  }}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                  title="Quitar"
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            ) : null}
            <div className="flex-1 w-full text-center sm:text-left">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                PNG, JPG o WEBP (máx. 5 MB)
              </p>
            </div>
          </div>
        </div>

        {/* Notas internas */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Notas internas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: Prueba gratis del 5 al 9 nov. Primer mes oficial pagado el 9 nov."
            className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-black focus:outline-none bg-white resize-none"
          />
        </div>

        {/* Botones de acción */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-11 min-h-[44px] px-5 rounded-xl text-xs font-semibold text-white bg-black hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {isSaving ? (
              <span>Guardando...</span>
            ) : (
              <>
                <FloppyDisk size={15} weight="bold" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
