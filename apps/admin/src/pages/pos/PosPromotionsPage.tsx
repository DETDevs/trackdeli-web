import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tag,
  Plus,
  MagnifyingGlass,
  WarningCircle,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  Check,
  X,
  Info,
  Calendar,
  FloppyDisk,
  Percent,
  CurrencyDollar,
  Stack,
  TrendUp,
} from '@phosphor-icons/react';
import {
  type PosPromotion,
  type CreatePosPromotionDto,
  type UpdatePosPromotionDto,
  type PromotionType,
  type PromotionScope,
  type PosProductItem,
  type PosCategory,
  getPosPromotions,
  createPosPromotion,
  updatePosPromotion,
  deletePosPromotion,
  getPosProducts,
  getPosCategories,
  getMyBusiness,
} from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';

type FilterTab = 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';

const DAYS_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

export function getPromotionStatus(p: PosPromotion): {
  key: 'inactive' | 'expired' | 'scheduled' | 'active';
  label: string;
  color: string;
} {
  if (!p.isActive) {
    return {
      key: 'inactive',
      label: 'Inactiva',
      color: 'bg-gray-100 text-gray-700 border-gray-200',
    };
  }
  const now = new Date();
  if (p.endsAt && new Date(p.endsAt).getTime() < now.getTime()) {
    return {
      key: 'expired',
      label: 'Vencida',
      color: 'bg-red-50 text-red-700 border-red-200',
    };
  }
  if (p.startsAt && new Date(p.startsAt).getTime() > now.getTime()) {
    return {
      key: 'scheduled',
      label: 'Programada',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  return {
    key: 'active',
    label: 'Vigente',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
}

export function formatTimeTo12h(timeStr?: string | null): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return timeStr;

  const period = h >= 12 ? 'p. m.' : 'a. m.';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minuteFormatted = m > 0 ? `:${m < 10 ? '0' : ''}${m}` : ':00';
  return `${hour12}${minuteFormatted} ${period}`;
}

export function formatPromotionSummary(
  promo: Partial<PosPromotion>,
  products: PosProductItem[],
  categories: PosCategory[],
  currency: string = 'NIO',
): string {
  // 1. Días
  let daysText = 'Todos los días';
  const days = promo.daysOfWeek;
  if (Array.isArray(days) && days.length > 0 && days.length < 7) {
    const sorted = [...days].sort((a, b) => a - b);
    const sortedStr = sorted.join(',');
    if (sortedStr === '1,2,3,4,5') {
      daysText = 'De lunes a viernes';
    } else if (sortedStr === '0,6') {
      daysText = 'Fines de semana';
    } else {
      const names = sorted.map((d) => DAYS_FULL_NAMES[d] || `día ${d}`);
      if (names.length === 1) {
        daysText = names[0].charAt(0).toUpperCase() + names[0].slice(1);
      } else if (names.length === 2) {
        const cap = names[0].charAt(0).toUpperCase() + names[0].slice(1);
        daysText = `${cap} y ${names[1]}`;
      } else {
        const last = names.pop();
        const cap = names[0].charAt(0).toUpperCase() + names[0].slice(1);
        names[0] = cap;
        daysText = `${names.join(', ')} y ${last}`;
      }
    }
  }

  // 2. Horario
  let timeText = '';
  if (promo.startTime && promo.endTime) {
    timeText = `de ${formatTimeTo12h(promo.startTime)} a ${formatTimeTo12h(promo.endTime)}`;
  } else if (promo.startTime) {
    timeText = `desde las ${formatTimeTo12h(promo.startTime)}`;
  } else if (promo.endTime) {
    timeText = `hasta las ${formatTimeTo12h(promo.endTime)}`;
  }

  // 3. Alcance
  let targetText = 'todo el catálogo';
  if (promo.scope === 'PRODUCT') {
    const pids = promo.productIds || [];
    if (pids.length === 1) {
      const match = products.find((p) => p.id === pids[0]);
      targetText = match?.name || 'producto seleccionado';
    } else if (pids.length > 1) {
      const match1 = products.find((p) => p.id === pids[0]);
      const match2 = products.find((p) => p.id === pids[1]);
      if (pids.length === 2 && match1 && match2) {
        targetText = `${match1.name} y ${match2.name}`;
      } else if (match1) {
        targetText = `${match1.name} y ${pids.length - 1} producto(s) más`;
      } else {
        targetText = `${pids.length} productos seleccionados`;
      }
    }
  } else if (promo.scope === 'CATEGORY') {
    const cids = promo.categoryIds || [];
    if (cids.length === 1) {
      const match = categories.find((c) => c.id === cids[0]);
      targetText = match?.name || 'categoría seleccionada';
    } else if (cids.length > 1) {
      const match1 = categories.find((c) => c.id === cids[0]);
      const match2 = categories.find((c) => c.id === cids[1]);
      if (cids.length === 2 && match1 && match2) {
        targetText = `${match1.name} y ${match2.name}`;
      } else if (match1) {
        targetText = `${match1.name} y ${cids.length - 1} categoría(s) más`;
      } else {
        targetText = `${cids.length} categorías seleccionadas`;
      }
    }
  }

  // 4. Acción según tipo
  let actionText = '';
  switch (promo.type) {
    case 'PERCENT_DISCOUNT':
      actionText = `${promo.discountPct || 0} % de descuento en ${targetText}`;
      break;
    case 'FIXED_DISCOUNT':
      actionText = `${formatCurrency(promo.discountAmount || 0, currency)} menos en ${targetText}`;
      break;
    case 'BUY_N_PAY_M':
      actionText = `${promo.buyQty || 0}x${promo.payQty || 0} en ${targetText}`;
      break;
    case 'QTY_PRICE_TIER':
      actionText = `desde ${promo.minQty || 0} unidades, a ${formatCurrency(
        promo.tierUnitPrice || 0,
        currency,
      )} cada una en ${targetText}`;
      break;
    default:
      actionText = `promoción en ${targetText}`;
  }

  const schedulePart = timeText ? `${daysText} ${timeText}` : daysText;
  return `${schedulePart}, ${actionText}`;
}

export const PosPromotionsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const userRole = String(user?.role || '').toUpperCase();
  const canManage = userRole === 'SUPERADMIN' || userRole === 'ENCARGADO';

  const [promotions, setPromotions] = useState<PosPromotion[]>([]);
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PosPromotion | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<PromotionType>('PERCENT_DISCOUNT');
  const [scope, setScope] = useState<PromotionScope>('PRODUCT');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [discountPct, setDiscountPct] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [buyQty, setBuyQty] = useState('');
  const [payQty, setPayQty] = useState('');
  const [minQty, setMinQty] = useState('');
  const [tierUnitPrice, setTierUnitPrice] = useState('');

  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selector buscador de productos / categorías dentro del modal
  const [targetSearch, setTargetSearch] = useState('');

  // Confirmación de desactivación cuando PROMOTION_IN_USE
  const [inUsePromoToDeactivate, setInUsePromoToDeactivate] = useState<PosPromotion | null>(null);

  const currency = business?.currency || 'NIO';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [promosData, prodsData, catsData, bizData] = await Promise.all([
        getPosPromotions({ includeInactive: true }),
        getPosProducts({ isActive: true }).catch(() => []),
        getPosCategories().catch(() => []),
        getMyBusiness().catch(() => null),
      ]);
      setPromotions(Array.isArray(promosData) ? promosData : []);
      setProducts(Array.isArray(prodsData) ? prodsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      if (bizData) setBusiness(bizData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudieron cargar las promociones. Inténtalo nuevamente.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrado de promociones en cliente
  const filteredPromotions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return promotions.filter((p) => {
      const statusMeta = getPromotionStatus(p);

      // Filtro de pestaña
      if (activeTab === 'active' && statusMeta.key !== 'active') return false;
      if (activeTab === 'scheduled' && statusMeta.key !== 'scheduled') return false;
      if (activeTab === 'expired' && statusMeta.key !== 'expired') return false;
      if (activeTab === 'inactive' && statusMeta.key !== 'inactive') return false;

      // Filtro de búsqueda
      if (term) {
        const nameMatch = p.name.toLowerCase().includes(term);
        const summary = formatPromotionSummary(p, products, categories, currency).toLowerCase();
        if (!nameMatch && !summary.includes(term)) return false;
      }

      return true;
    });
  }, [promotions, activeTab, searchTerm, products, categories, currency]);

  // Manejo de abrir modal para crear
  const handleOpenCreate = () => {
    setEditingPromo(null);
    setName('');
    setType('PERCENT_DISCOUNT');
    setScope('PRODUCT');
    setSelectedProductIds([]);
    setSelectedCategoryIds([]);
    setDiscountPct('');
    setDiscountAmount('');
    setBuyQty('');
    setPayQty('');
    setMinQty('');
    setTierUnitPrice('');
    setStartsAt('');
    setEndsAt('');
    setDaysOfWeek([]);
    setStartTime('');
    setEndTime('');
    setPriority('0');
    setIsActive(true);
    setFormError(null);
    setTargetSearch('');
    setIsModalOpen(true);
  };

  // Manejo de abrir modal para editar
  const handleOpenEdit = (p: PosPromotion) => {
    setEditingPromo(p);
    setName(p.name);
    setType(p.type);
    setScope(p.scope);
    setSelectedProductIds(p.productIds || []);
    setSelectedCategoryIds(p.categoryIds || []);
    setDiscountPct(p.discountPct != null ? String(p.discountPct) : '');
    setDiscountAmount(p.discountAmount != null ? String(p.discountAmount) : '');
    setBuyQty(p.buyQty != null ? String(p.buyQty) : '');
    setPayQty(p.payQty != null ? String(p.payQty) : '');
    setMinQty(p.minQty != null ? String(p.minQty) : '');
    setTierUnitPrice(p.tierUnitPrice != null ? String(p.tierUnitPrice) : '');
    setStartsAt(p.startsAt ? p.startsAt.slice(0, 10) : '');
    setEndsAt(p.endsAt ? p.endsAt.slice(0, 10) : '');
    setDaysOfWeek(p.daysOfWeek || []);
    setStartTime(p.startTime || '');
    setEndTime(p.endTime || '');
    setPriority(String(p.priority ?? 0));
    setIsActive(p.isActive);
    setFormError(null);
    setTargetSearch('');
    setIsModalOpen(true);
  };

  // Toggle día de la semana
  const handleToggleDay = (dayIndex: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex).sort((a, b) => a - b);
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  // Guardar formulario
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      setFormError('El nombre de la promoción es obligatorio.');
      return;
    }

    if (scope === 'PRODUCT' && selectedProductIds.length === 0) {
      setFormError('Seleccioná al menos un producto para la promoción.');
      return;
    }
    if (scope === 'CATEGORY' && selectedCategoryIds.length === 0) {
      setFormError('Seleccioná al menos una categoría para la promoción.');
      return;
    }

    const parsedPriority = parseInt(priority, 10);
    const dto: CreatePosPromotionDto = {
      name: cleanName,
      type,
      scope,
      productIds: scope === 'PRODUCT' ? selectedProductIds : [],
      categoryIds: scope === 'CATEGORY' ? selectedCategoryIds : [],
      priority: isNaN(parsedPriority) ? 0 : parsedPriority,
      isActive,
      daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
      startTime: startTime || null,
      endTime: endTime || null,
      startsAt: startsAt ? new Date(`${startsAt}T00:00:00`).toISOString() : null,
      endsAt: endsAt ? new Date(`${endsAt}T23:59:59.999`).toISOString() : null,
    };

    switch (type) {
      case 'PERCENT_DISCOUNT': {
        const val = parseFloat(discountPct);
        if (isNaN(val) || val <= 0 || val >= 100) {
          setFormError('El porcentaje debe ser un número mayor a 0 y menor a 100.');
          return;
        }
        dto.discountPct = val;
        break;
      }
      case 'FIXED_DISCOUNT': {
        const val = parseFloat(discountAmount);
        if (isNaN(val) || val <= 0) {
          setFormError('El monto de descuento debe ser mayor a 0.');
          return;
        }
        dto.discountAmount = val;
        break;
      }
      case 'BUY_N_PAY_M': {
        const n = parseInt(buyQty, 10);
        const m = parseInt(payQty, 10);
        if (isNaN(n) || isNaN(m) || m < 1 || n <= m) {
          setFormError('En promociones NxM debés llevar más de lo que pagás (ej. 3x2).');
          return;
        }
        dto.buyQty = n;
        dto.payQty = m;
        break;
      }
      case 'QTY_PRICE_TIER': {
        const mq = parseFloat(minQty);
        const tp = parseFloat(tierUnitPrice);
        if (isNaN(mq) || mq <= 0) {
          setFormError('La cantidad mínima debe ser mayor a 0.');
          return;
        }
        if (isNaN(tp) || tp < 0) {
          setFormError('El precio unitario no puede ser negativo.');
          return;
        }
        dto.minQty = mq;
        dto.tierUnitPrice = tp;
        break;
      }
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingPromo) {
        await updatePosPromotion(editingPromo.id, dto as UpdatePosPromotionDto);
      } else {
        await createPosPromotion(dto);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message || 'No se pudo guardar la promoción. Verificá los campos.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (p: PosPromotion) => {
    if (!canManage) return;
    try {
      await updatePosPromotion(p.id, { isActive: !p.isActive });
      await loadData();
    } catch (err: any) {
      setError('No se pudo cambiar el estado de la promoción.');
    }
  };

  const handleDelete = async (p: PosPromotion) => {
    if (!canManage) return;
    try {
      await deletePosPromotion(p.id);
      await loadData();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || '';
      if (code === 'PROMOTION_IN_USE' || msg.includes('Ya se usó')) {
        setInUsePromoToDeactivate(p);
      } else {
        setError(msg || 'No se pudo eliminar la promoción.');
      }
    }
  };

  const handleConfirmDeactivateInUse = async () => {
    if (!inUsePromoToDeactivate) return;
    try {
      await updatePosPromotion(inUsePromoToDeactivate.id, { isActive: false });
      setInUsePromoToDeactivate(null);
      await loadData();
    } catch (err: any) {
      setError('No se pudo desactivar la promoción.');
    }
  };

  // Resumen en vivo para el modal
  const livePreviewSummary = useMemo(() => {
    const draft: Partial<PosPromotion> = {
      type,
      scope,
      productIds: selectedProductIds,
      categoryIds: selectedCategoryIds,
      discountPct: parseFloat(discountPct) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      buyQty: parseInt(buyQty, 10) || 0,
      payQty: parseInt(payQty, 10) || 0,
      minQty: parseFloat(minQty) || 0,
      tierUnitPrice: parseFloat(tierUnitPrice) || 0,
      daysOfWeek,
      startTime: startTime || null,
      endTime: endTime || null,
    };
    return formatPromotionSummary(draft, products, categories, currency);
  }, [
    type,
    scope,
    selectedProductIds,
    selectedCategoryIds,
    discountPct,
    discountAmount,
    buyQty,
    payQty,
    minQty,
    tierUnitPrice,
    daysOfWeek,
    startTime,
    endTime,
    products,
    categories,
    currency,
  ]);

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base shadow-2xs">
            <Tag size={22} weight="duotone" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              Promociones del catálogo
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Descuentos automáticos, ofertas NxM y precios especiales por cantidad
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadData()}
            className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5"
            title="Actualizar promociones"
          >
            <ArrowsClockwise size={16} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="min-h-[44px] px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Plus size={16} weight="bold" />
              <span>Nueva promoción</span>
            </button>
          )}
        </div>
      </div>

      {/* Aviso obligatorio visible de alcance de promociones */}
      <div className="bg-purple-50/80 border border-purple-200/90 p-4 rounded-2xl flex items-start gap-3 text-xs text-purple-950 shadow-2xs">
        <Info size={20} weight="fill" className="shrink-0 text-purple-700 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold text-purple-900">
            Las promociones se aplican en la app y en la venta desde el navegador. En la computadora llegan pronto.
          </p>
          <p className="text-purple-700 mt-0.5">
            Al registrar ventas desde la web o la app móvil, el sistema detecta automáticamente la vigencia y aplica los descuentos según su horario y prioridad.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-2.5 text-xs text-red-800 shadow-2xs">
          <WarningCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => loadData()}
              className="mt-1 font-bold underline hover:text-red-900"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Filtros: Buscador y Pestañas de estado */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o resumen de promoción..."
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Todas ({promotions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'active'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Vigentes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'scheduled'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              Programadas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expired')}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'expired'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
              }`}
            >
              Vencidas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inactive')}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'inactive'
                  ? 'bg-gray-700 text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Inactivas
            </button>
          </div>
        </div>
      </div>

      {/* Lista de promociones */}
      {isLoading ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200/80 text-center text-xs text-gray-500">
          Cargando promociones...
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center space-y-2">
          <Tag size={32} className="mx-auto text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900">No hay promociones registradas</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Creá tu primera promoción de porcentaje, monto fijo, 3x2 o precios especiales por cantidad.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-3 min-h-[40px] px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus size={16} weight="bold" />
              <span>Crear promoción</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPromotions.map((p) => {
            const statusMeta = getPromotionStatus(p);
            const summaryText = formatPromotionSummary(p, products, categories, currency);

            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 hover:border-purple-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-sm sm:text-base text-gray-900 leading-snug">
                        {p.name}
                      </h2>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.color}`}
                      >
                        {statusMeta.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {p.scope === 'PRODUCT' ? 'Por productos' : 'Por categorías'}
                      </span>
                      {p.priority > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Prioridad {p.priority}
                        </span>
                      )}
                    </div>

                    {/* Resumen en lenguaje natural destacado */}
                    <div className="mt-2 p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start gap-2 text-xs text-purple-950 font-medium">
                      <Tag size={16} className="text-purple-700 shrink-0 mt-0.5" />
                      <span>{summaryText}</span>
                    </div>

                    {/* Vigencia por fechas */}
                    {(p.startsAt || p.endsAt) && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <span>
                          Vigencia:{' '}
                          {p.startsAt
                            ? `desde ${new Date(p.startsAt).toLocaleDateString('es-NI')}`
                            : 'desde siempre'}{' '}
                          {p.endsAt
                            ? `hasta ${new Date(p.endsAt).toLocaleDateString('es-NI')}`
                            : 'sin fecha límite'}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  {canManage && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                          p.isActive
                            ? 'border-gray-200 text-gray-700 hover:bg-gray-100'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {p.isActive ? 'Desactivar' : 'Activar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Editar promoción"
                      >
                        <PencilSimple size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar promoción"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Promoción */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 my-auto max-h-[92vh] flex flex-col">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {editingPromo ? 'Editar promoción' : 'Nueva promoción'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configurá las condiciones, alcance y vigencia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del formulario con scroll */}
            <form onSubmit={handleSavePromo} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                  <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nombre de la promoción */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Nombre descriptivo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. 3x2 en Gaseosas, 15 % en Lácteos, Mayoreo arroz"
                  maxLength={150}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                  autoFocus
                />
              </div>

              {/* Tipo de promoción (4 tipos de negocio) */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Tipo de promoción <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('PERCENT_DISCOUNT')}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors flex flex-col justify-between ${
                      type === 'PERCENT_DISCOUNT'
                        ? 'border-purple-600 bg-purple-50/60 text-purple-950 font-bold shadow-2xs'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Percent size={18} className="text-purple-600 mb-1" />
                    <span>Porcentaje</span>
                    <span className="text-xs text-gray-500 font-normal">Ej. 15 % en lácteos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('FIXED_DISCOUNT')}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors flex flex-col justify-between ${
                      type === 'FIXED_DISCOUNT'
                        ? 'border-purple-600 bg-purple-50/60 text-purple-950 font-bold shadow-2xs'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <CurrencyDollar size={18} className="text-purple-600 mb-1" />
                    <span>Monto fijo</span>
                    <span className="text-xs text-gray-500 font-normal">Ej. C$ 10 menos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('BUY_N_PAY_M')}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors flex flex-col justify-between ${
                      type === 'BUY_N_PAY_M'
                        ? 'border-purple-600 bg-purple-50/60 text-purple-950 font-bold shadow-2xs'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Stack size={18} className="text-purple-600 mb-1" />
                    <span>NxM (Lleva/Paga)</span>
                    <span className="text-xs text-gray-500 font-normal">Ej. 3x2 o 2x1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('QTY_PRICE_TIER')}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors flex flex-col justify-between ${
                      type === 'QTY_PRICE_TIER'
                        ? 'border-purple-600 bg-purple-50/60 text-purple-950 font-bold shadow-2xs'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <TrendUp size={18} className="text-purple-600 mb-1" />
                    <span>Precio cantidad</span>
                    <span className="text-xs text-gray-500 font-normal">Ej. desde 6 a C$ 18</span>
                  </button>
                </div>
              </div>

              {/* Parámetros numéricos según tipo */}
              <div className="p-3.5 rounded-xl bg-gray-50/60 border border-gray-200">
                {type === 'PERCENT_DISCOUNT' && (
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Porcentaje de descuento (%) <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="99.99"
                        value={discountPct}
                        onChange={(e) => setDiscountPct(e.target.value)}
                        placeholder="Ej. 15"
                        className="w-full h-11 px-3 pr-8 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        %
                      </span>
                    </div>
                  </div>
                )}

                {type === 'FIXED_DISCOUNT' && (
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Monto a restar por unidad ({currency}) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="Ej. 10.00"
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                )}

                {type === 'BUY_N_PAY_M' && (
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Lleva (cantidad N) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="2"
                        value={buyQty}
                        onChange={(e) => setBuyQty(e.target.value)}
                        placeholder="Ej. 3"
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Paga (cantidad M) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={payQty}
                        onChange={(e) => setPayQty(e.target.value)}
                        placeholder="Ej. 2"
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>
                )}

                {type === 'QTY_PRICE_TIER' && (
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Desde cuántas unidades <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={minQty}
                        onChange={(e) => setMinQty(e.target.value)}
                        placeholder="Ej. 6"
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Precio unitario ({currency}) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tierUnitPrice}
                        onChange={(e) => setTierUnitPrice(e.target.value)}
                        placeholder="Ej. 18.00"
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Alcance: Productos vs Categorías */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-800">
                  Alcance del descuento <span className="text-red-600">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('PRODUCT')}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
                      scope === 'PRODUCT'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Por productos específicos
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('CATEGORY')}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
                      scope === 'CATEGORY'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Por categorías completas
                  </button>
                </div>

                {/* Selector con buscador de Productos */}
                {scope === 'PRODUCT' && (
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                    <input
                      type="text"
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      placeholder="Buscar producto para agregar..."
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                    />

                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {products
                        .filter((pr) =>
                          pr.name.toLowerCase().includes(targetSearch.trim().toLowerCase()),
                        )
                        .map((pr) => {
                          const isSelected = selectedProductIds.includes(pr.id);
                          return (
                            <label
                              key={pr.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-white cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedProductIds((prev) => [...prev, pr.id]);
                                    } else {
                                      setSelectedProductIds((prev) =>
                                        prev.filter((id) => id !== pr.id),
                                      );
                                    }
                                  }}
                                  className="w-4 h-4 text-purple-600 rounded border-gray-300"
                                />
                                <span className="font-semibold text-gray-900">{pr.name}</span>
                              </div>
                              <span className="text-gray-500">{formatCurrency(pr.price, currency)}</span>
                            </label>
                          );
                        })}
                    </div>
                    <p className="text-xs text-gray-500">
                      {selectedProductIds.length} producto(s) seleccionado(s).
                    </p>
                  </div>
                )}

                {/* Selector con buscador de Categorías */}
                {scope === 'CATEGORY' && (
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {categories.map((cat) => {
                        const isSelected = selectedCategoryIds.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategoryIds((prev) => [...prev, cat.id]);
                                } else {
                                  setSelectedCategoryIds((prev) =>
                                    prev.filter((id) => id !== cat.id),
                                  );
                                }
                              }}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300"
                            />
                            <span className="font-semibold text-gray-900">{cat.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500">
                      {selectedCategoryIds.length} categoría(s) seleccionada(s).
                    </p>
                  </div>
                )}
              </div>

              {/* Días de la semana y Horario */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    Días en que aplica (dejá vacío para todos los días)
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_NAMES.map((dayName, idx) => {
                      const isSelected = daysOfWeek.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => handleToggleDay(idx)}
                          className={`min-h-[36px] rounded-lg text-xs font-semibold border transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Hora inicio (opcional)
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Hora fin (opcional)
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Fecha desde (opcional)
                    </label>
                    <input
                      type="date"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Fecha hasta (opcional)
                    </label>
                    <input
                      type="date"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="w-1/2">
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      Prioridad (número mayor gana)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mt-5">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300"
                    />
                    <span className="text-xs font-semibold text-gray-800">Promoción activa</span>
                  </label>
                </div>
              </div>

              {/* Vista previa en lenguaje natural antes de guardar */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1">
                <span className="text-xs font-bold text-purple-900 block">
                  Resumen de la promoción:
                </span>
                <p className="text-xs font-semibold text-purple-950 leading-relaxed">
                  "{livePreviewSummary}"
                </p>
              </div>

              {/* Footer con botones */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-[40px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[40px] px-5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
                >
                  <FloppyDisk size={16} weight="bold" />
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar promoción'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal aviso de desactivación cuando PROMOTION_IN_USE */}
      {inUsePromoToDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <WarningCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Promoción con historial</h3>
                <p className="text-xs text-gray-500">Ya se usó en comprobantes de venta</p>
              </div>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              La promoción <strong>"{inUsePromoToDeactivate.name}"</strong> ya se aplicó en ventas anteriores y no se puede borrar para preservar la información de esas ventas. ¿Querés desactivarla para que no se aplique a nuevas ventas?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setInUsePromoToDeactivate(null)}
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
                <span>Desactivar promoción</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

