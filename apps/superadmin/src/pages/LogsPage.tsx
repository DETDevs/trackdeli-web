import { useState } from 'react';
import {
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  WarningCircle,
  UserPlus,
  Storefront,
  Package,
  Motorcycle,
  Buildings,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { Badge } from '../components/ui/Badge';
import { useLogs, SystemLog } from '../hooks/useLogs';
import { formatTimeOnly, getGroupDateHeader } from '../utils/format';

export const LogsPage = () => {
  const { data: logs = [], isLoading } = useLogs();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    // Search
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      log.description.toLowerCase().includes(searchLower) ||
      (log.businessName && log.businessName.toLowerCase().includes(searchLower)) ||
      (log.riderName && log.riderName.toLowerCase().includes(searchLower)) ||
      (log.orderId && log.orderId.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    // Filter type
    if (filterType === 'DELIVERED') return log.type === 'ORDER_DELIVERED';
    if (filterType === 'CREATED') return log.type === 'ORDER_CREATED';
    if (filterType === 'CANCELLED') return log.type === 'ORDER_CANCELLED';
    if (filterType === 'INCIDENCIA') return log.type === 'INCIDENCIA';
    if (filterType === 'RIDER') return log.type === 'RIDER_REGISTERED';
    if (filterType === 'BUSINESS') return log.type === 'BUSINESS_CREATED';

    return true;
  });

  // Group by Date header (HOY, AYER, etc.)
  const groupedLogs: Record<string, SystemLog[]> = {};
  filteredLogs.forEach((log) => {
    const groupKey = getGroupDateHeader(log.createdAt);
    if (!groupedLogs[groupKey]) {
      groupedLogs[groupKey] = [];
    }
    groupedLogs[groupKey].push(log);
  });

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'ORDER_DELIVERED':
        return <CheckCircle size={16} className="text-brand-600" weight="fill" />;
      case 'ORDER_CANCELLED':
        return <XCircle size={16} className="text-red-600" weight="fill" />;
      case 'INCIDENCIA':
        return <WarningCircle size={16} className="text-amber-600" weight="fill" />;
      case 'RIDER_REGISTERED':
        return <UserPlus size={16} className="text-blue-600" weight="fill" />;
      case 'BUSINESS_CREATED':
        return <Storefront size={16} className="text-purple-600" weight="fill" />;
      default:
        return <Package size={16} className="text-gray-600" weight="fill" />;
    }
  };

  const getLogBadgeVariant = (type: string) => {
    switch (type) {
      case 'ORDER_DELIVERED':
        return 'success';
      case 'ORDER_CANCELLED':
        return 'danger';
      case 'INCIDENCIA':
        return 'warning';
      case 'RIDER_REGISTERED':
        return 'info';
      case 'BUSINESS_CREATED':
        return 'purple';
      default:
        return 'neutral';
    }
  };

  return (
    <div>
      <TopBar
        title="Logs y Actividad"
        subtitle="Registro cronológico de eventos relevantes del sistema"
      />

      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el historial de eventos..."
              className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs overflow-x-auto max-w-full">
            {[
              { key: 'ALL', label: 'Todos' },
              { key: 'DELIVERED', label: 'Entregas' },
              { key: 'CREATED', label: 'Creados' },
              { key: 'INCIDENCIA', label: 'Incidencias' },
              { key: 'CANCELLED', label: 'Cancelados' },
              { key: 'RIDER', label: 'Repartidores' },
              { key: 'BUSINESS', label: 'Negocios' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filterType === f.key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Logs agrupados */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent mb-2" />
            <p>Cargando actividad...</p>
          </div>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-400">
            No se encontraron eventos registrados con los filtros actuales
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLogs).map(([groupTitle, groupItems]) => (
              <div key={groupTitle} className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                  {groupTitle}
                </span>

                <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden shadow-xs">
                  {groupItems.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">{getLogIcon(log.type)}</div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-900">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={getLogBadgeVariant(log.type) as any}
                              size="sm"
                            >
                              {log.type.replace('_', ' ')}
                            </Badge>
                            {log.businessName && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                <Buildings size={12} className="text-gray-400" />
                                <span>{log.businessName}</span>
                              </span>
                            )}
                            {log.riderName && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                <Motorcycle size={12} className="text-gray-400" />
                                <span>{log.riderName}</span>
                              </span>
                            )}
                            {log.orderId && (
                              <span className="text-[11px] font-mono text-gray-400">
                                #{log.orderId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs text-gray-400 shrink-0 font-medium font-mono">
                        {formatTimeOnly(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
