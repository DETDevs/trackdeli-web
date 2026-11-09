import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'api-client';
import { toast } from 'react-hot-toast';
import {
  CashRegister,
  CheckCircle,
  CircleNotch,
  Info,
} from '@phosphor-icons/react';

export interface PosPoliciesResponse {
  businessId: string;
  cashCloseDiscrepancyPolicy?: 'AUTORIZACION' | 'LIBRE';
  cashCloseTolerance?: number;
  cashCloseMaxRecounts?: number;
  blindCashClose?: boolean;
  requireOpenShiftToSell?: boolean;
  [key: string]: any;
}

export const CashClosePoliciesSection: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: policies, isLoading, isError } = useQuery<PosPoliciesResponse>({
    queryKey: ['pos', 'policies'],
    queryFn: async () => {
      const res = await apiClient.get<PosPoliciesResponse>('/pos/policies');
      return res.data;
    },
    staleTime: 30000,
  });

  const [requireOpenShiftToSell, setRequireOpenShiftToSell] = useState<boolean>(true);
  const [discrepancyPolicy, setDiscrepancyPolicy] = useState<'AUTORIZACION' | 'LIBRE'>('AUTORIZACION');
  const [tolerance, setTolerance] = useState<number>(0);
  const [maxRecounts, setMaxRecounts] = useState<number>(1);

  useEffect(() => {
    if (policies) {
      setRequireOpenShiftToSell(policies.requireOpenShiftToSell !== false);
      setDiscrepancyPolicy(policies.cashCloseDiscrepancyPolicy === 'LIBRE' ? 'LIBRE' : 'AUTORIZACION');
      setTolerance(typeof policies.cashCloseTolerance === 'number' ? policies.cashCloseTolerance : 0);
      setMaxRecounts(typeof policies.cashCloseMaxRecounts === 'number' ? policies.cashCloseMaxRecounts : 1);
    }
  }, [policies]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      requireOpenShiftToSell: boolean;
      cashCloseDiscrepancyPolicy: 'AUTORIZACION' | 'LIBRE';
      cashCloseTolerance: number;
      cashCloseMaxRecounts: number;
    }) => {
      const res = await apiClient.patch('/pos/policies', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'policies'] });
      toast.success('Políticas de caja actualizadas');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al actualizar las políticas';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      requireOpenShiftToSell,
      cashCloseDiscrepancyPolicy: discrepancyPolicy,
      cashCloseTolerance: Number(tolerance) || 0,
      cashCloseMaxRecounts: Number(maxRecounts) || 0,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-12">
        <CircleNotch size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 text-red-600 text-xs">
        <p className="font-semibold">No se pudieron cargar las políticas de caja.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div className="flex items-center gap-2">
        <CashRegister size={20} className="text-gray-900" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Políticas de Caja y Cierre de Turno
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Configura la obligatoriedad de turno y la gestión de descuadres en el punto de venta.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Política de Apertura de Caja Obligatoria (251a / 251b) */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requireOpenShiftToSell}
              onChange={(e) => setRequireOpenShiftToSell(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-gray-900 block text-xs">
                Exigir abrir caja para vender.
              </span>
              <span className="text-gray-600 block mt-0.5 leading-relaxed text-xs">
                Si lo apagás, se puede vender sin turno; esas ventas no aparecen en los cierres de caja.
              </span>
            </div>
          </label>
        </div>

        {/* 2. Política de Descuadre */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Cierre con descuadre
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDiscrepancyPolicy('AUTORIZACION')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[44px] ${
                discrepancyPolicy === 'AUTORIZACION'
                  ? 'border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900 shadow-2xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs">Requiere autorización</span>
                {discrepancyPolicy === 'AUTORIZACION' && (
                  <CheckCircle size={16} weight="fill" className="text-gray-900" />
                )}
              </div>
              <p className="text-xs text-gray-500">
                Si el conteo no coincide, el cajero vuelve a contar y después necesita el PIN de un encargado para cerrar la caja.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDiscrepancyPolicy('LIBRE')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[44px] ${
                discrepancyPolicy === 'LIBRE'
                  ? 'border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900 shadow-2xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs">Cierre libre</span>
                {discrepancyPolicy === 'LIBRE' && (
                  <CheckCircle size={16} weight="fill" className="text-gray-900" />
                )}
              </div>
              <p className="text-xs text-gray-500">
                Permite al cajero cerrar la caja aunque haya descuadre, registrando la diferencia sin exigir PIN de encargado.
              </p>
            </button>
          </div>
        </div>

        {/* 3. Tolerancia y Reconteos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Tolerancia en C$ */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Tolerancia permitida (C$)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-gray-500 font-mono">
                C$
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={tolerance}
                onChange={(e) => setTolerance(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors min-h-[44px]"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Diferencia máxima aceptada sin exigir autorización de encargado (0 = cuadre exacto estricto).
            </p>
          </div>

          {/* Reconteos permitidos */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Reconteos permitidos
            </label>
            <select
              value={maxRecounts}
              onChange={(e) => setMaxRecounts(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors cursor-pointer bg-white min-h-[44px]"
            >
              <option value="0">0 (Sin reconteo adicional)</option>
              <option value="1">1 reconteo (Recomendado)</option>
              <option value="2">2 reconteos</option>
              <option value="3">3 reconteos</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Intentos que tiene el cajero para volver a contar el dinero antes de requerir la autorización del encargado.
            </p>
          </div>
        </div>

        {/* Mensaje de ayuda explicativo */}
        <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            Si el conteo no coincide con lo esperado y supera la tolerancia, el cajero deberá ingresar el PIN de un encargado para registrar el cierre.
          </p>
        </div>

        {/* Botón de Guardar */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {updateMutation.isPending && (
              <CircleNotch size={14} className="animate-spin" />
            )}
            <span>Guardar políticas de caja</span>
          </button>
        </div>
      </form>
    </div>
  );
};
