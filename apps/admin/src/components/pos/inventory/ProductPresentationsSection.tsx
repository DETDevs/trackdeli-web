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

interface ProductPresentationsSectionProps {
  productId?: string;
  unit: string;
  currentStock: number;
  currency: string;
  canManageCost: boolean;
  isReadOnly: boolean;
  businessId?: string;
  onPresentationsChanged?: (count: number) => void;
}

export const ProductPresentationsSection: React.FC<ProductPresentationsSectionProps> = ({
  productId,
  unit,
  currentStock,
  currency,
  canManageCost,
  isReadOnly,
  businessId,
  onPresentationsChanged,
}) => {
  const [presentations, setPresentations] = useState<PosProductPresentation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal para crear / editar presentación
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPres, setEditingPres] = useState<PosProductPresentation | null>(null);
  const [name, setName] = useState('');
  const [factor, setFactor] = useState('');
  const [price, setPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('');
  const [barcode, setBarcode] = useState('');
  const [cost, setCost] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmación de desactivación cuando PRESENTATION_IN_USE
  const [inUsePresToDeactivate, setInUsePresToDeactivate] = useState<PosProductPresentation | null>(null);

  const loadPresentations = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPosPresentations(productId, businessId);
      const list = Array.isArray(data) ? data : [];
      setPresentations(list);
      onPresentationsChanged?.(list.length);
    } catch (err: any) {
      setError('No se pudieron cargar las presentaciones.');
    } finally {
      setIsLoading(false);
    }
  }, [productId, businessId, onPresentationsChanged]);

  useEffect(() => {
    loadPresentations();
  }, [loadPresentations]);

  const handleOpenCreate = () => {
    setEditingPres(null);
    setName('');
    setFactor('');
    setPrice('');
    setWholesalePrice('');
    setWholesaleMinQty('');
    setBarcode('');
    setCost('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (pres: PosProductPresentation) => {
    setEditingPres(pres);
    setName(pres.name);
    setFactor(String(pres.factor));
    setPrice(String(pres.price));
    setWholesalePrice(pres.wholesalePrice != null ? String(pres.wholesalePrice) : '');
    setWholesaleMinQty(pres.wholesaleMinQty != null ? String(pres.wholesaleMinQty) : '');
    setBarcode(pres.barcode || '');
    setCost(pres.cost != null ? String(pres.cost) : '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    const cleanName = name.trim();
    const parsedFactor = parseFloat(factor);
    const parsedPrice = parseFloat(price);

    if (!cleanName) {
      setFormError('El nombre de la presentación es obligatorio.');
      return;
    }
    if (isNaN(parsedFactor) || parsedFactor <= 0) {
      setFormError('El factor de conversión debe ser un número mayor a 0.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('El precio debe ser un número mayor o igual a 0.');
      return;
    }

    const parsedWp = wholesalePrice.trim() ? parseFloat(wholesalePrice) : null;
    const parsedWmq = wholesaleMinQty.trim() ? parseFloat(wholesaleMinQty) : null;
    if (parsedWp !== null && (isNaN(parsedWp) || parsedWp < 0)) {
      setFormError('El precio por mayor no puede ser negativo.');
      return;
    }
    if (parsedWmq !== null && (isNaN(parsedWmq) || parsedWmq < 2)) {
      setFormError('La cantidad mínima por mayor debe ser al menos 2.');
      return;
    }

    const parsedCost = cost.trim() ? parseFloat(cost) : null;
    if (parsedCost !== null && (isNaN(parsedCost) || parsedCost < 0)) {
      setFormError('El costo no puede ser negativo.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const dto: CreatePosPresentationDto = {
        name: cleanName,
        factor: parsedFactor,
        price: parsedPrice,
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
          'No se pudo guardar la presentación. Verificá que el código de barras no esté repetido.',
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
      setError('No se pudo cambiar el estado de la presentación.');
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
        setError(msg || 'No se pudo eliminar la presentación.');
      }
    }
  };

  const handleConfirmDeactivateInUse = async () => {
    if (!productId || !inUsePresToDeactivate) return;
    try {
      await updatePosPresentation(productId, inUsePresToDeactivate.id, { isActive: false }, businessId);
      setInUsePresToDeactivate(null);
      await loadPresentations();
    } catch (err: any) {
      setError('No se pudo desactivar la presentación.');
    }
  };

  // Helper para texto de equivalencia informativa
  const getEquivalenceText = (pres: PosProductPresentation) => {
    if (!pres.factor || pres.factor <= 0) return null;
    const stockVal = currentStock || 0;
    const fullUnits = Math.floor(stockVal / pres.factor);
    const remainder = stockVal % pres.factor;
    const cleanRemainder = Math.round(remainder * 1000) / 1000;

    return `${stockVal} ${unit} = ${fullUnits} ${pres.name}${
      cleanRemainder > 0 ? ` y ${cleanRemainder} ${unit}` : ''
    }`;
  };

  if (!productId) {
    return (
      <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-purple-900">
        <p className="font-semibold">Guardá el producto primero.</p>
        <p className="text-purple-700 mt-0.5">
          Una vez guardado el producto base, vas a poder crear presentaciones (ej. saco de 100 lb, caja de 24, blíster de 10) que descuentan de su misma existencia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
          <WarningCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Encabezado de presentaciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-800">
            Presentaciones para venta y compra
          </p>
          <p className="text-xs text-gray-500">
            Empaques de mayor volumen que descuentan de la unidad base ({unit})
          </p>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="min-h-[36px] px-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Nueva presentación</span>
          </button>
        )}
      </div>

      {/* Lista de presentaciones */}
      {isLoading ? (
        <p className="text-xs text-gray-500 py-3 text-center">Cargando presentaciones...</p>
      ) : presentations.length === 0 ? (
        <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-500">
          No hay presentaciones configuradas para este producto.
        </div>
      ) : (
        <div className="space-y-2">
          {presentations.map((pres) => {
            const equivText = getEquivalenceText(pres);

            return (
              <div
                key={pres.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  pres.isActive
                    ? 'bg-white border-gray-200 shadow-2xs'
                    : 'bg-gray-50/70 border-gray-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900">{pres.name}</h4>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        Trae {pres.factor} {unit}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                          pres.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {pres.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {/* Precios y detalles */}
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 flex-wrap">
                      <span className="font-bold text-gray-900">
                        Precio: {formatCurrency(pres.price, currency)}
                      </span>
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

                    {/* Equivalencia informativa */}
                    {equivText && (
                      <p className="text-xs text-indigo-700 font-medium mt-1 bg-indigo-50/60 px-2 py-0.5 rounded-md inline-block">
                        Existencia actual: {equivText}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  {!isReadOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(pres)}
                        className={`min-h-[32px] px-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                          pres.isActive
                            ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                        title={pres.isActive ? 'Desactivar presentación' : 'Activar presentación'}
                      >
                        {pres.isActive ? 'Desactivar' : 'Activar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(pres)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Editar presentación"
                      >
                        <PencilSimple size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(pres)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar presentación"
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

      {/* Modal / Formulario de Presentación */}
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
                    {editingPres ? 'Editar presentación' : 'Nueva presentación'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Descuenta de la unidad base ({unit})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
                  Nombre de la presentación <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Saco 100 lb, Caja x 24, Blíster x 10"
                  maxLength={100}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Unidades base ({unit}) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={factor}
                    onChange={(e) => setFactor(e.target.value)}
                    placeholder="Ej. 100 o 24"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                  />
                  <p className="mt-1 text-xs text-gray-400">Factor de conversión</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Precio de venta <span className="text-red-600">*</span>
                  </label>
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
                  Código de barras de la presentación (opcional)
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Escaneá o escribí el código de la caja o saco..."
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
                  className="min-h-[40px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[40px] px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <FloppyDisk size={16} weight="bold" />
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar presentación'}</span>
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
                <h3 className="text-sm font-bold text-gray-900">Presentación con historial</h3>
                <p className="text-xs text-gray-500">Ya se usó en ventas o compras registradas</p>
              </div>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              La presentación <strong>"{inUsePresToDeactivate.name}"</strong> no se puede borrar para no alterar los comprobantes existentes. ¿Querés desactivarla para que no aparezca en nuevas ventas ni compras?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setInUsePresToDeactivate(null)}
                className="min-h-[40px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivateInUse}
                className="min-h-[40px] px-4 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Check size={16} weight="bold" />
                <span>Desactivar presentación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

