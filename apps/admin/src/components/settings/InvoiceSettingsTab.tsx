import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getMyBusiness,
  updateMyBusiness,
  getPosSettings,
  updatePosSettings,
  type PosSettingsData,
} from 'api-client';
import {
  Percent,
  Hash,
  Tag,
  Receipt,
  FloppyDisk,
  CircleNotch,
  ArrowRight,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../store/auth.store';

interface InvoiceSettingsTabProps {
  isReadOnly?: boolean;
  onNavigateToReceiptDesign?: () => void;
}

export const InvoiceSettingsTab: React.FC<InvoiceSettingsTabProps> = ({
  isReadOnly = false,
  onNavigateToReceiptDesign,
}) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

  const { data: posSettings, isLoading: isLoadingSettings } = useQuery<PosSettingsData>({
    queryKey: ['pos', 'settings'],
    queryFn: () => getPosSettings(),
  });

  const isListPriceEnabled = Boolean(
    (business as any)?.useListPrice ?? (user as any)?.business?.useListPrice ?? posSettings?.useListPrice
  );

  // Form states
  const [defaultMarkupPct, setDefaultMarkupPct] = useState<string>('');
  const [autoUpdatePriceOnPurchase, setAutoUpdatePriceOnPurchase] = useState<boolean>(false);
  const [invoicePrefix, setInvoicePrefix] = useState<string>('FAC-');
  const [taxEnabled, setTaxEnabled] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<string>('15');
  const [taxIncluded, setTaxIncluded] = useState<boolean>(false);
  const [taxName, setTaxName] = useState<string>('IVA');

  useEffect(() => {
    if (business) {
      const bAny = business as any;
      setDefaultMarkupPct(
        bAny.defaultMarkupPct !== undefined && bAny.defaultMarkupPct !== null
          ? String(bAny.defaultMarkupPct)
          : ''
      );
      setAutoUpdatePriceOnPurchase(Boolean(bAny.autoUpdatePriceOnPurchase));
    }
  }, [business]);

  useEffect(() => {
    if (posSettings) {
      if (posSettings.invoicePrefix !== undefined) {
        setInvoicePrefix(posSettings.invoicePrefix || 'FAC-');
      }
      setTaxEnabled(Boolean(posSettings.taxEnabled));
      setTaxRate(
        posSettings.taxRate !== undefined && posSettings.taxRate !== null
          ? String(posSettings.taxRate)
          : '15'
      );
      setTaxIncluded(Boolean(posSettings.taxIncluded));
      setTaxName(posSettings.taxName || 'IVA');
    }
  }, [posSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Guardar margen y autoUpdate en /businesses/me
      const markupNum = defaultMarkupPct.trim() === '' ? null : parseFloat(defaultMarkupPct);
      await updateMyBusiness({
        defaultMarkupPct: markupNum,
        autoUpdatePriceOnPurchase,
      } as any);

      // 2. Guardar prefijo e impuestos en /pos/settings
      const rateNum = parseFloat(taxRate) || 0;
      await updatePosSettings({
        invoicePrefix: invoicePrefix.trim() || 'FAC-',
        taxEnabled,
        taxRate: rateNum,
        taxIncluded,
        taxName: taxName.trim() || 'IVA',
      });
    },
    onSuccess: () => {
      toast.success('Configuración de comprobantes guardada');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'settings'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al guardar configuración';
      toast.error(msg);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    saveMutation.mutate();
  };

  const effectivePrefix = (invoicePrefix || 'FAC-').trim() || 'FAC-';

  if (isLoadingSettings) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 bg-gray-100 rounded-2xl" />
        <div className="h-44 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Comprobantes e impuestos</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Margen de ganancia, compras con precio sugerido, precio de etiqueta y numeración de comprobantes.
          </p>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-40 cursor-pointer"
          >
            {saveMutation.isPending ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <FloppyDisk size={14} />
            )}
            <span>{saveMutation.isPending ? 'Guardando...' : 'Guardar cambios'}</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tarjeta 1: Margen de Ganancia y Precios de Venta */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Percent size={20} className="text-gray-700" weight="bold" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Margen de Ganancia y Precios de Venta
            </h3>
          </div>

          {/* Margen de ganancia por defecto (%) */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Margen de ganancia sugerido por defecto (%)
            </label>
            <div className="relative max-w-xs">
              <input
                type="number"
                step="0.1"
                min="0"
                disabled={isReadOnly}
                value={defaultMarkupPct}
                onChange={(e) => setDefaultMarkupPct(e.target.value)}
                placeholder="Sin sugerencia (vacío)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-gray-900 text-xs font-mono"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">%</span>
            </div>
            <p className="text-[11px] text-gray-500">
              Se usa como margen sugerido al crear productos o registrar compras si el producto no tiene margen propio. Vacío = sin sugerencia.
            </p>
          </div>

          {/* Actualizar precio automáticamente en compras */}
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200/80 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-gray-900 block">
                Actualizar precio de venta automáticamente al registrar compras
              </span>
              <p className="text-xs text-gray-500 leading-relaxed">
                Si está activado, cuando registres una compra con costo nuevo, el precio de venta se actualizará según el margen de ganancia sin pedir confirmación.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={autoUpdatePriceOnPurchase}
                onChange={(e) => setAutoUpdatePriceOnPurchase(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Precio de etiqueta (solo lectura, configurado por Superadmin) */}
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-gray-700" weight="bold" />
                <span className="text-xs font-semibold text-gray-900">Uso de Precio de Etiqueta</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isListPriceEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {isListPriceEnabled ? 'Activado por Superadmin' : 'Desactivado'}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {isListPriceEnabled
                  ? 'El Superadmin activó el precio de etiqueta para tu negocio. Podés registrar precios de lista de referencia y visualizar descuentos automáticos en el catálogo.'
                  : 'Esta opción solo puede ser activada por el Superadmin si tu negocio maneja precios de etiqueta de referencia.'}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Numeración de Comprobantes */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Hash size={20} className="text-gray-700" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Numeración de Comprobantes
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Prefijo de Comprobante
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                maxLength={10}
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="FAC-"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900 font-mono text-xs uppercase"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Identificador inicial del número correlativo (ej: FAC-, T-, CV-).
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
              <div className="text-[11px] text-gray-500 font-medium">Ejemplo de visualización</div>
              <div className="font-mono text-xs font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200 inline-block shadow-2xs">
                Próximo comprobante: <span className="text-gray-900">{effectivePrefix}0012</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Cambiar el prefijo no altera los comprobantes ya emitidos.
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta 3: Configuración de IVA / Impuestos */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Receipt size={20} className="text-gray-700" />
              <div>
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Configuración de Impuesto (IVA)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Control de cálculo y aplicación de impuesto al valor agregado en ventas.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {taxEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre del impuesto
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="IVA"
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tasa de impuesto (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={isReadOnly}
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full text-xs py-2 px-3 pr-8 border border-gray-200 rounded-xl font-mono"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium">%</span>
                </div>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={taxIncluded}
                    onChange={(e) => setTaxIncluded(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-xs text-gray-700 font-medium">
                    Impuesto ya incluido en precio
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta 4: Personalización del Ticket */}
        {onNavigateToReceiptDesign && (
          <div className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-900">
                  Encabezado, pie de página y datos del comprobante
                </p>
                <p className="text-xs text-gray-500">
                  Personalizá el logotipo, eslogan, redes sociales y visibilidad de datos para los comprobantes.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToReceiptDesign}
                className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
              >
                <span>Ir a Diseño del ticket</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
