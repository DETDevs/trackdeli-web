import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Tag,
  MagnifyingGlass,
  ArrowCounterClockwise,
  CheckCircle,
  Printer,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { getMyBusiness, apiClient } from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { ReportPrintModal } from '../reports/ReportPrintModal';
import { ReportDocument } from '../../types/report';
import { buildExpensesReportDocument } from '../../utils/financesTabsPrintBuilders';
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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const [reportDocument, setReportDocument] = useState<ReportDocument | null>(null);

  const user = useAuthStore((s) => s.user);
  const branches = useAuthStore((s) => s.branches);
  const activeBranch = branches?.find((b) => b.id === user?.businessId);

  const { data: businessData } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 5 * 60 * 1000,
  });

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

  const handlePrint = async () => {
    setIsPrintModalOpen(true);
    setIsPreparingReport(true);
    setReportDocument(null);

    const fromYmd = resolvedDates.from || '2020-01-01';
    const toYmd = resolvedDates.to || todayStr;
    const periodLabel =
      periodPreset === 'today'
        ? 'Hoy'
        : periodPreset === 'week'
        ? 'Esta semana'
        : periodPreset === 'month'
        ? 'Este mes'
        : periodPreset === 'all'
        ? 'Histórico completo'
        : 'Personalizado';

    try {
      const allExpenses: any[] = [];
      const seenIds = new Set<string>();
      const batchLimit = 200;
      const maxPages = 50;

      for (let p = 1; p <= maxPages; p++) {
        const res = await apiClient.get<any>('/pos/expenses', {
          params: {
            from: resolvedDates.from,
            to: resolvedDates.to,
            categoryId: categoryId === 'ALL' ? undefined : categoryId,
            paymentMethod: paymentMethod === 'ALL' ? undefined : paymentMethod,
            includeVoided,
            search: search.trim() || undefined,
            page: p,
            pageSize: batchLimit,
          },
        });
        const batch = res.data?.items || [];
        for (const item of batch) {
          if (item && item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            allExpenses.push(item);
          }
        }
        if (batch.length < batchLimit) break;
      }

      const selectedCat = categories.find((c) => c.id === categoryId);

      const catTotalsMap: Record<string, number> = {};
      let calculatedTotal = 0;

      for (const exp of allExpenses) {
        if (!exp.isVoided) {
          const cName = exp.category?.name || 'Varios';
          catTotalsMap[cName] = (catTotalsMap[cName] || 0) + Number(exp.amount || 0);
          calculatedTotal += Number(exp.amount || 0);
        }
      }

      const catTotalsList = Object.entries(catTotalsMap).map(([cName, amt]) => ({
        categoryName: cName,
        amount: amt,
        percent: calculatedTotal > 0 ? (amt / calculatedTotal) * 100 : 0,
      }));

      const doc = buildExpensesReportDocument({
        items: allExpenses,
        totalAmount: calculatedTotal,
        totalCount: allExpenses.filter((e) => !e.isVoided).length,
        categoryTotals: catTotalsList,
        periodLabel,
        fromYmd,
        toYmd,
        categoryFilterName: selectedCat?.name,
        methodFilter: paymentMethod,
        search,
        business: businessData,
        branchName: activeBranch?.name,
        user,
        currency,
      });

      setReportDocument(doc);
    } catch (err) {
      console.error('[ExpensesTab] Error generando reporte:', err);
    } finally {
      setIsPreparingReport(false);
    }
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
          <div className="text-xl font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
            {isLoadingExpenses ? '—' : formatCurrency(totalAmount, currency)}
          </div>
          <p className="text-xs text-gray-600">
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
            <span className="text-xs font-semibold text-gray-600">Comprobantes</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <CheckCircle size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono tabular-nums">
            {isLoadingExpenses ? '—' : totalItems}
          </div>
          <p className="text-xs text-gray-600">Registros en este filtro</p>
        </div>

        {/* Categorías Disponibles */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Categorías</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Tag size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono tabular-nums">
            {categories.filter((c) => c.isActive).length}
          </div>
          <p className="text-xs text-gray-600">Categorías operativas activas</p>
        </div>
      </div>

      {/* Header Bar con Botones Principales y Filtros de Fecha */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Selector de periodo rápido */}
        <div className="inline-flex flex-wrap items-center bg-gray-100 p-1 rounded-xl gap-1 max-w-full">
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
              className={`px-3 py-1.5 min-h-[40px] text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                periodPreset === preset.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={isLoadingExpenses}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Imprimir reporte en hoja carta o guardar PDF"
          >
            <Printer size={14} weight="bold" />
            <span>Imprimir</span>
          </button>

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
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
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
                      className={`font-mono font-bold text-sm whitespace-nowrap tabular-nums shrink-0 ${
                        item.isVoided ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{item.description}</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formatManaguaDate(item.expenseDate)} • {item.paymentMethod}
                      {item.receiptNumber ? ` (Ref: ${item.receiptNumber})` : ''}
                    </p>
                    {item.isVoided && item.voidReason && (
                      <p className="text-xs text-rose-700 font-medium mt-1">
                        Anulado: {item.voidReason}
                      </p>
                    )}
                  </div>

                  {!item.isVoided && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => setExpenseToVoid(item)}
                        className="text-xs text-rose-700 hover:text-rose-800 font-medium flex items-center gap-1 min-h-[44px] px-3 rounded-lg hover:bg-rose-50"
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

      {/* Modal de Impresión de Reporte */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        document={reportDocument}
        isPreparing={isPreparingReport}
      />
    </div>
  );
};
