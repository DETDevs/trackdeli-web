import { useQuery } from '@tanstack/react-query';
import { getOrders } from 'api-client';
import { formatRelativeCompact } from '../utils/formatDate';

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

export const StaffPage = () => {
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
  });

  const ridersMap = new Map();
  
  orders.forEach(order => {
    if (order.deliveryUser) {
      const rider = order.deliveryUser as any;
      if (!ridersMap.has(rider.id)) {
        ridersMap.set(rider.id, {
          ...rider,
          totalDeliveries: order.status === 'ENTREGADO' ? 1 : 0,
          lastActive: order.updatedAt || order.createdAt,
        });
      } else {
        const existing = ridersMap.get(rider.id);
        if (order.status === 'ENTREGADO') {
            existing.totalDeliveries += 1;
        }
        if (new Date(order.updatedAt || order.createdAt) > new Date(existing.lastActive)) {
          existing.lastActive = order.updatedAt || order.createdAt;
        }
      }
    }
  });

  const users = Array.from(ridersMap.values()).sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Repartidores</h1>
        <p className="text-sm text-gray-500 mt-1">Repartidores que han trabajado con tu negocio</p>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between">
          No se pudo cargar la información.
          <button onClick={() => refetch()} className="underline">Reintentar</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-100 rounded-xl shadow-sm">
          <p className="text-sm font-medium text-gray-900">Aún no hay repartidores</p>
          <p className="mt-1 text-sm text-gray-400">Cuando un repartidor acepte tu pedido, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
            <div key={user.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="flex items-start gap-4">
                {user.profilePhotoUrl ? (
                  <img src={user.profilePhotoUrl} className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100" alt="Foto perfil" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm shrink-0">
                    {initials(user.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${user.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={`text-[10px] ${user.isAvailable ? 'text-green-700' : 'text-gray-400'}`}>
                        {user.isAvailable ? 'Disponible' : 'Ocupado'}
                      </span>
                    </div>
                  </div>
                  
                  {user.vehicleType ? (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      {(user.vehicleType === 'MOTO' ? '🏍️' : 
                        user.vehicleType === 'BICICLETA' ? '🚲' : 
                        user.vehicleType === 'CARRO' ? '🚗' : '🚶')}{' '}
                      <span className="truncate">
                        {(user.vehicleType.charAt(0).toUpperCase() + user.vehicleType.slice(1).toLowerCase())}
                        {user.vehicleColor ? ' · ' + user.vehicleColor : ''}
                        {user.vehiclePlate ? ' · ' + user.vehiclePlate : ''}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Repartidor independiente</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <span>{user.totalDeliveries} entregas</span>
                    {/* Placeholder for rating since we don't have it natively on User model yet */}
                    <span>·</span>
                    <span className="flex items-center gap-0.5">⭐ 4.9</span> 
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2">
                    Último pedido: {formatRelativeCompact(user.lastActive)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

