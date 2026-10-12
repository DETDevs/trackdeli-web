import { apiClient } from './apiClient';
import type {
  WaiterPublicInfo,
  BusinessPublicInfo,
  WaiterAuthData,
  TableStatusSummary,
  TableZone,
  Category,
  Product,
  ActiveTableOrder,
  AddOrderItemsPayload,
  KitchenRound,
  SendToKitchenPayload,
  VoidOrderItemPayload,
} from '../types/mesero';

export const meseroApi = {
  /**
   * Obtiene la lista de meseros públicos de un negocio por slug o ID.
   */
  async getWaiters(slugOrId: string): Promise<{ business?: BusinessPublicInfo; waiters: WaiterPublicInfo[] }> {
    const res = await apiClient.get<any>(`/businesses/${slugOrId}/waiters`);
    if (Array.isArray(res.data)) {
      return { waiters: res.data };
    }
    return {
      business: res.data.business,
      waiters: res.data.waiters || [],
    };
  },

  /**
   * Inicio de sesión del mesero con PIN de 4 dígitos.
   */
  async loginWithPin(
    slugOrId: string,
    payload: { waiterId: string; pin: string }
  ): Promise<WaiterAuthData> {
    const res = await apiClient.post<WaiterAuthData>(
      `/businesses/${slugOrId}/waiters/login`,
      payload
    );
    return res.data;
  },

  /**
   * Obtiene el estado actual de todas las mesas (libre/ocupada, total, ítems, zonas).
   */
  async getTablesStatus(): Promise<TableStatusSummary[]> {
    const res = await apiClient.get<any[]>('/pos/tables/status');
    return (res.data || []).map((t) => {
      const order = t.currentOrder || t.activeOrder;
      const isOccupied =
        t.isOccupied !== undefined
          ? Boolean(t.isOccupied)
          : t.status === 'OCCUPIED' || Boolean(order);

      const zoneId = t.zoneId || t.zone?.id || null;
      const zoneName = t.zoneName || t.zone?.name || null;

      return {
        id: t.id,
        number: t.number,
        name: t.name,
        capacity: t.capacity,
        shape: t.shape,
        status: isOccupied ? 'OCCUPIED' : 'FREE',
        isOccupied,
        zoneId: zoneId || undefined,
        zoneName: zoneName || undefined,
        activeOrder: order
          ? {
              id: order.id,
              openedAt: order.openedAt || order.createdAt || new Date().toISOString(),
              customerName: order.customerName || null,
              itemCount: order.itemCount || order.itemsCount || 0,
              total: Number(order.total) || 0,
            }
          : null,
      };
    });
  },

  /**
   * Obtiene las zonas configuradas del salón si están disponibles en el API.
   */
  async getZones(): Promise<TableZone[]> {
    try {
      const res = await apiClient.get<any[]>('/pos/salon/zones');
      if (Array.isArray(res.data)) {
        return res.data.map((z) => ({
          id: z.id,
          name: z.name,
          sortOrder: z.sortOrder ?? z.order ?? 0,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Obtiene las categorías de productos.
   */
  async getCategories(): Promise<Category[]> {
    const res = await apiClient.get<Category[]>('/pos/categories');
    return res.data;
  },

  /**
   * Obtiene los productos del catálogo.
   */
  async getProducts(params?: { categoryId?: string; search?: string }): Promise<Product[]> {
    const res = await apiClient.get<Product[]>('/pos/products', {
      params: {
        categoryId: params?.categoryId || undefined,
        search: params?.search || undefined,
      },
    });
    return res.data;
  },

  /**
   * Obtiene el pedido activo de una mesa.
   */
  async getActiveOrder(tableId: string): Promise<ActiveTableOrder | null> {
    try {
      const res = await apiClient.get<any>(`/pos/tables/${tableId}/order`);
      const data = res.data?.data !== undefined ? res.data.data : res.data;
      if (!data) return null;
      return {
        id: data.id,
        tableId: data.tableId,
        status: data.status,
        total: Number(data.total ?? data.subtotal) || 0,
        subtotal: Number(data.subtotal ?? data.total) || 0,
        openedAt: data.openedAt || data.createdAt || new Date().toISOString(),
        openedByWaiterName: data.openedByWaiterName || null,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        vehicleInfo: data.vehicleInfo || null,
        workshopVehicleId: data.workshopVehicleId || null,
        items: (data.items || []).map((it: any) => ({
          id: it.id,
          productId: it.productId,
          productName: it.productName || it.product?.name,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice || it.product?.price) || 0,
          subtotal: Number(it.subtotal) || (Number(it.quantity || 1) * Number(it.unitPrice || it.product?.price || 0)),
          notes: it.notes || null,
          waiterName: it.waiterName || null,
          waiterId: it.waiterId || null,
          kitchenRoundId: it.kitchenRoundId || null,
          sentAt: it.sentAt || null,
          isSent: Boolean(it.kitchenRoundId) || Boolean(it.isSent),
          product: it.product
            ? {
                id: it.product.id,
                name: it.product.name,
                price: Number(it.product.price) || 0,
                sendToKitchen: it.product.sendToKitchen !== false,
                stock: it.product.stock != null ? Number(it.product.stock) : undefined,
                unit: it.product.unit || 'UND',
              }
            : null,
          createdAt: it.createdAt || new Date().toISOString(),
        })),
      };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null; // Mesa sin pedido abierto aún
      }
      throw err;
    }
  },

  /**
   * Agrega ítems a la comanda de una mesa (abre la mesa si no estaba abierta).
   */
  async addOrderItems(
    tableId: string,
    payload: AddOrderItemsPayload
  ): Promise<ActiveTableOrder> {
    const res = await apiClient.post<any>(
      `/pos/tables/${tableId}/order/items`,
      payload
    );
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  /**
   * 170c - Envía a cocina los ítems sin ronda. Idempotente con clientRequestId.
   */
  async sendToKitchen(
    tableId: string,
    payload: SendToKitchenPayload
  ): Promise<{ round: KitchenRound; tableOrder: ActiveTableOrder }> {
    const res = await apiClient.post<any>(
      `/pos/tables/${tableId}/order/send-to-kitchen`,
      payload
    );
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return {
      round: data.round || data,
      tableOrder: data.tableOrder || data,
    };
  },

  /**
   * 170c - Obtiene el listado de rondas de cocina de la mesa con sus estados de impresión.
   */
  async getTableOrderRounds(tableId: string): Promise<KitchenRound[]> {
    const res = await apiClient.get<any>(
      `/pos/tables/${tableId}/order/rounds`
    );
    const raw = res.data?.data !== undefined ? res.data.data : res.data;
    return Array.isArray(raw) ? raw : [];
  },

  /**
   * 170c - Anula o reduce cantidad de un ítem de la comanda (con PIN obligatorio si ya fue enviado).
   */
  async voidOrderItem(
    tableId: string,
    itemId: string,
    payload: VoidOrderItemPayload
  ): Promise<{ success: boolean; voided: any; tableOrder: ActiveTableOrder }> {
    const res = await apiClient.post<any>(
      `/pos/tables/${tableId}/order/items/${itemId}/void`,
      payload
    );
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  /**
   * Elimina un renglón sin enviar de la orden abierta.
   */
  async deleteOrderItem(tableId: string, itemId: string): Promise<ActiveTableOrder> {
    const res = await apiClient.delete<any>(
      `/pos/tables/${tableId}/order/items/${itemId}`
    );
    return res.data?.data !== undefined ? res.data.data : res.data;
  },
};

