export const StaffPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Repartidores</h1>
      <p className="text-gray-400">Gestión del equipo de entrega.</p>
      <div className="bg-surface p-4 rounded-lg">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2">Nombre</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Pedidos hoy</th>
              <th className="p-2">Calificación</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Carlos R.</td>
              <td className="p-2 text-green-400">Activo</td>
              <td className="p-2">12</td>
              <td className="p-2">4.8 ⭐</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
