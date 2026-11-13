import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getPosPolicies,
  updatePosPolicies,
  getPosBanks,
  createPosBank,
  updatePosBank,
  deletePosBank,
  getMyBusiness,
  type PosPoliciesData,
  type PosBankItem,
} from 'api-client';
import {
  Receipt,
  ArrowCounterClockwise,
  Vault,
  Package,
  CurrencyCircleDollar,
  Buildings,
  Plus,
  PencilSimple,
  Trash,
  CircleNotch,
  Warning,
  FloppyDisk,
  HandCoins,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../store/auth.store';
import { useMyProducts } from '../../hooks/useMyProducts';

const ALL_PAYMENT_METHODS = [
  { id: 'EFECTIVO', label: 'Efectivo', description: 'Moneda de curso legal (siempre obligatorio).' },
  { id: 'TARJETA', label: 'Tarjeta de Débito / Crédito', description: 'Terminal punto de venta / POS bancario.' },
  { id: 'TRANSFERENCIA', label: 'Transferencia Bancaria', description: 'Transferencia directa o ACH.' },
  { id: 'CREDITO', label: 'Crédito / Cuenta Corriente', description: 'Venta al fiado con saldo a cobrar a clientes registrados.' },
  { id: 'OTRO', label: 'Otro / Cheque / Bono', description: 'Otros medios de pago autorizados.' },
];

interface SensitivePolicyWarning {
  key: keyof PosPoliciesData;
  title: string;
  warning: string;
  newValue: boolean;
}

interface PoliciesSettingsTabProps {
  isReadOnly?: boolean;
}

export const PoliciesSettingsTab: React.FC<PoliciesSettingsTabProps> = ({ isReadOnly = false }) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: productsData } = useMyProducts();

  const hasCarteraCobro = Boolean(
    (user as any)?.business?.hasCarteraCobro || productsData?.products?.CARTERA_COBRO
  );

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 60000,
  });

  const { data: serverPolicies, isLoading } = useQuery<PosPoliciesData>({
    queryKey: ['pos', 'policies'],
    queryFn: () => getPosPolicies(),
  });

  const { data: banks = [], refetch: refetchBanks } = useQuery<PosBankItem[]>({
    queryKey: ['pos', 'banks'],
    queryFn: () => getPosBanks(),
  });

  const [draft, setDraft] = useState<PosPoliciesData | null>(null);
  const [pendingSensitiveChange, setPendingSensitiveChange] = useState<SensitivePolicyWarning | null>(null);

  // Bank modal state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<PosBankItem | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankOrder, setBankOrder] = useState<number>(0);

  useEffect(() => {
    if (serverPolicies) {
      setDraft({ ...serverPolicies });
    }
  }, [serverPolicies]);

  const hasUnsavedChanges = useMemo(() => {
    if (!serverPolicies || !draft) return false;
    return JSON.stringify(serverPolicies) !== JSON.stringify(draft);
  }, [serverPolicies, draft]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<PosPoliciesData>) => updatePosPolicies(payload),
    onSuccess: (saved) => {
      toast.success('Políticas guardadas correctamente');
      setDraft({ ...saved });
      queryClient.setQueryData(['pos', 'policies'], saved);
      queryClient.invalidateQueries({ queryKey: ['pos', 'policies'] });
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al guardar las políticas';
      toast.error(msg);
      // Revert draft to server state if rejected
      if (serverPolicies) {
        setDraft({ ...serverPolicies });
      }
    },
  });

  const bankMutation = useMutation({
    mutationFn: async (payload: { id?: string; name: string; code?: string; order?: number }) => {
      if (payload.id) {
        return updatePosBank(payload.id, {
          name: payload.name,
          code: payload.code,
          order: payload.order,
        });
      }
      return createPosBank({
        name: payload.name,
        code: payload.code,
        order: payload.order,
      });
    },
    onSuccess: () => {
      toast.success(editingBank ? 'Banco actualizado' : 'Banco creado');
      setIsBankModalOpen(false);
      refetchBanks();
      queryClient.invalidateQueries({ queryKey: ['pos', 'banks'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al guardar banco';
      toast.error(msg);
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: (id: string) => deletePosBank(id),
    onSuccess: () => {
      toast.success('Banco eliminado');
      refetchBanks();
      queryClient.invalidateQueries({ queryKey: ['pos', 'banks'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al eliminar banco';
      toast.error(msg);
    },
  });

  const handleToggle = (key: keyof PosPoliciesData, _label?: string) => {
    if (isReadOnly || !draft) return;
    const current = Boolean(draft[key]);
    const next = !current;

    if (key === 'allowNegativeStock' && next) {
      setPendingSensitiveChange({
        key,
        title: 'Permitir stock en negativo',
        warning:
          'Activar ventas con inventario negativo puede generar descuadres contables y dificultar el control de existencias.',
        newValue: true,
      });
      return;
    }

    if (key === 'priceOverrideEnabled' && next) {
      setPendingSensitiveChange({
        key,
        title: 'Modificación libre de precios en caja',
        warning:
          'Permitir cambiar precios en el cobro permite a los cajeros alterar el valor unitario de cualquier producto sin autorización previa.',
        newValue: true,
      });
      return;
    }

    setDraft({ ...draft, [key]: next });
  };

  const handleConfirmSensitive = () => {
    if (!pendingSensitiveChange || !draft) return;
    setDraft({
      ...draft,
      [pendingSensitiveChange.key]: pendingSensitiveChange.newValue,
    });
    setPendingSensitiveChange(null);
  };

  const handlePaymentMethodToggle = (methodId: string) => {
    if (isReadOnly || !draft || methodId === 'EFECTIVO') return;
    const currentList = (draft.paymentMethodsEnabled || 'EFECTIVO,TARJETA,TRANSFERENCIA')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let nextList: string[];
    if (currentList.includes(methodId)) {
      nextList = currentList.filter((m) => m !== methodId);
    } else {
      nextList = [...currentList, methodId];
    }
    if (!nextList.includes('EFECTIVO')) {
      nextList.unshift('EFECTIVO');
    }
    setDraft({
      ...draft,
      paymentMethodsEnabled: nextList.join(','),
    });
  };

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !draft) return;
    saveMutation.mutate(draft);
  };

  const openCreateBank = () => {
    setEditingBank(null);
    setBankName('');
    setBankCode('');
    setBankOrder(banks.length + 1);
    setIsBankModalOpen(true);
  };

  const openEditBank = (bank: PosBankItem) => {
    setEditingBank(bank);
    setBankName(bank.name);
    setBankCode(bank.code || '');
    setBankOrder(bank.order || 0);
    setIsBankModalOpen(true);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) {
      toast.error('El nombre del banco es obligatorio');
      return;
    }
    bankMutation.mutate({
      id: editingBank?.id,
      name: bankName.trim(),
      code: bankCode.trim() || undefined,
      order: bankOrder,
    });
  };

  if (isLoading || !draft) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 bg-gray-100 rounded-2xl" />
        <div className="h-44 bg-gray-100 rounded-2xl" />
        <div className="h-44 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const enabledMethods = (draft.paymentMethodsEnabled || 'EFECTIVO,TARJETA,TRANSFERENCIA')
    .split(',')
    .map((s) => s.trim());

  const businessVertical = (business as any)?.tracksBatches
    ? 'FARMACIA'
    : String(
        (business as any)?.posVertical || (user as any)?.business?.posVertical || 'RETAIL',
      ).toUpperCase();
  const salonProfile = String(
    (business as any)?.salonProfile || (user as any)?.business?.salonProfile || 'RESTAURANTE',
  ).toUpperCase();
  const showTipsCard =
    (businessVertical === 'RESTAURANTE' && salonProfile !== 'TALLER') ||
    businessVertical === 'BAR' ||
    salonProfile === 'BAR' ||
    Boolean(draft.tipEnabled);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Políticas del negocio</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Reglas operativas de venta, turnos de caja, métodos de pago, devoluciones e inventario.
          </p>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={handleSavePolicies}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {saveMutation.isPending ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <FloppyDisk size={14} />
            )}
            <span>{saveMutation.isPending ? 'Guardando...' : 'Guardar políticas'}</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSavePolicies} className="space-y-6">
        {/* 1. Ventas y Cobro */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Receipt size={20} className="text-gray-700" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Ventas y Cobro
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Exigir turno de caja para vender */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Exigir turno de caja abierto para vender
                </span>
                <p className="text-xs text-gray-500">
                  Bloquea las ventas si no hay un turno de caja iniciado en la sucursal.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={draft.requireOpenShiftToSell !== false}
                  onChange={() => handleToggle('requireOpenShiftToSell', 'Exigir turno')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Permitir modificar precios al cobrar */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-800 block">
                    Permitir modificar precios al cobrar
                  </span>
                  {draft.priceOverrideEnabled && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Sensible
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Permite editar el precio unitario del producto en la pantalla de cobro.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.priceOverrideEnabled)}
                  onChange={() => handleToggle('priceOverrideEnabled', 'Modificar precios')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Permitir descuentos en caja */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Permitir descuentos en el cobro
                </span>
                <p className="text-xs text-gray-500">
                  Habilita el botón de descuento general o por producto al registrar ventas.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.discountsEnabled)}
                  onChange={() => handleToggle('discountsEnabled', 'Descuentos')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Límite de descuento para cajeros */}
            {draft.discountsEnabled && (
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-gray-800 block">
                    Límite máximo de descuento para cajeros (%)
                  </span>
                  <p className="text-xs text-gray-500">
                    Descuentos superiores requieren autorización de encargado con PIN.
                  </p>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={isReadOnly}
                    value={draft.cashierMaxDiscountPercent ?? 10}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        cashierMaxDiscountPercent: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs py-1.5 px-3 border border-gray-200 rounded-xl text-right font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Devoluciones y Anulaciones */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <ArrowCounterClockwise size={20} className="text-gray-700" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Devoluciones y Anulaciones
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Permitir devoluciones */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Permitir devoluciones de ventas
                </span>
                <p className="text-xs text-gray-500">
                  Habilita el registro de devoluciones parciales o totales de comprobantes.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.returnsEnabled)}
                  onChange={() => handleToggle('returnsEnabled', 'Devoluciones')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Devoluciones requieren aprobación */}
            {draft.returnsEnabled && (
              <>
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-gray-800 block">
                      Devoluciones requieren aprobación de encargado
                    </span>
                    <p className="text-xs text-gray-500">
                      El cajero deberá ingresar credenciales de encargado para procesar la devolución.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={Boolean(draft.returnsRequireApproval)}
                      onChange={() => handleToggle('returnsRequireApproval', 'Aprobación devolución')}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-gray-800 block">
                      Días máximos permitidos para devoluciones
                    </span>
                    <p className="text-xs text-gray-500">
                      Plazo máximo tras la venta para aceptar devolución de mercadería.
                    </p>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      disabled={isReadOnly}
                      value={draft.returnsMaxDays ?? 30}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          returnsMaxDays: Number(e.target.value) || 30,
                        })
                      }
                      className="w-full text-xs py-1.5 px-3 border border-gray-200 rounded-xl text-right font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Anulación de ventas completadas */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Permitir anular ventas completadas
                </span>
                <p className="text-xs text-gray-500">
                  Permite anular una venta ya cobrada para reintegrar dinero y revertir inventario.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.voidsCompletedEnabled)}
                  onChange={() => handleToggle('voidsCompletedEnabled', 'Anulaciones')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {draft.voidsCompletedEnabled && (
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-gray-800 block">
                    Anulaciones requieren aprobación de encargado
                  </span>
                  <p className="text-xs text-gray-500">
                    Se exige PIN o contraseña de encargado antes de anular un comprobante.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={Boolean(draft.voidsRequireApproval)}
                    onChange={() => handleToggle('voidsRequireApproval', 'Aprobación anulación')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 3. Métodos de Pago y Cuentas Bancarias */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Buildings size={20} className="text-gray-700" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Métodos de Pago y Bancos
            </h3>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Métodos de pago aceptados en caja
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_PAYMENT_METHODS.map((pm) => {
                const isChecked = enabledMethods.includes(pm.id);
                const isMandatory = pm.id === 'EFECTIVO';
                return (
                  <div
                    key={pm.id}
                    onClick={() => !isMandatory && handlePaymentMethodToggle(pm.id)}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                      isChecked
                        ? 'border-gray-900 bg-gray-50/50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    } ${isMandatory ? 'opacity-90' : 'cursor-pointer'}`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{pm.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{pm.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      disabled={isReadOnly || isMandatory}
                      checked={isChecked}
                      onChange={() => handlePaymentMethodToggle(pm.id)}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 mt-0.5"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="divide-y divide-gray-100 pt-2 border-t border-gray-100">
            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-gray-800">
                Exigir número de referencia en pagos con tarjeta
              </span>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.requireReferenceCard)}
                  onChange={() => handleToggle('requireReferenceCard', 'Referencia tarjeta')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-gray-800">
                Exigir comprobante / referencia en transferencias
              </span>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.requireReferenceTransfer)}
                  onChange={() => handleToggle('requireReferenceTransfer', 'Referencia transferencia')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-gray-800">
                Exigir banco emisor / receptor en transferencias y tarjetas
              </span>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.requireBankCardTransfer)}
                  onChange={() => handleToggle('requireBankCardTransfer', 'Exigir banco')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Subsección: Cuentas Bancarias */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-gray-800">
                  Cuentas bancarias del negocio
                </h4>
                <p className="text-[11px] text-gray-500">
                  Bancos disponibles para transferencias y pagos con tarjeta.
                </p>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={openCreateBank}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus size={13} />
                  <span>Nuevo banco</span>
                </button>
              )}
            </div>

            {banks.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">
                No hay bancos registrados. Registrá los bancos donde recibís pagos.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {banks.map((bank) => (
                  <div
                    key={bank.id}
                    className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-gray-900">{bank.name}</span>
                      {bank.code && (
                        <span className="ml-2 font-mono text-[11px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                          {bank.code}
                        </span>
                      )}
                    </div>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditBank(bank)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 rounded-md hover:bg-white"
                        >
                          <PencilSimple size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBankMutation.mutate(bank.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Cierre de Caja */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Vault size={20} className="text-gray-700" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Cierre de Caja y Arqueo
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Cierre de caja ciego
                </span>
                <p className="text-xs text-gray-500">
                  El cajero no ve el saldo esperado por el sistema al realizar el arqueo.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.blindCashClose)}
                  onChange={() => handleToggle('blindCashClose', 'Cierre ciego')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Política ante discrepancia de efectivo
                </span>
                <p className="text-xs text-gray-500">
                  Acción a seguir si el conteo difiere del saldo esperado.
                </p>
              </div>
              <select
                disabled={isReadOnly}
                value={draft.cashCloseDiscrepancyPolicy || 'AUTORIZACION'}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    cashCloseDiscrepancyPolicy: e.target.value as any,
                  })
                }
                className="text-xs py-1.5 px-3 border border-gray-200 rounded-xl bg-white"
              >
                <option value="AUTORIZACION">Exigir autorización de encargado</option>
                <option value="LIBRE">Permitir cierre con justificación</option>
              </select>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Tolerancia de diferencia de efectivo (C$)
                </span>
                <p className="text-xs text-gray-500">
                  Diferencias menores a este monto no activan la política de discrepancia.
                </p>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={isReadOnly}
                  value={draft.cashCloseTolerance ?? draft.cashDifferenceTolerance ?? 0}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      cashCloseTolerance: Number(e.target.value) || 0,
                      cashDifferenceTolerance: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs py-1.5 px-3 border border-gray-200 rounded-xl text-right font-mono"
                />
              </div>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Intentos máximos de reconteo
                </span>
                <p className="text-xs text-gray-500">
                  Límite de veces que el cajero puede reintentar el conteo de caja (1 a 5).
                </p>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  max="5"
                  disabled={isReadOnly}
                  value={draft.cashCloseMaxRecounts ?? 1}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      cashCloseMaxRecounts: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-full text-xs py-1.5 px-3 border border-gray-200 rounded-xl text-right font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Inventario */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Package size={20} className="text-gray-700" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Control de Inventario
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-800 block">
                    Permitir ventas con stock en negativo
                  </span>
                  {draft.allowNegativeStock && (
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Riesgo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Permite vender productos aunque no tengan existencias registradas.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.allowNegativeStock)}
                  onChange={() => handleToggle('allowNegativeStock', 'Stock negativo')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-800 block">
                  Ajustes manuales de inventario requieren aprobación
                </span>
                <p className="text-xs text-gray-500">
                  Entradas o salidas manuales de stock deben ser autorizadas por encargado.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(draft.inventoryAdjustRequireApproval)}
                  onChange={() => handleToggle('inventoryAdjustRequireApproval', 'Ajustes inventario')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* 6. Cartera / Crédito (Si el negocio maneja Cartera o crédito) */}
        {hasCarteraCobro && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <HandCoins size={20} className="text-gray-700" />
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Ventas al Crédito y Cartera de Cobro
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-gray-800 block">
                    Cobro de intereses en ventas al crédito
                  </span>
                  <p className="text-xs text-gray-500">
                    Aplica recargo o tasa de financiamiento sobre ventas a plazos.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={Boolean(draft.creditInterestEnabled)}
                    onChange={() => handleToggle('creditInterestEnabled', 'Intereses crédito')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {draft.creditInterestEnabled && (
                <>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-gray-800">
                      Tasa de interés / recargo (%)
                    </span>
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        disabled={isReadOnly}
                        value={draft.creditInterestRate ?? 0}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            creditInterestRate: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full text-xs py-1.5 px-3 border border-gray-200 rounded-xl text-right font-mono"
                      />
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-gray-800">
                      Número máximo de cuotas permitidas
                    </span>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        disabled={isReadOnly}
                        value={draft.creditMaxInstallments ?? 12}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            creditMaxInstallments: Number(e.target.value) || 12,
                          })
                        }
                        className="w-full text-xs py-1.5 px-3 border border-gray-200 rounded-xl text-right font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 7. Cobro Multimoneda (USD / NIO) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <CurrencyCircleDollar size={20} className="text-gray-700" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Cobro Multimoneda (USD / NIO)
            </h3>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-gray-800 block">
                Habilitar cobro multimoneda (Dólares USD)
              </span>
              <p className="text-xs text-gray-500">
                Permite cobrar en dólares estadounidenses y registrar cambio en córdobas o viceversa.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={Boolean(draft.multiCurrencyEnabled)}
                onChange={() => handleToggle('multiCurrencyEnabled', 'Multimoneda')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* 8. Propina voluntaria (Restaurante o bar) */}
        {showTipsCard && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <HandCoins size={20} className="text-gray-700" />
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Propina voluntaria
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-gray-800 block">
                    Ofrecer propina en el cobro
                  </span>
                  <p className="text-xs text-gray-500">
                    Permite registrar propinas voluntarias en mostrador separadas de ventas, IVA y ganancias.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={Boolean(draft.tipEnabled)}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        tipEnabled: !Boolean(draft.tipEnabled),
                        tipDefaultPercent:
                          !Boolean(draft.tipEnabled) && !draft.tipDefaultPercent
                            ? 10
                            : draft.tipDefaultPercent ?? 10,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {draft.tipEnabled && (
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="tip-default-percent-input"
                      className="text-xs font-medium text-gray-800 block"
                    >
                      Porcentaje sugerido (%)
                    </label>
                    <p className="text-xs text-gray-500">
                      Porcentaje rápido ofrecido al cajero al cobrar (entre 1 % y 30 %).
                    </p>
                  </div>
                  <div className="w-24 shrink-0">
                    <input
                      id="tip-default-percent-input"
                      type="number"
                      min="1"
                      max="30"
                      step="1"
                      disabled={isReadOnly}
                      value={draft.tipDefaultPercent ?? 10}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        const clamped = Number.isFinite(raw)
                          ? Math.min(30, Math.max(1, Math.round(raw)))
                          : 10;
                        setDraft({
                          ...draft,
                          tipDefaultPercent: clamped,
                        });
                      }}
                      className="w-full text-xs py-1.5 px-3 border border-gray-200 rounded-xl text-right font-mono min-h-[40px]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </form>

      {/* Modal: Advertencia de política sensible */}
      {pendingSensitiveChange && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-600">
              <Warning size={28} weight="fill" />
              <h3 className="text-sm font-semibold text-gray-900">
                {pendingSensitiveChange.title}
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {pendingSensitiveChange.warning}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingSensitiveChange(null)}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSensitive}
                className="px-4 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                Comprendo el riesgo, activar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Banco */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <h3 className="text-sm font-semibold text-gray-900">
              {editingBank ? 'Editar banco' : 'Registrar nuevo banco'}
            </h3>

            <form onSubmit={handleSaveBank} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre del banco *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. BAC Credomatic, BANPRO, LAFISE"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Código o sigla (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. BAC, BP, LAF"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl uppercase font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bankMutation.isPending}
                  className="px-4 py-2 text-xs font-medium bg-gray-900 hover:bg-black text-white rounded-xl"
                >
                  {bankMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
