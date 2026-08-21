export const OrdersPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pedidos</h1>
      <p className="text-gray-400">Lista de pedidos del día.</p>
      <div className="bg-surface p-4 rounded-lg">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2">Cliente</th>
              <th className="p-2">Dirección</th>
              <th className="p-2">Repartidor</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Juan Pérez</td>
              <td className="p-2">Av Siempre Viva 123</td>
              <td className="p-2">Carlos R.</td>
              <td className="p-2">EN_CAMINO</td>
              <td className="p-2">12:30 PM</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
