import React, { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Plus,
  PencilSimple,
  Trash,
  WarningCircle,
  FloppyDisk,
  X,
  Check,
} from '@phosphor-icons/react';
import {
  type PosProductPresentation,
  type CreatePosPresentationDto,
  getPosPresentations,
  createPosPresentation,
  updatePosPresentation,
  deletePosPresentation,
} from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import {
  BASE_UNIT_PRESETS,
  pluralizeUnitName,
  pluralizePresentationName,
} from '../../../utils/presentationHelpers';

export interface DraftPresentationItem {
  tempId: string;
  name: string;
  factor: number;
  price: number;
  listPrice?: number | null;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  barcode?: string | null;
  cost?: number | null;
  isActive: boolean;
}

interface ProductPresentationsSectionProps {
  productId?: string;
  unit: string;
  baseUnitName: string;
  onBaseUnitNameChange?: (value: string) => void;
  basePrice?: number;
  currentStock: number;
  currency: string;
  canManageCost: boolean;
  isReadOnly: boolean;
  useListPrice?: boolean;
  businessId?: string;
  draftPresentations?: DraftPresentationItem[];
  onDraftPresentationsChange?: (items: DraftPresentationItem[]) => void;
  onPresentationsChanged?: (items: PosProductPresentation[]) => void;
}

export const ProductPresentationsSection: React.FC<ProductPresentationsSectionProps> = ({
  productId,
  unit,
  baseUnitName,
  onBaseUnitNameChange,
  basePrice = 0,
  currentStock,
  currency,
  canManageCost,
  isReadOnly,
  useListPrice = false,
  businessId,
  draftPresentations = [],
  onDraftPresentationsChange,
  onPresentationsChanged,
}) => {
  const [presentations, setPresentations] = useState<PosProductPresentation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selector de unidad base ("Otra" permite texto libre)
  const normalizedBaseUnit = baseUnitName.trim() || 'Unidad';
  const isPresetUnit = BASE_UNIT_PRESETS.some(
    (u) => u.toLowerCase() === normalizedBaseUnit.toLowerCase(),
  );
  const [isCustomBaseUnit, setIsCustomBaseUnit] = useState(!isPresetUnit && Boolean(baseUnitName.trim()));

  useEffect(() => {
    const trimmed = baseUnitName.trim();
    if (!trimmed) {
      setIsCustomBaseUnit(false);
    } else if (!BASE_UNIT_PRESETS.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
      setIsCustomBaseUnit(true);
    }
  }, [baseUnitName]);

  // Modal para crear / editar forma de venta
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPres, setEditingPres] = useState<PosProductPresentation | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [factor, setFactor] = useState('');
  const [price, setPrice] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('');
  const [barcode, setBarcode] = useState('');
  const [cost, setCost] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmación de desactivación cuando PRESENTATION_IN_USE
  const [inUsePresToDeactivate, setInUsePresToDeactivate] = useState<PosProductPresentation | null>(null);

  const displayBaseUnit = baseUnitName.trim() || (unit === 'UND' ? 'Unidad' : unit);

  const loadPresentations = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPosPresentations(productId, businessId);
      const list = Array.isArray(data) ? data : [];
      setPresentations(list);
      onPresentationsChanged?.(list);
    } catch {
      setError('No se pudieron cargar las formas de venta.');
    } finally {
      setIsLoading(false);
    }
  }, [productId, businessId, onPresentationsChanged]);

  useEffect(() => {
    loadPresentations();
  }, [loadPresentations]);

  const handleOpenCreate = () => {
    setEditingPres(null);
    setEditingDraftId(null);
    setName('');
    setFactor('');
    setPrice('');
    setListPrice('');
    setWholesalePrice('');
    setWholesaleMinQty('');
    setBarcode('');
    setCost('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (pres: PosProductPresentation) => {
    setEditingPres(pres);
    setEditingDraftId(null);
    setName(pres.name);
    setFactor(String(pres.factor));
    setPrice(String(pres.price));
    setListPrice(pres.listPrice != null ? String(pres.listPrice) : '');
    setWholesalePrice(pres.wholesalePrice != null ? String(pres.wholesalePrice) : '');
    setWholesaleMinQty(pres.wholesaleMinQty != null ? String(pres.wholesaleMinQty) : '');
    setBarcode(pres.barcode || '');
    setCost(pres.cost != null ? String(pres.cost) : '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditDraft = (draft: DraftPresentationItem) => {
    setEditingPres(null);
    setEditingDraftId(draft.tempId);
    setName(draft.name);
    setFactor(String(draft.factor));
    setPrice(String(draft.price));
    setListPrice(draft.listPrice != null ? String(draft.listPrice) : '');
    setWholesalePrice(draft.wholesalePrice != null ? String(draft.wholesalePrice) : '');
    setWholesaleMinQty(draft.wholesaleMinQty != null ? String(draft.wholesaleMinQty) : '');
    setBarcode(draft.barcode || '');
    setCost(draft.cost != null ? String(draft.cost) : '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const parsedFactorPreview = parseFloat(factor.replace(',', '.'));
  const suggestedFormPrice =
    basePrice > 0 && Number.isFinite(parsedFactorPreview) && parsedFactorPreview > 0
      ? Math.round(basePrice * parsedFactorPreview * 100) / 100
      : null;

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = name.trim();
    const parsedFactor = parseFloat(factor.replace(',', '.'));
    const parsedPrice = parseFloat(price.replace(',', '.'));

    if (!cleanName) {
      setFormError('El nombre de la forma de venta es obligatorio.');
      return;
    }
    if (isNaN(parsedFactor) || parsedFactor <= 0) {
      setFormError('La cantidad que contiene debe ser un número mayor a 0.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('El precio debe ser un número mayor o igual a 0.');
      return;
    }

    const parsedWp = wholesalePrice.trim() ? parseFloat(wholesalePrice.replace(',', '.')) : null;
    const parsedWmq = wholesaleMinQty.trim() ? parseFloat(wholesaleMinQty.replace(',', '.')) : null;
    if (parsedWp !== null && (isNaN(parsedWp) || parsedWp < 0)) {
      setFormError('El precio por mayor no puede ser negativo.');
      return;
    }
    if (parsedWmq !== null && (isNaN(parsedWmq) || parsedWmq < 2)) {
      setFormError('La cantidad mínima por mayor debe ser al menos 2.');
      return;
    }

    const parsedCost = cost.trim() ? parseFloat(cost.replace(',', '.')) : null;
    if (parsedCost !== null && (isNaN(parsedCost) || parsedCost < 0)) {
      setFormError('El costo no puede ser negativo.');
      return;
    }

    // 306c #7: Solo validar/enviar listPrice si useListPrice está encendido
    let parsedListPrice: number | null | undefined = undefined;
    if (useListPrice) {
      if (listPrice.trim() !== '') {
        const lp = parseFloat(listPrice.replace(',', '.'));
        if (isNaN(lp) || lp < 0) {
          setFormError('El precio de etiqueta no puede ser negativo.');
          return;
        }
        parsedListPrice = lp;
      } else {
        parsedListPrice = null;
      }
    }

    // Modo borrador (producto aún no guardado)
    if (!productId) {
      if (!onDraftPresentationsChange) return;
      const duplicateName = draftPresentations.some(
        (d) => d.tempId !== editingDraftId && d.name.trim().toLowerCase() === cleanName.toLowerCase(),
      );
      if (duplicateName) {
        setFormError('Ya existe una forma de venta con ese nombre.');
        return;
      }
      if (!editingDraftId && draftPresentations.filter((d) => d.isActive).length >= 5) {
        setFormError('Solo podés tener hasta 5 formas de venta activas por producto.');
        return;
      }

      const nextDraft: DraftPresentationItem = {
        tempId: editingDraftId || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: cleanName,
        factor: parsedFactor,
        price: parsedPrice,
        ...(useListPrice ? { listPrice: parsedListPrice } : {}),
        wholesalePrice: parsedWp,
        wholesaleMinQty: parsedWmq,
        barcode: barcode.trim() || null,
        cost: canManageCost ? parsedCost : null,
        isActive: true,
      };

      if (editingDraftId) {
        onDraftPresentationsChange(
          draftPresentations.map((d) => (d.tempId === editingDraftId ? nextDraft : d)),
        );
      } else {
        onDraftPresentationsChange([...draftPresentations, nextDraft]);
      }
      setIsFormOpen(false);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const dto: CreatePosPresentationDto = {
        name: cleanName,
        factor: parsedFactor,
        price: parsedPrice,
        ...(useListPrice ? { listPrice: parsedListPrice } : {}),
        wholesalePrice: parsedWp,
        wholesaleMinQty: parsedWmq,
        barcode: barcode.trim() || null,
        ...(canManageCost ? { cost: parsedCost } : {}),
      };

      if (editingPres) {
        await updatePosPresentation(productId, editingPres.id, dto, businessId);
      } else {
        await createPosPresentation(productId, dto, businessId);
      }

      setIsFormOpen(false);
      await loadPresentations();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ||
          'No se pudo guardar la forma de venta. Verificá que el nombre o el código de barras no estén repetidos.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (pres: PosProductPresentation) => {
    if (!productId || isReadOnly) return;
    try {
      await updatePosPresentation(productId, pres.id, { isActive: !pres.isActive }, businessId);
      await loadPresentations();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo cambiar el estado de la forma de venta.');
    }
  };

  const handleDelete = async (pres: PosProductPresentation) => {
    if (!productId || isReadOnly) return;
    try {
      await deletePosPresentation(productId, pres.id, businessId);
      await loadPresentations();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || '';
      if (code === 'PRESENTATION_IN_USE' || msg.includes('Ya se usó')) {
        setInUsePresToDeactivate(pres);
      } else {
        setError(msg || 'No se pudo eliminar la forma de venta.');
      }
    }
  };

  const handleDeleteDraft = (tempId: string) => {
    if (!onDraftPresentationsChange) return;
    onDraftPresentationsChange(draftPresentations.filter((d) => d.tempId !== tempId));
  };

  const handleConfirmDeactivateInUse = async () => {
    if (!productId || !inUsePresToDeactivate) return;
    try {
      await updatePosPresentation(productId, inUsePresToDeactivate.id, { isActive: false }, businessId);
      setInUsePresToDeactivate(null);
      await loadPresentations();
    } catch {
      setError('No se pudo desactivar la forma de venta.');
    }
  };

  const getEquivalenceText = (pres: { name: string; factor: number }) => {
    if (!pres.factor || pres.factor <= 0) return null;
    const stockVal = Math.max(0, Number(currentStock) || 0);
    const fullUnits = Math.floor(stockVal / pres.factor);
    const remainder = Math.round((stockVal - fullUnits * pres.factor) * 1000) / 1000;
    const baseLabel = pluralizeUnitName(displayBaseUnit, stockVal);
    const presLabel = pluralizePresentationName(pres.name, fullUnits);
    const remLabel = pluralizeUnitName(displayBaseUnit, remainder);
    const looseWord = remainder === 1 ? 'suelta' : 'sueltas';

    return `${stockVal} ${baseLabel} = ${fullUnits} ${presLabel}${
      remainder > 0 ? ` y ${remainder} ${remLabel} ${looseWord}` : ''
    }`;
  };

  const itemsToRender = productId ? presentations : draftPresentations;

  return (
    <div className="space-y-3.5">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
          <WarningCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Unidad base */}
      {onBaseUnitNameChange && (
        <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-200 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Unidad base
              </label>
              <select
                disabled={isReadOnly}
                value={isCustomBaseUnit ? '__OTHER__' : BASE_UNIT_PRESETS.find((u) => u.toLowerCase() === normalizedBaseUnit.toLowerCase()) || 'Unidad'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__OTHER__') {
                    setIsCustomBaseUnit(true);
                    if (isPresetUnit) onBaseUnitNameChange('');
                  } else {
                    setIsCustomBaseUnit(false);
                    onBaseUnitNameChange(val);
                  }
                }}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-purple-600 disabled:bg-gray-100"
              >
                {BASE_UNIT_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="__OTHER__">Otra...</option>
              </select>
            </div>

            {isCustomBaseUnit && (
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Nombre de la unidad base
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={baseUnitName}
                  onChange={(e) => onBaseUnitNameChange(e.target.value)}
                  placeholder="Ej. Ampolla, Parche, Gramo"
                  maxLength={40}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-purple-600 disabled:bg-gray-100"
                />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-600">
            El inventario se lleva en esta unidad ({pluralizeUnitName(displayBaseUnit, 2)}) y cada forma de venta descuenta su equivalente.
          </p>
        </div>
      )}

      {/* Encabezado de formas de venta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-800">
            Formas de venta y compra
          </p>
          <p className="text-xs text-gray-500">
            Empaques o múltiplos que descuentan de la unidad base ({displayBaseUnit})
          </p>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="min-h-[36px] px-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Nueva forma de venta</span>
          </button>
        )}
      </div>

      {/* Lista de formas de venta */}
      {isLoading ? (
        <p className="text-xs text-gray-500 py-3 text-center">Cargando formas de venta...</p>
      ) : itemsToRender.length === 0 ? (
        <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-500">
          No hay formas de venta configuradas para este producto.
        </div>
      ) : (
        <div className="space-y-2">
          {productId
            ? presentations.map((pres) => {
                const equivText = getEquivalenceText(pres);
                return (
                  <div
                    key={pres.id}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      pres.isActive !== false
                        ? 'bg-white border-gray-200 shadow-2xs'
                        : 'bg-gray-50/70 border-gray-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-gray-900">{pres.name}</h4>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            Contiene {pres.factor} {pluralizeUnitName(displayBaseUnit, pres.factor)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                              pres.isActive !== false
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {pres.isActive !== false ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 flex-wrap">
                          <span className="font-bold text-gray-900">
                            Precio: {formatCurrency(pres.price, currency)}
                          </span>
                          {useListPrice && pres.listPrice != null && Number(pres.listPrice) > 0 && (
                            <span className="text-gray-500">
                              Etiqueta: {formatCurrency(pres.listPrice, currency)}
                            </span>
                          )}
                          {pres.wholesalePrice != null && (
                            <span className="text-purple-700">
                              Mayor: {formatCurrency(pres.wholesalePrice, currency)} (≥ {pres.wholesaleMinQty})
                            </span>
                          )}
                          {canManageCost && pres.cost != null && (
                            <span className="text-gray-500">
                              Costo: {formatCurrency(pres.cost, currency)}
                            </span>
                          )}
                          {pres.barcode && (
                            <span className="font-mono text-gray-500">Código: {pres.barcode}</span>
                          )}
                        </div>

                        {equivText && (
                          <p className="text-xs text-indigo-700 font-medium mt-1 bg-indigo-50/60 px-2 py-0.5 rounded-md inline-block">
                            Existencia actual: {equivText}
                          </p>
                        )}
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(pres)}
                            className={`min-h-[32px] px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              pres.isActive !== false
                                ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                            title={pres.isActive !== false ? 'Desactivar forma de venta' : 'Activar forma de venta'}
                          >
                            {pres.isActive !== false ? 'Desactivar' : 'Activar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pres)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Editar forma de venta"
                          >
                            <PencilSimple size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(pres)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Eliminar forma de venta"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            : draftPresentations.map((draft) => {
                const equivText = getEquivalenceText(draft);
                return (
                  <div
                    key={draft.tempId}
                    className="p-3.5 rounded-xl border bg-white border-purple-200/80 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-gray-900">{draft.name}</h4>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            Contiene {draft.factor} {pluralizeUnitName(displayBaseUnit, draft.factor)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                            Se guardará con el producto
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 flex-wrap">
                          <span className="font-bold text-gray-900">
                            Precio: {formatCurrency(draft.price, currency)}
                          </span>
                          {useListPrice && draft.listPrice != null && Number(draft.listPrice) > 0 && (
                            <span className="text-gray-500">
                              Etiqueta: {formatCurrency(draft.listPrice, currency)}
                            </span>
                          )}
                          {draft.wholesalePrice != null && (
                            <span className="text-purple-700">
                              Mayor: {formatCurrency(draft.wholesalePrice, currency)} (≥ {draft.wholesaleMinQty})
                            </span>
                          )}
                          {draft.barcode && (
                            <span className="font-mono text-gray-500">Código: {draft.barcode}</span>
                          )}
                        </div>
                        {equivText && (
                          <p className="text-xs text-indigo-700 font-medium mt-1 bg-indigo-50/60 px-2 py-0.5 rounded-md inline-block">
                            Existencia actual: {equivText}
                          </p>
                        )}
                      </div>
                      {!isReadOnly && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDraft(draft)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Editar forma de venta"
                          >
                            <PencilSimple size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(draft.tempId)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Quitar forma de venta"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      {/* Modal / Formulario de Forma de venta */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  <Stack size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {editingPres || editingDraftId ? 'Editar forma de venta' : 'Nueva forma de venta'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Descuenta de la unidad base ({displayBaseUnit})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 space-y-3.5 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                  <WarningCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Nombre de la forma de venta <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Blíster x10, Caja x100, Saco 100 lb"
                  maxLength={100}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Contiene ({pluralizeUnitName(displayBaseUnit, 2)}) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={factor}
                    onChange={(e) => setFactor(e.target.value)}
                    placeholder="Ej. 10 o 100"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                  />
                  <p className="mt-1 text-xs text-gray-500">Cantidad de unidades base</p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="block text-xs font-semibold text-gray-800">
                      Precio de venta <span className="text-red-600">*</span>
                    </label>
                    {suggestedFormPrice !== null && (
                      <span className="text-xs font-medium text-purple-700 tabular-nums">
                        Sugerido: {formatCurrency(suggestedFormPrice, currency)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600 font-bold"
                  />
                </div>
              </div>

              {useListPrice && (
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Precio de etiqueta (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Precio mayorista (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    placeholder="Opcional"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Mínimo mayoreo
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="2"
                    value={wholesaleMinQty}
                    onChange={(e) => setWholesaleMinQty(e.target.value)}
                    placeholder="Ej. 3"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Código de barras de la forma de venta (opcional)
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Escaneá o escribí el código del blíster o caja..."
                  maxLength={50}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              {canManageCost && (
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Costo sugerido (solo visible para vos)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="Opcional"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-[40px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[40px] px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FloppyDisk size={16} weight="bold" />
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar forma de venta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal aviso de desactivación cuando PRESENTATION_IN_USE */}
      {inUsePresToDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <WarningCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Forma de venta con historial</h3>
                <p className="text-xs text-gray-500">Ya se usó en ventas o compras registradas</p>
              </div>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              La forma de venta <strong>"{inUsePresToDeactivate.name}"</strong> no se puede borrar para no alterar los comprobantes existentes. ¿Querés desactivarla para que no aparezca en nuevas ventas ni compras?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setInUsePresToDeactivate(null)}
                className="min-h-[40px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivateInUse}
                className="min-h-[40px] px-4 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check size={16} weight="bold" />
                <span>Desactivar forma de venta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
