import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'api-client';

export type BusinessProductStatus = 'ACTIVE' | 'INACTIVE';

export interface BusinessProductItem {
  id?: string;
  productType: 'DELIVERY' | 'POS' | 'CARTERA_COBRO' | 'CITAS';
  status: BusinessProductStatus;
  [key: string]: any;
}

export interface MyProductsResponse {
  businessId: string;
  businessName: string;
  products: {
    DELIVERY?: BusinessProductItem | null;
    POS?: BusinessProductItem | null;
    CARTERA_COBRO?: BusinessProductItem | null;
    CITAS?: BusinessProductItem | null;
  };
}

export function useMyProducts(enabled: boolean = true) {
  return useQuery<MyProductsResponse>({
    queryKey: ['businesses', 'me', 'products'],
    queryFn: async () => {
      const res = await apiClient.get<MyProductsResponse>('/businesses/me/products');
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
}
