// src/services/queries/orders.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { api } from '@/services/api/axios';
import { cartQueryKeys, EMPTY_CART } from '@/services/queries/cart';
import type {
  ApiErrorResponse,
  CheckoutRequest,
  CheckoutResponse,
  OrdersQueryParams,
  OrdersResponse,
} from '@/types/order';

// --- shared response shape (consistent & typed) ---
type ApiSuccessResponse<T> = {
  success: true;
  message?: string;
  data: T;
};

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

const isApiSuccess = <T>(res: ApiResponse<T>): res is ApiSuccessResponse<T> =>
  res.success === true;

export const orderQueryKeys = {
  list: (
    params: Required<Pick<OrdersQueryParams, 'status' | 'page' | 'limit'>>
  ) => ['orders', params.status, params.page, params.limit] as const,
  root: ['orders'] as const,
};

export const ordersQueryHelpers = {
  getApiErrorMessage: (err: unknown): string => {
    const fallback = 'Something went wrong. Please try again.';
    if (!axios.isAxiosError(err)) return fallback;

    const data = err.response?.data as ApiErrorResponse | undefined;

    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }

    if (Array.isArray(data?.errors) && typeof data.errors[0] === 'string') {
      const first = data.errors[0].trim();
      if (first) return first;
    }

    return fallback;
  },
};

type CheckoutMutationVariables = {
  payload: CheckoutRequest;
  purchasedCartItemIds: number[];
  clearEntireCart: boolean;
};

export const useCheckoutMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload }: CheckoutMutationVariables) => {
      const res = await api.post<ApiResponse<CheckoutResponse['data']>>(
        '/api/order/checkout',
        payload
      );

      const body = res.data;

      if (!isApiSuccess(body)) {
        throw new Error(body.message ?? 'Failed to checkout');
      }

      const normalized: CheckoutResponse = {
        success: true,
        message: body.message ?? 'Order placed successfully',
        data: body.data,
      };

      return normalized;
    },

    onSuccess: async (res, vars) => {
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(
            'last_transaction',
            JSON.stringify(res.data.transaction)
          );
        } catch {
          // ignore
        }
      }

      try {
        if (vars.clearEntireCart) {
          await api.delete('/api/cart');
        } else {
          await Promise.all(
            vars.purchasedCartItemIds.map((id) =>
              api.delete(`/api/cart/${id}`)
            )
          );
        }
      } catch {
        // ignore
      }

      if (vars.clearEntireCart) {
        qc.setQueryData(cartQueryKeys.all, EMPTY_CART);
      }
      qc.invalidateQueries({ queryKey: cartQueryKeys.all });

      // refresh orders cache (any status/page)
      qc.invalidateQueries({ queryKey: orderQueryKeys.root });
    },
  });
};

export const useOrdersQuery = (params: OrdersQueryParams) => {
  const status = params.status ?? 'done';
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  return useQuery({
    queryKey: orderQueryKeys.list({ status, page, limit }),
    queryFn: async () => {
      const res = await api.get<ApiResponse<OrdersResponse['data']>>(
        '/api/order/my-order',
        { params: { status, page, limit } }
      );

      const body = res.data;

      if (!isApiSuccess(body)) {
        throw new Error(body.message ?? 'Failed to fetch orders');
      }

      const normalized: OrdersResponse = {
        success: true,
        data: body.data,
      };

      return normalized;
    },

    // smooth UI when switching tabs/pagination
    placeholderData: (prev) => prev,

    retry: (failureCount, err) => {
      if (axios.isAxiosError(err) && err.response?.status === 401) return false;
      return failureCount < 1;
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
};
