import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Plus,
  FloppyDisk,
  WarningCircle,
  Check,
  X,
} from '@phosphor-icons/react';
import {
  type PosProductVariantDetail,
  type GeneratePosVariantsAxis,
  getPosVariants,
  generatePosVariants,
  updatePosVariant,
} from 'api-client';
import { formatQuantity } from '../../../utils/formatters';
import type { ProductField } from './ListFieldSelect';

interface ProductVariantsSectionProps {
  productId?: string;
  productName: string;
  isVariantParent: boolean;
  unit: string;
  currency: string;
  productFields: ProductField[];
  canManageCost: boolean;
  isReadOnly: boolean;
  businessId?: string;
  onVariantsChanged?: (count: number) => void;
  onRequestCreateField?: () => void;
}

export const ProductVariantsSection: React.FC<ProductVariantsSectionProps> = ({
  productId,
  productName: _productName,
  isVariantParent: initialIsParent,
  unit,
  currency: _currency,
  productFields,
  canManageCost,
  isReadOnly,
  businessId,
  onVariantsChanged,
  onRequestCreateField,
}) => {
  const [variants, setVariants] = useState<PosProductVariantDetail[]>([]);
  const [isVariantParent, setIsVariantParent] = useState(initialIsParent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modo generador de variantes
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAxes, setSelectedAxes] = useState<Record<string, string[]>>({});
  const [customValueInputs, setCustomValueInputs] = useState<Record<string, string>>({});
  const [isSubmittingGen, setIsSubmittingGen] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Edición en línea de cada variante
  const [editingRows, setEditingRows] = useState<
    Record<
      string,
      {
        price: string;
        cost: string;
        barcode: string;
        sku: string;
        isActive: boolean;
        isSaving?: boolean;
        savedNotice?: boolean;
        error?: string;
      }
    >
  >({});

  const loadVariants = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPosVariants(productId, businessId);
      const list = Array.isArray(data) ? data : [];
      setVariants(list);
      if (list.length > 0) {
        setIsVariantParent(true);
      }
      onVariantsChanged?.(list.length);

      // Inicializar estados de edición en línea
      const rows: typeof editingRows = {};
      for (const v of list) {
        rows[v.id] = {
          price: v.price != null ? String(v.price) : '0',
          cost: v.cost != null ? String(v.cost) : '',
          barcode: v.barcode || '',
          sku: v.sku || '',
          isActive: v.isActive !== false,
        };
      }
      setEditingRows(rows);
    } catch (err: any) {
      setError('No se pudieron cargar las variantes.');
    } finally {
      setIsLoading(false);
    }
  }, [productId, businessId, onVariantsChanged]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  // Ejes disponibles a partir de los campos del catálogo
  const availableAxes = productFields.filter(
    (f) => f.isActive !== false && !f.key?.endsWith('_id'),
  );

  const handleToggleAxis = (axisKey: string) => {
    setSelectedAxes((prev) => {
      const next = { ...prev };
      if (next[axisKey]) {
        delete next[axisKey];
      } else {
        // Pre-cargar valores existentes si el campo tiene opciones
        const field = availableAxes.find((f) => f.key === axisKey);
        const initialVals = (field?.fieldOptions || [])
          .filter((opt) => opt.isActive !== false)
          .map((opt) => opt.label);
        next[axisKey] = initialVals;
      }
      return next;
    });
  };

  const handleAddValueToAxis = (axisKey: string) => {
    const raw = (customValueInputs[axisKey] || '').trim();
    if (!raw) return;
    setSelectedAxes((prev) => {
      const current = prev[axisKey] || [];
      if (current.includes(raw)) return prev;
      return { ...prev, [axisKey]: [...current, raw] };
    });
    setCustomValueInputs((prev) => ({ ...prev, [axisKey]: '' }));
  };

  const handleRemoveValueFromAxis = (axisKey: string, valToRemove: string) => {
    setSelectedAxes((prev) => ({
      ...prev,
      [axisKey]: (prev[axisKey] || []).filter((v) => v !== valToRemove),
    }));
  };

  const handleGenerateVariants = async () => {
    if (!productId) return;

    const axesToSubmit: GeneratePosVariantsAxis[] = Object.entries(selectedAxes)
      .filter(([_, vals]) => vals.length > 0)
      .map(([k, vals]) => ({
        key: k,
        values: vals,
      }));

    if (axesToSubmit.length === 0) {
      setGenError('Seleccioná al menos un eje con valores para generar variantes.');
      return;
    }

    setIsSubmittingGen(true);
    setGenError(null);
    try {
      await generatePosVariants(productId, { axes: axesToSubmit }, businessId);
      setIsGenerating(false);
      setSelectedAxes({});
      await loadVariants();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || '';

      if (code === 'PRODUCT_HAS_HISTORY' || msg.includes('ya tiene ventas o existencia')) {
        setGenError(
          'Este producto ya tiene ventas o existencia. Creá uno nuevo para manejarlo con variantes.',
        );
      } else {
        setGenError(msg || 'No se pudieron generar las variantes. Verificá los valores.');
      }
    } finally {
      setIsSubmittingGen(false);
    }
  };

  const handleSaveVariantRow = async (variantId: string) => {
    if (!productId || isReadOnly) return;
    const row = editingRows[variantId];
    if (!row) return;

    const parsedPrice = parseFloat(row.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setEditingRows((prev) => ({
        ...prev,
        [variantId]: { ...prev[variantId], error: 'Precio inválido' },
      }));
      return;
    }

    const parsedCost = row.cost.trim() ? parseFloat(row.cost) : null;
    if (parsedCost !== null && (isNaN(parsedCost) || parsedCost < 0)) {
      setEditingRows((prev) => ({
        ...prev,
        [variantId]: { ...prev[variantId], error: 'Costo inválido' },
      }));
      return;
    }

    setEditingRows((prev) => ({
      ...prev,
      [variantId]: { ...prev[variantId], isSaving: true, error: undefined },
    }));

    try {
      await updatePosVariant(
        productId,
        variantId,
        {
          price: parsedPrice,
          cost: canManageCost ? parsedCost : undefined,
          barcode: row.barcode.trim() || null,
          sku: row.sku.trim() || null,
          isActive: row.isActive,
        },
        businessId,
      );

      setEditingRows((prev) => ({
        ...prev,
        [variantId]: { ...prev[variantId], isSaving: false, savedNotice: true },
      }));

      setTimeout(() => {
        setEditingRows((prev) => {
          if (!prev[variantId]) return prev;
          return { ...prev, [variantId]: { ...prev[variantId], savedNotice: false } };
        });
      }, 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al guardar';
      setEditingRows((prev) => ({
        ...prev,
        [variantId]: { ...prev[variantId], isSaving: false, error: msg },
      }));
    }
  };

  if (!productId) {
    return (
      <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-purple-900">
        <p className="font-semibold">Guardá el producto primero.</p>
        <p className="text-purple-700 mt-0.5">
          Una vez guardado el producto, vas a poder convertirlo en producto con variantes definiendo sus tallas, colores o atributos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
          <WarningCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Caso A: Producto simple sin variantes aún */}
      {!isVariantParent && variants.length === 0 && !isGenerating && (
        <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={22} weight="bold" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                Manejo con variantes (tallas, colores, sabores...)
              </h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Este producto se maneja actualmente como producto simple con un único precio y existencia. Si se vende en distintas presentaciones de talla, color o sabor, podés convertirlo en un producto con variantes.
              </p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsGenerating(true);
                  setGenError(null);
                }}
                className="min-h-[40px] px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <SlidersHorizontal size={16} weight="bold" />
                <span>Convertir en producto con variantes</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generador de variantes (modal o panel expandido) */}
      {isGenerating && (
        <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-indigo-950">
                {variants.length > 0 ? 'Agregar valores de variantes' : 'Generar variantes del producto'}
              </h4>
              <p className="text-xs text-indigo-800">
                Elegí los atributos que definen cada variante (ej. Talla y Color) y sus valores.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsGenerating(false);
                setGenError(null);
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {genError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
              <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <span className="font-semibold">{genError}</span>
            </div>
          )}

          {/* Selección de Ejes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800">
                1. Seleccioná los atributos (ejes)
              </label>
              {onRequestCreateField && (
                <button
                  type="button"
                  onClick={onRequestCreateField}
                  className="text-xs font-semibold text-purple-700 hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} weight="bold" />
                  <span>Crear nuevo atributo</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {availableAxes.map((f) => {
                const isSelected = Boolean(selectedAxes[f.key]);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleToggleAxis(f.key)}
                    className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && <Check size={14} weight="bold" />}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuración de valores por eje */}
          {Object.keys(selectedAxes).length > 0 && (
            <div className="space-y-3 pt-2 border-t border-indigo-100">
              <label className="text-xs font-bold text-gray-800 block">
                2. Definí los valores para cada atributo
              </label>

              {Object.keys(selectedAxes).map((axisKey) => {
                const field = availableAxes.find((f) => f.key === axisKey);
                const values = selectedAxes[axisKey] || [];
                const fieldOptions = field?.fieldOptions || [];

                return (
                  <div key={axisKey} className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">
                        {field?.label || axisKey} ({values.length} valores)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleAxis(axisKey)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar eje
                      </button>
                    </div>

                    {/* Chips de valores */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                      {values.map((val) => (
                        <span
                          key={val}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-900 border border-indigo-200"
                        >
                          <span>{val}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveValueFromAxis(axisKey, val)}
                            className="text-indigo-400 hover:text-red-600"
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Opciones predefinidas para agregar con 1 click */}
                    {fieldOptions.length > 0 && (
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-gray-500">Opciones disponibles:</span>
                        {fieldOptions
                          .filter((opt) => !values.includes(opt.label))
                          .map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedAxes((prev) => ({
                                  ...prev,
                                  [axisKey]: [...(prev[axisKey] || []), opt.label],
                                }));
                              }}
                              className="text-xs px-2 py-0.5 rounded-md bg-gray-100 hover:bg-purple-100 hover:text-purple-700 text-gray-700 transition-colors"
                            >
                              + {opt.label}
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Input para agregar valor a mano */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customValueInputs[axisKey] || ''}
                        onChange={(e) =>
                          setCustomValueInputs((prev) => ({ ...prev, [axisKey]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddValueToAxis(axisKey);
                          }
                        }}
                        placeholder={`Nuevo valor para ${field?.label || axisKey}...`}
                        className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddValueToAxis(axisKey)}
                        className="h-9 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
            <button
              type="button"
              onClick={() => {
                setIsGenerating(false);
                setGenError(null);
              }}
              disabled={isSubmittingGen}
              className="min-h-[40px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGenerateVariants}
              disabled={isSubmittingGen}
              className="min-h-[40px] px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
            >
              <FloppyDisk size={16} weight="bold" />
              <span>
                {isSubmittingGen
                  ? 'Generando combinaciones...'
                  : variants.length > 0
                  ? 'Generar combinaciones faltantes'
                  : 'Generar variantes'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Caso B: Producto ya tiene variantes */}
      {(isVariantParent || variants.length > 0) && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-800">
                Variantes activas ({variants.length})
              </p>
              <p className="text-xs text-gray-500">
                Cada combinación tiene su propio precio, código de barras y existencia
              </p>
            </div>

            {!isReadOnly && !isGenerating && (
              <button
                type="button"
                onClick={() => {
                  setIsGenerating(true);
                  setGenError(null);
                }}
                className="min-h-[36px] px-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>Agregar valores</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <p className="text-xs text-gray-500 py-4 text-center">Cargando variantes...</p>
          ) : (
            <div className="space-y-2">
              {variants.map((v) => {
                const row = editingRows[v.id] || {
                  price: String(v.price),
                  cost: v.cost != null ? String(v.cost) : '',
                  barcode: v.barcode || '',
                  sku: v.sku || '',
                  isActive: v.isActive,
                };

                return (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      row.isActive
                        ? 'bg-white border-gray-200 shadow-2xs'
                        : 'bg-gray-50/70 border-gray-200 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Nombre y stock de la variante */}
                      <div className="min-w-0 md:w-1/3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-gray-900">
                            {v.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                              row.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {row.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Existencia actual:{' '}
                          <strong className="text-gray-900">{formatQuantity(v.stock, unit)}</strong>
                        </p>
                      </div>

                      {/* Inputs editables en línea */}
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Precio */}
                        <div>
                          <label className="block text-xs text-gray-500 font-medium mb-0.5">
                            Precio
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={isReadOnly}
                            value={row.price}
                            onChange={(e) =>
                              setEditingRows((prev) => ({
                                ...prev,
                                [v.id]: { ...prev[v.id], price: e.target.value },
                              }))
                            }
                            className="w-full h-9 px-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>

                        {/* Costo (solo si encargado) */}
                        {canManageCost && (
                          <div>
                            <label className="block text-xs text-gray-500 font-medium mb-0.5">
                              Costo
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={isReadOnly}
                              value={row.cost}
                              placeholder="Opcional"
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [v.id]: { ...prev[v.id], cost: e.target.value },
                                }))
                              }
                              className="w-full h-9 px-2 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        )}

                        {/* Código de barras */}
                        <div>
                          <label className="block text-xs text-gray-500 font-medium mb-0.5">
                            Código barras
                          </label>
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={row.barcode}
                            placeholder="Opcional"
                            onChange={(e) =>
                              setEditingRows((prev) => ({
                                ...prev,
                                [v.id]: { ...prev[v.id], barcode: e.target.value },
                              }))
                            }
                            className="w-full h-9 px-2 rounded-lg border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>

                        {/* SKU */}
                        <div>
                          <label className="block text-xs text-gray-500 font-medium mb-0.5">
                            SKU
                          </label>
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={row.sku}
                            placeholder="Opcional"
                            onChange={(e) =>
                              setEditingRows((prev) => ({
                                ...prev,
                                [v.id]: { ...prev[v.id], sku: e.target.value },
                              }))
                            }
                            className="w-full h-9 px-2 rounded-lg border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>

                      {/* Botón guardar fila */}
                      {!isReadOnly && (
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.isActive}
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [v.id]: { ...prev[v.id], isActive: e.target.checked },
                                }))
                              }
                              className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                            />
                            <span>Activa</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleSaveVariantRow(v.id)}
                            disabled={row.isSaving}
                            className="h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <FloppyDisk size={14} weight="bold" />
                            <span>{row.isSaving ? 'Guardando...' : 'Guardar'}</span>
                          </button>

                          {row.savedNotice && (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                              <Check size={14} weight="bold" />
                              <span>Listo</span>
                            </span>
                          )}
                          {row.error && (
                            <span className="text-xs text-red-600 font-medium">{row.error}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

