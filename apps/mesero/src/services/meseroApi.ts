import { apiClient } from './apiClient';
import type {
  WaiterPublicInfo,
  BusinessPublicInfo,
  WaiterAuthData,
  TableStatusSummary,
  Category,
  Product,
  ActiveTableOrder,
  AddOrderItemsPayload,
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
   * Obtiene el estado actual de todas las mesas (libre/ocupada, total, ítems).
   */
  async getTablesStatus(): Promise<TableStatusSummary[]> {
    const res = await apiClient.get<any[]>('/pos/tables/status');
    return (res.data || []).map((t) => {
      const order = t.currentOrder || t.activeOrder;
      const isOccupied =
        t.isOccupied !== undefined
          ? Boolean(t.isOccupied)
          : t.status === 'OCCUPIED' || Boolean(order);

      return {
        id: t.id,
        number: t.number,
        name: t.name,
        capacity: t.capacity,
        shape: t.shape,
        status: isOccupied ? 'OCCUPIED' : 'FREE',
        isOccupied,
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
      const data = res.data;
      if (!data) return null;
      return {
        id: data.id,
        tableId: data.tableId,
        status: data.status,
        total: Number(data.total ?? data.subtotal) || 0,
        openedAt: data.openedAt || data.createdAt || new Date().toISOString(),
        openedByWaiterName: data.openedByWaiterName || null,
        customerName: data.customerName || null,
        items: (data.items || []).map((it: any) => ({
          id: it.id,
          productId: it.productId,
          productName: it.productName || it.product?.name,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice || it.product?.price) || 0,
          notes: it.notes || null,
          waiterName: it.waiterName || null,
          waiterId: it.waiterId || null,
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
    const res = await apiClient.post<ActiveTableOrder>(
      `/pos/tables/${tableId}/order/items`,
      payload
    );
    return res.data;
  },
};
