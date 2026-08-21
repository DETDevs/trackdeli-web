export const OrderDetailPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detalle del Pedido</h1>
      <p className="text-gray-400">Información completa y estado del envío.</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface p-4 rounded-lg space-y-4">
          <h2 className="text-lg font-semibold">Datos</h2>
          <p>Cliente: María Gómez</p>
          <p>Dirección: Calle Falsa 123</p>
        </div>
        <div className="bg-surface p-4 rounded-lg space-y-4">
          <h2 className="text-lg font-semibold">Timeline de estados</h2>
          <div className="pl-4 border-l-2 border-primary space-y-2">
            <p>12:00 PM - PENDIENTE</p>
            <p>12:15 PM - TOMADO</p>
            <p>12:30 PM - EN_CAMINO</p>
          </div>
        </div>
      </div>
      <div className="bg-surface p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Galería de fotos</h2>
        <div className="flex gap-4">
          <div className="w-32 h-32 bg-secondary flex items-center justify-center text-sm">Foto Paquete</div>
          <div className="w-32 h-32 bg-secondary flex items-center justify-center text-sm">Foto Domicilio</div>
        </div>
      </div>
    </div>
  );
};
