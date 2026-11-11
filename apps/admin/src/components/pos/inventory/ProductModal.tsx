import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Sparkle,
  WarningCircle,
  Check,
  Info,
} from '@phosphor-icons/react';
import {
  PosProductItem,
  PosCategory,
  createPosProduct,
  updatePosProduct,
  getPosSuppliers,
  getPosProductFields,
} from 'api-client';
import {
  isPharmacyIndustry,
  validateProductForIndustry,
} from '../../../utils/productIndustryRules';
import { ListFieldSelect } from './ListFieldSelect';

interface ProductModalProps {
  isOpen: boolean;
  product?: PosProductItem | null;
  categories: PosCategory[];
  business?: any;
  currency?: string;
  onClose: () => void;
  onSaved: (product: PosProductItem) => void;
  onOpenCategoriesModal?: () => void;
}

export const generateAutoSku = (
  catId?: string,
  prodName?: string,
  catsList?: PosCategory[],
): string => {
  const cat = catsList?.find((c) => c.id === catId);
  let prefix = 'PRD';
  if (cat && cat.name) {
    prefix = cat.name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
  } else if (prodName && prodName.trim().length >= 3) {
    prefix = prodName.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  if (!prefix) prefix = 'PRD';
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${randomSuffix}`;
};

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  product,
  categories,
  business,
  currency = 'NIO',
  onClose,
  onSaved,
  onOpenCategoriesModal,
}) => {
  const isEditing = Boolean(product && product.id);

  // Core Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [isService, setIsService] = useState(false);
  const [unit, setUnit] = useState('UND');

  // Prices & Costs
  const [cost, setCost] = useState('');
  const [markupPct, setMarkupPct] = useState('');
  const [price, setPrice] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [taxable, setTaxable] = useState(false);

  // Wholesale
  const [enableWholesale, setEnableWholesale] = useState(false);
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('2');

  // Stock
  const [trackStock, setTrackStock] = useState(true);
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('0');

  // Industry / Dynamic Attributes (Pharmacy etc.)
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [laboratorio, setLaboratorio] = useState('');
  const [presentacion, setPresentacion] = useState('');
  const [principioActivo, setPrincipioActivo] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Pharmacy check
  const isPharmacy = useMemo(() => {
    return isPharmacyIndustry(business, dynamicFields);
  }, [business, dynamicFields]);

  const activeFields = useMemo(() => {
    let fields = (dynamicFields || []).filter((f: any) => f.isActive !== false && !f.key?.endsWith('_id'));

    // En rubro farmacia, asegurar que existan los 3 campos dinámicos obligatorios
    if (isPharmacy) {
      const existingKeys = new Set(fields.map((f: any) => f.key?.toLowerCase() || ''));
      const synthFields: any[] = [];
      if (!existingKeys.has('laboratorio') && !existingKeys.has('laboratory')) {
        synthFields.push({
          id: 'synth_laboratorio',
          key: 'laboratorio',
          label: 'Laboratorio',
          dataType: 'LIST',
          isActive: true,
          required: true,
          order: 1,
          allowCreateInline: true,
        });
      }
      if (!existingKeys.has('presentacion') && !existingKeys.has('presentation')) {
        synthFields.push({
          id: 'synth_presentacion',
          key: 'presentacion',
          label: 'Presentación',
          dataType: 'LIST',
          isActive: true,
          required: true,
          order: 2,
          allowCreateInline: true,
        });
      }
      if (
        !existingKeys.has('principio_activo') &&
        !existingKeys.has('active_ingredient') &&
        !existingKeys.has('activeingredient') &&
        !existingKeys.has('principioactivo')
      ) {
        synthFields.push({
          id: 'synth_principio_activo',
          key: 'principio_activo',
          label: 'Principio activo',
          dataType: 'TEXT',
          isActive: true,
          required: true,
          order: 3,
        });
      }
      if (synthFields.length > 0) {
        fields = [...fields, ...synthFields];
      }
    }

    const priorityMap: Record<string, number> = {
      laboratorio: 1,
      presentacion: 2,
      principio_activo: 3,
      principioactivo: 3,
      requiere_receta: 4,
      requierereceta: 4,
      receta: 4,
    };
    return [...fields].sort((a: any, b: any) => {
      const aPri = priorityMap[a.key?.toLowerCase() || ''] ?? 50;
      const bPri = priorityMap[b.key?.toLowerCase() || ''] ?? 50;
      if (aPri !== bPri) return aPri - bPri;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [dynamicFields, isPharmacy]);

  // Load suppliers and fields
  useEffect(() => {
    if (!isOpen) return;

    getPosSuppliers()
      .then((data) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => setSuppliers([]));

    getPosProductFields()
      .then((res: any) => {
        if (Array.isArray(res)) setDynamicFields(res);
        else if (res?.fields && Array.isArray(res.fields)) setDynamicFields(res.fields);
      })
      .catch(() => setDynamicFields([]));
  }, [isOpen]);

  // Initialize or populate form
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setFormErrors({});

    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setCategoryId(product.categoryId || product.category?.id || '');
      setSupplierId(product.supplierId || (product as any).supplier_id || '');
      setIsService(Boolean(product.isService || (product as any).type === 'SERVICE'));
      setUnit(product.unit || 'UND');

      const c = product.cost != null ? String(product.cost) : '';
      const p = product.price != null ? String(product.price) : '';
      setCost(c);
      setPrice(p);

      if (product.markupPct != null) {
        setMarkupPct(String(product.markupPct));
      } else if (Number(c) > 0 && Number(p) >= Number(c)) {
        const m = (((Number(p) - Number(c)) / Number(c)) * 100).toFixed(2);
        setMarkupPct(m);
      } else {
        setMarkupPct('');
      }

      setListPrice(product.listPrice != null ? String(product.listPrice) : '');
      setTaxable(Boolean(product.taxable));

      const wp = product.wholesalePrice ?? (product as any).wholesale_price;
      const wmq = product.wholesaleMinQty ?? (product as any).wholesale_min_qty;
      if (wp != null && Number(wp) > 0) {
        setEnableWholesale(true);
        setWholesalePrice(String(wp));
        setWholesaleMinQty(wmq != null ? String(wmq) : '2');
      } else {
        setEnableWholesale(false);
        setWholesalePrice('');
        setWholesaleMinQty('2');
      }

      setTrackStock(product.trackStock !== false);
      setStock(product.stock != null ? String(product.stock) : '0');
      setMinStock(product.minStock != null ? String(product.minStock) : '0');

      // Attributes & Rubro fields
      const rawAttrs =
        product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes)
          ? { ...product.attributes }
          : {};

      const lab = product.laboratorio || rawAttrs.laboratorio || rawAttrs.laboratory || '';
      const pres = product.presentacion || rawAttrs.presentacion || rawAttrs.presentation || '';
      const pa =
        product.principio_activo ||
        rawAttrs.principio_activo ||
        rawAttrs.activeIngredient ||
        rawAttrs.active_ingredient ||
        '';

      if (lab && !rawAttrs.laboratorio) rawAttrs.laboratorio = lab;
      if (pres && !rawAttrs.presentacion) rawAttrs.presentacion = pres;
      if (pa && !rawAttrs.principio_activo) rawAttrs.principio_activo = pa;

      setAttributes(rawAttrs);
      setLaboratorio(lab);
      setPresentacion(pres);
      setPrincipioActivo(pa);
    } else {
      // New product defaults
      setName('');
      const defaultCatId = categories.length > 0 ? categories[0].id : '';
      setCategoryId(defaultCatId);
      setSku(generateAutoSku(defaultCatId, '', categories));
      setBarcode('');
      setSupplierId('');
      setIsService(false);
      setUnit('UND');
      setCost('');
      setMarkupPct('');
      setPrice('');
      setListPrice('');
      setTaxable(false);
      setEnableWholesale(false);
      setWholesalePrice('');
      setWholesaleMinQty('2');
      setTrackStock(true);
      setStock('0');
      setMinStock('0');
      setAttributes({});
      setLaboratorio('');
      setPresentacion('');
      setPrincipioActivo('');
    }
  }, [isOpen, product, categories]);

  // Recalculations for Cost, Markup, and Price
  const handleCostChange = (newCostVal: string) => {
    setCost(newCostVal);
    const numCost = parseFloat(newCostVal);
    const numMarkup = parseFloat(markupPct);

    if (!isNaN(numCost) && numCost > 0 && !isNaN(numMarkup) && numMarkup >= 0) {
      const calculatedPrice = (numCost * (1 + numMarkup / 100)).toFixed(2);
      setPrice(calculatedPrice);
    } else {
      const numPrice = parseFloat(price);
      if (!isNaN(numCost) && numCost > 0 && !isNaN(numPrice) && numPrice >= 0) {
        const calculatedMarkup = (((numPrice - numCost) / numCost) * 100).toFixed(2);
        setMarkupPct(calculatedMarkup);
      }
    }
  };

  const handlePriceChange = (newPriceVal: string) => {
    setPrice(newPriceVal);
    const numPrice = parseFloat(newPriceVal);
    const numCost = parseFloat(cost);

    if (!isNaN(numPrice) && !isNaN(numCost) && numCost > 0) {
      const calculatedMarkup = (((numPrice - numCost) / numCost) * 100).toFixed(2);
      setMarkupPct(calculatedMarkup);
    }
  };

  const handleMarkupChange = (newMarkupVal: string) => {
    setMarkupPct(newMarkupVal);
    const numMarkup = parseFloat(newMarkupVal);
    const numCost = parseFloat(cost);

    if (!isNaN(numMarkup) && !isNaN(numCost) && numCost >= 0) {
      const calculatedPrice = (numCost * (1 + numMarkup / 100)).toFixed(2);
      setPrice(calculatedPrice);
    }
  };

  // Unit changes validation: if UND, enforce integers for stock
  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    if (newUnit === 'UND') {
      if (stock.includes('.')) setStock(String(Math.floor(parseFloat(stock) || 0)));
      if (minStock.includes('.')) setMinStock(String(Math.floor(parseFloat(minStock) || 0)));
    }
  };

  const handleGenerateSku = () => {
    setSku(generateAutoSku(categoryId, name, categories));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre del producto es obligatorio.');
      setFormErrors((prev) => ({ ...prev, name: 'El nombre es obligatorio' }));
      return;
    }

    if (!categoryId) {
      setError('Debes seleccionar una categoría.');
      setFormErrors((prev) => ({ ...prev, categoryId: 'Selecciona una categoría' }));
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('El precio debe ser un número mayor o igual a 0.');
      setFormErrors((prev) => ({ ...prev, price: 'Ingresa un precio válido' }));
      return;
    }

    const numCost = cost ? parseFloat(cost) : undefined;
    const numListPrice = listPrice ? parseFloat(listPrice) : undefined;
    const numStock = parseFloat(stock) || 0;
    const numMinStock = parseFloat(minStock) || 0;

    // Wholesale validation
    let numWholesalePrice: number | undefined;
    let numWholesaleMinQty: number | undefined;
    if (enableWholesale) {
      numWholesalePrice = parseFloat(wholesalePrice);
      numWholesaleMinQty = parseFloat(wholesaleMinQty);
      if (isNaN(numWholesalePrice) || numWholesalePrice <= 0) {
        setError('El precio por mayor debe ser mayor a 0.');
        setFormErrors((prev) => ({ ...prev, wholesalePrice: 'Ingresa un precio mayor a 0' }));
        return;
      }
      if (isNaN(numWholesaleMinQty) || numWholesaleMinQty < 2) {
        setError('La cantidad mínima de mayoreo debe ser al menos 2.');
        setFormErrors((prev) => ({ ...prev, wholesaleMinQty: 'Mínimo 2 unidades' }));
        return;
      }
    }

    // Industry validation (Pharmacy, etc.)
    const labVal = (attributes.laboratorio || laboratorio || '').trim();
    const presVal = (attributes.presentacion || presentacion || '').trim();
    const paVal = (attributes.principio_activo || principioActivo || '').trim();

    const mergedAttributes: Record<string, any> = {
      ...(product?.attributes || {}),
      ...attributes,
    };
    if (labVal) mergedAttributes.laboratorio = labVal;
    if (presVal) mergedAttributes.presentacion = presVal;
    if (paVal) mergedAttributes.principio_activo = paVal;

    const industryKey = business?.industryCode || business?.industry?.code || (isPharmacy ? 'farmacia' : '');
    const validationValues = {
      name: trimmedName,
      laboratorio: labVal,
      presentacion: presVal,
      principio_activo: paVal,
      listPrice: numListPrice,
      cost: numCost,
      price: numPrice,
      stock: numStock,
      minStock: numMinStock,
      supplierId: supplierId || null,
      attributes: mergedAttributes,
    };

    const industryValidation = validateProductForIndustry(
      industryKey,
      isService ? 'SERVICE' : 'PRODUCT',
      validationValues,
    );

    const combinedErrors: Record<string, string> = { ...industryValidation.errors };
    if (!isService) {
      for (const field of activeFields) {
        if (field.required && !field.key?.endsWith('_id')) {
          const val = mergedAttributes[field.key];
          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            if (!combinedErrors[field.key]) {
              combinedErrors[field.key] = `${field.label} es obligatorio.`;
            }
          }
        }
      }
    }

    if (Object.keys(combinedErrors).length > 0) {
      setFormErrors(combinedErrors);
      const firstErr = Object.values(combinedErrors)[0];
      setError(firstErr || 'Por favor completa todos los campos obligatorios del rubro.');
      return;
    }

    const dto: any = {
      name: trimmedName,
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      categoryId,
      supplierId: supplierId || undefined,
      unit,
      price: numPrice,
      cost: numCost,
      listPrice: numListPrice,
      markupPct: markupPct ? parseFloat(markupPct) : undefined,
      taxable,
      type: isService ? 'SERVICE' : 'PRODUCT',
      trackStock: isService ? false : trackStock,
      stock: isService ? 0 : numStock,
      minStock: isService ? 0 : numMinStock,
      wholesalePrice: enableWholesale ? numWholesalePrice : null,
      wholesaleMinQty: enableWholesale ? numWholesaleMinQty : null,
      laboratorio: labVal || undefined,
      presentacion: presVal || undefined,
      principio_activo: paVal || undefined,
      attributes: mergedAttributes,
    };

    setIsSaving(true);
    try {
      let saved: PosProductItem;
      if (isEditing && product) {
        saved = await updatePosProduct(product.id, dto);
      } else {
        saved = await createPosProduct(dto);
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Ocurrió un error al guardar el producto. Verifica los campos ingresados.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasBatches = Boolean(
    product &&
      (product.hasBatches ||
        product.tracksBatches ||
        (product.batchesCount && product.batchesCount > 0)),
  );
  const hasComponents = Boolean(
    product && product.components && product.components.length > 0,
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base">
              <Package size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                {isEditing ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <p className="text-xs text-gray-500">
                Completa la información del producto para tu catálogo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 shrink-0">
            <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Lotes y Recetas: Aviso de solo lectura */}
          {(hasBatches || hasComponents) && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <Info size={18} className="shrink-0 text-amber-700 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">
                  {hasBatches
                    ? 'Este producto tiene control de lotes y vencimientos activo.'
                    : 'Este producto contiene insumos y componentes de receta.'}
                </p>
                <p className="text-amber-800">
                  Esto se edita desde NEXOL POS en la computadora.
                </p>
              </div>
            </div>
          )}

          {/* 1. Información General */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Información general
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre del producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Arroz Faisán 50 lbs, Café Molido..."
                className={`w-full h-11 px-3 rounded-xl border text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs ${
                  formErrors.name ? 'border-red-500' : 'border-gray-200'
                }`}
                required
              />
              {formErrors.name && (
                <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Categoría */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  {onOpenCategoriesModal && (
                    <button
                      type="button"
                      onClick={onOpenCategoriesModal}
                      className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
                    >
                      + Gestionar
                    </button>
                  )}
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`w-full h-11 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer ${
                    formErrors.categoryId ? 'border-red-500' : 'border-gray-200'
                  }`}
                  required
                >
                  <option value="">Selecciona una categoría...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {formErrors.categoryId && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.categoryId}</p>
                )}
              </div>

              {/* Proveedor */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
                >
                  <option value="">Sin proveedor asignado</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SKU autogenerado */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Código SKU
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    <Sparkle size={13} weight="fill" />
                    <span>Autogenerar</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ej. ARR-542"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 font-mono placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
                />
              </div>

              {/* Código de barras */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Código de barras
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Escanear o escribir..."
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 font-mono placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
                />
              </div>
            </div>

            {/* Tipo: Producto vs Servicio */}
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-800">
                <input
                  type="radio"
                  name="productType"
                  checked={!isService}
                  onChange={() => setIsService(false)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold">Producto físico</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-800">
                <input
                  type="radio"
                  name="productType"
                  checked={isService}
                  onChange={() => {
                    setIsService(true);
                    setTrackStock(false);
                  }}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold">Servicio (sin inventario)</span>
              </label>
            </div>
          </div>

          {/* 2. Precios y Costos */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Precios y costos ({currency})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Costo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Costo de compra
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => handleCostChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 pl-7 pr-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Margen % */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Margen de ganancia
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={markupPct}
                    onChange={(e) => handleMarkupChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full h-11 pl-3 pr-7 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                    %
                  </span>
                </div>
              </div>

              {/* Precio de venta */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Precio de venta <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="0.00"
                    className={`w-full h-11 pl-7 pr-3 rounded-xl border text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs font-semibold ${
                      formErrors.price ? 'border-red-500' : 'border-gray-200'
                    }`}
                    required
                  />
                </div>
                {formErrors.price && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.price}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Precio de lista / etiqueta */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Precio de lista (etiqueta)
                  {isPharmacy && <span className="text-red-500"> *</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 pl-7 pr-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Impuesto IVA 15% */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={taxable}
                    onChange={(e) => setTaxable(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-semibold text-gray-900">
                    Aplica IVA (15%)
                  </span>
                </label>
              </div>
            </div>

            {/* Venta por mayor */}
            <div className="p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-800">
                <input
                  type="checkbox"
                  checked={enableWholesale}
                  onChange={(e) => setEnableWholesale(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold">
                  Habilitar precio por mayor
                </span>
              </label>

              {enableWholesale && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Precio mayorista <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={wholesalePrice}
                        onChange={(e) => setWholesalePrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-11 pl-7 pr-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
                        required={enableWholesale}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cantidad mínima de unidades <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="2"
                      value={wholesaleMinQty}
                      onChange={(e) => setWholesaleMinQty(e.target.value)}
                      placeholder="Ej. 6, 12..."
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
                      required={enableWholesale}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Inventario y Unidades (si no es servicio) */}
          {!isService && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                3. Inventario y unidades de medida
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Unidad de medida */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Unidad de medida <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
                  >
                    <option value="UND">Unidad (UND)</option>
                    <option value="LB">Libra (LB)</option>
                    <option value="KG">Kilogramo (KG)</option>
                    <option value="LT">Litro (LT)</option>
                    <option value="GAL">Galón (GAL)</option>
                  </select>
                </div>

                {/* Stock actual */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {isEditing ? 'Existencia actual' : 'Stock inicial'}
                  </label>
                  <input
                    type="number"
                    step={unit === 'UND' ? '1' : '0.01'}
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-purple-600 shadow-2xs font-semibold"
                  />
                </div>

                {/* Stock mínimo */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stock mínimo de alerta
                  </label>
                  <input
                    type="number"
                    step={unit === 'UND' ? '1' : '0.01'}
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Control de inventario toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={trackStock}
                    onChange={(e) => setTrackStock(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-semibold text-gray-900">
                    Descontar inventario automáticamente con cada venta
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 4. Campos del Rubro (Farmacia / Especializados de cualquier vertical) */}
          {!isService && activeFields.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                4. Datos del rubro{isPharmacy ? ' (Farmacia)' : (business?.industry?.name ? ` (${business.industry.name})` : '')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeFields.map((f: any) => {
                  const isFarmaciaReq =
                    isPharmacy &&
                    !isService &&
                    ['laboratorio', 'presentacion', 'principio_activo'].includes(f.key.toLowerCase());
                  const isRequired = f.required || isFarmaciaReq;
                  const fieldError = formErrors[f.key];

                  return (
                    <div key={f.id || f.key} className="flex flex-col justify-start">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {f.label} {isRequired && <span className="text-red-500">*</span>}
                      </label>

                      {f.dataType === 'BOOLEAN' ? (
                        <div className="flex items-center h-11">
                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(attributes[f.key])}
                              onChange={(e) => {
                                setAttributes((prev) => ({ ...prev, [f.key]: e.target.checked }));
                                if (formErrors[f.key]) {
                                  setFormErrors((prev) => ({ ...prev, [f.key]: undefined as any }));
                                }
                              }}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700 font-medium">
                              {f.key.toLowerCase().includes('receta')
                                ? attributes[f.key]
                                  ? 'Requiere receta médica'
                                  : 'Venta libre (sin receta)'
                                : f.label}
                            </span>
                          </label>
                        </div>
                      ) : f.dataType === 'LIST' ? (
                        <ListFieldSelect
                          field={f}
                          value={attributes[f.key] || ''}
                          hasError={Boolean(fieldError)}
                          businessId={business?.id}
                          onOptionCreated={(newOpt) => {
                            setDynamicFields((prev) =>
                              prev.map((item) =>
                                item.id === f.id
                                  ? {
                                      ...item,
                                      fieldOptions: [...(item.fieldOptions || []), newOpt].sort(
                                        (a, b) =>
                                          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
                                          a.label.localeCompare(b.label),
                                      ),
                                    }
                                  : item,
                              ),
                            );
                          }}
                          onChange={(label, optionId) => {
                            setAttributes((prev) => ({
                              ...prev,
                              [f.key]: label,
                              ...(optionId ? { [`${f.key}_id`]: optionId } : {}),
                            }));
                            if (f.key === 'laboratorio') setLaboratorio(label);
                            if (f.key === 'presentacion') setPresentacion(label);
                            if (formErrors[f.key]) {
                              setFormErrors((prev) => ({ ...prev, [f.key]: undefined as any }));
                            }
                          }}
                        />
                      ) : f.dataType === 'SELECT' ? (
                        <select
                          value={attributes[f.key] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAttributes((prev) => ({ ...prev, [f.key]: val }));
                            if (formErrors[f.key]) {
                              setFormErrors((prev) => ({ ...prev, [f.key]: undefined as any }));
                            }
                          }}
                          className={`w-full h-11 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none focus:border-purple-600 shadow-2xs ${
                            fieldError ? 'border-red-500' : 'border-gray-200'
                          }`}
                        >
                          <option value="">Seleccionar...</option>
                          {(Array.isArray(f.options)
                            ? f.options
                            : typeof f.options === 'string'
                            ? f.options.split(',').map((s: string) => s.trim())
                            : []
                          ).map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.dataType === 'NUMBER' ? 'number' : f.dataType === 'DATE' ? 'date' : 'text'}
                          value={attributes[f.key] ?? ''}
                          onChange={(e) => {
                            const val =
                              f.dataType === 'NUMBER'
                                ? parseFloat(e.target.value) || 0
                                : e.target.value;
                            setAttributes((prev) => ({ ...prev, [f.key]: val }));
                            if (f.key === 'principio_activo') setPrincipioActivo(e.target.value);
                            if (formErrors[f.key]) {
                              setFormErrors((prev) => ({ ...prev, [f.key]: undefined as any }));
                            }
                          }}
                          placeholder={
                            f.key === 'principio_activo'
                              ? 'Ej. Ibuprofeno 400mg...'
                              : `Ingresá ${(f.label || '').toLowerCase()}...`
                          }
                          className={`w-full h-11 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none focus:border-purple-600 shadow-2xs ${
                            fieldError ? 'border-red-500' : 'border-gray-200'
                          }`}
                        />
                      )}

                      {fieldError && <p className="text-xs text-red-600 mt-1">{fieldError}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="h-2" />
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="min-h-[44px] px-5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check size={16} weight="bold" />
                <span>{isEditing ? 'Guardar cambios' : 'Crear producto'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

