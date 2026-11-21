import React from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ForkKnife } from '@phosphor-icons/react';
import { getMyBusiness, type PosTableStatusItem } from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { isRestaurantSalonBusiness } from '../../utils/salonVertical';

const formatTableTitle = (rawNumber?: string | null): string => {
  const clean = String(rawNumber || '').trim();
  if (!clean) return 'Mesa seleccionada';
  return /^mesa\s+/i.test(clean) ? clean : `Mesa ${clean}`;
};

export const PosTableOrderPlaceholderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const userRole = String(user?.role || '').toUpperCase();
  const isAllowedRole =
    userRole === 'ENCARGADO' ||
    userRole === 'SUPERADMIN' ||
    userRole === 'CAJERO';

  const { data: business, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    enabled: userRole !== 'VENDEDOR' && isAllowedRole,
    staleTime: 60000,
    retry: false,
  });

  const isRestaurant = isRestaurantSalonBusiness(
    business,
    (user as any)?.business,
  );

  if (userRole === 'VENDEDOR') {
    return <Navigate to="/pos/quotes" replace />;
  }

  if (!isAllowedRole) {
    return <Navigate to="/" replace />;
  }

  if (isLoadingBusiness && !business && !isRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[260px]">
        <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium">
          Verificando configuración del salón...
        </p>
      </div>
    );
  }

  if (!isLoadingBusiness && !isRestaurant) {
    return (
      <Navigate
        to={userRole === 'CAJERO' ? '/pos/cobrar' : '/pos/dashboard'}
        replace
      />
    );
  }

  const stateTable = (location.state as { table?: PosTableStatusItem } | null)
    ?.table;
  const cachedTables = queryClient.getQueryData<PosTableStatusItem[]>([
    'pos',
    'tables',
    'status',
  ]);
  const table =
    stateTable ||
    cachedTables?.find((item) => item.id === id) ||
    null;

  return (
    <div className="space-y-4 pb-10 max-w-2xl mx-auto">
      <div>
        <button
          type="button"
          onClick={() => navigate('/pos/tables')}
          className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition-colors shadow-2xs inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Volver al salón</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 sm:p-8 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
          <ForkKnife size={28} weight="duotone" />
        </div>

        <div className="space-y-2 max-w-md">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
            Próximamente
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-[#0F0F0F]">
            {formatTableTitle(table?.number)}
          </h1>
          {table?.zoneName && (
            <p className="text-xs text-gray-500 font-medium">
              Zona: {table.zoneName}
            </p>
          )}
          <p className="text-sm text-gray-600 pt-1">
            La toma de pedidos y el cobro de mesas estarán disponibles próximamente.
            Mientras tanto, la mesa ya quedó abierta en el salón.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/pos/tables')}
          className="min-h-[44px] px-5 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          Volver al salón
        </button>
      </div>
    </div>
  );
};
