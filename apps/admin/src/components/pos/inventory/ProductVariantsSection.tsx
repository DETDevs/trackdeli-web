import React, { useState, useMemo } from 'react';
import {
  Plus,
  X,
  Check,
  Question,
  WarningCircle,
} from '@phosphor-icons/react';
import type { PosProductVariantDetail } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import type { ProductField } from './ListFieldSelect';

export const MAX_VARIANTS = 100;

export interface DraftVariantRow {
  comboKey: string;
  label: string;
  variantValues: Record<string, string>;
  existingId?: string;
  existingStock?: number;
  priceText: string;
  costText: string;
  barcode: string;
  sku: string;
  initialStockText: string;
  isActive: boolean;
  excluded: boolean;
  error?: string | null;
  savedOk?: boolean;
}

export interface VariantsDraftState {
  enabled: boolean;
  samePrice: boolean;
  sameCost: boolean;
  selectedAxisKeys: string[];
  axisValues: Record<string, string[]>;
  valuePriceDeltas: Record<string, number>;
  rows: Record<string, DraftVariantRow>;
}

export function normalizeVariantKeyText(raw: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function makeCanonicalComboKey(
  values: Record<string, string> | null | undefined,
): string {
  if (!values) return '';
  return Object.keys(values)
    .sort()
    .map((k) => `${k.toLowerCase()}=${normalizeVariantKeyText(values[k] || '')}`)
    .join('|');
}

export function formatVariantValueLabel(
  raw: string,
  suggestions: string[],
  axisKey: string,
): string {
  const clean = raw.trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  const norm = normalizeVariantKeyText(clean);
  const matchedSuggestion = suggestions.find(
    (s) => normalizeVariantKeyText(s) === norm,
  );
  if (matchedSuggestion) return matchedSuggestion;

  // Tallas estándar o siglas cortas en mayúscula (XL, XXXL, S, M, L, XS, XXL)
  const isTallaAxis = normalizeVariantKeyText(axisKey) === 'talla';
  if (/^(x{0,4}[sml]|xs|sm|md|lg|xl|xxl|xxxl)$/i.test(clean)) {
    if (isTallaAxis || clean === clean.toUpperCase()) {
      return clean.toUpperCase();
    }
  }
  if (
    clean === clean.toUpperCase() &&
    /^[A-Z0-9\s-]{2,6}$/.test(clean) &&
    /[A-Z]/.test(clean)
  ) {
    return clean;
  }
  // Valores con dígitos + unidad (ej. "256 GB", "500 ml", "16GB")
  if (/\d/.test(clean)) {
    return clean;
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function extractFieldOptionLabels(field: ProductField): string[] {
  if (Array.isArray(field.fieldOptions) && field.fieldOptions.length > 0) {
    return field.fieldOptions
      .filter((o) => o.isActive !== false)
      .map((o) => o.label);
  }
  if (Array.isArray(field.options)) {
    return field.options
      .map((o) => (typeof o === 'string' ? o : o.isActive !== false ? o.label : ''))
      .filter(Boolean);
  }
  return [];
}

export function countTotalCombinations(
  axisKeys: string[],
  axisValues: Record<string, string[]>,
): number {
  const active = axisKeys
    .map((k) => (axisValues[k] || []).filter(Boolean).length)
    .filter((n) => n > 0);
  if (active.length === 0) return 0;
  return active.reduce((acc, n) => acc * n, 1);
}

export function isComboChecked(
  state: VariantsDraftState,
  comboKey: string,
): boolean {
  const row = state.rows[comboKey];
  if (!row) return true;
  return !row.excluded && row.isActive;
}

export function buildCombinations(
  axisKeys: string[],
  axisValues: Record<string, string[]>,
): Array<{ comboKey: string; label: string; variantValues: Record<string, string> }> {
  const activeAxes = axisKeys
    .map((k) => ({ key: k, values: (axisValues[k] || []).filter(Boolean) }))
    .filter((a) => a.values.length > 0);
  if (activeAxes.length === 0) return [];

  let combos: Array<{ labels: string[]; values: Record<string, string> }> = [
    { labels: [], values: {} },
  ];
  for (const ax of activeAxes) {
    const next: Array<{ labels: string[]; values: Record<string, string> }> = [];
    for (const prefix of combos) {
      for (const val of ax.values) {
        next.push({
          labels: [...prefix.labels, val],
          values: { ...prefix.values, [ax.key]: val },
        });
        if (next.length > MAX_VARIANTS + 1) break;
      }
      if (next.length > MAX_VARIANTS + 1) break;
    }
    combos = next;
  }

  return combos.map((c) => ({
    comboKey: makeCanonicalComboKey(c.values),
    label: c.labels.join(' / '),
    variantValues: c.values,
  }));
}

export function hydrateVariantsDraftFromExisting(
  variantAxes: string[] | null | undefined,
  existingVariants: PosProductVariantDetail[],
  parentPrice: number,
  parentCost: number | null,
): VariantsDraftState {
  const axes = Array.isArray(variantAxes) ? variantAxes.map(String) : [];
  const axisValues: Record<string, string[]> = {};
  for (const k of axes) axisValues[k] = [];

  const rows: Record<string, DraftVariantRow> = {};
  let allSamePrice = true;
  let allSameCost = true;

  for (const v of existingVariants) {
    const vals = (v.variantValues as Record<string, string>) || {};
    const orderedKeys = axes.length > 0 ? axes : Object.keys(vals);
    for (const k of orderedKeys) {
      const val = vals[k];
      if (val) {
        if (!axisValues[k]) axisValues[k] = [];
        const norm = normalizeVariantKeyText(val);
        if (!axisValues[k].some((x) => normalizeVariantKeyText(x) === norm)) {
          axisValues[k].push(val);
        }
      }
    }
    const comboKey = makeCanonicalComboKey(vals);
    const label = orderedKeys.map((k) => vals[k]).filter(Boolean).join(' / ') || v.name;
    if (Math.abs(Number(v.price || 0) - parentPrice) > 0.005) {
      allSamePrice = false;
    }
    const vCost = v.cost ?? null;
    if (vCost != null && parentCost != null && Math.abs(Number(vCost) - parentCost) > 0.005) {
      allSameCost = false;
    }
    rows[comboKey] = {
      comboKey,
      label,
      variantValues: vals,
      existingId: v.id,
      existingStock: Number(v.stock || 0),
      priceText: String(v.price ?? parentPrice),
      costText: vCost != null ? String(vCost) : parentCost != null ? String(parentCost) : '',
      barcode: v.barcode || '',
      sku: v.sku || '',
      initialStockText: '',
      isActive: v.isActive !== false,
      excluded: false,
    };
  }

  return {
    enabled: true,
    samePrice: allSamePrice,
    sameCost: allSameCost,
    selectedAxisKeys: axes.length > 0 ? axes : Object.keys(axisValues),
    axisValues,
    valuePriceDeltas: {},
    rows,
  };
}

function pluralizeAxisUnit(count: number, rawLabel: string): string {
  const lower = rawLabel.trim().toLowerCase();
  if (count === 1) return `1 ${lower}`;
  if (lower.endsWith('z')) return `${count} ${lower.slice(0, -1)}ces`;
  if (/[aeiouáéíóú]$/.test(lower)) return `${count} ${lower}s`;
  if (lower.endsWith('s')) return `${count} ${lower}`;
  return `${count} ${lower}es`;
}

// ==========================================
// MODAL DE AYUDA (ⓘ ¿Cómo funcionan las variantes?)
// ==========================================
export const VariantsHelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">¿Cómo funcionan las variantes?</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="text-xs text-gray-700 space-y-3 leading-relaxed">
          <p>
            <strong className="text-gray-900 font-bold">Opción</strong> es lo que cambia entre una variante y otra, por ejemplo Talla o Color.
          </p>
          <p>
            <strong className="text-gray-900 font-bold">Valores</strong> son las alternativas de cada opción, por ejemplo S, M, L o Rojo, Verde.
          </p>
          <p>
            El sistema combina un valor de cada opción. Cada combinación es una variante con su propio stock y código de barras.
          </p>

          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-2">
            <span className="text-xs font-bold text-purple-950 block">Ejemplo</span>
            <p className="text-xs text-purple-900">
              Talla (S, M) × Color (Rojo, Verde) = 4 variantes:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Rojo / S', 'Rojo / M', 'Verde / S', 'Verde / M'].map((ex) => (
                <span
                  key={ex}
                  className="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-950 text-xs font-medium"
                >
                  {ex}
                </span>
              ))}
            </div>
          </div>

          <p>
            Si un valor cuesta más, poné cuánto más junto al valor (por ejemplo, XL +C$ 20).
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SECCIÓN DE OPCIONES Y VALORES (SECCIÓN 1)
// ==========================================
export interface VariantsOptionsSectionProps {
  state: VariantsDraftState;
  onChange: (next: VariantsDraftState) => void;
  fields: ProductField[];
  isEditingExistingParent: boolean;
  canToggleVariants: boolean;
  parentPriceNum: number;
  currency: string;
  onRequestCreateField?: () => void;
  commonAttributes?: Record<string, any>;
  onRemoveVariantsConfirm?: () => void;
}

export const VariantsOptionsSection: React.FC<VariantsOptionsSectionProps> = ({
  state,
  onChange,
  fields,
  isEditingExistingParent,
  canToggleVariants,
  parentPriceNum,
  currency,
  onRequestCreateField,
  commonAttributes,
}) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [newValInputs, setNewValInputs] = useState<Record<string, string>>({});
  const [deltaTarget, setDeltaTarget] = useState<{ axisKey: string; value: string } | null>(null);
  const [deltaText, setDeltaText] = useState('');
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [confirmUncheckStock, setConfirmUncheckStock] = useState<{
    targets: Array<{ comboKey: string; label: string; variantValues: Record<string, string> }>;
    stock: number;
    count: number;
  } | null>(null);

  // Ordenar campos: LIST y SELECT primero
  const sortedFields = useMemo(() => {
    return [...fields]
      .filter((f) => f.isActive !== false && !f.key?.endsWith('_id'))
      .sort((a, b) => {
        const rankA = a.dataType === 'LIST' || a.dataType === 'SELECT' ? 0 : 1;
        const rankB = b.dataType === 'LIST' || b.dataType === 'SELECT' ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
        return a.label.localeCompare(b.label);
      });
  }, [fields]);

  const combinations = useMemo(
    () => buildCombinations(state.selectedAxisKeys, state.axisValues),
    [state.selectedAxisKeys, state.axisValues],
  );

  const activeAxesSummary = useMemo(() => {
    const active = state.selectedAxisKeys
      .map((k) => {
        const field = fields.find((f) => f.key === k);
        const count = (state.axisValues[k] || []).filter(Boolean).length;
        return {
          key: k,
          label: field?.label || k,
          count,
          values: state.axisValues[k] || [],
        };
      })
      .filter((a) => a.count > 0);
    const total = active.length === 0 ? 0 : active.reduce((acc, a) => acc * a.count, 1);
    const checkedCount = isEditingExistingParent
      ? combinations.filter((c) => isComboChecked(state, c.comboKey)).length
      : total === 0
      ? 0
      : combinations.filter((c) => isComboChecked(state, c.comboKey)).length;
    const breakdown = active.map((a) => pluralizeAxisUnit(a.count, a.label)).join(' × ');
    return { active, total, checkedCount, breakdown };
  }, [state, fields, combinations, isEditingExistingParent]);

  const handleToggleEnabled = (next: boolean) => {
    if (next) {
      onChange({ ...state, enabled: true });
      return;
    }
    const hasOptions =
      state.selectedAxisKeys.length > 0 ||
      Object.values(state.axisValues).some((vals) => vals.length > 0);
    if (!hasOptions) {
      onChange({ ...state, enabled: false });
      return;
    }
    setConfirmRemoveOpen(true);
  };

  const handleConfirmRemove = () => {
    onChange({
      ...state,
      enabled: false,
      selectedAxisKeys: [],
      axisValues: {},
      valuePriceDeltas: {},
      rows: {},
    });
    setConfirmRemoveOpen(false);
  };

  const toggleAxis = (key: string) => {
    if (isEditingExistingParent) return;
    const exists = state.selectedAxisKeys.includes(key);
    if (exists) {
      onChange({
        ...state,
        selectedAxisKeys: state.selectedAxisKeys.filter((k) => k !== key),
      });
      return;
    }
    const carriedVal = commonAttributes?.[key] ? String(commonAttributes[key]).trim() : '';
    const prevVals = state.axisValues[key] || [];
    let nextAxisVals = prevVals;
    if (
      carriedVal &&
      !prevVals.some((v) => normalizeVariantKeyText(v) === normalizeVariantKeyText(carriedVal))
    ) {
      nextAxisVals = [carriedVal, ...prevVals];
    }
    onChange({
      ...state,
      selectedAxisKeys: [...state.selectedAxisKeys, key],
      axisValues: { ...state.axisValues, [key]: nextAxisVals },
    });
  };

  const toggleAxisValue = (axisKey: string, label: string) => {
    const current = state.axisValues[axisKey] || [];
    const norm = normalizeVariantKeyText(label);
    const exists = current.some((v) => normalizeVariantKeyText(v) === norm);
    const next = exists
      ? current.filter((v) => normalizeVariantKeyText(v) !== norm)
      : [...current, label];
    onChange({
      ...state,
      axisValues: { ...state.axisValues, [axisKey]: next },
    });
  };

  const addCustomValue = (axisKey: string) => {
    const raw = (newValInputs[axisKey] || '').trim();
    if (!raw) return;
    const field = fields.find((f) => f.key === axisKey);
    const suggestions = field ? extractFieldOptionLabels(field) : [];
    const formatted = formatVariantValueLabel(raw, suggestions, axisKey);
    if (!formatted) return;

    const current = state.axisValues[axisKey] || [];
    const norm = normalizeVariantKeyText(formatted);
    if (!current.some((v) => normalizeVariantKeyText(v) === norm)) {
      onChange({
        ...state,
        axisValues: { ...state.axisValues, [axisKey]: [...current, formatted] },
      });
    }
    setNewValInputs((prev) => ({ ...prev, [axisKey]: '' }));
  };

  const applyCombosChecked = (
    targets: Array<{ comboKey: string; label: string; variantValues: Record<string, string> }>,
    nextChecked: boolean,
  ) => {
    const commit = () => {
      const nextRows = { ...state.rows };
      for (const c of targets) {
        const existing = nextRows[c.comboKey];
        if (existing?.existingId) {
          nextRows[c.comboKey] = {
            ...existing,
            isActive: nextChecked,
            excluded: false,
            savedOk: false,
            error: null,
          };
        } else {
          const base = existing || {
            comboKey: c.comboKey,
            label: c.label,
            variantValues: c.variantValues,
            priceText: parentPriceNum > 0 ? String(parentPriceNum) : '',
            costText: '',
            barcode: '',
            sku: '',
            initialStockText: '',
            isActive: true,
            excluded: false,
          };
          nextRows[c.comboKey] = {
            ...base,
            isActive: nextChecked,
            excluded: !nextChecked,
            savedOk: false,
            error: null,
          };
        }
      }
      onChange({ ...state, rows: nextRows });
    };

    if (!nextChecked) {
      const withStock = targets
        .map((c) => state.rows[c.comboKey])
        .filter((r) => Boolean(r?.existingId) && Number(r?.existingStock || 0) > 0);

      if (withStock.length > 0) {
        const totalStock = withStock.reduce((sum, r) => sum + Number(r?.existingStock || 0), 0);
        setConfirmUncheckStock({
          targets,
          stock: totalStock,
          count: withStock.length,
        });
        return;
      }
    }

    commit();
  };

  const applyPriceDeltaForValue = () => {
    if (!deltaTarget) return;
    const delta = Number(deltaText.replace(',', '.').trim());
    if (!Number.isFinite(delta)) return;

    const nextRows = { ...state.rows };
    const normTarget = normalizeVariantKeyText(deltaTarget.value);
    for (const c of combinations.slice(0, MAX_VARIANTS)) {
      const val = c.variantValues[deltaTarget.axisKey] || '';
      if (normalizeVariantKeyText(val) === normTarget) {
        const base = nextRows[c.comboKey] || {
          comboKey: c.comboKey,
          label: c.label,
          variantValues: c.variantValues,
          priceText: parentPriceNum > 0 ? String(parentPriceNum) : '',
          costText: '',
          barcode: '',
          sku: '',
          initialStockText: '',
          isActive: true,
          excluded: false,
        };
        const nextPrice = Math.max(0, Math.round((parentPriceNum + delta) * 100) / 100);
        nextRows[c.comboKey] = { ...base, priceText: String(nextPrice), error: null };
      }
    }

    onChange({
      ...state,
      rows: nextRows,
      valuePriceDeltas: {
        ...state.valuePriceDeltas,
        [`${deltaTarget.axisKey}::${deltaTarget.value}`]: delta,
      },
    });
    setDeltaTarget(null);
    setDeltaText('');
  };

  const isLockedExistingNonVariant = !canToggleVariants && !isEditingExistingParent;

  return (
    <div className="pt-3 border-t border-gray-100 space-y-3.5">
      {/* Toggle principal */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50">
        <div className="pr-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-900">Este producto tiene variantes</span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="text-gray-400 hover:text-purple-700 transition-colors cursor-pointer"
              title="¿Cómo funcionan las variantes?"
            >
              <Question size={15} weight="bold" />
            </button>
          </div>
          <span className="text-xs text-gray-500 block mt-0.5">
            {isLockedExistingNonVariant
              ? 'No podés agregar variantes a un producto con stock. Ajustá el stock a 0 primero.'
              : 'Por ejemplo: colores, tallas o capacidades, cada una con su propio stock y código.'}
          </span>
        </div>
        <input
          type="checkbox"
          disabled={!canToggleVariants || isEditingExistingParent}
          checked={state.enabled}
          onChange={(e) => handleToggleEnabled(e.target.checked)}
          className="w-5 h-5 text-purple-600 rounded border-gray-300 shrink-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      {state.enabled && (
        <div className="space-y-4 pt-1">
          {/* Selector de opciones (ejes) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800">
                Opciones (¿en qué varía este producto?)
              </label>
              {onRequestCreateField && !isEditingExistingParent && (
                <button
                  type="button"
                  onClick={onRequestCreateField}
                  className="text-xs font-semibold text-purple-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={12} weight="bold" />
                  <span>Nuevo atributo</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {sortedFields.map((field) => {
                const isSelected = state.selectedAxisKeys.includes(field.key);
                return (
                  <button
                    key={field.id}
                    type="button"
                    disabled={isEditingExistingParent && isSelected}
                    onClick={() => toggleAxis(field.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && <Check size={13} weight="bold" />}
                    <span>{field.label}</span>
                  </button>
                );
              })}
            </div>
            {state.selectedAxisKeys.length === 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                Seleccioná al menos una opción (ej. Talla o Color) para configurar sus variantes.
              </p>
            )}
          </div>

          {/* Valores para cada eje seleccionado */}
          {state.selectedAxisKeys.map((axisKey) => {
            const field = fields.find((f) => f.key === axisKey);
            const label = field?.label || axisKey;
            const suggestions = field ? extractFieldOptionLabels(field) : [];
            const chosen = state.axisValues[axisKey] || [];

            return (
              <div
                key={axisKey}
                className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{label}</span>
                    <span className="text-xs text-gray-400 font-normal">
                      ({chosen.length} {chosen.length === 1 ? 'valor' : 'valores'})
                    </span>
                  </div>
                  {!isEditingExistingParent && (
                    <button
                      type="button"
                      onClick={() => toggleAxis(axisKey)}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Quitar opción"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  )}
                </div>

                {/* Sugerencias de valores */}
                {suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-gray-500 font-medium block">
                      Valores sugeridos:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((sug) => {
                        const isPicked = chosen.some(
                          (v) => normalizeVariantKeyText(v) === normalizeVariantKeyText(sug),
                        );
                        const deltaKey = `${axisKey}::${sug}`;
                        const deltaVal = state.valuePriceDeltas[deltaKey];

                        return (
                          <div key={sug} className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleAxisValue(axisKey, sug)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                                isPicked
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                              }`}
                            >
                              {isPicked && <Check size={12} weight="bold" className="text-purple-700" />}
                              <span>{sug}</span>
                            </button>

                            {/* Botón + precio */}
                            {isPicked && !state.samePrice && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeltaTarget({ axisKey, value: sug });
                                  setDeltaText(deltaVal != null ? String(deltaVal) : '');
                                }}
                                className="px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors"
                                title="Ajustar precio para este valor"
                              >
                                {deltaVal != null && deltaVal !== 0
                                  ? `${deltaVal > 0 ? '+' : ''}${formatCurrency(deltaVal, currency)}`
                                  : '+ precio'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Valores seleccionados si no estaban en sugerencias */}
                {chosen.filter((c) => !suggestions.some((s) => normalizeVariantKeyText(s) === normalizeVariantKeyText(c))).length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 font-medium block">
                      Valores personalizados:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {chosen
                        .filter((c) => !suggestions.some((s) => normalizeVariantKeyText(s) === normalizeVariantKeyText(c)))
                        .map((val) => {
                          const deltaKey = `${axisKey}::${val}`;
                          const deltaVal = state.valuePriceDeltas[deltaKey];

                          return (
                            <div key={val} className="inline-flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300">
                                <span>{val}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleAxisValue(axisKey, val)}
                                  className="text-purple-700 hover:text-red-700 ml-0.5 cursor-pointer"
                                  title="Quitar valor"
                                >
                                  <X size={12} weight="bold" />
                                </button>
                              </span>

                              {/* Botón + precio */}
                              {!state.samePrice && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeltaTarget({ axisKey, value: val });
                                    setDeltaText(deltaVal != null ? String(deltaVal) : '');
                                  }}
                                  className="px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors"
                                  title="Ajustar precio para este valor"
                                >
                                  {deltaVal != null && deltaVal !== 0
                                    ? `${deltaVal > 0 ? '+' : ''}${formatCurrency(deltaVal, currency)}`
                                    : '+ precio'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Input para agregar otro valor */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newValInputs[axisKey] || ''}
                    onChange={(e) =>
                      setNewValInputs((prev) => ({ ...prev, [axisKey]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomValue(axisKey);
                      }
                    }}
                    placeholder={`Otro valor de ${label.toLowerCase()} (ej. XXXL)...`}
                    className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600 bg-white"
                  />
                  <button
                    type="button"
                    disabled={!(newValInputs[axisKey] || '').trim()}
                    onClick={() => addCustomValue(axisKey)}
                    className="px-3 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>

                {chosen.length === 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    Agregá al menos un valor de {label.toLowerCase()} para generar las variantes.
                  </p>
                )}
              </div>
            );
          })}

          {/* Selector de combinaciones: Cuadrícula (2 ejes), Chips (1 eje), Lista (3+ ejes) */}
          {activeAxesSummary.total > 0 && activeAxesSummary.total <= MAX_VARIANTS && (
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">¿Qué combinaciones vendés?</h4>
                  <p className="text-xs text-gray-500">
                    Desmarcá las combinaciones que no comercializás.
                  </p>
                </div>
              </div>

              {/* Caso 1 opción: Chips para marcar/desmarcar */}
              {activeAxesSummary.active.length === 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {combinations.map((c) => {
                    const checked = isComboChecked(state, c.comboKey);
                    return (
                      <button
                        key={c.comboKey}
                        type="button"
                        onClick={() => applyCombosChecked([c], !checked)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                          checked
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'bg-gray-50 border border-gray-200 text-gray-400 line-through'
                        }`}
                      >
                        <Check
                          size={14}
                          weight="bold"
                          className={checked ? 'text-white' : 'opacity-0'}
                        />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Caso 2 opciones: Cuadrícula bidimensional */}
              {activeAxesSummary.active.length === 2 && (() => {
                const rowAxis = activeAxesSummary.active[0];
                const colAxis = activeAxesSummary.active[1];
                const comboMap = new Map(combinations.map((c) => [c.comboKey, c]));

                const getRowCombos = (rowVal: string) =>
                  colAxis.values
                    .map((colVal) =>
                      comboMap.get(
                        makeCanonicalComboKey({
                          [rowAxis.key]: rowVal,
                          [colAxis.key]: colVal,
                        }),
                      ),
                    )
                    .filter(Boolean) as typeof combinations;

                const getColCombos = (colVal: string) =>
                  rowAxis.values
                    .map((rowVal) =>
                      comboMap.get(
                        makeCanonicalComboKey({
                          [rowAxis.key]: rowVal,
                          [colAxis.key]: colVal,
                        }),
                      ),
                    )
                    .filter(Boolean) as typeof combinations;

                return (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700">
                          <th className="p-2.5 text-left text-gray-500 font-semibold bg-gray-100/70 whitespace-nowrap">
                            {rowAxis.label} \ {colAxis.label}
                          </th>
                          {colAxis.values.map((colVal) => {
                            const colCombos = getColCombos(colVal);
                            const allColChecked =
                              colCombos.length > 0 &&
                              colCombos.every((c) => isComboChecked(state, c.comboKey));
                            return (
                              <th key={colVal} className="p-2.5">
                                <button
                                  type="button"
                                  onClick={() => applyCombosChecked(colCombos, !allColChecked)}
                                  className={`px-2 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                                    allColChecked
                                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                      : 'text-gray-500 hover:bg-gray-200'
                                  }`}
                                  title={`${allColChecked ? 'Desmarcar' : 'Marcar'} toda la columna ${colVal}`}
                                >
                                  {colVal}
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {rowAxis.values.map((rowVal) => {
                          const rowCombos = getRowCombos(rowVal);
                          const allRowChecked =
                            rowCombos.length > 0 &&
                            rowCombos.every((c) => isComboChecked(state, c.comboKey));

                          return (
                            <tr key={rowVal} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-2.5 text-left font-bold text-gray-800 bg-gray-50/40 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => applyCombosChecked(rowCombos, !allRowChecked)}
                                  className={`px-2 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                                    allRowChecked
                                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                      : 'text-gray-500 hover:bg-gray-200'
                                  }`}
                                  title={`${allRowChecked ? 'Desmarcar' : 'Marcar'} toda la fila ${rowVal}`}
                                >
                                  {rowVal}
                                </button>
                              </td>

                              {colAxis.values.map((colVal) => {
                                const combo = comboMap.get(
                                  makeCanonicalComboKey({
                                    [rowAxis.key]: rowVal,
                                    [colAxis.key]: colVal,
                                  }),
                                );
                                if (!combo) return <td key={colVal} className="p-2.5">—</td>;
                                const checked = isComboChecked(state, combo.comboKey);

                                return (
                                  <td key={combo.comboKey} className="p-2.5">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => applyCombosChecked([combo], !checked)}
                                      className="w-4 h-4 text-purple-600 rounded border-gray-300 cursor-pointer"
                                      aria-label={combo.label}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Caso 3+ opciones: Marcar/Desmarcar todas y lista */}
              {activeAxesSummary.active.length >= 3 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyCombosChecked(combinations, true)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 cursor-pointer"
                    >
                      Marcar todas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCombosChecked(combinations, false)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      Desmarcar todas
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl p-2 bg-gray-50/30">
                    {combinations.map((c) => {
                      const checked = isComboChecked(state, c.comboKey);
                      return (
                        <label
                          key={c.comboKey}
                          className="flex items-center gap-2 p-1.5 text-xs font-medium text-gray-800 cursor-pointer hover:bg-gray-100/60 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => applyCombosChecked([c], !checked)}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300"
                          />
                          <span className={checked ? 'text-gray-900' : 'text-gray-400 line-through'}>
                            {c.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contador en vivo */}
          {activeAxesSummary.total > MAX_VARIANTS ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <WarningCircle size={16} className="shrink-0" />
              <span>
                Son demasiadas combinaciones ({activeAxesSummary.total}). El máximo es {MAX_VARIANTS}.
              </span>
            </div>
          ) : activeAxesSummary.total > 0 ? (
            activeAxesSummary.checkedCount === 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <WarningCircle size={16} className="shrink-0" />
                <span>Marcá al menos una combinación.</span>
              </div>
            ) : (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 font-semibold flex items-center justify-between">
                <span>
                  {isEditingExistingParent
                    ? activeAxesSummary.checkedCount === 1
                      ? `1 variante activa (de ${activeAxesSummary.total})`
                      : `${activeAxesSummary.checkedCount} variantes activas (de ${activeAxesSummary.total})`
                    : activeAxesSummary.checkedCount === 1
                    ? `Se va a crear 1 variante${
                        activeAxesSummary.checkedCount === activeAxesSummary.total
                          ? ` (${activeAxesSummary.breakdown})`
                          : ` (de ${activeAxesSummary.total})`
                      }`
                    : `Se van a crear ${activeAxesSummary.checkedCount} variantes${
                        activeAxesSummary.checkedCount === activeAxesSummary.total
                          ? ` (${activeAxesSummary.breakdown})`
                          : ` (de ${activeAxesSummary.total})`
                      }`}
                </span>
                <span className="text-purple-700 text-xs font-normal">Máximo 100</span>
              </div>
            )
          ) : null}

          {/* Modal / Dialog inline para + precio */}
          {deltaTarget && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950">
                  Ajuste para «{deltaTarget.value}» sobre el precio base
                </span>
                <button
                  type="button"
                  onClick={() => setDeltaTarget(null)}
                  className="text-emerald-700 hover:text-emerald-950"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
              <p className="text-xs text-emerald-800">
                Sumará o restará este monto a todas las variantes con {deltaTarget.value}.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={deltaText}
                  onChange={(e) => setDeltaText(e.target.value)}
                  placeholder="Ej. 20"
                  className="w-32 h-9 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-mono text-gray-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={applyPriceDeltaForValue}
                  className="px-3 h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => setDeltaTarget(null)}
                  className="px-3 h-9 rounded-xl border border-emerald-300 text-emerald-900 text-xs font-medium hover:bg-emerald-100/50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Ayuda */}
      <VariantsHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Modal confirmación quitar variantes */}
      {confirmRemoveOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">¿Quitar las variantes?</h3>
            <p className="text-xs text-gray-600">
              Se perderán las opciones y combinaciones que cargaste para este producto.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveOpen(false)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Quitar variantes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación desmarcar con stock */}
      {confirmUncheckStock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">
              {confirmUncheckStock.count === 1 ? 'Desactivar variante' : 'Desactivar variantes'}
            </h3>
            <p className="text-xs text-gray-600">
              {confirmUncheckStock.count === 1
                ? `Esta variante tiene ${confirmUncheckStock.stock} en stock. ¿Desactivarla igual?`
                : `${confirmUncheckStock.count} variantes tienen stock (${confirmUncheckStock.stock} en total). ¿Desactivarlas igual?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUncheckStock(null)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const targets = confirmUncheckStock.targets;
                  const nextRows = { ...state.rows };
                  for (const c of targets) {
                    const existing = nextRows[c.comboKey];
                    if (existing?.existingId) {
                      nextRows[c.comboKey] = {
                        ...existing,
                        isActive: false,
                        excluded: false,
                        savedOk: false,
                        error: null,
                      };
                    } else {
                      nextRows[c.comboKey] = {
                        ...(existing || {
                          comboKey: c.comboKey,
                          label: c.label,
                          variantValues: c.variantValues,
                          priceText: parentPriceNum > 0 ? String(parentPriceNum) : '',
                          costText: '',
                          barcode: '',
                          sku: '',
                          initialStockText: '',
                          isActive: false,
                          excluded: true,
                        }),
                        isActive: false,
                        excluded: true,
                        savedOk: false,
                        error: null,
                      };
                    }
                  }
                  onChange({ ...state, rows: nextRows });
                  setConfirmUncheckStock(null);
                }}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SECCIÓN DE TABLA DE COMBINACIONES (SECCIÓN 2 / PRECIOS)
// ==========================================
export interface VariantsTableSectionProps {
  state: VariantsDraftState;
  onChange: (next: VariantsDraftState) => void;
  isEditingExistingParent: boolean;
  parentPriceNum: number;
  parentCostNum: number | null;
  currency: string;
  canManageCost: boolean;
  isReadOnly: boolean;
  unit: string;
}

export const VariantsTableSection: React.FC<VariantsTableSectionProps> = ({
  state,
  onChange,
  isEditingExistingParent,
  parentPriceNum,
  parentCostNum,
  currency,
  canManageCost,
  isReadOnly,
  unit,
}) => {
  const [bulkStockText, setBulkStockText] = useState('');
  const [confirmDeactivateRow, setConfirmDeactivateRow] = useState<DraftVariantRow | null>(null);

  const combinations = useMemo(
    () => buildCombinations(state.selectedAxisKeys, state.axisValues),
    [state.selectedAxisKeys, state.axisValues],
  );

  const visibleRows: DraftVariantRow[] = useMemo(() => {
    return combinations
      .slice(0, MAX_VARIANTS)
      .filter((c) => isComboChecked(state, c.comboKey))
      .map((c) => {
        const existing = state.rows[c.comboKey];
        if (existing) return existing;
        return {
          comboKey: c.comboKey,
          label: c.label,
          variantValues: c.variantValues,
          priceText: parentPriceNum > 0 ? String(parentPriceNum) : '',
          costText: parentCostNum != null ? String(parentCostNum) : '',
          barcode: '',
          sku: '',
          initialStockText: '',
          isActive: true,
          excluded: false,
        };
      });
  }, [combinations, state, parentPriceNum, parentCostNum]);

  const activeCount = visibleRows.length;

  const totalExistingStock = useMemo(
    () => visibleRows.reduce((sum, r) => sum + Number(r.existingStock || 0), 0),
    [visibleRows],
  );

  const updateRow = (comboKey: string, patch: Partial<DraftVariantRow>) => {
    const base = state.rows[comboKey] || visibleRows.find((r) => r.comboKey === comboKey);
    if (!base) return;
    onChange({
      ...state,
      rows: {
        ...state.rows,
        [comboKey]: { ...base, ...patch, savedOk: false, error: null },
      },
    });
  };

  const handleToggleRowActive = (row: DraftVariantRow) => {
    if (row.isActive) {
      // Intenta desactivar
      if (row.existingId && Number(row.existingStock || 0) > 0) {
        setConfirmDeactivateRow(row);
        return;
      }
      updateRow(row.comboKey, { isActive: false, excluded: !row.existingId });
    } else {
      // Reactivar
      updateRow(row.comboKey, { isActive: true, excluded: false });
    }
  };

  const applyStockToAll = () => {
    const clean = bulkStockText.trim();
    if (!clean) return;
    const nextRows = { ...state.rows };
    for (const r of visibleRows) {
      if (!r.existingId) {
        nextRows[r.comboKey] = { ...r, initialStockText: clean };
      }
    }
    onChange({ ...state, rows: nextRows });
    setBulkStockText('');
  };

  if (!state.enabled || visibleRows.length === 0) return null;

  return (
    <div className="pt-3 border-t border-gray-100 space-y-3.5">
      {/* Encabezado y switches Mismo precio / Mismo costo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
            <span>Combinaciones de variantes</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-bold">
              {activeCount} {activeCount === 1 ? 'activa' : 'activas'}
            </span>
          </h4>
          {isEditingExistingParent && (
            <p className="text-xs text-gray-500 mt-0.5">
              Stock total actual: <strong className="text-gray-900 font-bold">{totalExistingStock} {unit}</strong>
            </p>
          )}
        </div>

        {/* Toggles Mismo precio / Mismo costo */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={isReadOnly}
              checked={state.samePrice}
              onChange={(e) => onChange({ ...state, samePrice: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-800">Mismo precio</span>
          </label>

          {canManageCost && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={state.sameCost}
                onChange={(e) => onChange({ ...state, sameCost: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-800">Mismo costo</span>
            </label>
          )}
        </div>
      </div>

      {/* Aplicar stock inicial a todas (solo si hay nuevas) */}
      {visibleRows.some((r) => !r.existingId) && !isReadOnly && (
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            Stock inicial:
          </span>
          <input
            type="number"
            step="any"
            min="0"
            value={bulkStockText}
            onChange={(e) => setBulkStockText(e.target.value)}
            placeholder="Cantidad para todas (ej. 5)"
            className="w-48 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600"
          />
          <button
            type="button"
            disabled={!bulkStockText.trim()}
            onClick={applyStockToAll}
            className="px-3 h-8 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Aplicar a todas
          </button>
        </div>
      )}

      {/* Tabla de combinaciones */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700">
              <th className="py-2.5 px-3">Combinación</th>
              <th className="py-2.5 px-3 text-right">Precio ({currency})</th>
              {canManageCost && <th className="py-2.5 px-3 text-right">Costo ({currency})</th>}
              <th className="py-2.5 px-3">Código de barras</th>
              <th className="py-2.5 px-3">SKU</th>
              <th className="py-2.5 px-3 text-right">
                {visibleRows.some((r) => !r.existingId) ? 'Stock inicial' : 'Stock actual'}
              </th>
              <th className="py-2.5 px-3 text-center">Activa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {visibleRows.map((row) => {
              const rowPriceVal = state.samePrice ? String(parentPriceNum) : row.priceText;
              const rowCostVal = state.sameCost
                ? parentCostNum != null
                  ? String(parentCostNum)
                  : ''
                : row.costText;

              return (
                <tr
                  key={row.comboKey}
                  className={`hover:bg-gray-50/60 transition-colors ${
                    !row.isActive ? 'opacity-60 bg-gray-50/40' : ''
                  }`}
                >
                  {/* Nombre de combinación */}
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-gray-900 block">{row.label}</span>
                    {row.error && (
                      <p className="text-xs text-red-600 font-medium mt-0.5">{row.error}</p>
                    )}
                    {row.savedOk && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                        <Check size={12} weight="bold" />
                        <span>Guardada</span>
                      </span>
                    )}
                  </td>

                  {/* Precio */}
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isReadOnly || state.samePrice}
                      value={rowPriceVal}
                      onChange={(e) => updateRow(row.comboKey, { priceText: e.target.value })}
                      placeholder="0.00"
                      className={`w-24 h-8 px-2 rounded-lg border text-xs font-mono text-right text-gray-900 focus:outline-none ${
                        state.samePrice
                          ? 'bg-gray-50 border-gray-200 text-gray-500'
                          : 'border-gray-200 focus:border-purple-600 bg-white'
                      }`}
                    />
                  </td>

                  {/* Costo */}
                  {canManageCost && (
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isReadOnly || state.sameCost}
                        value={rowCostVal}
                        onChange={(e) => updateRow(row.comboKey, { costText: e.target.value })}
                        placeholder="0.00"
                        className={`w-24 h-8 px-2 rounded-lg border text-xs font-mono text-right text-gray-900 focus:outline-none ${
                          state.sameCost
                            ? 'bg-gray-50 border-gray-200 text-gray-500'
                            : 'border-gray-200 focus:border-purple-600 bg-white'
                        }`}
                      />
                    </td>
                  )}

                  {/* Código de barras (pistola USB) */}
                  <td className="py-2.5 px-3">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.barcode}
                        onChange={(e) => updateRow(row.comboKey, { barcode: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder="Escanear / escribir..."
                        className="w-36 h-8 px-2 rounded-lg border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600 bg-white"
                      />
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={row.sku}
                      onChange={(e) => updateRow(row.comboKey, { sku: e.target.value })}
                      placeholder="SKU..."
                      className="w-24 h-8 px-2 rounded-lg border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-600 bg-white"
                    />
                  </td>

                  {/* Stock inicial o actual */}
                  <td className="py-2.5 px-3 text-right">
                    {row.existingId ? (
                      <span className="font-bold text-gray-800 text-xs font-mono">
                        {row.existingStock ?? 0} {unit}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={isReadOnly}
                        value={row.initialStockText}
                        onChange={(e) =>
                          updateRow(row.comboKey, { initialStockText: e.target.value })
                        }
                        placeholder="0"
                        className="w-20 h-8 px-2 rounded-lg border border-gray-200 text-xs font-mono text-right text-gray-900 focus:outline-none focus:border-purple-600 bg-white"
                      />
                    )}
                  </td>

                  {/* Activa */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={row.isActive}
                      onChange={() => handleToggleRowActive(row)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 cursor-pointer"
                      title={row.isActive ? 'Variante activa' : 'Variante inactiva'}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal confirmación desactivar variante con stock */}
      {confirmDeactivateRow && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Desactivar variante</h3>
            <p className="text-xs text-gray-600">
              La variante <strong className="text-gray-900">{confirmDeactivateRow.label}</strong> tiene{' '}
              {confirmDeactivateRow.existingStock} en stock. ¿Desactivarla igual?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeactivateRow(null)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  updateRow(confirmDeactivateRow.comboKey, {
                    isActive: false,
                    excluded: !confirmDeactivateRow.existingId,
                  });
                  setConfirmDeactivateRow(null);
                }}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
