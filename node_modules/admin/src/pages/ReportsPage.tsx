export const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reportes</h1>
      <p className="text-gray-400">Métricas de rendimiento.</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface p-6 rounded-lg text-center">
          <p className="text-sm text-gray-400">Entregas del día</p>
          <p className="text-3xl font-bold text-primary mt-2">145</p>
        </div>
        <div className="bg-surface p-6 rounded-lg text-center">
          <p className="text-sm text-gray-400">Tiempo promedio</p>
          <p className="text-3xl font-bold text-primary mt-2">24 min</p>
        </div>
        <div className="bg-surface p-6 rounded-lg text-center">
          <p className="text-sm text-gray-400">Calificación promedio</p>
          <p className="text-3xl font-bold text-primary mt-2">4.9 ⭐</p>
        </div>
      </div>
    </div>
  );
};
