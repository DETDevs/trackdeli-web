import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Barcode,
  Check,
  CircleNotch,
  FilePdf,
  Info,
  MagnifyingGlass,
  Minus,
  Plus,
  Printer,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  generateNextPosBarcode,
  getMyBusiness,
  getPosProducts,
  updatePosProduct,
  updatePosVariant,
  type PosProductItem,
} from 'api-client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import {
  downloadLabelsPdf,
  formatBarcodeDisplay,
  LABEL_SIZE_SPECS,
  printLabelsViaBrowser,
  renderBarcodeSvgString,
  type BarcodeLabelPrintItem,
  type LabelSizeKey,
} from '../../utils/barcodeLabels';

interface LabelCatalogEntry {
  id: string;
  parentProductId?: string | null;
  isVariant: boolean;
  displayName: string;
  variantBadge?: string;
  barcode: string;
  sku: string;
  price: number;
  stock: number;
}

interface SelectedLabelItem extends LabelCatalogEntry {
  copies: number;
}

function buildVariantLabel(
  parentName: string,
  variantName: string,
  variantValues?: Record<string, string> | null,
): { displayName: string; variantBadge?: string } {
  const valuesText =
    variantValues && Object.keys(variantValues).length > 0
      ? Object.values(variantValues).filter(Boolean).join(' · ')
      : '';

  if (valuesText) {
    const cleanParent = parentName.trim();
    return {
      displayName: `${cleanParent} (${valuesText})`,
      variantBadge: valuesText,
    };
  }

  const cleanVar = (variantName || '').trim();
  const cleanParent = parentName.trim();
  if (!cleanVar) {
    return { displayName: cleanParent };
  }
  if (cleanVar.toLowerCase().includes(cleanParent.toLowerCase())) {
    return { displayName: cleanVar };
  }
  return {
    displayName: `${cleanParent} — ${cleanVar}`,
    variantBadge: cleanVar,
  };
}

function flattenProductsForLabels(products: PosProductItem[]): LabelCatalogEntry[] {
  const result: LabelCatalogEntry[] = [];

  for (const p of products) {
    if (p.isActive === false) continue;

    const variants = Array.isArray(p.variants) ? p.variants.filter((v) => v.isActive !== false) : [];
    const hasVariants = Boolean(p.isVariantParent) || variants.length > 0;

    if (hasVariants) {
      for (const v of variants) {
        const { displayName, variantBadge } = buildVariantLabel(
          p.name,
          v.name,
          v.variantValues,
        );
        result.push({
          id: v.id,
          parentProductId: p.id,
          isVariant: true,
          displayName,
          variantBadge,
          barcode: (v.barcode || '').trim(),
          sku: (v.sku || '').trim(),
          price: Number(v.price ?? p.price ?? 0),
          stock: Number(v.stock ?? 0),
        });
      }
    } else {
      result.push({
        id: p.id,
        parentProductId: null,
        isVariant: false,
        displayName: p.name,
        barcode: (p.barcode || '').trim(),
        sku: (p.sku || '').trim(),
        price: Number(p.price ?? 0),
        stock: Number(p.stock ?? 0),
      });
    }
  }

  return result.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
}

export const PosLabelsPage: React.FC = () => {
  const [entries, setEntries] = useState<LabelCatalogEntry[]>([]);
  const [currency, setCurrency] = useState<string>('NIO');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [onlyWithBarcode, setOnlyWithBarcode] = useState(false);

  const [selectedMap, setSelectedMap] = useState<Record<string, SelectedLabelItem>>({});
  const [sizeKey, setSizeKey] = useState<LabelSizeKey>('50x25');
  const [showPrice, setShowPrice] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, bizRes] = await Promise.all([
        getPosProducts({ isActive: true, groupVariants: true }),
        getMyBusiness().catch(() => null),
      ]);
      const flattened = flattenProductsForLabels(Array.isArray(productsRes) ? productsRes : []);
      setEntries(flattened);
      const bizCurrency = (bizRes as any)?.currency;
      if (bizCurrency) {
        setCurrency(bizCurrency);
      }
      // Sincronizar códigos/stock en seleccionados si cambiaron
      setSelectedMap((prev) => {
        const byId = new Map(flattened.map((e) => [e.id, e]));
        const next: Record<string, SelectedLabelItem> = {};
        for (const [id, sel] of Object.entries(prev)) {
          const fresh = byId.get(id);
          if (fresh) {
            next[id] = { ...fresh, copies: sel.copies };
          }
        }
        return next;
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No se pudo cargar el catálogo para imprimir etiquetas.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return entries.filter((item) => {
      if (onlyWithBarcode && !item.barcode) return false;
      if (!q) return true;
      return (
        item.displayName.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    });
  }, [entries, searchTerm, onlyWithBarcode]);

  const selectedItems = useMemo(() => Object.values(selectedMap), [selectedMap]);

  const printableItems = useMemo<BarcodeLabelPrintItem[]>(() => {
    return selectedItems
      .filter((item) => Boolean(item.barcode) && item.copies > 0)
      .map((item) => ({
        id: item.id,
        name: item.displayName,
        priceFormatted: formatCurrency(item.price, currency),
        barcode: item.barcode,
        copies: item.copies,
      }));
  }, [selectedItems, currency]);

  const totalLabelsCount = useMemo(
    () => printableItems.reduce((sum, it) => sum + it.copies, 0),
    [printableItems],
  );

  const handleToggleSelect = (entry: LabelCatalogEntry) => {
    if (!entry.barcode) {
      toast.error('Este producto no tiene código de barras. Generá uno primero.');
      return;
    }
    setSelectedMap((prev) => {
      if (prev[entry.id]) {
        const copy = { ...prev };
        delete copy[entry.id];
        return copy;
      }
      return {
        ...prev,
        [entry.id]: { ...entry, copies: 1 },
      };
    });
  };

  const handleUpdateCopies = (id: string, nextCopies: number) => {
    const clamped = Math.max(1, Math.min(500, Math.floor(Number(nextCopies) || 1)));
    setSelectedMap((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return {
        ...prev,
        [id]: { ...existing, copies: clamped },
      };
    });
  };

  const handleSetCopiesEqualStock = (id: string) => {
    setSelectedMap((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const stockQty = Math.floor(Number(existing.stock) || 0);
      if (stockQty <= 0) {
        toast('Este producto tiene existencia en 0; se mantuvo en 1 etiqueta.');
        return { ...prev, [id]: { ...existing, copies: 1 } };
      }
      return {
        ...prev,
        [id]: { ...existing, copies: Math.min(500, stockQty) },
      };
    });
  };

  const handleSetAllEqualStock = () => {
    let adjusted = 0;
    setSelectedMap((prev) => {
      const next: Record<string, SelectedLabelItem> = {};
      for (const [id, item] of Object.entries(prev)) {
        const stockQty = Math.floor(Number(item.stock) || 0);
        const copies = stockQty > 0 ? Math.min(500, stockQty) : 1;
        if (stockQty > 0) adjusted++;
        next[id] = { ...item, copies };
      }
      return next;
    });
    toast.success(
      adjusted > 0
        ? 'Cantidades ajustadas igual a la existencia actual.'
        : 'Los productos seleccionados no tienen existencia mayor a 0; se dejó 1 por defecto.',
    );
  };

  const handleRemoveSelected = (id: string) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleQuickGenerateBarcode = async (entry: LabelCatalogEntry) => {
    setGeneratingId(entry.id);
    try {
      const { barcode } = await generateNextPosBarcode();
      if (entry.isVariant && entry.parentProductId) {
        await updatePosVariant(entry.parentProductId, entry.id, { barcode });
      } else {
        await updatePosProduct(entry.id, { barcode });
      }
      setEntries((prev) =>
        prev.map((it) => (it.id === entry.id ? { ...it, barcode } : it)),
      );
      setSelectedMap((prev) => ({
        ...prev,
        [entry.id]: { ...entry, barcode, copies: prev[entry.id]?.copies ?? 1 },
      }));
      toast.success(`Código ${barcode} generado y guardado.`);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'No se pudo generar el código de barras.',
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const handlePrint = () => {
    if (printableItems.length === 0) {
      toast.error('Seleccioná al menos un producto con código de barras.');
      return;
    }
    try {
      printLabelsViaBrowser({
        items: printableItems,
        sizeKey,
        showPrice,
      });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo abrir el diálogo de impresión.');
    }
  };

  const handleDownloadPdf = () => {
    if (printableItems.length === 0) {
      toast.error('Seleccioná al menos un producto con código de barras.');
      return;
    }
    setIsExportingPdf(true);
    try {
      downloadLabelsPdf({
        items: printableItems,
        sizeKey,
        showPrice,
      });
      toast.success('PDF de etiquetas descargado.');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo generar el PDF de etiquetas.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const previewItem = printableItems[0] || null;
  const previewSpec = LABEL_SIZE_SPECS[sizeKey];
  const previewSvg = useMemo(() => {
    if (!previewItem) return '';
    return renderBarcodeSvgString(previewItem.barcode, { heightPx: 54 });
  }, [previewItem]);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/pos/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Volver al catálogo</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Imprimir etiquetas</h1>
          <p className="text-xs text-gray-500">
            Elegí los productos y variantes, definí cuántas copias necesitás e imprimí en tu
            impresora térmica o guardá como PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={printableItems.length === 0 || isExportingPdf}
            className="min-h-[42px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isExportingPdf ? (
              <CircleNotch size={16} className="animate-spin" />
            ) : (
              <FilePdf size={16} weight="bold" className="text-rose-600" />
            )}
            <span>Guardar como PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={printableItems.length === 0}
            className="min-h-[42px] px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer size={16} weight="bold" />
            <span>
              Imprimir etiquetas{totalLabelsCount > 0 ? ` (${totalLabelsCount})` : ''}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-2.5 text-xs text-red-800">
          <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-1 font-bold underline hover:text-red-900 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Columna izquierda: buscador y selector de productos/variantes */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscá por nombre, variante, código de barras o SKU..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-purple-600"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-gray-700 select-none cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={onlyWithBarcode}
                  onChange={(e) => setOnlyWithBarcode(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span>Solo con código</span>
              </label>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{filteredEntries.length} productos y variantes activos</span>
              <span>{selectedItems.length} seleccionados</span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
              <CircleNotch size={24} className="animate-spin text-purple-600" />
              <span>Cargando productos...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-500">
              No se encontraron productos con esa búsqueda.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[540px] overflow-y-auto">
              {filteredEntries.map((entry) => {
                const isSelected = Boolean(selectedMap[entry.id]);
                const hasBarcode = Boolean(entry.barcode);

                return (
                  <div
                    key={entry.id}
                    className={`px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-purple-50/60' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(entry)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : hasBarcode
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-100'
                        }`}
                      >
                        {isSelected && <Check size={12} weight="bold" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {entry.displayName}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="font-semibold text-gray-800">
                            {formatCurrency(entry.price, currency)}
                          </span>
                          <span>·</span>
                          <span>Existencia: {entry.stock}</span>
                          <span>·</span>
                          {hasBarcode ? (
                            <span className="font-mono text-gray-600">{entry.barcode}</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Sin código</span>
                          )}
                        </div>
                      </div>
                    </button>

                    {!hasBarcode && (
                      <button
                        type="button"
                        disabled={generatingId === entry.id}
                        onClick={() => handleQuickGenerateBarcode(entry)}
                        className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {generatingId === entry.id ? (
                          <CircleNotch size={13} className="animate-spin" />
                        ) : (
                          <Barcode size={14} weight="bold" />
                        )}
                        <span>Generar código</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna derecha: configuración, vista previa y seleccionados */}
        <div className="lg:col-span-5 space-y-4">
          {/* Configuración de etiqueta */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Configuración de etiqueta</h2>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Tamaño de etiqueta
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['50x25', '40x30', '58_continuous'] as LabelSizeKey[]).map((key) => {
                  const spec = LABEL_SIZE_SPECS[key];
                  const active = sizeKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSizeKey(key)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-center transition-colors cursor-pointer ${
                        active
                          ? 'border-purple-600 bg-purple-50 text-purple-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {spec.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">{previewSpec.description}</p>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-gray-800 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <span>Mostrar precio en la etiqueta</span>
            </label>

            {/* Ayuda corta de impresión */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-start gap-2 text-xs text-gray-600">
              <Info size={16} className="text-purple-700 shrink-0 mt-0.5" />
              <span>
                En el diálogo de impresión elegí la impresora de etiquetas, tamaño de papel de la
                etiqueta y márgenes: ninguno.
              </span>
            </div>
          </div>

          {/* Vista previa */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Vista previa</h2>
              <span className="text-xs text-gray-500">
                {previewSpec.widthMm} × {previewSpec.heightMm} mm
              </span>
            </div>

            <div className="bg-gray-100/80 rounded-xl p-5 flex items-center justify-center border border-dashed border-gray-300">
              {previewItem ? (
                <div
                  style={{
                    width: `${previewSpec.widthMm * 4.4}px`,
                    height: `${previewSpec.heightMm * 4.4}px`,
                  }}
                  className="bg-white border border-gray-300 shadow-sm rounded-sm px-2.5 py-1.5 flex flex-col justify-between items-center text-center overflow-hidden"
                >
                  <div className="w-full text-xs font-semibold text-gray-900 leading-tight line-clamp-2">
                    {previewItem.name}
                  </div>
                  {showPrice && (
                    <div className="text-sm font-extrabold text-gray-900 leading-none">
                      {previewItem.priceFormatted}
                    </div>
                  )}
                  <div className="w-full flex flex-col items-center">
                    <div
                      className="w-full h-10 flex items-stretch justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: previewSvg }}
                    />
                    <div className="text-xs font-mono font-bold text-gray-900 tracking-wider leading-none mt-0.5">
                      {formatBarcodeDisplay(previewItem.barcode)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-6">
                  Seleccioná un producto de la lista para ver la vista previa de su etiqueta.
                </p>
              )}
            </div>
          </div>

          {/* Lista de seleccionados con cantidades */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-gray-900">
                Etiquetas a imprimir ({totalLabelsCount})
              </h2>
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetAllEqualStock}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 cursor-pointer"
                  >
                    Igual a la existencia
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMap({})}
                    className="text-xs font-semibold text-gray-500 hover:text-rose-600 cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {selectedItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                Todavía no agregaste productos a la cola de impresión.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                {selectedItems.map((item) => (
                  <div key={item.id} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {item.displayName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {item.barcode} · {formatCurrency(item.price, currency)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelected(item.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Quitar"
                        aria-label="Quitar"
                      >
                        <Trash size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetCopiesEqualStock(item.id)}
                        className="text-xs font-medium text-purple-700 hover:underline cursor-pointer"
                      >
                        Igual a la existencia ({item.stock})
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCopies(item.id, item.copies - 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 cursor-pointer"
                          aria-label="Restar copia"
                        >
                          <Minus size={13} weight="bold" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={item.copies}
                          onChange={(e) => handleUpdateCopies(item.id, Number(e.target.value))}
                          className="w-14 h-7 px-2 rounded-lg border border-gray-200 text-xs font-mono font-bold text-center text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCopies(item.id, item.copies + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 cursor-pointer"
                          aria-label="Sumar copia"
                        >
                          <Plus size={13} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
