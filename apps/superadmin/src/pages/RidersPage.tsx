import { useState } from 'react';
import {
  MagnifyingGlass,
  Motorcycle,
  Star,
  Bicycle,
  Car,
  PersonSimpleWalk,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { DataTable, Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { MapboxRidersMap } from '../components/ui/MapboxRidersMap';
import {
  useRiders,
  useActiveRiders,
  useToggleRider,
  RiderItem,
} from '../hooks/useRiders';

export const RidersPage = () => {
  const { data: riders = [], isLoading: loadingRiders } = useRiders();
  const { data: activeRiders = [] } = useActiveRiders();
  const toggleMutation = useToggleRider();

  // Filter states
  const [tab, setTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  const filteredRiders = riders.filter((r) => {
    // 1. Search text
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(searchLower) ||
      r.email.toLowerCase().includes(searchLower) ||
      (r.phone && r.phone.includes(searchLower)) ||
      (r.vehiclePlate && r.vehiclePlate.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    // 2. Vehicle filter
    if (vehicleFilter !== 'ALL' && r.vehicleType !== vehicleFilter) {
      return false;
    }

    // 3. Tab filter
    if (tab === 'ACTIVE') return r.isActive && r.isAvailable;
    if (tab === 'INACTIVE') return !r.isActive;
    return true;
  });

  const handleToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleMutation.mutate(id);
  };

  const getVehicleDisplay = (vehicleType: string | null, plate: string | null, color: string | null) => {
    let icon = <Motorcycle size={16} />;
    let label = 'Moto';

    if (vehicleType === 'BICICLETA') {
      icon = <Bicycle size={16} />;
      label = 'Bicicleta';
    } else if (vehicleType === 'CARRO') {
      icon = <Car size={16} />;
      label = 'Carro';
    } else if (vehicleType === 'A_PIE') {
      icon = <PersonSimpleWalk size={16} />;
      label = 'A pie';
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{icon}</span>
        <div>
          <p className="text-xs font-medium text-gray-900">{label}</p>
          <p className="text-[11px] text-gray-400">
            {plate ? plate : 'Sin placa'} {color ? `· ${color}` : ''}
          </p>
        </div>
      </div>
    );
  };

  const columns: Column<RiderItem>[] = [
    {
      header: 'Repartidor',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          {row.profilePhotoUrl ? (
            <img
              src={row.profilePhotoUrl}
              alt={row.name}
              className="w-8 h-8 rounded-full object-cover border border-gray-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-medium text-xs text-gray-700">
              {row.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 leading-tight">{row.name}</p>
            <p className="text-xs text-gray-400">{row.email} {row.phone ? `· ${row.phone}` : ''}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Vehículo',
      accessor: (row) => getVehicleDisplay(row.vehicleType, row.vehiclePlate, row.vehicleColor),
    },
    {
      header: 'Entregas',
      accessor: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.totalDeliveries} total</p>
          <p className="text-[11px] text-gray-400">+{row.deliveriesToday} hoy</p>
        </div>
      ),
    },
    {
      header: 'Calificación',
      accessor: (row) =>
        row.averageRating ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/50">
            <Star size={13} weight="fill" />
            {row.averageRating}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      header: 'Disponibilidad',
      accessor: (row) => (
        <Badge
          variant={row.isAvailable && row.isActive ? 'success' : 'neutral'}
          dot
          size="sm"
        >
          {row.isActive
            ? row.isAvailable
              ? 'Disponible'
              : 'No disponible'
            : 'Desactivado'}
        </Badge>
      ),
    },
    {
      header: 'Cuenta',
      className: 'text-right',
      accessor: (row) => (
        <button
          onClick={(e) => handleToggle(e, row.id)}
          disabled={toggleMutation.isPending}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            row.isActive
              ? 'text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200/60'
              : 'text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60'
          }`}
        >
          {row.isActive ? 'Desactivar' : 'Activar'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <TopBar
        title="Gestión de Repartidores"
        subtitle={`Total de ${riders.length} repartidores independientes registrados`}
      />

      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        {/* 1. Mapa de Repartidores Activos en Vivo */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                Mapa de Repartidores en Vivo
              </h3>
              <p className="text-xs text-gray-400">
                {activeRiders.length} repartidores transmitiendo ubicación en los últimos 5 minutos
              </p>
            </div>
            <Badge variant="success" size="sm">
              {activeRiders.length} conectados
            </Badge>
          </div>

          <MapboxRidersMap riders={activeRiders} height="h-72" />
        </div>

        {/* 2. Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Input de Búsqueda */}
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, placa..."
                className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            {/* Selector de Vehículo */}
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:border-gray-900"
            >
              <option value="ALL">Todos los vehículos</option>
              <option value="MOTO">Motos</option>
              <option value="BICICLETA">Bicicletas</option>
              <option value="CARRO">Carros</option>
              <option value="A_PIE">A pie</option>
            </select>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs self-stretch sm:self-auto">
            <button
              onClick={() => setTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'ALL' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Todos ({riders.length})
            </button>
            <button
              onClick={() => setTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'ACTIVE'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Disponibles ({riders.filter((r) => r.isActive && r.isAvailable).length})
            </button>
            <button
              onClick={() => setTab('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'INACTIVE'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Inactivos ({riders.filter((r) => !r.isActive).length})
            </button>
          </div>
        </div>

        {/* 3. Tabla de Repartidores */}
        <DataTable
          columns={columns}
          data={filteredRiders}
          keyExtractor={(row) => row.id}
          pageSize={10}
          isLoading={loadingRiders}
          emptyMessage="No se encontraron repartidores con los filtros seleccionados"
        />
      </div>
    </div>
  );
};
