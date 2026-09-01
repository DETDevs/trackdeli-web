import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getOrders,
  getOrderCommissions,
  getMonthlyStatement,
  getMyBusiness,
  type OrderCommission,
} from 'api-client';
import {
  Coins,
  Package,
  DownloadSimple,
  CheckCircle,
  Clock,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { formatRelativeCompact } from '../utils/formatDate';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const CommissionsPage = () => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

  const { data: statement } = useQuery({
    queryKey: ['monthly-statement', selectedMonth, selectedYear],
    queryFn: () => getMonthlyStatement(selectedMonth, selectedYear),
  });

  const { data: apiCommissions = [], isLoading: loadingCommissions } = useQuery({
    queryKey: ['order-commissions', selectedMonth, selectedYear],
    queryFn: () => getOrderCommissions({ month: selectedMonth, year: selectedYear }),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
  });

  // Calculate or fallback commissions from orders for the selected month
  const derivedCommissions = useMemo(() => {
    if (apiCommissions.length > 0) {
      return apiCommissions;
    }

    const defaultRate = business?.commissionRate ?? 0.15;
    const altRate = business?.altCommissionRate ?? 0.12;
    const altDist = business?.altCommissionDistanceKm ?? 40;

    return orders
      .filter((o) => {
        if (!o.deliveredAt && o.status !== 'ENTREGADO') return false;
        const d = new Date(o.deliveredAt || o.createdAt);
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      })
      .map((o): OrderCommission => {
        const fee = Number(o.deliveryFee) || 0;
        const dist = Number(o.distanceKm) || 0;
        const rate = dist > altDist ? altRate : defaultRate;
        const amount = Number((fee * rate).toFixed(2));

        return {
          id: `comm-${o.id}`,
          orderId: o.id,
          order: o,
          businessId: o.businessId,
          deliveryFee: fee,
          distanceKm: dist,
          commissionRate: rate,
          commissionAmount: amount,
          status: 'PENDING',
          createdAt: o.deliveredAt || o.createdAt,
        };
      });
  }, [apiCommissions, orders, business, selectedMonth, selectedYear]);

  const totalDeliveries = statement?.totalDeliveries ?? derivedCommissions.length;
  const totalDeliveryFee = statement?.totalDeliveryFee ?? derivedCommissions.reduce((acc, c) => acc + c.deliveryFee, 0);
  const totalCommission = statement?.totalCommission ?? derivedCommissions.reduce((acc, c) => acc + c.commissionAmount, 0);
  const statementStatus = statement?.status ?? 'PENDING';

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleDownloadCsv = () => {
    if (derivedCommissions.length === 0) return;

    const headers = ['Fecha', 'ID Pedido', 'Cliente', 'Negocio Origen', 'Envio (C$)', 'Distancia (km)', 'Tasa (%)', 'Comision (C$)', 'Estado'];
    const rows = derivedCommissions.map((c) => {
      const orderDate = new Date(c.createdAt).toLocaleDateString('es-NI');
      const clientName = c.order?.customerName || 'Cliente';
      const originName = c.order?.originBusinessName || c.order?.originBusinessClient?.name || 'Local';
      const ratePct = `${(c.commissionRate * 100).toFixed(0)}%`;
      return [
        orderDate,
        c.orderId.slice(0, 8),
        `"${clientName}"`,
        `"${originName}"`,
        c.deliveryFee.toFixed(2),
        c.distanceKm.toFixed(1),
        ratePct,
        c.commissionAmount.toFixed(2),
        c.status,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `comisiones_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 leading-tight">
            Comisiones y Liquidaciones
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Resumen del cobro de comisiones por envíos completados por tu empresa de repartidores.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* Month Selector */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <CaretLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-gray-800 px-3 min-w-[130px] text-center">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <CaretRight size={16} />
            </button>
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={derivedCommissions.length === 0}
            className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <DownloadSimple size={15} weight="bold" />
            <span className="hidden sm:inline">Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Entregas Completadas</span>
            <Package size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalDeliveries}</p>
          <p className="text-xs text-gray-400 mt-0.5">En el período seleccionado</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Envíos Cobrados</span>
            <Coins size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 font-mono">
            C$ {totalDeliveryFee.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Suma de tarifas de entrega</p>
        </div>

        <div className="bg-white border border-brand-200/80 rounded-2xl p-5 shadow-xs bg-brand-50/20">
          <div className="flex items-center justify-between text-brand-800 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Comisión a Pagar</span>
            <Coins size={18} className="text-brand-600" weight="duotone" />
          </div>
          <p className="text-2xl font-bold text-brand-900 font-mono">
            C$ {totalCommission.toFixed(2)}
          </p>
          <p className="text-xs text-brand-700/80 mt-0.5">
            Tarifa base {(Number(business?.commissionRate || 0.15) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Statement Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
          statementStatus === 'PAID'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {statementStatus === 'PAID' ? (
            <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
          ) : (
            <Clock size={18} weight="fill" className="text-amber-600 shrink-0" />
          )}
          <div>
            <span className="font-bold uppercase tracking-wider">
              {statementStatus === 'PAID' ? 'Liquidación Pagada' : 'Liquidación Pendiente de Pago'}
            </span>
            <span className="ml-2 font-normal opacity-90">
              {statementStatus === 'PAID'
                ? `El estado de cuenta de ${MONTH_NAMES[selectedMonth - 1]} se encuentra saldado.`
                : `Fecha límite estimada de pago: 5 de ${MONTH_NAMES[selectedMonth % 12]} ${selectedYear}.`}
            </span>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-current self-end sm:self-auto">
          {statementStatus === 'PAID' ? 'Saldado' : 'Pendiente'}
        </span>
      </div>

      {/* Detail Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Detalle por Pedido</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Registro desglosado de entregas y comisiones calculadas
            </p>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {derivedCommissions.length} pedidos
          </span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-5">Fecha</th>
                <th className="py-3 px-5">Cliente / Negocio</th>
                <th className="py-3 px-5">Monto Envío</th>
                <th className="py-3 px-5">Distancia</th>
                <th className="py-3 px-5">Tasa</th>
                <th className="py-3 px-5 text-right">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {loadingCommissions || loadingOrders ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="p-4">
                      <div className="h-5 bg-gray-100 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : derivedCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Coins size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600">No hay comisiones en este mes</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Los pedidos completados en {MONTH_NAMES[selectedMonth - 1]} se reflejarán automáticamente aquí.
                    </p>
                  </td>
                </tr>
              ) : (
                derivedCommissions.map((comm) => {
                  const clientName = comm.order?.customerName || 'Cliente';
                  const originName = comm.order?.originBusinessName || comm.order?.originBusinessClient?.name;

                  return (
                    <tr key={comm.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-5 whitespace-nowrap text-gray-500">
                        {formatRelativeCompact(comm.createdAt)}
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-gray-900">{clientName}</p>
                        {originName && (
                          <p className="text-[11px] text-gray-400">Origen: {originName}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-medium text-gray-900">
                        C$ {comm.deliveryFee.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-gray-500">
                        {comm.distanceKm > 0 ? `${comm.distanceKm.toFixed(1)} km` : '—'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold text-[10px]">
                          {(comm.commissionRate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-gray-900">
                        C$ {comm.commissionAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {derivedCommissions.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/80 font-semibold text-gray-900">
                  <td colSpan={2} className="py-3.5 px-5 uppercase tracking-wider text-xs">
                    Total del Mes
                  </td>
                  <td className="py-3.5 px-5 font-mono text-xs">
                    C$ {totalDeliveryFee.toFixed(2)}
                  </td>
                  <td colSpan={2} />
                  <td className="py-3.5 px-5 text-right font-mono text-sm text-brand-700 font-bold">
                    C$ {totalCommission.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {loadingCommissions || loadingOrders ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))
          ) : derivedCommissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay comisiones en este mes.
            </div>
          ) : (
            derivedCommissions.map((comm) => {
              const clientName = comm.order?.customerName || 'Cliente';
              const originName = comm.order?.originBusinessName || comm.order?.originBusinessClient?.name;

              return (
                <div key={comm.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{clientName}</p>
                      {originName && (
                        <p className="text-[11px] text-gray-500">De: {originName}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {formatRelativeCompact(comm.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-gray-600">
                    <div>
                      <span>Envío: </span>
                      <strong className="font-mono text-gray-900 font-semibold">
                        C$ {comm.deliveryFee.toFixed(2)}
                      </strong>
                      {comm.distanceKm > 0 && (
                        <span className="text-gray-400 text-[11px] ml-1.5">
                          ({comm.distanceKm.toFixed(1)} km)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-semibold">
                        {(comm.commissionRate * 100).toFixed(0)}%
                      </span>
                      <span className="font-bold text-gray-900 font-mono text-sm">
                        C$ {comm.commissionAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
