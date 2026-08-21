export const OrderPhotos = () => {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-400">Fotos del pedido:</p>
      <div className="flex gap-2 overflow-x-auto">
        <div className="w-24 h-24 bg-secondary rounded flex-shrink-0 flex items-center justify-center text-xs">Foto 1</div>
        <div className="w-24 h-24 bg-secondary rounded flex-shrink-0 flex items-center justify-center text-xs">Foto 2</div>
      </div>
    </div>
  );
};
