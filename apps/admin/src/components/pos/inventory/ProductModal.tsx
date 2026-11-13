import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  FloppyDisk,
  WarningCircle,
  Package,
  CurrencyDollar,
  Stack,
  Info,
  Plus,
  CaretDown,
  CaretUp,
  Tag,
  Clock,
  PencilSimple,
  Trash,
  ArrowsClockwise,
  Check,
  ChefHat,
  SlidersHorizontal,
} from '@phosphor-icons/react';
import {
  type PosProductItem,
  type PosCategory,
  type PosProductBatchItem,
  type PosSettingsData,
  type PosInventoryAdjustmentType,
  createPosProduct,
  updatePosProduct,
  getPosSuppliers,
  getPosProductFields,
  getPosProductBatches,
  updatePosBatch,
  getPosSettings,
} from 'api-client';
import { useAuthStore } from '../../../store/auth.store';
import {
  isPharmacyIndustry,
  validateProductForIndustry,
} from '../../../utils/productIndustryRules';
import {
  parseCostInput,
  computeSuggestedPrice,
  computeProfitSummary,
  extractApiErrorMessage,
} from '../../../utils/productCost';
import { getBatchStatusMeta } from '../../../utils/batchStatus';
import { formatCurrency, formatQuantity } from '../../../utils/formatters';
import { formatManaguaDate } from '../../../utils/dateManagua';
import { ListFieldSelect, type ProductField } from './ListFieldSelect';
import { EditBatchModal, type BatchToEdit } from './EditBatchModal';

interface ProductModalProps {
  isOpen: boolean;
  product?: PosProductItem | null;
  categories: PosCategory[];
  business?: any;
  posSettings?: PosSettingsData | null;
  currency?: string;
  onClose: () => void;
  onSaved: () => void;
  onOpenCategoriesModal?: () => void;
  onRequestStockAdjustment?: (
    product: PosProductItem,
    opts?: {
      initialType?: PosInventoryAdjustmentType;
      initialBatchId?: string;
      initialBatchNumber?: string;
      initialQty?: number;
    },
  ) => void;
}

const ALLOWED_UNITS = [
  { value: 'UND', label: 'Unidad (UND)' },
  { value: 'LT', label: 'Litro (LT)' },
  { value: 'GAL', label: 'Galón (GAL)' },
  { value: 'KG', label: 'Kilogramo (KG)' },
  { value: 'LB', label: 'Libra (LB)' },
];

type SectionKey = 'basic' | 'pricing' | 'inventory' | 'batches' | 'operation';

const normalizeDynamicAttributeValue = (val: any): string => {
  if (val === undefined || val === null) return '';
  if (typeof val === 'object') return String(val.label || val.name || val.id || '');
  return String(val);
};

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  product,
  categories,
  business,
  posSettings: posSettingsProp,
  currency = 'NIO',
  onClose,
  onSaved,
  onOpenCategoriesModal,
  onRequestStockAdjustment,
}) => {
  const user = useAuthStore((s) => s.user);
  const userRole = String(user?.role || '').toUpperCase();
  const isReadOnly = userRole !== 'SUPERADMIN' && userRole !== 'ENCARGADO';

  const [fetchedSettings, setFetchedSettings] = useState<PosSettingsData | null>(
    posSettingsProp ?? null,
  );

  // Settings & Business policies (paridad con pos-desktop)
  const effectiveSettings = posSettingsProp ?? fetchedSettings;
  const businessTracksBatches = Boolean(
    business?.tracksBatches ?? (user as any)?.business?.tracksBatches,
  );
  const canManageBatches = !isReadOnly && businessTracksBatches;
  const useListPrice = Boolean(
    business?.useListPrice ?? (user as any)?.business?.useListPrice,
  );
  const rawDefaultMarkup =
    business?.defaultMarkupPct ?? (user as any)?.business?.defaultMarkupPct;
  const defaultMarkupPct =
    rawDefaultMarkup !== undefined && rawDefaultMarkup !== null && !isNaN(Number(rawDefaultMarkup))
      ? Number(rawDefaultMarkup)
      : null;

  const wholesaleEnabled = Boolean(
    effectiveSettings?.wholesale_enabled ??
      effectiveSettings?.wholesaleEnabled ??
      business?.wholesaleEnabled ??
      business?.wholesale_enabled,
  );
  const posVertical = String(
    effectiveSettings?.posVertical ?? business?.posVertical ?? 'RETAIL',
  ).toUpperCase();
  const isRestaurant = posVertical === 'RESTAURANTE';
  const isTaller =
    posVertical === 'TALLER' ||
    business?.salonProfile === 'TALLER' ||
    business?.industry?.code?.toLowerCase() === 'taller';
  const isWholesaleActive = wholesaleEnabled && !isRestaurant && !isTaller;

  const taxEnabled = Boolean(effectiveSettings?.taxEnabled ?? business?.taxEnabled);
  const taxRate = Number(effectiveSettings?.taxRate ?? business?.taxRate ?? 0);

  // Form States
  const [itemType, setItemType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [unit, setUnit] = useState('UND');

  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [markupPct, setMarkupPct] = useState('');
  const [taxable, setTaxable] = useState(false);
  const [listPrice, setListPrice] = useState('');

  const [wholesaleEnabledLocal, setWholesaleEnabledLocal] = useState(false);
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('');

  const [trackStock, setTrackStock] = useState(true);
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('5');
  const [maxStock, setMaxStock] = useState('');

  // Batches states
  const [tracksBatches, setTracksBatches] = useState(false);
  const [confirmedInitialBatch, setConfirmedInitialBatch] = useState(false);
  const [confirmedDisableBatches, setConfirmedDisableBatches] = useState(false);
  const [pendingEnableBatchesConfirm, setPendingEnableBatchesConfirm] = useState(false);
  const [pendingDisableBatchesConfirm, setPendingDisableBatchesConfirm] = useState(false);

  const [initialLotNumber, setInitialLotNumber] = useState('');
  const [initialExpiryDate, setInitialExpiryDate] = useState('');

  const [batches, setBatches] = useState<PosProductBatchItem[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [singleBatchId, setSingleBatchId] = useState<string | null>(null);
  const [singleBatchNumber, setSingleBatchNumber] = useState('');
  const [singleBatchExpiry, setSingleBatchExpiry] = useState('');
  const [originalSingleBatch, setOriginalSingleBatch] = useState<{
    number: string;
    expiry: string;
  } | null>(null);

  const [batchToEdit, setBatchToEdit] = useState<BatchToEdit | null>(null);
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false);

  // Operation states
  const [sendToKitchen, setSendToKitchen] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Dynamic attributes
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  // Auxiliary data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productFields, setProductFields] = useState<ProductField[]>([]);

  // Accordion & UI states
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    pricing: true,
    inventory: true,
    batches: true,
    operation: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const initialSnapshotRef = useRef<string>('');
  const errorBannerRef = useRef<HTMLDivElement>(null);

  const isPharmacy = useMemo(
    () => isPharmacyIndustry(business, productFields),
    [business, productFields],
  );
  const isService = itemType === 'SERVICE';
  const hasComponents = Boolean(product?.components && product.components.length > 0);
  const activeCustomFields = useMemo(
    () => productFields.filter((f) => f.isActive !== false && !f.key?.endsWith('_id')),
    [productFields],
  );

  // Load settings if parent didn't pass them
  useEffect(() => {
    if (!isOpen) return;
    if (posSettingsProp) {
      setFetchedSettings(posSettingsProp);
      return;
    }
    getPosSettings()
      .then((data) => setFetchedSettings(data))
      .catch(() => {});
  }, [isOpen, posSettingsProp]);

  // Load suppliers and field definitions
  useEffect(() => {
    if (!isOpen) return;
    getPosSuppliers()
      .then((data) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => setSuppliers([]));

    getPosProductFields()
      .then((data) => setProductFields(Array.isArray(data) ? data : []))
      .catch(() => setProductFields([]));
  }, [isOpen]);

  const loadBatches = useCallback(async (productId: string) => {
    setIsLoadingBatches(true);
    setBatchesError(null);
    try {
      const res = await getPosProductBatches(productId);
      const list = Array.isArray(res?.batches) ? res.batches : [];
      setBatches(list);
      if (list.length === 1) {
        const b = list[0];
        const exp = b.expiryDate ? String(b.expiryDate).slice(0, 10) : '';
        setSingleBatchId(b.id);
        setSingleBatchNumber(b.batchNumber || '');
        setSingleBatchExpiry(exp);
        setOriginalSingleBatch({ number: b.batchNumber || '', expiry: exp });
      } else {
        setSingleBatchId(null);
        setSingleBatchNumber('');
        setSingleBatchExpiry('');
        setOriginalSingleBatch(null);
      }
    } catch (err: any) {
      setBatchesError(extractApiErrorMessage(err, 'No se pudieron cargar los lotes.'));
      setBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);

  // Build snapshot helper for unsaved changes detection
  const buildFormSnapshot = useCallback(
    (vals: {
      itemType: string;
      name: string;
      description: string;
      barcode: string;
      sku: string;
      categoryId: string;
      supplierId: string;
      unit: string;
      price: string;
      cost: string;
      markupPct: string;
      taxable: boolean;
      listPrice: string;
      wholesaleEnabledLocal: boolean;
      wholesalePrice: string;
      wholesaleMinQty: string;
      trackStock: boolean;
      stock: string;
      minStock: string;
      maxStock: string;
      tracksBatches: boolean;
      initialLotNumber: string;
      initialExpiryDate: string;
      singleBatchNumber: string;
      singleBatchExpiry: string;
      sendToKitchen: boolean;
      isActive: boolean;
      attributes: Record<string, any>;
    }) => JSON.stringify(vals),
    [],
  );

  // Sync modal fields on open / product change
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setFieldErrors({});
    setShowDiscardConfirm(false);
    setPendingEnableBatchesConfirm(false);
    setPendingDisableBatchesConfirm(false);
    setConfirmedInitialBatch(false);
    setConfirmedDisableBatches(false);

    if (product) {
      const nextType: 'PRODUCT' | 'SERVICE' =
        product.isService || product.type === 'SERVICE' ? 'SERVICE' : 'PRODUCT';
      const nextName = product.name || '';
      const nextDesc = product.description || '';
      const nextBarcode = product.barcode || '';
      const nextSku = product.sku || '';
      const nextCatId = product.categoryId || product.category?.id || '';
      const nextSuppId = product.supplierId || (product as any).supplier_id || '';
      const nextUnit = (product.unit || 'UND').toUpperCase();
      const nextPrice = product.price != null ? String(product.price) : '';
      const nextCost = product.cost != null ? String(product.cost) : '';
      const nextMarkup = product.markupPct != null ? String(product.markupPct) : '';
      const nextTaxable = Boolean(product.taxable);
      const nextListPrice = product.listPrice != null ? String(product.listPrice) : '';

      const wp = product.wholesalePrice ?? product.wholesale_price;
      const wmq = product.wholesaleMinQty ?? product.wholesale_min_qty;
      const hasWp = wp != null && Number(wp) > 0;
      const nextWp = hasWp ? String(wp) : '';
      const nextWmq = wmq != null && Number(wmq) > 0 ? String(wmq) : '';

      const nextTrackStock = nextType === 'SERVICE' ? false : product.trackStock ?? true;
      const nextStock = product.stock != null ? String(product.stock) : '0';
      const nextMinStock = product.minStock != null ? String(product.minStock) : '0';
      const nextMaxStock = product.maxStock != null ? String(product.maxStock) : '';
      const nextTracksBatches = Boolean(product.tracksBatches);
      const nextSendToKitchen =
        product.sendToKitchen !== undefined ? Boolean(product.sendToKitchen) : true;
      const nextIsActive = product.isActive !== false;
      const nextAttrs: Record<string, any> =
        product.attributes && typeof product.attributes === 'object'
          ? { ...product.attributes }
          : {};
      if (product.laboratorio && !nextAttrs.laboratorio) nextAttrs.laboratorio = product.laboratorio;
      if (product.presentacion && !nextAttrs.presentacion) nextAttrs.presentacion = product.presentacion;
      if (product.principio_activo && !nextAttrs.principio_activo) {
        nextAttrs.principio_activo = product.principio_activo;
      }

      setItemType(nextType);
      setName(nextName);
      setDescription(nextDesc);
      setBarcode(nextBarcode);
      setSku(nextSku);
      setCategoryId(nextCatId);
      setSupplierId(nextSuppId);
      setUnit(nextUnit);
      setPrice(nextPrice);
      setCost(nextCost);
      setMarkupPct(nextMarkup);
      setTaxable(nextTaxable);
      setListPrice(nextListPrice);
      setWholesaleEnabledLocal(hasWp);
      setWholesalePrice(nextWp);
      setWholesaleMinQty(nextWmq);
      setTrackStock(nextTrackStock);
      setStock(nextStock);
      setMinStock(nextMinStock);
      setMaxStock(nextMaxStock);
      setTracksBatches(nextTracksBatches);
      setInitialLotNumber('');
      setInitialExpiryDate('');
      setSendToKitchen(nextSendToKitchen);
      setIsActive(nextIsActive);
      setAttributes(nextAttrs);
      setOpenSections({
        basic: true,
        pricing: true,
        inventory: nextType !== 'SERVICE',
        batches: Boolean(businessTracksBatches && nextTracksBatches),
        operation: Boolean(isRestaurant),
      });

      initialSnapshotRef.current = buildFormSnapshot({
        itemType: nextType,
        name: nextName,
        description: nextDesc,
        barcode: nextBarcode,
        sku: nextSku,
        categoryId: nextCatId,
        supplierId: nextSuppId,
        unit: nextUnit,
        price: nextPrice,
        cost: nextCost,
        markupPct: nextMarkup,
        taxable: nextTaxable,
        listPrice: nextListPrice,
        wholesaleEnabledLocal: hasWp,
        wholesalePrice: nextWp,
        wholesaleMinQty: nextWmq,
        trackStock: nextTrackStock,
        stock: nextStock,
        minStock: nextMinStock,
        maxStock: nextMaxStock,
        tracksBatches: nextTracksBatches,
        initialLotNumber: '',
        initialExpiryDate: '',
        singleBatchNumber: '',
        singleBatchExpiry: '',
        sendToKitchen: nextSendToKitchen,
        isActive: nextIsActive,
        attributes: nextAttrs,
      });

      if (canManageBatches && nextTracksBatches && product.id) {
        loadBatches(product.id);
      } else {
        setBatches([]);
        setSingleBatchId(null);
        setSingleBatchNumber('');
        setSingleBatchExpiry('');
        setOriginalSingleBatch(null);
      }
    } else {
      const defaultCatId = categories[0]?.id || '';
      const defaultTrackStock = !isRestaurant;
      const defaultTracksBatches = Boolean(canManageBatches && isPharmacy);

      setItemType('PRODUCT');
      setName('');
      setDescription('');
      setBarcode('');
      setSku('');
      setCategoryId(defaultCatId);
      setSupplierId('');
      setUnit('UND');
      setPrice('');
      setCost('');
      setMarkupPct('');
      setTaxable(false);
      setListPrice('');
      setWholesaleEnabledLocal(false);
      setWholesalePrice('');
      setWholesaleMinQty('');
      setTrackStock(defaultTrackStock);
      setStock('0');
      setMinStock('5');
      setMaxStock('');
      setTracksBatches(defaultTracksBatches);
      setInitialLotNumber('');
      setInitialExpiryDate('');
      setSendToKitchen(true);
      setIsActive(true);
      setAttributes({});
      setBatches([]);
      setSingleBatchId(null);
      setSingleBatchNumber('');
      setSingleBatchExpiry('');
      setOriginalSingleBatch(null);
      setOpenSections({
        basic: true,
        pricing: true,
        inventory: true,
        batches: defaultTracksBatches,
        operation: Boolean(isRestaurant),
      });

      initialSnapshotRef.current = buildFormSnapshot({
        itemType: 'PRODUCT',
        name: '',
        description: '',
        barcode: '',
        sku: '',
        categoryId: defaultCatId,
        supplierId: '',
        unit: 'UND',
        price: '',
        cost: '',
        markupPct: '',
        taxable: false,
        listPrice: '',
        wholesaleEnabledLocal: false,
        wholesalePrice: '',
        wholesaleMinQty: '',
        trackStock: defaultTrackStock,
        stock: '0',
        minStock: '5',
        maxStock: '',
        tracksBatches: defaultTracksBatches,
        initialLotNumber: '',
        initialExpiryDate: '',
        singleBatchNumber: '',
        singleBatchExpiry: '',
        sendToKitchen: true,
        isActive: true,
        attributes: {},
      });
    }
  }, [
    isOpen,
    product,
    categories,
    businessTracksBatches,
    canManageBatches,
    isPharmacy,
    isRestaurant,
    loadBatches,
    buildFormSnapshot,
  ]);

  // Reload batches if user toggles tracksBatches ON when editing existing product
  useEffect(() => {
    if (isOpen && product?.id && canManageBatches && tracksBatches && batches.length === 0 && !isLoadingBatches) {
      loadBatches(product.id);
    }
  }, [isOpen, product?.id, canManageBatches, tracksBatches]);

  const parsedCostValue = useMemo(() => parseCostInput(cost), [cost]);
  const numericCost = typeof parsedCostValue === 'number' ? parsedCostValue : null;
  const numericPrice = useMemo(() => {
    if (!price.trim()) return null;
    const n = Number(price.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }, [price]);

  const effectiveMarkupPct = useMemo(() => {
    if (markupPct.trim() !== '') {
      const m = Number(markupPct.replace(',', '.'));
      return Number.isFinite(m) && m >= 0 ? m : null;
    }
    return defaultMarkupPct;
  }, [markupPct, defaultMarkupPct]);

  const suggestedPrice = useMemo(
    () => computeSuggestedPrice(numericCost, effectiveMarkupPct),
    [numericCost, effectiveMarkupPct],
  );

  const profitSummary = useMemo(
    () => computeProfitSummary(numericPrice, numericCost, unit, currency),
    [numericPrice, numericCost, unit, currency],
  );

  const currentSnapshot = buildFormSnapshot({
    itemType,
    name,
    description,
    barcode,
    sku,
    categoryId,
    supplierId,
    unit,
    price,
    cost,
    markupPct,
    taxable,
    listPrice,
    wholesaleEnabledLocal,
    wholesalePrice,
    wholesaleMinQty,
    trackStock,
    stock,
    minStock,
    maxStock,
    tracksBatches,
    initialLotNumber,
    initialExpiryDate,
    singleBatchNumber: '',
    singleBatchExpiry: '',
    sendToKitchen,
    isActive,
    attributes,
  });

  // Account for singleBatch initial snapshot load asynchronously
  const singleBatchDirty = Boolean(
    originalSingleBatch &&
      (singleBatchNumber !== originalSingleBatch.number ||
        singleBatchExpiry !== originalSingleBatch.expiry),
  );

  const isDirty =
    Boolean(initialSnapshotRef.current) &&
    (currentSnapshot !== initialSnapshotRef.current || singleBatchDirty);

  const handleRequestClose = () => {
    if (isSubmitting) return;
    if (!isReadOnly && isDirty && !showDiscardConfirm) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAttributeChange = (key: string, value: any, optionId?: string) => {
    setAttributes((prev) => {
      const next = { ...prev, [key]: value };
      if (optionId !== undefined) {
        next[`${key}_id`] = optionId;
      } else {
        delete next[`${key}_id`];
      }
      return next;
    });
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleTracksBatchesToggle = (checked: boolean) => {
    if (isReadOnly) return;
    setPendingEnableBatchesConfirm(false);
    setPendingDisableBatchesConfirm(false);

    if (checked && !tracksBatches) {
      const currentStockNum = parseFloat(stock) || (product?.stock ?? 0);
      if (product && currentStockNum > 0 && !confirmedInitialBatch) {
        setPendingEnableBatchesConfirm(true);
        return;
      }
      setTracksBatches(true);
      setOpenSections((prev) => ({ ...prev, batches: true }));
      return;
    }

    if (!checked && tracksBatches && product) {
      const activeCount = batches.filter((b) => Number(b.quantity) > 0).length;
      if (activeCount > 0 && !confirmedDisableBatches) {
        setPendingDisableBatchesConfirm(true);
        return;
      }
    }

    setTracksBatches(checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSubmitting) return;

    setError(null);
    setFieldErrors({});

    const nextFieldErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      nextFieldErrors.name = 'El nombre debe tener al menos 2 caracteres.';
    }
    if (!categoryId) {
      nextFieldErrors.categoryId = 'Seleccioná una categoría.';
    }

    if (parsedCostValue === 'invalid') {
      nextFieldErrors.cost = 'El costo no puede ser negativo.';
    }

    const numPrice = Number(price.replace(',', '.'));
    if (!price.trim() || !Number.isFinite(numPrice) || numPrice < 0) {
      nextFieldErrors.price = 'Ingresá un precio de venta válido (mayor o igual a 0).';
    }

    if (markupPct.trim() !== '') {
      const m = Number(markupPct.replace(',', '.'));
      if (!Number.isFinite(m) || m < 0 || m > 1000) {
        nextFieldErrors.markupPct = 'El margen debe estar entre 0% y 1000%.';
      }
    }

    if (isWholesaleActive && !isService && wholesaleEnabledLocal) {
      const wpNum = Number(wholesalePrice.replace(',', '.'));
      const wmqNum = Number(wholesaleMinQty.replace(',', '.'));
      if (!wholesalePrice.trim() || !Number.isFinite(wpNum) || wpNum <= 0) {
        nextFieldErrors.wholesalePrice = 'Ingresá un precio por mayor mayor a 0.';
      } else if (Number.isFinite(numPrice) && wpNum >= numPrice) {
        nextFieldErrors.wholesalePrice =
          'El precio por mayor debe ser menor al precio de venta normal.';
      }
      if (!wholesaleMinQty.trim() || !Number.isFinite(wmqNum) || wmqNum < 2) {
        nextFieldErrors.wholesaleMinQty = 'La cantidad mínima por mayor debe ser al menos 2.';
      }
    }

    // Validación de campos de farmacia (paridad con backend 233a)
    if (isPharmacy && !isService) {
      const validation = validateProductForIndustry('farmacia', itemType, {
        name: name.trim(),
        listPrice,
        cost,
        price,
        stock,
        minStock,
        supplierId,
        attributes,
      });
      if (!validation.isValid) {
        Object.assign(nextFieldErrors, validation.errors);
      }
    }

    // Validación de campos custom requeridos
    for (const f of activeCustomFields) {
      if (f.required) {
        const val = normalizeDynamicAttributeValue(attributes[f.key]).trim();
        if (!val) {
          nextFieldErrors[f.key] = `El campo "${f.label}" es obligatorio.`;
        }
      }
    }

    // Validación de lote único inline cuando edita
    if (product && canManageBatches && tracksBatches && singleBatchId && !singleBatchNumber.trim()) {
      nextFieldErrors.singleBatchNumber = 'El número de lote no puede estar vacío.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setOpenSections({
        basic: true,
        pricing: true,
        inventory: !isService,
        batches: Boolean(canManageBatches && tracksBatches),
        operation: Boolean(isRestaurant),
      });
      setError('Revisá los campos marcados antes de guardar.');
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const numListPrice =
      (useListPrice || (isPharmacy && !isService)) && listPrice.trim() !== ''
        ? Number(listPrice.replace(',', '.'))
        : product
        ? null
        : undefined;

    const numMarkupPct =
      markupPct.trim() !== '' ? Number(markupPct.replace(',', '.')) : product ? null : undefined;

    const parsedWp =
      isWholesaleActive && !isService && wholesaleEnabledLocal && wholesalePrice.trim() !== ''
        ? Number(wholesalePrice.replace(',', '.'))
        : product
        ? null
        : undefined;
    const parsedWmq =
      isWholesaleActive && !isService && wholesaleEnabledLocal && wholesaleMinQty.trim() !== ''
        ? Number(wholesaleMinQty.replace(',', '.'))
        : product
        ? null
        : undefined;

    const isUnd = unit === 'UND';
    const parseStockNum = (val: string) => {
      const n = Number(val.replace(',', '.')) || 0;
      return isUnd ? Math.round(n) : Number(n.toFixed(3));
    };

    const parsedStock = !isService && trackStock ? parseStockNum(stock) : 0;
    const parsedMinStock = !isService && trackStock ? parseStockNum(minStock) : undefined;
    const parsedMaxStock =
      !isService && trackStock && maxStock.trim() !== '' ? parseStockNum(maxStock) : undefined;

    const isPharmacyProduct = isPharmacy && !isService;
    const cleanedAttributes: Record<string, any> = { ...attributes };

    const payload: Record<string, any> = {
      name: name.trim(),
      description: description.trim() || undefined,
      type: itemType,
      categoryId,
      supplierId: supplierId || undefined,
      barcode: !isService ? barcode.trim() || undefined : undefined,
      sku: !isService ? sku.trim() || undefined : undefined,
      unit: isService ? 'UND' : unit,
      price: numPrice,
      cost: typeof parsedCostValue === 'number' ? parsedCostValue : product ? null : undefined,
      markupPct: numMarkupPct,
      taxable,
      listPrice: numListPrice,
      trackStock: isService ? false : trackStock,
      minStock: parsedMinStock,
      maxStock: parsedMaxStock,
      sendToKitchen: isRestaurant && !isService ? sendToKitchen : true,
      isActive,
      attributes: cleanedAttributes,
    };

    if (!product) {
      payload.stock = parsedStock;
      if (canManageBatches && trackStock && tracksBatches) {
        payload.tracksBatches = true;
        if (parsedStock > 0) {
          if (initialLotNumber.trim()) payload.initialLotNumber = initialLotNumber.trim();
          if (initialExpiryDate) payload.initialExpiryDate = initialExpiryDate;
        }
      }
    } else {
      // No sobrescribir stock directamente cuando tiene lotes activos para preservar SUM(ProductBatch.quantity)
      if (!isService && trackStock && !tracksBatches) {
        payload.stock = parsedStock;
      }
      if (canManageBatches && trackStock) {
        payload.tracksBatches = tracksBatches;
        if (confirmedInitialBatch || confirmedDisableBatches) {
          payload.confirm = true;
        }
      }
    }

    if (isWholesaleActive && !isService) {
      payload.wholesalePrice = parsedWp;
      payload.wholesaleMinQty = parsedWmq;
      payload.wholesale_price = parsedWp;
      payload.wholesale_min_qty = parsedWmq;
    }

    if (isPharmacyProduct) {
      payload.laboratorio = normalizeDynamicAttributeValue(cleanedAttributes.laboratorio) || undefined;
      payload.presentacion = normalizeDynamicAttributeValue(cleanedAttributes.presentacion) || undefined;
      payload.principio_activo =
        normalizeDynamicAttributeValue(cleanedAttributes.principio_activo) || undefined;
    }

    setIsSubmitting(true);
    try {
      if (product) {
        await updatePosProduct(product.id, payload);
        if (canManageBatches && tracksBatches && singleBatchId && originalSingleBatch) {
          if (
            singleBatchNumber.trim() !== originalSingleBatch.number ||
            singleBatchExpiry !== originalSingleBatch.expiry
          ) {
            await updatePosBatch(singleBatchId, {
              batchNumber: singleBatchNumber.trim(),
              expiryDate: singleBatchExpiry ? singleBatchExpiry : null,
            });
          }
        }
      } else {
        await createPosProduct(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      const msg = extractApiErrorMessage(err, 'No se pudo guardar el producto.');
      setError(msg);
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isUnd = unit === 'UND';
  const showBatchesSection = canManageBatches && !isService && trackStock;
  const batchesWithoutDateCount = batches.filter((b) => !b.expiryDate && b.quantity > 0).length;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <div className="relative bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl lg:max-w-3xl sm:rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          {/* Header fijo */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Package size={20} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h2 id="product-modal-title" className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {isReadOnly
                    ? 'Detalle de producto'
                    : product
                    ? 'Editar producto'
                    : isService
                    ? 'Nuevo servicio'
                    : 'Nuevo producto'}
                </h2>
                <p className="text-xs text-gray-600 truncate">
                  {isReadOnly
                    ? 'Vista de solo lectura según tu rol'
                    : isPharmacy
                    ? 'Ficha farmacéutica y control FEFO'
                    : 'Completá la información del catálogo'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestClose}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Cerrar formulario"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Guardia de cambios sin guardar inline */}
          {showDiscardConfirm && (
            <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950 shrink-0">
              <span className="font-semibold">
                Tenés cambios sin guardar. ¿Querés descartarlos y cerrar?
              </span>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="min-h-[36px] px-3 rounded-lg bg-white border border-amber-300 text-amber-950 font-semibold hover:bg-amber-100"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[36px] px-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* Body con scroll + Footer fijo */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isReadOnly && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                <Info size={18} className="shrink-0 text-blue-700 mt-0.5" />
                <span>
                  Solo un Encargado o Administrador puede crear o modificar productos y lotes.
                </span>
              </div>
            )}

            {hasComponents && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <Info size={18} className="shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p className="font-semibold">Este servicio/producto incluye receta de insumos.</p>
                  <p className="text-amber-800 mt-0.5">
                    Los componentes de receta se gestionan desde NEXOL POS de escritorio.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div
                ref={errorBannerRef}
                className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800"
              >
                <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* SECCIÓN 1: DATOS BÁSICOS */}
            <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('basic')}
                className="w-full px-4 py-3 bg-gray-50/70 flex items-center justify-between text-left border-b border-gray-100"
              >
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={15} className="text-purple-700" />
                  <span>Datos básicos</span>
                </span>
                {openSections.basic ? (
                  <CaretUp size={16} className="text-gray-600" />
                ) : (
                  <CaretDown size={16} className="text-gray-600" />
                )}
              </button>

              {openSections.basic && (
                <div className="p-4 space-y-3.5">
                  {/* Tipo Producto vs Servicio */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                      Tipo en catálogo
                    </label>
                    <div className="grid grid-cols-2 rounded-xl border border-gray-200 p-1 bg-gray-50 gap-1">
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          setItemType('PRODUCT');
                          setTrackStock(!isRestaurant);
                        }}
                        className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                          itemType === 'PRODUCT'
                            ? 'bg-white text-purple-700 shadow-2xs border border-purple-200'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Producto físico
                      </button>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          setItemType('SERVICE');
                          setTrackStock(false);
                        }}
                        className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                          itemType === 'SERVICE'
                            ? 'bg-white text-purple-700 shadow-2xs border border-purple-200'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Servicio
                      </button>
                    </div>
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Nombre <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                      }}
                      placeholder="Ej. Acetaminofén 500 mg caja x 10"
                      className={`w-full h-11 px-3 rounded-xl border text-xs text-gray-900 focus:outline-none disabled:bg-gray-50 ${
                        fieldErrors.name
                          ? 'border-red-500 bg-red-50/20'
                          : 'border-gray-200 focus:border-purple-600'
                      }`}
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs text-red-700 font-medium">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Descripción (opcional)
                    </label>
                    <textarea
                      rows={2}
                      disabled={isReadOnly}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Notas breves o detalles visibles en ficha..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600 disabled:bg-gray-50 resize-none"
                    />
                  </div>

                  {/* Categoría + Proveedor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-800">
                          Categoría <span className="text-red-600">*</span>
                        </label>
                        {!isReadOnly && onOpenCategoriesModal && (
                          <button
                            type="button"
                            onClick={onOpenCategoriesModal}
                            className="text-xs font-semibold text-purple-700 hover:underline flex items-center gap-0.5"
                          >
                            <Plus size={12} weight="bold" />
                            <span>Nueva</span>
                          </button>
                        )}
                      </div>
                      <select
                        disabled={isReadOnly}
                        value={categoryId}
                        onChange={(e) => {
                          setCategoryId(e.target.value);
                          if (fieldErrors.categoryId) {
                            setFieldErrors((p) => ({ ...p, categoryId: '' }));
                          }
                        }}
                        className={`w-full h-11 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none disabled:bg-gray-50 ${
                          fieldErrors.categoryId
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-gray-200 focus:border-purple-600'
                        }`}
                      >
                        <option value="">Seleccioná categoría...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.categoryId && (
                        <p className="mt-1 text-xs text-red-700 font-medium">
                          {fieldErrors.categoryId}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Proveedor {isPharmacy && !isService && <span className="text-red-600">*</span>}
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={supplierId}
                        onChange={(e) => {
                          setSupplierId(e.target.value);
                          if (fieldErrors.supplierId) {
                            setFieldErrors((p) => ({ ...p, supplierId: '' }));
                          }
                        }}
                        className={`w-full h-11 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none disabled:bg-gray-50 ${
                          fieldErrors.supplierId
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-gray-200 focus:border-purple-600'
                        }`}
                      >
                        <option value="">Sin proveedor asignado</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.supplierId && (
                        <p className="mt-1 text-xs text-red-700 font-medium">
                          {fieldErrors.supplierId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Código de barras + SKU */}
                  {!isService && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Código de barras
                        </label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          placeholder="Escaneá o escribí el código..."
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          SKU / Código interno
                        </label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="Opcional"
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600 disabled:bg-gray-50"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campos del rubro y personalizados */}
                  {activeCustomFields.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 space-y-3">
                      <p className="text-xs font-bold text-gray-700">
                        {isPharmacy ? 'Datos farmacéuticos y de catálogo' : 'Campos del catálogo'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeCustomFields.map((field) => {
                          const isRequiredByIndustry =
                            isPharmacy &&
                            !isService &&
                            ['laboratorio', 'presentacion', 'principio_activo'].includes(
                              field.key.toLowerCase(),
                            );
                          const isReq = Boolean(field.required || isRequiredByIndustry);
                          const valStr = normalizeDynamicAttributeValue(attributes[field.key]);
                          const errMsg = fieldErrors[field.key];

                          if (field.dataType === 'LIST') {
                            return (
                              <div key={field.id} className="sm:col-span-1">
                                <label className="block text-xs font-semibold text-gray-800 mb-1">
                                  {field.label} {isReq && <span className="text-red-600">*</span>}
                                </label>
                                <ListFieldSelect
                                  field={field}
                                  value={valStr}
                                  disabled={isReadOnly}
                                  hasError={Boolean(errMsg)}
                                  businessId={business?.id}
                                  onChange={(label, optionId) =>
                                    handleAttributeChange(field.key, label, optionId)
                                  }
                                />
                                {errMsg && (
                                  <p className="mt-1 text-xs text-red-700 font-medium">{errMsg}</p>
                                )}
                              </div>
                            );
                          }

                          if (field.dataType === 'BOOLEAN') {
                            const checked = Boolean(attributes[field.key]);
                            return (
                              <div
                                key={field.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50"
                              >
                                <span className="text-xs font-semibold text-gray-800">
                                  {field.label}
                                </span>
                                <input
                                  type="checkbox"
                                  disabled={isReadOnly}
                                  checked={checked}
                                  onChange={(e) =>
                                    handleAttributeChange(field.key, e.target.checked)
                                  }
                                  className="w-5 h-5 text-purple-600 rounded border-gray-300"
                                />
                              </div>
                            );
                          }

                          return (
                            <div key={field.id}>
                              <label className="block text-xs font-semibold text-gray-800 mb-1">
                                {field.label} {isReq && <span className="text-red-600">*</span>}
                              </label>
                              <input
                                type={
                                  field.dataType === 'NUMBER'
                                    ? 'number'
                                    : field.dataType === 'DATE'
                                    ? 'date'
                                    : 'text'
                                }
                                step={field.dataType === 'NUMBER' ? 'any' : undefined}
                                disabled={isReadOnly}
                                value={valStr}
                                onChange={(e) =>
                                  handleAttributeChange(
                                    field.key,
                                    field.dataType === 'NUMBER' && e.target.value !== ''
                                      ? Number(e.target.value)
                                      : e.target.value,
                                  )
                                }
                                className={`w-full h-11 px-3 rounded-xl border text-xs text-gray-900 focus:outline-none disabled:bg-gray-50 ${
                                  errMsg
                                    ? 'border-red-500 bg-red-50/20'
                                    : 'border-gray-200 focus:border-purple-600'
                                }`}
                              />
                              {errMsg && (
                                <p className="mt-1 text-xs text-red-700 font-medium">{errMsg}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* SECCIÓN 2: PRECIOS Y MÁRGENES */}
            <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('pricing')}
                className="w-full px-4 py-3 bg-gray-50/70 flex items-center justify-between text-left border-b border-gray-100"
              >
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CurrencyDollar size={15} className="text-purple-700" />
                  <span>Precios y márgenes</span>
                </span>
                {openSections.pricing ? (
                  <CaretUp size={16} className="text-gray-600" />
                ) : (
                  <CaretDown size={16} className="text-gray-600" />
                )}
              </button>

              {openSections.pricing && (
                <div className="p-4 space-y-3.5">
                  {(useListPrice || (isPharmacy && !isService)) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-800">
                          Precio de etiqueta / lista{' '}
                          {isPharmacy && !isService && <span className="text-red-600">*</span>}
                        </label>
                        {!isReadOnly && listPrice.trim() !== '' && !price.trim() && (
                          <button
                            type="button"
                            onClick={() => setPrice(listPrice)}
                            className="text-xs font-semibold text-purple-700 hover:underline"
                          >
                            Usar como precio de venta
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isReadOnly}
                        value={listPrice}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          setListPrice(e.target.value);
                          if (fieldErrors.listPrice) {
                            setFieldErrors((p) => ({ ...p, listPrice: '' }));
                          }
                        }}
                        placeholder="0.00"
                        className={`w-full h-11 px-3 rounded-xl border text-xs font-mono text-gray-900 focus:outline-none disabled:bg-gray-50 ${
                          fieldErrors.listPrice
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-gray-200 focus:border-purple-600'
                        }`}
                      />
                      {fieldErrors.listPrice && (
                        <p className="mt-1 text-xs text-red-700 font-medium">
                          {fieldErrors.listPrice}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {!isReadOnly && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Costo {isPharmacy && !isService && <span className="text-red-600">*</span>}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isReadOnly}
                          value={cost}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            setCost(e.target.value);
                            if (fieldErrors.cost) setFieldErrors((p) => ({ ...p, cost: '' }));
                          }}
                          placeholder="0.00"
                          className={`w-full h-11 px-3 rounded-xl border text-xs font-mono text-gray-900 focus:outline-none disabled:bg-gray-50 ${
                            fieldErrors.cost
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-gray-200 focus:border-purple-600'
                          }`}
                        />
                        {fieldErrors.cost && (
                          <p className="mt-1 text-xs text-red-700 font-medium">{fieldErrors.cost}</p>
                        )}
                      </div>
                    )}

                    {!isReadOnly && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          % Margen deseado
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1000"
                          disabled={isReadOnly}
                          value={markupPct}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            setMarkupPct(e.target.value);
                            if (fieldErrors.markupPct) {
                              setFieldErrors((p) => ({ ...p, markupPct: '' }));
                            }
                          }}
                          placeholder={
                            defaultMarkupPct !== null ? `${defaultMarkupPct}% (negocio)` : 'Opcional'
                          }
                          className={`w-full h-11 px-3 rounded-xl border text-xs font-mono text-gray-900 focus:outline-none disabled:bg-gray-50 ${
                            fieldErrors.markupPct
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-gray-200 focus:border-purple-600'
                          }`}
                        />
                        {fieldErrors.markupPct && (
                          <p className="mt-1 text-xs text-red-700 font-medium">
                            {fieldErrors.markupPct}
                          </p>
                        )}
                      </div>
                    )}

                    <div className={isReadOnly ? 'sm:col-span-3' : 'sm:col-span-1'}>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Precio de venta <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isReadOnly}
                        value={price}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          if (fieldErrors.price) setFieldErrors((p) => ({ ...p, price: '' }));
                        }}
                        placeholder="0.00"
                        className={`w-full h-11 px-3 rounded-xl border text-xs font-mono font-bold text-gray-900 focus:outline-none disabled:bg-gray-50 ${
                          fieldErrors.price
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-gray-200 focus:border-purple-600'
                        }`}
                      />
                      {fieldErrors.price && (
                        <p className="mt-1 text-xs text-red-700 font-medium">{fieldErrors.price}</p>
                      )}
                    </div>
                  </div>

                  {/* Precio sugerido según margen (paridad con desktop) */}
                  {!isReadOnly && suggestedPrice !== null && (
                    <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-purple-950">
                        Sugerido ({effectiveMarkupPct}%):{' '}
                        <strong className="font-mono">
                          {formatCurrency(Math.round(suggestedPrice), currency)}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPrice(String(Math.round(suggestedPrice)))}
                        className="min-h-[36px] px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
                      >
                        Usar sugerido
                      </button>
                    </div>
                  )}

                  {/* Ganancia en vivo */}
                  {!isReadOnly && profitSummary && (
                    <p
                      className={`text-xs font-semibold ${
                        !profitSummary.hasCost
                          ? 'text-gray-600'
                          : profitSummary.isPositive
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                    >
                      {profitSummary.text}
                    </p>
                  )}

                  {/* Aplica IVA */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                    <div className="pr-3">
                      <span className="text-xs font-semibold text-gray-900 block">
                        Aplica impuesto (IVA)
                      </span>
                      <span className="text-xs text-gray-600">
                        {taxEnabled
                          ? `Tasa configurada del negocio: ${taxRate}%`
                          : 'El IVA global del negocio está desactivado actualmente.'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={taxable}
                      onChange={(e) => setTaxable(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded border-gray-300 shrink-0"
                    />
                  </label>

                  {/* Venta por mayor (solo si política del negocio la habilita y no es servicio/restaurante/taller) */}
                  {isWholesaleActive && !isService && (
                    <div className="p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/40 space-y-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="pr-3">
                          <span className="text-xs font-semibold text-gray-900 block">
                            Precio por mayor
                          </span>
                          <span className="text-xs text-gray-600">
                            Se aplica automáticamente al superar la cantidad mínima.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={wholesaleEnabledLocal}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setWholesaleEnabledLocal(checked);
                            if (!checked) {
                              setWholesalePrice('');
                              setWholesaleMinQty('');
                            }
                          }}
                          className="w-5 h-5 text-purple-600 rounded border-gray-300 shrink-0"
                        />
                      </label>

                      {wholesaleEnabledLocal && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                              Precio por mayor *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={isReadOnly}
                              value={wholesalePrice}
                              onChange={(e) => setWholesalePrice(e.target.value)}
                              placeholder="Menor al precio normal"
                              className={`w-full h-11 px-3 rounded-xl border bg-white text-xs font-mono text-gray-900 focus:outline-none ${
                                fieldErrors.wholesalePrice
                                  ? 'border-red-500'
                                  : 'border-gray-200 focus:border-purple-600'
                              }`}
                            />
                            {fieldErrors.wholesalePrice && (
                              <p className="mt-1 text-xs text-red-700 font-medium">
                                {fieldErrors.wholesalePrice}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                              A partir de cuántas {unit} (mín. 2) *
                            </label>
                            <input
                              type="number"
                              step={isUnd ? '1' : '0.001'}
                              min="2"
                              disabled={isReadOnly}
                              value={wholesaleMinQty}
                              onChange={(e) => setWholesaleMinQty(e.target.value)}
                              placeholder="Ej. 6"
                              className={`w-full h-11 px-3 rounded-xl border bg-white text-xs font-mono text-gray-900 focus:outline-none ${
                                fieldErrors.wholesaleMinQty
                                  ? 'border-red-500'
                                  : 'border-gray-200 focus:border-purple-600'
                              }`}
                            />
                            {fieldErrors.wholesaleMinQty && (
                              <p className="mt-1 text-xs text-red-700 font-medium">
                                {fieldErrors.wholesaleMinQty}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* SECCIÓN 3: INVENTARIO Y STOCK (solo PRODUCTO) */}
            {!isService && (
              <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('inventory')}
                  className="w-full px-4 py-3 bg-gray-50/70 flex items-center justify-between text-left border-b border-gray-100"
                >
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Stack size={15} className="text-purple-700" />
                    <span>Inventario y unidades</span>
                  </span>
                  {openSections.inventory ? (
                    <CaretUp size={16} className="text-gray-600" />
                  ) : (
                    <CaretDown size={16} className="text-gray-600" />
                  )}
                </button>

                {openSections.inventory && (
                  <div className="p-4 space-y-3.5">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                      <div className="pr-3">
                        <span className="text-xs font-semibold text-gray-900 block">
                          Controlar existencia
                        </span>
                        <span className="text-xs text-gray-600">
                          Descuenta automáticamente al vender y alerta por stock bajo.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={trackStock}
                        onChange={(e) => setTrackStock(e.target.checked)}
                        className="w-5 h-5 text-purple-600 rounded border-gray-300 shrink-0"
                      />
                    </label>

                    {trackStock && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-800 mb-1">
                            Unidad de medida
                          </label>
                          <select
                            disabled={isReadOnly}
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-purple-600 disabled:bg-gray-50"
                          >
                            {ALLOWED_UNITS.map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-gray-800">
                              Existencia actual{' '}
                              {isPharmacy && <span className="text-red-600">*</span>}
                            </label>
                            {product && !isReadOnly && onRequestStockAdjustment && (
                              <button
                                type="button"
                                onClick={() => onRequestStockAdjustment(product)}
                                className="text-xs font-semibold text-purple-700 hover:underline inline-flex items-center gap-1"
                              >
                                <SlidersHorizontal size={12} weight="bold" />
                                <span>Ajustar</span>
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            step={isUnd ? '1' : '0.001'}
                            min="0"
                            disabled={isReadOnly || Boolean(product && tracksBatches)}
                            value={stock}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              setStock(e.target.value);
                              if (fieldErrors.stock) setFieldErrors((p) => ({ ...p, stock: '' }));
                            }}
                            className={`w-full h-11 px-3 rounded-xl border text-xs font-mono text-gray-900 focus:outline-none disabled:bg-gray-100 disabled:text-gray-700 ${
                              fieldErrors.stock
                                ? 'border-red-500 bg-red-50/20'
                                : 'border-gray-200 focus:border-purple-600'
                            }`}
                          />
                          {product && tracksBatches && (
                            <p className="mt-1 text-xs text-gray-600">
                              Con control de lotes, modificá la existencia con{' '}
                              <strong>Ajustar</strong> para mantener integridad por lote.
                            </p>
                          )}
                          {fieldErrors.stock && (
                            <p className="mt-1 text-xs text-red-700 font-medium">
                              {fieldErrors.stock}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-800 mb-1">
                            Existencia mínima{' '}
                            {isPharmacy && <span className="text-red-600">*</span>}
                          </label>
                          <input
                            type="number"
                            step={isUnd ? '1' : '0.001'}
                            min="0"
                            disabled={isReadOnly}
                            value={minStock}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              setMinStock(e.target.value);
                              if (fieldErrors.minStock) {
                                setFieldErrors((p) => ({ ...p, minStock: '' }));
                              }
                            }}
                            className={`w-full h-11 px-3 rounded-xl border text-xs font-mono text-gray-900 focus:outline-none disabled:bg-gray-50 ${
                              fieldErrors.minStock
                                ? 'border-red-500 bg-red-50/20'
                                : 'border-gray-200 focus:border-purple-600'
                            }`}
                          />
                          {fieldErrors.minStock && (
                            <p className="mt-1 text-xs text-red-700 font-medium">
                              {fieldErrors.minStock}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-800 mb-1">
                            Existencia máxima (opcional)
                          </label>
                          <input
                            type="number"
                            step={isUnd ? '1' : '0.001'}
                            min="0"
                            disabled={isReadOnly}
                            value={maxStock}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setMaxStock(e.target.value)}
                            placeholder="Opcional"
                            className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600 disabled:bg-gray-50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* SECCIÓN 4: LOTES Y VENCIMIENTOS (FEFO) */}
            {showBatchesSection && (
              <section className="rounded-2xl border border-purple-200/80 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('batches')}
                  className="w-full px-4 py-3 bg-purple-50/70 flex items-center justify-between text-left border-b border-purple-100"
                >
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={15} className="text-purple-700" />
                    <span>Lotes y vencimientos (FEFO)</span>
                    {product && tracksBatches && batches.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-950 text-xs font-bold normal-case">
                        {batches.filter((b) => b.quantity > 0).length} activos
                      </span>
                    )}
                  </span>
                  {openSections.batches ? (
                    <CaretUp size={16} className="text-purple-800" />
                  ) : (
                    <CaretDown size={16} className="text-purple-800" />
                  )}
                </button>

                {openSections.batches && (
                  <div className="p-4 space-y-3.5">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
                      <div className="pr-3">
                        <span className="text-xs font-semibold text-gray-900 block">
                          Controlar lotes y fecha de vencimiento
                        </span>
                        <span className="text-xs text-gray-600">
                          Vende primero los lotes más próximos a vencer (FEFO) y activa alertas.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={tracksBatches}
                        onChange={(e) => handleTracksBatchesToggle(e.target.checked)}
                        className="w-5 h-5 text-purple-600 rounded border-gray-300 shrink-0"
                      />
                    </label>

                    {/* Confirmación activar lotes con stock existente */}
                    {pendingEnableBatchesConfirm && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
                        <p className="font-semibold">
                          Este producto tiene {formatQuantity(parseFloat(stock) || product?.stock || 0, unit)}. Al activar el control de lotes, al guardar se creará automáticamente un lote INICIAL con esa existencia.
                        </p>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setPendingEnableBatchesConfirm(false)}
                            className="min-h-[36px] px-3 rounded-lg bg-white border border-amber-300 font-semibold text-amber-950"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmedInitialBatch(true);
                              setTracksBatches(true);
                              setPendingEnableBatchesConfirm(false);
                            }}
                            className="min-h-[36px] px-3 rounded-lg bg-purple-600 text-white font-semibold inline-flex items-center gap-1"
                          >
                            <Check size={14} weight="bold" />
                            <span>Activar lotes</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Confirmación desactivar lotes con lotes activos */}
                    {pendingDisableBatchesConfirm && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
                        <p className="font-semibold">
                          El producto tiene lotes con stock activo. ¿Confirmás desactivar el control de lotes?
                        </p>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setPendingDisableBatchesConfirm(false)}
                            className="min-h-[36px] px-3 rounded-lg bg-white border border-amber-300 font-semibold text-amber-950"
                          >
                            Mantener activo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmedDisableBatches(true);
                              setTracksBatches(false);
                              setPendingDisableBatchesConfirm(false);
                            }}
                            className="min-h-[36px] px-3 rounded-lg bg-red-600 text-white font-semibold"
                          >
                            Desactivar lotes
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Caso CREAR producto con stock > 0 */}
                    {!product && tracksBatches && (parseFloat(stock) || 0) > 0 && (
                      <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-3">
                        <p className="text-xs font-semibold text-purple-950">
                          Lote y vencimiento del inventario inicial
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                              Número de lote (opcional)
                            </label>
                            <input
                              type="text"
                              maxLength={100}
                              value={initialLotNumber}
                              onChange={(e) => setInitialLotNumber(e.target.value)}
                              placeholder="Por defecto: INICIAL"
                              className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                              Fecha de vencimiento (opcional)
                            </label>
                            <input
                              type="date"
                              value={initialExpiryDate}
                              onChange={(e) => setInitialExpiryDate(e.target.value)}
                              className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600"
                            />
                          </div>
                        </div>
                        {!initialExpiryDate && (
                          <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                            Sin fecha no se generarán alertas de vencimiento hasta que la completés luego.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Caso EDITAR producto */}
                    {product && tracksBatches && (
                      <>
                        {isLoadingBatches ? (
                          <div className="py-5 text-center text-xs text-gray-600 flex items-center justify-center gap-2">
                            <ArrowsClockwise size={16} className="animate-spin text-purple-600" />
                            <span>Cargando lotes del producto...</span>
                          </div>
                        ) : batchesError ? (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-xs text-red-800">
                            <span>{batchesError}</span>
                            <button
                              type="button"
                              onClick={() => loadBatches(product.id)}
                              className="font-semibold underline shrink-0"
                            >
                              Reintentar
                            </button>
                          </div>
                        ) : batches.length === 1 ? (
                          <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-purple-950">
                                Lote único ({formatQuantity(batches[0].quantity, unit)})
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                                  getBatchStatusMeta(batches[0].status, batches[0].expiryDate)
                                    .badgeClass
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    getBatchStatusMeta(batches[0].status, batches[0].expiryDate)
                                      .dotClass
                                  }`}
                                />
                                {
                                  getBatchStatusMeta(batches[0].status, batches[0].expiryDate)
                                    .label
                                }
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-800 mb-1">
                                  Lote <span className="text-red-600">*</span>
                                </label>
                                <input
                                  type="text"
                                  maxLength={100}
                                  value={singleBatchNumber}
                                  onChange={(e) => {
                                    setSingleBatchNumber(e.target.value);
                                    if (fieldErrors.singleBatchNumber) {
                                      setFieldErrors((p) => ({ ...p, singleBatchNumber: '' }));
                                    }
                                  }}
                                  className={`w-full h-11 px-3 rounded-xl border bg-white text-xs font-mono text-gray-900 focus:outline-none ${
                                    fieldErrors.singleBatchNumber
                                      ? 'border-red-500'
                                      : 'border-gray-200 focus:border-purple-600'
                                  }`}
                                />
                                {fieldErrors.singleBatchNumber && (
                                  <p className="mt-1 text-xs text-red-700 font-medium">
                                    {fieldErrors.singleBatchNumber}
                                  </p>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-semibold text-gray-800">
                                    Fecha de vencimiento
                                  </label>
                                  {singleBatchExpiry && (
                                    <button
                                      type="button"
                                      onClick={() => setSingleBatchExpiry('')}
                                      className="text-xs font-medium text-red-700 hover:underline"
                                    >
                                      Quitar fecha
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="date"
                                  value={singleBatchExpiry}
                                  onChange={(e) => setSingleBatchExpiry(e.target.value)}
                                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600"
                                />
                              </div>
                            </div>

                            {batches[0].status === 'VENCIDO' &&
                              batches[0].quantity > 0 &&
                              onRequestStockAdjustment && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRequestStockAdjustment(product, {
                                      initialType: 'EXPIRED',
                                      initialBatchId: batches[0].id,
                                      initialBatchNumber: batches[0].batchNumber,
                                      initialQty: batches[0].quantity,
                                    })
                                  }
                                  className="min-h-[40px] px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-semibold inline-flex items-center gap-1.5"
                                >
                                  <Trash size={14} weight="bold" />
                                  <span>Dar de baja lote vencido</span>
                                </button>
                              )}
                          </div>
                        ) : batches.length >= 2 ? (
                          <div className="space-y-2.5">
                            {batchesWithoutDateCount > 0 && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900">
                                <div className="flex items-center gap-2">
                                  <Clock size={16} className="shrink-0 text-amber-700" />
                                  <span>
                                    {batchesWithoutDateCount === 1
                                      ? '1 lote activo sin fecha.'
                                      : `${batchesWithoutDateCount} lotes activos sin fecha.`}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const firstMissing = batches.find(
                                      (b) => !b.expiryDate && b.quantity > 0,
                                    );
                                    if (firstMissing) {
                                      setBatchToEdit({
                                        id: firstMissing.id,
                                        batchNumber: firstMissing.batchNumber,
                                        expiryDate: firstMissing.expiryDate,
                                        quantity: firstMissing.quantity,
                                        productName: product.name,
                                        unit,
                                      });
                                      setIsEditBatchOpen(true);
                                    }
                                  }}
                                  className="min-h-[36px] px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0"
                                >
                                  Completar
                                </button>
                              </div>
                            )}

                            {/* Tarjetas responsive para 375 px y tabla en pantallas mayores */}
                            <div className="space-y-2 sm:hidden">
                              {batches.map((b) => {
                                const meta = getBatchStatusMeta(b.status, b.expiryDate);
                                return (
                                  <div
                                    key={b.id}
                                    className="p-3 rounded-xl border border-gray-200 bg-gray-50/40 space-y-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                        {b.batchNumber}
                                      </span>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${meta.badgeClass}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                                        {meta.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-700">
                                      <span>
                                        Vence:{' '}
                                        {b.expiryDate
                                          ? formatManaguaDate(b.expiryDate)
                                          : 'Sin fecha'}
                                      </span>
                                      <span className="font-bold text-gray-900">
                                        {formatQuantity(b.quantity, unit)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBatchToEdit({
                                            id: b.id,
                                            batchNumber: b.batchNumber,
                                            expiryDate: b.expiryDate,
                                            quantity: b.quantity,
                                            productName: product.name,
                                            unit,
                                          });
                                          setIsEditBatchOpen(true);
                                        }}
                                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold inline-flex items-center justify-center gap-1"
                                      >
                                        <PencilSimple size={14} weight="bold" />
                                        <span>Editar</span>
                                      </button>
                                      {b.status === 'VENCIDO' &&
                                        b.quantity > 0 &&
                                        onRequestStockAdjustment && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              onRequestStockAdjustment(product, {
                                                initialType: 'EXPIRED',
                                                initialBatchId: b.id,
                                                initialBatchNumber: b.batchNumber,
                                                initialQty: b.quantity,
                                              })
                                            }
                                            className="min-h-[40px] px-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-semibold inline-flex items-center justify-center gap-1"
                                          >
                                            <Trash size={14} weight="bold" />
                                            <span>Baja</span>
                                          </button>
                                        )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="hidden sm:block rounded-xl border border-gray-200 overflow-hidden">
                              <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold">
                                  <tr>
                                    <th className="py-2.5 px-3">Lote</th>
                                    <th className="py-2.5 px-3">Vence</th>
                                    <th className="py-2.5 px-3 text-right">Existencia</th>
                                    <th className="py-2.5 px-3 text-center">Estado</th>
                                    <th className="py-2.5 px-3 text-right">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {batches.map((b) => {
                                    const meta = getBatchStatusMeta(b.status, b.expiryDate);
                                    return (
                                      <tr key={b.id} className="hover:bg-gray-50/70">
                                        <td className="py-2 px-3 font-mono font-semibold text-gray-900">
                                          {b.batchNumber}
                                        </td>
                                        <td className="py-2 px-3 whitespace-nowrap">
                                          {b.expiryDate
                                            ? formatManaguaDate(b.expiryDate)
                                            : 'Sin fecha'}
                                        </td>
                                        <td className="py-2 px-3 text-right font-semibold text-gray-900 tabular-nums">
                                          {formatQuantity(b.quantity, unit)}
                                        </td>
                                        <td className="py-2 px-3 text-center whitespace-nowrap">
                                          <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${meta.badgeClass}`}
                                          >
                                            <span
                                              className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`}
                                            />
                                            {meta.label}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right whitespace-nowrap">
                                          <div className="inline-flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setBatchToEdit({
                                                  id: b.id,
                                                  batchNumber: b.batchNumber,
                                                  expiryDate: b.expiryDate,
                                                  quantity: b.quantity,
                                                  productName: product.name,
                                                  unit,
                                                });
                                                setIsEditBatchOpen(true);
                                              }}
                                              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold inline-flex items-center gap-1"
                                            >
                                              <PencilSimple size={13} weight="bold" />
                                              <span>Editar</span>
                                            </button>
                                            {b.status === 'VENCIDO' &&
                                              b.quantity > 0 &&
                                              onRequestStockAdjustment && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    onRequestStockAdjustment(product, {
                                                      initialType: 'EXPIRED',
                                                      initialBatchId: b.id,
                                                      initialBatchNumber: b.batchNumber,
                                                      initialQty: b.quantity,
                                                    })
                                                  }
                                                  className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-semibold"
                                                >
                                                  Baja
                                                </button>
                                              )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (parseFloat(stock) || (product?.stock ?? 0)) > 0 ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                            <p className="font-semibold">Sin lote asignado todavía</p>
                            <p className="mt-0.5 text-amber-800">
                              Al guardar cambios se generará un lote INICIAL con la existencia actual para que puedas editar su código y vencimiento.
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 text-center">
                            Sin lotes registrados (existencia en 0). Los lotes nuevos se agregan desde Compras en NEXOL POS de escritorio o por Ajuste de existencia.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* SECCIÓN 5: OPERACIÓN Y ESTADO */}
            {(isRestaurant && !isService) || product ? (
              <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('operation')}
                  className="w-full px-4 py-3 bg-gray-50/70 flex items-center justify-between text-left border-b border-gray-100"
                >
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ChefHat size={15} className="text-purple-700" />
                    <span>Operación y estado</span>
                  </span>
                  {openSections.operation ? (
                    <CaretUp size={16} className="text-gray-600" />
                  ) : (
                    <CaretDown size={16} className="text-gray-600" />
                  )}
                </button>

                {openSections.operation && (
                  <div className="p-4 space-y-3">
                    {isRestaurant && !isService && (
                      <label className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
                        <div className="pr-3">
                          <span className="text-xs font-semibold text-amber-950 block">
                            Se prepara en cocina
                          </span>
                          <span className="text-xs text-amber-800">
                            Envía este producto a la comanda cuando se ordena en Salón. Desmarcalo para bebidas listas.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={sendToKitchen}
                          onChange={(e) => setSendToKitchen(e.target.checked)}
                          className="w-5 h-5 text-purple-600 rounded border-gray-300 shrink-0"
                        />
                      </label>
                    )}

                    {product && (
                      <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                        <div className="pr-3">
                          <span className="text-xs font-semibold text-gray-900 block">
                            Producto activo en el catálogo
                          </span>
                          <span className="text-xs text-gray-600">
                            Si lo desactivás, no aparecerá disponible en ventas.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="w-5 h-5 text-purple-600 rounded border-gray-300 shrink-0"
                        />
                      </label>
                    )}
                  </div>
                )}
              </section>
            ) : null}

            </div>

            {/* Footer sticky */}
            <div className="shrink-0 px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleRequestClose}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {isReadOnly ? 'Cerrar' : 'Cancelar'}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <FloppyDisk size={16} weight="bold" />
                  <span>
                    {isSubmitting
                      ? 'Guardando...'
                      : product
                      ? 'Guardar cambios'
                      : 'Crear producto'}
                  </span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <EditBatchModal
        isOpen={isEditBatchOpen}
        batch={batchToEdit}
        onClose={() => {
          setIsEditBatchOpen(false);
          setBatchToEdit(null);
        }}
        onSuccess={() => {
          if (product?.id) loadBatches(product.id);
          onSaved();
        }}
      />
    </>
  );
};
