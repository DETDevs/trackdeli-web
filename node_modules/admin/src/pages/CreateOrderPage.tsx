export const CreateOrderPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Pedido</h1>
      <p className="text-gray-400">Crear un pedido para enviar a un cliente.</p>
      <div className="bg-surface p-6 rounded-lg max-w-2xl space-y-4">
        <input type="text" placeholder="Nombre cliente" className="w-full p-2 bg-secondary rounded" />
        <input type="text" placeholder="WhatsApp" className="w-full p-2 bg-secondary rounded" />
        <input type="text" placeholder="Dirección" className="w-full p-2 bg-secondary rounded" />
        <textarea placeholder="Descripción del pedido" className="w-full p-2 bg-secondary rounded h-24"></textarea>
        <select className="w-full p-2 bg-secondary rounded">
          <option>Estado de pago: Pagado</option>
          <option>Estado de pago: Contra entrega</option>
          <option>Estado de pago: Gratis</option>
        </select>
        <input type="number" placeholder="Monto de envío" className="w-full p-2 bg-secondary rounded" />
        <button className="bg-primary px-4 py-2 rounded text-white font-semibold hover:bg-green-600">Crear Pedido</button>
      </div>
    </div>
  );
};
