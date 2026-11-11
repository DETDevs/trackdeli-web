import React, { useState, useEffect, useRef, useId } from 'react';
import { CaretDown, Check, Plus, X, WarningCircle, SpinnerGap, MagnifyingGlass } from '@phosphor-icons/react';
import { createPosProductFieldOption, getPosProductFieldOptions } from 'api-client';

export interface ProductFieldOption {
  id: string;
  fieldDefinitionId?: string;
  businessId?: string;
  label: string;
  normalizedLabel?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ProductField {
  id: string;
  key: string;
  label: string;
  dataType: string;
  required?: boolean;
  order?: number;
  isActive?: boolean;
  options?: any;
  fieldOptions?: ProductFieldOption[];
  allowCreateInline?: boolean;
}

export interface ListFieldSelectProps {
  field: ProductField;
  value: string;
  onChange: (label: string, optionId?: string) => void;
  disabled?: boolean;
  onOptionCreated?: (newOption: ProductFieldOption) => void;
  hasError?: boolean;
  triggerRef?: React.RefObject<HTMLDivElement> | ((el: HTMLDivElement | null) => void);
  businessId?: string;
}

export const ListFieldSelect: React.FC<ListFieldSelectProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  onOptionCreated,
  hasError = false,
  triggerRef,
  businessId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ProductFieldOption[]>(field.fieldOptions || []);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLDivElement>(null);

  const listboxId = useId();

  // Sincronizar opciones cuando cambie field.fieldOptions
  useEffect(() => {
    if (field.fieldOptions) {
      setOptions(field.fieldOptions);
    }
  }, [field.fieldOptions]);

  // Recargar opciones frescas desde el API al abrir si el campo tiene un ID real
  useEffect(() => {
    if (!isOpen || !field.id || field.id.startsWith('synth_')) return;

    let isMounted = true;
    setIsLoadingOptions(true);
    getPosProductFieldOptions(field.id, businessId)
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setOptions(data);
        }
      })
      .catch(() => {
        // Si falla la recarga en segundo plano, se mantienen las opciones locales existentes
      })
      .finally(() => {
        if (isMounted) setIsLoadingOptions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, field.id, businessId]);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setErrorMessage(null);
        setQuery('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const filteredOptions = options.filter((opt) => {
    if (opt.isActive === false) return false;
    if (!normalizedQuery) return true;
    return opt.label.toLowerCase().includes(normalizedQuery);
  });

  const exactMatchExists = options.some(
    (opt) => opt.isActive !== false && opt.label.trim().toLowerCase() === normalizedQuery,
  );

  const canCreate =
    field.allowCreateInline !== false &&
    trimmedQuery.length > 0 &&
    !exactMatchExists &&
    !field.id.startsWith('synth_');

  // Total de elementos navegables por teclado (opciones + botón crear si está activo)
  const totalNavigable = filteredOptions.length + (canCreate ? 1 : 0);

  // Asegurar que el elemento resaltado esté visible en el scroll
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const itemEl = listRef.current.querySelector<HTMLElement>(`[data-nav-index="${highlightedIndex}"]`);
      if (itemEl) {
        itemEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelectOption = (opt: ProductFieldOption) => {
    onChange(opt.label, opt.id);
    setQuery('');
    setIsOpen(false);
    setErrorMessage(null);
    setHighlightedIndex(-1);
    triggerButtonRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setQuery('');
    setErrorMessage(null);
    setHighlightedIndex(-1);
  };

  const handleCreateOption = async () => {
    if (!trimmedQuery || isCreating || field.id.startsWith('synth_')) return;

    setIsCreating(true);
    setErrorMessage(null);
    try {
      const newOpt = await createPosProductFieldOption(
        field.id,
        { label: trimmedQuery },
        businessId,
      );

      setOptions((prev) => {
        const filtered = prev.filter((o) => o.id !== newOpt.id);
        return [...filtered, newOpt].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label),
        );
      });

      onChange(newOpt.label, newOpt.id);
      if (onOptionCreated) {
        onOptionCreated(newOpt);
      }
      setIsOpen(false);
      setQuery('');
      setHighlightedIndex(-1);
      triggerButtonRef.current?.focus();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al crear la opción. Por favor intentá de nuevo.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsCreating(false);
    }
  };

  const openDropdown = () => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(-1);
    setErrorMessage(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalNavigable > 0) {
        setHighlightedIndex((prev) => (prev + 1 < totalNavigable ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalNavigable > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalNavigable - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (highlightedIndex === filteredOptions.length && canCreate) {
        handleCreateOption();
      } else if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[0]);
      } else if (canCreate) {
        handleCreateOption();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setErrorMessage(null);
      setQuery('');
      setHighlightedIndex(-1);
      triggerButtonRef.current?.focus();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setErrorMessage(null);
      setHighlightedIndex(-1);
    }
  };

  const activeDescendantId =
    highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
      ? `${listboxId}-opt-${filteredOptions[highlightedIndex].id}`
      : highlightedIndex === filteredOptions.length && canCreate
      ? `${listboxId}-create-btn`
      : undefined;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botón disparador (trigger) */}
      <div
        ref={(el) => {
          (triggerButtonRef as any).current = el;
          if (typeof triggerRef === 'function') {
            triggerRef(el);
          } else if (triggerRef && 'current' in triggerRef) {
            (triggerRef as any).current = el;
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={field.label}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            if (isOpen) {
              setIsOpen(false);
            } else {
              openDropdown();
            }
          }
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault();
            openDropdown();
          }
        }}
        className={`w-full min-h-[44px] flex items-center justify-between border rounded-xl px-3 py-2.5 text-xs bg-white cursor-pointer transition-colors shadow-2xs ${
          disabled
            ? 'bg-gray-50 cursor-not-allowed opacity-75 border-gray-200'
            : hasError
            ? 'border-red-500 bg-red-50/20 focus:border-red-600'
            : 'border-gray-200 hover:border-gray-300 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600'
        } ${isOpen ? 'border-purple-600 ring-1 ring-purple-600' : ''}`}
      >
        <span className={`truncate mr-2 ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {value || `Seleccionar ${field.label.toLowerCase()}...`}
        </span>
        <div className="flex items-center space-x-1 shrink-0 text-gray-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              title="Borrar selección"
              aria-label={`Borrar selección de ${field.label}`}
            >
              <X size={14} weight="bold" />
            </button>
          )}
          <CaretDown size={14} weight="bold" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Panel desplegable con buscador y opciones */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-64 animate-in fade-in slide-in-from-top-1 duration-100">
          {/* Caja de búsqueda interna */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                role="searchbox"
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-activedescendant={activeDescendantId}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setErrorMessage(null);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDownInput}
                placeholder="Escribir para filtrar o crear..."
                className="w-full text-xs bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-2 outline-none text-gray-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 placeholder:text-gray-400"
              />
              <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Aviso de error al crear o consultar */}
          {errorMessage && (
            <div className="px-3 py-2 bg-red-50 border-b border-red-100 flex items-center space-x-2 text-xs text-red-700">
              <WarningCircle size={16} className="shrink-0 text-red-600" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          {/* Lista de opciones */}
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={`Opciones de ${field.label}`}
            className="overflow-y-auto flex-1 divide-y divide-gray-50 py-1"
          >
            {isLoadingOptions && options.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-500 font-medium flex items-center justify-center space-x-2">
                <SpinnerGap size={14} className="animate-spin text-purple-600" />
                <span>Cargando catálogo...</span>
              </div>
            )}

            {!isLoadingOptions && filteredOptions.length === 0 && !canCreate && (
              <div className="px-3 py-3 text-center text-xs text-gray-500 font-medium">
                No hay opciones que coincidan
              </div>
            )}

            {filteredOptions.map((opt, index) => {
              const isSelected = value === opt.label;
              const isHighlighted = highlightedIndex === index;

              return (
                <button
                  key={opt.id}
                  id={`${listboxId}-opt-${opt.id}`}
                  data-nav-index={index}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50 text-purple-900 font-semibold'
                      : isHighlighted
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check size={14} weight="bold" className="text-purple-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}

            {/* Opción para crear al vuelo */}
            {canCreate && (
              <button
                id={`${listboxId}-create-btn`}
                data-nav-index={filteredOptions.length}
                type="button"
                onClick={handleCreateOption}
                disabled={isCreating}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                className={`w-full text-left px-3 py-2.5 text-xs text-purple-600 hover:bg-purple-50 font-semibold flex items-center space-x-2 border-t border-gray-100 transition-colors disabled:opacity-50 cursor-pointer ${
                  highlightedIndex === filteredOptions.length ? 'bg-purple-50 ring-1 ring-purple-500' : ''
                }`}
              >
                {isCreating ? (
                  <SpinnerGap size={14} className="animate-spin text-purple-600 shrink-0" />
                ) : (
                  <Plus size={14} weight="bold" className="text-purple-600 shrink-0" />
                )}
                <span className="truncate">
                  {isCreating ? 'Guardando opción...' : `+ Crear «${trimmedQuery}»`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

