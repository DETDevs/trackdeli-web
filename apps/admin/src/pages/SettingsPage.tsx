import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getMyBusiness, updateMyBusiness } from 'api-client';
import { PinPicker } from 'map';

const mapboxToken = (import.meta as any).env.VITE_MAPBOX_TOKEN;

export const SettingsPage = () => {
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

  const mutation = useMutation({
    mutationFn: updateMyBusiness,
    onSuccess: () => {
      toast.success('Ubicación del negocio guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    onError: () => {
      toast.error('Error al guardar la ubicación');
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/4"></div>
        <div className="h-64 bg-gray-100 rounded w-full"></div>
      </div>
    );
  }

  const handleConfirmLocation = (lat: number, lng: number) => {
    mutation.mutate({ latitude: lat, longitude: lng });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Configuración del Negocio</h2>
        <p className="text-sm text-gray-500">
          Ajusta la ubicación de <strong className="font-semibold text-gray-900">{business?.name}</strong> en el mapa. Este será el punto de partida (Origen) para trazar las rutas de entrega.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Ubicación principal</h3>
        
        <PinPicker
          initialLat={business?.latitude || 12.1328}
          initialLng={business?.longitude || -86.2504}
          mapboxToken={mapboxToken}
          onConfirm={handleConfirmLocation}
        />
        
        {business?.latitude && business?.longitude && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span>Ubicación actual guardada:</span>
            <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200">
              {business.latitude.toFixed(6)}, {business.longitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
