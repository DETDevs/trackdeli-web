import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  MagnifyingGlass,
  UserPlus,
  X,
  CircleNotch,
  Phone,
  IdentificationCard,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  searchPosCustomers,
  createPosCustomer,
  getCustomerCreditAccounts,
  type PosCustomer,
  type CustomerCreditSummary,
} from 'api-client';
import { formatCurrency } from '../../../utils/formatters';

export interface SelectedCustomerData {
  id?: string | null;
  name: string;
  phone?: string | null;
  ruc?: string | null;
  creditLimit?: number | null;
  creditSummary?: CustomerCreditSummary['summary'] | null;
}

interface CustomerSelectorProps {
  selectedCustomer: SelectedCustomerData;
  onChangeCustomer: (customer: SelectedCustomerData) => void;
  carteraActive?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onChangeCustomer,
  carteraActive = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCredit, setIsLoadingCredit] = useState(false);

  // Modal de registro rápido
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickRuc, setQuickRuc] = useState('');
  const [quickCreditLimit, setQuickCreditLimit] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const [quickCreateError, setQuickCreateError] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);

  // Debounced search
  useEffect(() => {
    if (!isSearchOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchPosCustomers(trimmed);
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, isSearchOpen]);

  // Al seleccionar un cliente de la búsqueda
  const handleSelectCustomer = async (cust: PosCustomer) => {
    setIsSearchOpen(false);
    setQuery('');

    let creditSummary: CustomerCreditSummary['summary'] | null = null;

    if (carteraActive && cust.id) {
      setIsLoadingCredit(true);
      try {
        const creditRes = await getCustomerCreditAccounts(cust.id);
        if (creditRes && creditRes.summary) {
          creditSummary = creditRes.summary;
        }
      } catch {
        // No tiene cartera activa o error
      } finally {
        setIsLoadingCredit(false);
      }
    }

    onChangeCustomer({
      id: cust.id,
      name: cust.name,
      phone: cust.phone || null,
      ruc: cust.ruc || null,
      creditLimit: cust.creditLimit ?? null,
      creditSummary,
    });
  };

  // Restablecer a Consumidor final
  const handleResetToFinalConsumer = () => {
    onChangeCustomer({
      id: null,
      name: 'Consumidor final',
      phone: null,
      ruc: null,
      creditLimit: null,
      creditSummary: null,
    });
    setIsSearchOpen(false);
  };

  // Crear cliente rápido
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickCreateError('Ingresá el nombre del cliente.');
      return;
    }

    setIsSubmittingQuick(true);
    setQuickCreateError(null);

    try {
      const created = await createPosCustomer({
        name: quickName.trim(),
        phone: quickPhone.trim() || undefined,
        ruc: quickRuc.trim() || undefined,
        creditLimit: quickCreditLimit ? parseFloat(quickCreditLimit) : undefined,
      });

      setIsQuickCreateOpen(false);
      setQuickName('');
      setQuickPhone('');
      setQuickRuc('');
      setQuickCreditLimit('');

      // Auto-seleccionar nuevo cliente
      await handleSelectCustomer(created);
    } catch (err: any) {
      setQuickCreateError(err?.response?.data?.message || err?.message || 'Error al registrar cliente.');
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const isFinalConsumer = !selectedCustomer.id || selectedCustomer.name === 'Consumidor final';

  return (
    <div className="space-y-2">
      {/* Tarjeta de cliente seleccionado */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 shrink-0">
              <User size={16} weight={isFinalConsumer ? 'regular' : 'bold'} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 leading-snug break-words">
                {selectedCustomer.name}
              </div>
              <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-snug">
                {isFinalConsumer ? (
                  <span>Venta al contado por defecto</span>
                ) : (
                  <>
                    {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                    {selectedCustomer.ruc && <span>• {selectedCustomer.ruc}</span>}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isFinalConsumer && (
              <button
                type="button"
                onClick={handleResetToFinalConsumer}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Quitar cliente y usar Consumidor final"
              >
                <X size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <MagnifyingGlass size={14} weight="bold" />
              <span>{isFinalConsumer ? 'Buscar cliente' : 'Cambiar'}</span>
            </button>
          </div>
        </div>

        {/* Resumen de crédito si el cliente seleccionado tiene cuenta o límite */}
        {carteraActive && !isFinalConsumer && (
          <div className="pt-2 border-t border-gray-200/70 text-xs">
            {isLoadingCredit ? (
              <div className="flex items-center gap-2 text-gray-500 py-1">
                <CircleNotch size={14} className="animate-spin" />
                <span>Consultando estado de crédito...</span>
              </div>
            ) : selectedCustomer.creditSummary ? (
              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-gray-100 text-center">
                <div>
                  <span className="block text-xs text-gray-500 font-medium">Límite</span>
                  <span className="font-bold text-gray-900">
                    {selectedCustomer.creditSummary.creditLimit != null
                      ? formatCurrency(selectedCustomer.creditSummary.creditLimit)
                      : 'Sin límite'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-medium">Deuda actual</span>
                  <span className="font-bold text-amber-700">
                    {formatCurrency(selectedCustomer.creditSummary.totalDebt || 0)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-medium">Disponible</span>
                  <span
                    className={`font-black ${
                      (selectedCustomer.creditSummary.availableCredit ?? 0) > 0
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}
                  >
                    {selectedCustomer.creditSummary.availableCredit != null
                      ? formatCurrency(selectedCustomer.creditSummary.availableCredit)
                      : formatCurrency(0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic py-0.5">
                Este cliente no tiene cuenta de crédito configurada en el sistema.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel desplegable de búsqueda */}
      {isSearchOpen && (
        <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-lg space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <MagnifyingGlass size={15} />
              </span>
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, teléfono o cédula..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(true)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[44px]"
              title="Registrar nuevo cliente"
            >
              <UserPlus size={16} weight="bold" />
              <span>Nuevo</span>
            </button>
          </div>

          {/* Opciones directas */}
          <div className="flex items-center justify-between text-xs px-1 text-gray-500">
            <span>Resultados de búsqueda</span>
            <button
              type="button"
              onClick={handleResetToFinalConsumer}
              className="text-emerald-700 hover:underline font-bold cursor-pointer min-h-[44px] flex items-center"
            >
              Usar Consumidor final
            </button>
          </div>

          {/* Lista de resultados */}
          <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-gray-100">
            {isSearching ? (
              <div className="flex items-center justify-center py-4 text-gray-500 text-xs gap-2">
                <CircleNotch size={16} className="animate-spin" />
                <span>Buscando clientes...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCustomer(c)}
                  className="w-full text-left p-2.5 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-between gap-2 min-h-[44px] cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">{c.name}</div>
                    <div className="text-xs text-gray-500 truncate flex items-center gap-2">
                      {c.phone && <span>Tel: {c.phone}</span>}
                      {c.ruc && <span>Cédula: {c.ruc}</span>}
                    </div>
                  </div>
                  {c.creditLimit != null && c.creditLimit > 0 && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                      Crédito C$ {c.creditLimit}
                    </span>
                  )}
                </button>
              ))
            ) : query.trim().length >= 2 ? (
              <div className="text-center py-4 text-xs text-gray-500">
                No encontramos clientes con ese nombre o número.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setQuickName(query.trim());
                    setIsQuickCreateOpen(true);
                  }}
                  className="text-emerald-700 font-bold underline cursor-pointer"
                >
                  ¿Deseás registrarlo ahora?
                </button>
              </div>
            ) : (
              <div className="text-center py-3 text-xs text-gray-400">
                Escribí al menos 2 letras o dígitos para buscar
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de creación rápida de cliente */}
      {isQuickCreateOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <UserPlus size={18} weight="bold" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 leading-tight">
                  Registrar cliente rápido
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleQuickCreate} className="p-5 space-y-3">
              {quickCreateError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-1.5">
                  <WarningCircle size={15} className="shrink-0 mt-0.5" weight="fill" />
                  <span>{quickCreateError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Ej: Marvin Gómez"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Phone size={14} />
                  </span>
                  <input
                    type="tel"
                    required
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="Ej: 8888-1234"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cédula o RUC (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <IdentificationCard size={14} />
                  </span>
                  <input
                    type="text"
                    value={quickRuc}
                    onChange={(e) => setQuickRuc(e.target.value)}
                    placeholder="Ej: 001-010190-0000A"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
                  />
                </div>
              </div>

              {carteraActive && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Límite de crédito inicial (C$, opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickCreditLimit}
                    onChange={(e) => setQuickCreditLimit(e.target.value)}
                    placeholder="Ej: 1500.00"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCreateOpen(false)}
                  disabled={isSubmittingQuick}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 min-h-[44px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuick}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 min-h-[44px] cursor-pointer shadow-xs"
                >
                  {isSubmittingQuick ? (
                    <>
                      <CircleNotch size={15} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar y usar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

