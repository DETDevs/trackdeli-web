export const OrderStatusTimeline = () => {
  return (
    <div className="pl-4 border-l-2 border-primary space-y-4 my-4">
      <div className="relative">
        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[22px] top-1"></div>
        <p className="font-semibold">PENDIENTE</p>
      </div>
      <div className="relative">
        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[22px] top-1"></div>
        <p className="font-semibold">EN_CAMINO</p>
      </div>
    </div>
  );
};
