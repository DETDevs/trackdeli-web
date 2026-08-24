import { create } from 'zustand';

export interface Repartidor {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  orderId: string;
  customerName: string;
  status: string;
  lastUpdated: number;
}

interface MapState {
  repartidoresActivos: Repartidor[];
  updateRepartidorLocation: (data: { orderId: string; userId: string; lat: number; lng: number }) => void;
}

export const useMapStore = create<MapState>((set) => ({
  repartidoresActivos: [],
  updateRepartidorLocation: (data) => set((state) => {
    // Backend's location_updated payload might omit userId, so we match by orderId
    const existing = state.repartidoresActivos.findIndex(r => r.orderId === data.orderId);
    if (existing >= 0) {
      const updated = [...state.repartidoresActivos];
      updated[existing] = { 
        ...updated[existing], 
        lat: data.lat, 
        lng: data.lng, 
        userId: data.userId || updated[existing].userId,
        lastUpdated: Date.now()
      };
      return { repartidoresActivos: updated };
    } else {
      // Create a temporary entry until we fetch real data
      return {
        repartidoresActivos: [
          ...state.repartidoresActivos,
          {
            userId: data.userId || `unknown-${data.orderId}`,
            name: 'Repartidor',
            lat: data.lat,
            lng: data.lng,
            orderId: data.orderId,
            customerName: 'Pedido en curso',
            status: 'EN_CAMINO',
            lastUpdated: Date.now()
          }
        ]
      };
    }
  }),
}));
