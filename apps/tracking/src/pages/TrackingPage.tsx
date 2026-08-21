import { MapView } from 'map';
import { OrderStatusTimeline } from '../components/OrderStatusTimeline';
import { OrderPhotos } from '../components/OrderPhotos';

export const TrackingPage = () => {
  return (
    <div className="flex flex-col h-screen bg-background text-white">
      <header className="p-4 flex items-center justify-between shadow-md bg-surface z-10">
        <div className="font-bold">Mi Negocio</div>
        <div className="text-sm bg-primary px-3 py-1 rounded-full text-white font-medium">Llega en ~10 min</div>
      </header>
      <div className="flex-1 relative">
        <MapView />
      </div>
      <div className="bg-surface rounded-t-2xl p-4 -mt-4 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
        <h2 className="text-lg font-bold mb-2">Tu pedido está en camino</h2>
        <OrderStatusTimeline />
        <div className="mt-4">
          <OrderPhotos />
        </div>
        <a href="tel:123456789" className="block w-full bg-secondary border border-gray-600 text-center py-3 rounded-lg mt-4 font-semibold">
          Llamar al repartidor
        </a>
      </div>
    </div>
  );
};
