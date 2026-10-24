import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Tag,
  MagnifyingGlass,
  ArrowCounterClockwise,
  CheckCircle,
} from '@phosphor-icons/react';
import { ExpenseItem } from '../../types/finances';
import {
  useExpenses,
  useExpenseCategories,
} from '../../hooks/useFinances';
import { CreateExpenseModal } from './CreateExpenseModal';
import { ManageExpenseCategoriesModal } from './ManageExpenseCategoriesModal';
import { VoidExpenseModal } from './VoidExpenseModal';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate } from '../../utils/dateManagua';
import { getManaguaTodayYMD } from '../../utils/dateManagua';

interface ExpensesTabProps {
  currency?: string;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ currency = 'NIO' }) => {
  const todayStr = getManaguaTodayYMD();

  // Period / Date filters
  const [periodPreset, setPeriodPreset] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Other filters
  const [categoryId, setCategoryId] = useState<string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [includeVoided, setIncludeVoided] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [expenseToVoid, setExpenseToVoid] = useState<ExpenseItem | null>(null);

  // Queries
  const { data: categories = [] } = useExpenseCategories();

  // Resolver fechas según preset
  const resolvedDates = React.useMemo(() => {
    if (periodPreset === 'all') {
      return { from: undefined, to: undefined };
    }
    if (periodPreset === 'custom') {
      return { from: fromDate || undefined, to: toDate || undefined };
    }

    const now = new Date();
    if (periodPreset === 'today') {
      return { from: todayStr, to: todayStr };
    }
    if (periodPreset === 'week') {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const from = monday.toISOString().slice(0, 10);
      return { from, to: todayStr };
    }
    if (periodPreset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const from = firstDay.toISOString().slice(0, 10);
      return { from, to: todayStr };
    }

    return { from: undefined, to: undefined };
  }, [periodPreset, fromDate, toDate, todayStr]);

  const { data: expensesData, isLoading: isLoadingExpenses } = useExpenses({
    from: resolvedDates.from,
    to: resolvedDates.to,
    categoryId: categoryId === 'ALL' ? undefined : categoryId,
    paymentMethod: paymentMethod === 'ALL' ? undefined : paymentMethod,
    includeVoided,
    search: search.trim() || undefined,
    page,
    pageSize,
  });

  const items = expensesData?.items || [];
  const totalItems = expensesData?.total || 0;
  const totalAmount = expensesData?.totalAmount || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const handlePresetClick = (preset: 'today' | 'week' | 'month' | 'all' | 'custom') => {
    setPeriodPreset(preset);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Gastos */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Gastos (Período)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Receipt size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {isLoadingExpenses ? '—' : formatCurrency(totalAmount, currency)}
          </div>
          <p className="text-[11px] text-gray-400">
            {periodPreset === 'today'
              ? 'Gastos registrados hoy'
              : periodPreset === 'week'
              ? 'Gastos de la semana'
              : periodPreset === 'month'
              ? 'Gastos del mes en curso'
              : 'Total del período seleccionado'}
          </p>
        </div>

        {/* Cantidad de Gastos */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Comprobantes</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <CheckCircle size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {isLoadingExpenses ? '—' : totalItems}
          </div>
          <p className="text-[11px] text-gray-400">Registros en este filtro</p>
        </div>

        {/* Categorías Disponibles */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Categorías</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Tag size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {categories.filter((c) => c.isActive).length}
          </div>
          <p className="text-[11px] text-gray-400">Categorías operativas activas</p>
        </div>
      </div>

      {/* Header Bar con Botones Principales y Filtros de Fecha */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Selector de periodo rápido */}
        <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl gap-0.5 overflow-x-auto max-w-full">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mes' },
            { id: 'all', label: 'Todo' },
            { id: 'custom', label: 'Personalizado' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                periodPreset === preset.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Tag size={14} />
            <span>Categorías</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={14} weight="bold" />
            <span>Nuevo gasto</span>
          </button>
        </div>
      </div>

      {/* Rango personalizado de fechas si está activo */}
      {periodPreset === 'custom' && (
        <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-wrap items-center gap-3 text-xs animate-fade-in">
          <span className="font-semibold text-gray-700">Rango:</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Desde</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Hasta</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs bg-white"
            />
          </div>
        </div>
      )}

      {/* Filtros secundarios: Categoría, Método de pago, Búsqueda, Anulados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Categoría */}
        <div>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs bg-white text-gray-800 focus:outline-none focus:border-gray-900"
          >
            <option value="ALL">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Método de pago */}
        <div>
          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs bg-white text-gray-800 focus:outline-none focus:border-gray-900"
          >
            <option value="ALL">Todos los métodos de pago</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar descripción o ref..."
            className="w-full h-9 pl-8.5 pr-3 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>

        {/* Checkbox Anulados */}
        <div className="flex items-center px-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
            <input
              type="checkbox"
              checked={includeVoided}
              onChange={(e) => {
                setIncludeVoided(e.target.checked);
                setPage(1);
              }}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 w-3.5 h-3.5"
            />
            <span>Mostrar gastos anulados</span>
          </label>
        </div>
      </div>

      {/* Tabla / Lista de Gastos */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {isLoadingExpenses ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Receipt size={24} />
            </div>
            <h4 className="text-sm font-bold text-gray-800">No hay gastos registrados</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No se han encontrado gastos en el período o con los filtros seleccionados.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={13} weight="bold" />
                <span>Registrar primer gasto</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50/75 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Categoría</th>
                    <th className="px-4 py-3 font-semibold">Descripción</th>
                    <th className="px-4 py-3 font-semibold">Método / Ref</th>
                    <th className="px-4 py-3 font-semibold">Registrado por</th>
                    <th className="px-4 py-3 font-semibold text-right">Monto</th>
                    <th className="px-4 py-3 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        item.isVoided ? 'opacity-60 bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-gray-700">
                        {formatManaguaDate(item.expenseDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${item.category.color || '#3B82F6'}15`,
                            color: item.category.color || '#3B82F6',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.category.color || '#3B82F6' }}
                          />
                          <span>{item.category.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-900">{item.description}</div>
                        {item.isVoided && item.voidReason && (
                          <div className="text-[10px] text-rose-600 font-medium">
                            Anulado: {item.voidReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-gray-800">{item.paymentMethod}</div>
                        {item.receiptNumber && (
                          <div className="text-[10px] text-gray-400">Ref: {item.receiptNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {item.createdBy?.name || 'Usuario'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            item.isVoided
                              ? 'line-through text-gray-400'
                              : 'text-gray-900 text-sm'
                          }
                        >
                          {formatCurrency(item.amount, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {!item.isVoided ? (
                          <button
                            onClick={() => setExpenseToVoid(item)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-xs"
                            title="Anular gasto"
                          >
                            <ArrowCounterClockwise size={15} />
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                            Anulado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (<md) */}
            <div className="block md:hidden divide-y divide-gray-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 space-y-2 ${
                    item.isVoided ? 'opacity-60 bg-rose-50/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${item.category.color || '#3B82F6'}15`,
                        color: item.category.color || '#3B82F6',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.category.color || '#3B82F6' }}
                      />
                      <span>{item.category.name}</span>
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        item.isVoided ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{item.description}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatManaguaDate(item.expenseDate)} • {item.paymentMethod}
                      {item.receiptNumber ? ` (Ref: ${item.receiptNumber})` : ''}
                    </p>
                    {item.isVoided && item.voidReason && (
                      <p className="text-[10px] text-rose-600 font-medium mt-1">
                        Anulado: {item.voidReason}
                      </p>
                    )}
                  </div>

                  {!item.isVoided && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => setExpenseToVoid(item)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50"
                      >
                        <ArrowCounterClockwise size={13} />
                        <span>Anular</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
            <span>
              Total: <strong>{totalItems}</strong> gastos
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white font-medium disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-2 font-semibold text-gray-800">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white font-medium disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        categories={categories.filter((c) => c.isActive)}
        onOpenManageCategories={() => setIsCategoriesModalOpen(true)}
        currency={currency}
      />

      <ManageExpenseCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
      />

      <VoidExpenseModal
        expense={expenseToVoid}
        isOpen={Boolean(expenseToVoid)}
        onClose={() => setExpenseToVoid(null)}
        currency={currency}
      />
    </div>
  );
};
