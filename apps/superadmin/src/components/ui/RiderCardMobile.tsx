import React from 'react';
import { RiderItem } from '../../hooks/useRiders';
import { Badge } from './Badge';
import {
  Motorcycle,
  Bicycle,
  Car,
  PersonSimpleWalk,
  Star,
  Phone,
} from '@phosphor-icons/react';

interface RiderCardMobileProps {
  rider: RiderItem;
  onToggle: (e: React.MouseEvent, id: string) => void;
}

export const RiderCardMobile: React.FC<RiderCardMobileProps> = ({ rider, onToggle }) => {
  const getVehicleIcon = (type: string | null) => {
    if (type === 'BICICLETA') return <Bicycle size={15} />;
    if (type === 'CARRO') return <Car size={15} />;
    if (type === 'A_PIE') return <PersonSimpleWalk size={15} />;
    return <Motorcycle size={15} />;
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl p-4 transition-all shadow-2xs space-y-3">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {rider.profilePhotoUrl ? (
            <img
              src={rider.profilePhotoUrl}
              alt={rider.name}
              className="w-10 h-10 rounded-full object-cover border border-gray-100 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700 shrink-0">
              {rider.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">{rider.name}</h4>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              {rider.phone ? (
                <span className="flex items-center gap-1">
                  <Phone size={11} className="text-gray-400" />
                  <span>{rider.phone}</span>
                </span>
              ) : (
                <span className="truncate">{rider.email}</span>
              )}
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={(e) => onToggle(e, rider.id)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            rider.isActive ? 'bg-brand-600' : 'bg-gray-200'
          }`}
          title={rider.isActive ? 'Desactivar repartidor' : 'Activar repartidor'}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              rider.isActive ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Vehicle & Metrics */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
          <span className="text-gray-500">{getVehicleIcon(rider.vehicleType)}</span>
          <span className="font-medium text-gray-900">
            {rider.vehiclePlate || (rider.vehicleType ? rider.vehicleType.toLowerCase() : 'Moto')}
          </span>
          {rider.vehicleColor && (
            <span className="text-gray-400">· {rider.vehicleColor}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {rider.averageRating ? (
            <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
              <Star size={13} weight="fill" className="text-amber-500" />
              {Number(rider.averageRating).toFixed(1)}
            </span>
          ) : (
            <span className="text-gray-400 text-[11px]">Sin rating</span>
          )}

          <span className="text-gray-400">|</span>

          <span className="font-medium text-gray-700">
            {rider.totalDeliveries} entregas
          </span>
        </div>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
        <div className="text-gray-400 text-[11px]">
          Hoy: <strong className="text-gray-800 font-semibold">{rider.deliveriesToday}</strong>
        </div>

        <Badge
          variant={
            !rider.isActive
              ? 'danger'
              : rider.isAvailable
              ? 'success'
              : 'neutral'
          }
          dot
          size="sm"
        >
          {!rider.isActive
            ? 'Inactivo'
            : rider.isAvailable
            ? 'Disponible'
            : 'Desconectado'}
        </Badge>
      </div>
    </div>
  );
};
