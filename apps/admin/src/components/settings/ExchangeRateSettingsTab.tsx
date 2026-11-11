import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getPosExchangeRate,
  updatePosExchangeRate,
  getPosExchangeRateHistory,
} from 'api-client';
import {
  CurrencyCircleDollar,
  CheckCircle,
  CircleNotch,
} from '@phosphor-icons/react';

interface ExchangeRateSettingsTabProps {
  isReadOnly?: boolean;
}

export const ExchangeRateSettingsTab: React.FC<ExchangeRateSettingsTabProps> = ({
  isReadOnly = false,
}) => {
  const queryClient = useQueryClient();

  const { data: rateData } = useQuery({
    queryKey: ['pos', 'exchange-rate'],
    queryFn: () => getPosExchangeRate(),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['pos', 'exchange-rate', 'history'],
    queryFn: () => getPosExchangeRateHistory(),
  });

  const [officialRate, setOfficialRate] = useState<string>('');
  const [parallelRate, setParallelRate] = useState<string>('');

  useEffect(() => {
    if (rateData) {
      const off = rateData.officialRate ?? rateData.rate;
      if (off) {
        setOfficialRate(String(off));
      }
      if (rateData.parallelRate) {
        setParallelRate(String(rateData.parallelRate));
      }
    }
  }, [rateData]);

  const updateMutation = useMutation({
    mutationFn: (dto: { officialRate: number; parallelRate?: number }) =>
      updatePosExchangeRate(dto),
    onSuccess: () => {
      toast.success('Tasa de cambio actualizada');
      queryClient.invalidateQueries({ queryKey: ['pos', 'exchange-rate'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'exchange-rate', 'history'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al actualizar tasa de cambio';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const off = parseFloat(officialRate);
    if (isNaN(off) || off <= 0) {
      toast.error('Ingresá una tasa de cambio válida mayor a 0');
      return;
    }
    updateMutation.mutate({
      officialRate: off,
      parallelRate: parallelRate ? parseFloat(parallelRate) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Tasa de cambio (USD / NIO)</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Cotización oficial utilizada para calcular conversiones y vueltos en caja al cobrar en dólares.
        </p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <CurrencyCircleDollar size={20} className="text-emerald-600" />
          <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
            Cotización oficial vigente
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tasa oficial (C$ por 1 USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-gray-400">C$</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  disabled={isReadOnly}
                  value={officialRate}
                  onChange={(e) => setOfficialRate(e.target.value)}
                  placeholder="36.6243"
                  className="w-full text-xs py-2 pl-9 pr-3 border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tasa paralela / mercado (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-gray-400">C$</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  disabled={isReadOnly}
                  value={parallelRate}
                  onChange={(e) => setParallelRate(e.target.value)}
                  placeholder="36.7000"
                  className="w-full text-xs py-2 pl-9 pr-3 border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {updateMutation.isPending ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              <span>Guardar tasa de cambio</span>
            </button>
          )}
        </form>
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
          <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
            Historial de tasas de cambio
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 text-gray-400 text-[11px] uppercase">
                <tr>
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium text-right">Tasa oficial</th>
                  <th className="py-2 font-medium text-right">Tasa paralela</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-mono text-gray-700">
                {history.slice(0, 10).map((h: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-2 text-gray-500 font-sans">
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString('es-NI', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900">
                      C$ {Number(h.officialRate || h.rate || 0).toFixed(4)}
                    </td>
                    <td className="py-2 text-right text-gray-500">
                      {h.parallelRate ? `C$ ${Number(h.parallelRate).toFixed(4)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
