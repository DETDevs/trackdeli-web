import { MapView } from 'map';

export const DashboardPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-400">Mapa en vivo y contadores de hoy.</p>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-lg">Pendientes: 10</div>
        <div className="bg-surface p-4 rounded-lg">En camino: 5</div>
        <div className="bg-surface p-4 rounded-lg">Entregados hoy: 45</div>
        <div className="bg-surface p-4 rounded-lg">Repartidores activos: 3</div>
      </div>
      <div className="h-96 bg-surface rounded-lg overflow-hidden">
        <MapView />
      </div>
    </div>
  );
};
