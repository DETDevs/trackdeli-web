import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getPosReceiptSettings,
  updatePosReceiptSettings,
  getPosSettings,
  updatePosSettings,
  getMyBusiness,
  updateMyBusiness,
  type PosReceiptSettingsData,
} from 'api-client';
import {
  Image as ImageIcon,
  Storefront,
  FloppyDisk,
  Trash,
  CircleNotch,
  Desktop,
  FileText,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../store/auth.store';

interface ReceiptDesignSettingsTabProps {
  isReadOnly?: boolean;
}

export const ReceiptDesignSettingsTab: React.FC<ReceiptDesignSettingsTabProps> = ({
  isReadOnly = false,
}) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

  const { data: posSettings } = useQuery({
    queryKey: ['pos', 'settings'],
    queryFn: () => getPosSettings(),
  });

  const { data: receiptData, isLoading: isLoadingReceipt } = useQuery<PosReceiptSettingsData>({
    queryKey: ['pos', 'receipt-settings'],
    queryFn: () => getPosReceiptSettings(),
  });

  // Business profile form
  const [bizName, setBizName] = useState('');
  const [bizTaxId, setBizTaxId] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizAddress, setBizAddress] = useState('');

  // Ticket design form
  const [showLogo, setShowLogo] = useState(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [headerLines, setHeaderLines] = useState<string[]>(['', '', '', '']);
  const [footerLines, setFooterLines] = useState<string[]>(['¡Gracias por su compra!', '', '', '']);

  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showTaxId, setShowTaxId] = useState(true);
  const [showCashier, setShowCashier] = useState(true);
  const [showCustomer, setShowCustomer] = useState(true);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(true);
  const [showBatches, setShowBatches] = useState(false);
  const [showListPrice, setShowListPrice] = useState(false);

  // Preview paper width state (80 vs 58 mm)
  const [previewPaperWidth, setPreviewPaperWidth] = useState<80 | 58>(80);

  const vertical = String(
    (business as any)?.posVertical || (user as any)?.business?.posVertical || 'RETAIL'
  ).toUpperCase();
  const isFarmacia = Boolean((business as any)?.tracksBatches || vertical === 'FARMACIA');
  const isListPriceActive = Boolean(
    (business as any)?.useListPrice || (user as any)?.business?.useListPrice
  );

  useEffect(() => {
    if (business) {
      setBizName(business.name || '');
      setBizTaxId((business as any)?.taxId || '');
    }
  }, [business]);

  useEffect(() => {
    if (posSettings) {
      setBizPhone(posSettings.posPhone || '');
      setBizAddress(posSettings.posAddress || '');
    }
  }, [posSettings]);

  useEffect(() => {
    if (receiptData) {
      setShowLogo(Boolean(receiptData.showLogo));
      setLogoImage(receiptData.logoImage || null);

      const h = Array.isArray(receiptData.headerLines) ? [...receiptData.headerLines] : [];
      while (h.length < 4) h.push('');
      setHeaderLines(h.slice(0, 4));

      const f = Array.isArray(receiptData.footerLines) ? [...receiptData.footerLines] : [];
      if (f.length === 0) f.push('¡Gracias por su compra!');
      while (f.length < 4) f.push('');
      setFooterLines(f.slice(0, 4));

      setShowBusinessName(receiptData.showBusinessName !== false);
      setShowAddress(receiptData.showAddress !== false);
      setShowPhone(receiptData.showPhone !== false);
      setShowTaxId(receiptData.showTaxId !== false);
      setShowCashier(receiptData.showCashier !== false);
      setShowCustomer(receiptData.showCustomer !== false);
      setShowTaxBreakdown(receiptData.showTaxBreakdown !== false);
      setShowBatches(Boolean(receiptData.showBatches));
      setShowListPrice(Boolean(receiptData.showListPrice));
    }
  }, [receiptData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Guardar nombre y RUC en /businesses/me
      await updateMyBusiness({
        name: bizName.trim(),
        taxId: bizTaxId.trim() || undefined,
      } as any);

      // 2. Guardar teléfono y dirección en /pos/settings
      await updatePosSettings({
        posPhone: bizPhone.trim() || undefined,
        posAddress: bizAddress.trim() || undefined,
      });

      // 3. Guardar diseño del ticket en /pos/receipt-settings
      await updatePosReceiptSettings({
        showLogo,
        logoImage,
        headerLines: headerLines.map((l) => l.trim()).filter(Boolean),
        footerLines: footerLines.map((l) => l.trim()).filter(Boolean),
        showBusinessName,
        showAddress,
        showPhone,
        showTaxId,
        showCashier,
        showCustomer,
        showTaxBreakdown,
        showBatches,
        paperWidthMm: previewPaperWidth,
      });
    },
    onSuccess: () => {
      toast.success('Diseño del ticket y datos guardados');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'receipt-settings'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al guardar diseño del ticket';
      toast.error(msg);
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setLogoImage(base64);
      setShowLogo(true);
      toast.success('Logotipo cargado');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoImage(null);
    setShowLogo(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleHeaderChange = (index: number, val: string) => {
    const next = [...headerLines];
    next[index] = val;
    setHeaderLines(next);
  };

  const handleFooterChange = (index: number, val: string) => {
    const next = [...footerLines];
    next[index] = val;
    setFooterLines(next);
  };

  if (isLoadingReceipt) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Diseño del ticket térmico</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Personalizá el logotipo, encabezados, pie de página y datos visibles en los comprobantes.
          </p>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-40 cursor-pointer"
          >
            {saveMutation.isPending ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <FloppyDisk size={14} />
            )}
            <span>{saveMutation.isPending ? 'Guardando...' : 'Guardar diseño'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Opciones de configuración */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Ancho de simulación */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Desktop size={15} className="text-gray-500" />
                  Formato de papel para vista previa
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visualizá el ticket en formato de 80 mm (estándar) o 58 mm (compacto).
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-semibold">
                {previewPaperWidth} mm
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPreviewPaperWidth(80)}
                className={`flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  previewPaperWidth === 80
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>80 mm (Estándar · 48 car.)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewPaperWidth(58)}
                className={`flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  previewPaperWidth === 58
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>58 mm (Compacto · 32 car.)</span>
              </button>
            </div>
          </div>

          {/* 2. Datos Oficiales del Negocio */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Storefront size={20} className="text-gray-700" />
              <div>
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Datos del Negocio en el Comprobante
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Información oficial impresa en los comprobantes y tickets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Nombre comercial del negocio
                </label>
                <input
                  type="text"
                  maxLength={100}
                  disabled={isReadOnly}
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="Ej. FARMACIA SAN JOSÉ"
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  RUC / NIT del negocio
                </label>
                <input
                  type="text"
                  maxLength={50}
                  disabled={isReadOnly}
                  value={bizTaxId}
                  onChange={(e) => setBizTaxId(e.target.value)}
                  placeholder="Ej. J0310000000000"
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Teléfono del negocio
                </label>
                <input
                  type="text"
                  maxLength={30}
                  disabled={isReadOnly}
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  placeholder="Ej. 2222-3333 / 8888-9999"
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Dirección física
                </label>
                <input
                  type="text"
                  maxLength={300}
                  disabled={isReadOnly}
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  placeholder="Ej. De la rotonda 2c al norte"
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
          </div>

          {/* 3. Logotipo del Ticket */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider block">
                  Logotipo del comprobante
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Impreso en la parte superior del comprobante.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {logoImage ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="p-2 bg-white border border-gray-300 rounded-lg shadow-inner max-w-[160px] flex items-center justify-center">
                  <img
                    src={logoImage}
                    alt="Logo del ticket"
                    className="max-h-20 max-w-full object-contain filter contrast-125"
                  />
                </div>
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <p className="text-xs font-medium text-gray-800">Logotipo listo</p>
                  <p className="text-[11px] text-gray-400">
                    Se imprimirá centrado al inicio del comprobante.
                  </p>
                  {!isReadOnly && (
                    <div className="pt-2 flex items-center gap-2 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-2xs"
                      >
                        Cambiar imagen
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 flex items-center gap-1"
                      >
                        <Trash size={14} />
                        <span>Quitar logo</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={() => !isReadOnly && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-gray-200 hover:border-gray-400 bg-gray-50/50 rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center ${
                  !isReadOnly ? 'cursor-pointer' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white text-gray-500 flex items-center justify-center mb-2 shadow-2xs">
                  <ImageIcon size={20} />
                </div>
                <p className="text-xs font-medium text-gray-700">
                  Hacé clic para subir tu logotipo
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Formatos permitidos: PNG o JPEG (máx. 2 MB).
                </p>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/png, image/jpeg, image/jpg"
              className="hidden"
            />
          </div>

          {/* 4. Encabezado Personalizado */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-800 uppercase tracking-wider block">
                Encabezado (hasta 4 líneas)
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Texto centrado en la parte superior (eslogan, redes, sucursal). Máximo 48 caracteres por línea.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {headerLines.map((val, idx) => (
                <div key={idx} className="relative">
                  <input
                    type="text"
                    maxLength={48}
                    disabled={isReadOnly}
                    value={val}
                    onChange={(e) => handleHeaderChange(idx, e.target.value)}
                    placeholder={`Línea ${idx + 1} (ej. ${
                      idx === 0 ? '¡La mejor atención!' : idx === 1 ? 'Instagram: @minegocio' : ''
                    })`}
                    className="w-full text-xs py-2 px-3 pr-14 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 bg-gray-50/50 focus:bg-white"
                  />
                  <span
                    className={`absolute right-3 top-2.5 text-[10px] tabular-nums font-mono ${
                      val.length >= 44 ? 'text-amber-600 font-semibold' : 'text-gray-400'
                    }`}
                  >
                    {val.length}/48
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Pie de Página Personalizado */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-800 uppercase tracking-wider block">
                Pie de página (hasta 4 líneas)
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Texto centrado al final del comprobante (agradecimiento, política de cambios). Máximo 48 caracteres.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {footerLines.map((val, idx) => (
                <div key={idx} className="relative">
                  <input
                    type="text"
                    maxLength={48}
                    disabled={isReadOnly}
                    value={val}
                    onChange={(e) => handleFooterChange(idx, e.target.value)}
                    placeholder={`Línea ${idx + 1} (ej. ${
                      idx === 0 ? '¡Gracias por su compra!' : idx === 1 ? 'Conserve este comprobante para cambios' : ''
                    })`}
                    className="w-full text-xs py-2 px-3 pr-14 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 bg-gray-50/50 focus:bg-white"
                  />
                  <span
                    className={`absolute right-3 top-2.5 text-[10px] tabular-nums font-mono ${
                      val.length >= 44 ? 'text-amber-600 font-semibold' : 'text-gray-400'
                    }`}
                  >
                    {val.length}/48
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Visibilidad de Datos en el Ticket */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-800 uppercase tracking-wider block">
                Datos visibles en el comprobante
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Activa o desactiva qué elementos se imprimen en el ticket.
              </p>
            </div>

            <div className="divide-y divide-gray-100 pt-1">
              {[
                { label: 'Nombre comercial del negocio', checked: showBusinessName, set: setShowBusinessName },
                { label: 'Dirección física del negocio', checked: showAddress, set: setShowAddress },
                { label: 'Teléfono del negocio', checked: showPhone, set: setShowPhone },
                { label: 'RUC / NIT del negocio', checked: showTaxId, set: setShowTaxId },
                { label: 'Nombre del cajero', checked: showCashier, set: setShowCashier },
                { label: 'Nombre del cliente', checked: showCustomer, set: setShowCustomer },
                { label: 'Desglose detallado de impuesto (IVA)', checked: showTaxBreakdown, set: setShowTaxBreakdown },
                ...(isFarmacia
                  ? [{ label: 'Mostrar lotes y vencimientos en productos', checked: showBatches, set: setShowBatches }]
                  : []),
                ...(isListPriceActive
                  ? [{ label: 'Mostrar precio de etiqueta de referencia', checked: showListPrice, set: setShowListPrice }]
                  : []),
              ].map((opt, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={opt.checked}
                      onChange={(e) => opt.set(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Previsualización en Vivo Fiel */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-gray-100 p-4 rounded-2xl border border-gray-200 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 text-xs text-gray-600 font-medium">
              <span className="flex items-center gap-1.5">
                <FileText size={16} className="text-gray-700" />
                <span>Simulador de ticket</span>
              </span>
              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-gray-200">
                {previewPaperWidth} mm
              </span>
            </div>

            {/* Hoja de ticket térmico */}
            <div
              className={`bg-white shadow-md p-4 transition-all duration-300 rounded border border-gray-300 font-mono text-[11px] leading-tight text-gray-900 select-text ${
                previewPaperWidth === 58 ? 'w-[250px]' : 'w-[320px]'
              }`}
            >
              {/* Logo */}
              {showLogo && logoImage && (
                <div className="flex justify-center mb-2">
                  <img
                    src={logoImage}
                    alt="Logo"
                    className="max-h-14 max-w-full object-contain filter contrast-125"
                  />
                </div>
              )}

              {/* Nombre y datos oficiales */}
              <div className="text-center space-y-0.5 pb-2">
                {showBusinessName && (
                  <p className="font-bold text-xs uppercase tracking-wider">{bizName || 'MI NEGOCIO'}</p>
                )}
                {showTaxId && bizTaxId && (
                  <p className="text-[10px] text-gray-600">RUC: {bizTaxId}</p>
                )}
                {showAddress && bizAddress && (
                  <p className="text-[10px] text-gray-600">{bizAddress}</p>
                )}
                {showPhone && bizPhone && (
                  <p className="text-[10px] text-gray-600">Tel: {bizPhone}</p>
                )}
              </div>

              {/* Encabezado personalizado */}
              {headerLines.filter((l) => l.trim()).length > 0 && (
                <div className="text-center py-1.5 border-y border-dashed border-gray-300 space-y-0.5">
                  {headerLines
                    .filter((l) => l.trim())
                    .map((l, i) => (
                      <p key={i} className="text-[10px] text-gray-700 italic">
                        {l}
                      </p>
                    ))}
                </div>
              )}

              {/* Metadatos de la venta */}
              <div className="py-2 space-y-0.5 text-[10px] border-b border-gray-200">
                <div className="flex justify-between">
                  <span>COMPROBANTE:</span>
                  <span className="font-semibold">FAC-000142</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA:</span>
                  <span>{new Date().toLocaleDateString('es-NI')}</span>
                </div>
                {showCashier && (
                  <div className="flex justify-between">
                    <span>CAJERO:</span>
                    <span>{user?.name || 'Cajero 1'}</span>
                  </div>
                )}
                {showCustomer && (
                  <div className="flex justify-between">
                    <span>CLIENTE:</span>
                    <span>Consumidor Final</span>
                  </div>
                )}
              </div>

              {/* Artículos de prueba */}
              <div className="py-2 space-y-1.5 text-[10px] border-b border-gray-200">
                <div>
                  <div className="flex justify-between">
                    <span>1 x Paracetamol 500mg</span>
                    <span>C$ 40.00</span>
                  </div>
                  {showBatches && (
                    <p className="text-[9px] text-gray-500 pl-2">Lote: L-2026A · Venc: 12/2027</p>
                  )}
                  {showListPrice && (
                    <p className="text-[9px] text-gray-400 pl-2">Etiqueta C$ 50.00</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between">
                    <span>2 x Alcohol Gel 120ml</span>
                    <span>C$ 70.00</span>
                  </div>
                  {showBatches && (
                    <p className="text-[9px] text-gray-500 pl-2">Lote: AG-990 · Venc: 06/2028</p>
                  )}
                </div>
              </div>

              {/* Totales */}
              <div className="py-2 space-y-0.5 text-[10px]">
                <div className="flex justify-between text-gray-600">
                  <span>SUBTOTAL:</span>
                  <span>C$ 95.65</span>
                </div>
                {showTaxBreakdown && (
                  <div className="flex justify-between text-gray-600">
                    <span>IVA (15%):</span>
                    <span>C$ 14.35</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-900">
                  <span>TOTAL:</span>
                  <span>C$ 110.00</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1 text-gray-600">
                  <span>EFECTIVO:</span>
                  <span>C$ 200.00</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>CAMBIO:</span>
                  <span>C$ 90.00</span>
                </div>
              </div>

              {/* Pie de página personalizado */}
              {footerLines.filter((l) => l.trim()).length > 0 && (
                <div className="text-center pt-2.5 border-t border-dashed border-gray-300 space-y-0.5">
                  {footerLines
                    .filter((l) => l.trim())
                    .map((l, i) => (
                      <p key={i} className="text-[10px] text-gray-700 font-medium">
                        {l}
                      </p>
                    ))}
                </div>
              )}

              {/* Marca de corte */}
              <div className="mt-4 pt-2 border-t border-dotted border-gray-400 flex items-center justify-center text-[9px] text-gray-400 uppercase tracking-widest font-mono">
                [ CORTE DE PAPEL ]
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-3 text-center max-w-xs">
              Vista previa generada a partir de los datos configurados en pantalla.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
