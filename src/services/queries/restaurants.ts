// src/services/queries/restaurants.ts
import {
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { api } from '@/services/api/axios';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/auth';
import type {
  BestSellerRestaurantsData,
  GetBestSellerRestaurantsParams,
  GetRestaurantDetailParams,
  GetRestaurantsParams,
  RecommendedRestaurantsData,
  RestaurantDetail,
  RestaurantsListData,
  SearchRestaurantsData,
  SearchRestaurantsParams,
} from '@/types/restaurant';

export const restaurantQueryKeys = {
  restaurants: (params?: GetRestaurantsParams) =>
    [
      'restaurants',
      params?.location ?? '',
      params?.range ?? null,
      params?.priceMin ?? null,
      params?.priceMax ?? null,
      params?.rating ?? null,
      params?.category ?? '',
      params?.page ?? 1,
      params?.limit ?? 20,
    ] as const,

  restaurantsInfinite: (params?: Omit<GetRestaurantsParams, 'page'>) =>
    [
      'restaurants',
      'infinite',
      params?.location ?? '',
      params?.range ?? null,
      params?.priceMin ?? null,
      params?.priceMax ?? null,
      params?.rating ?? null,
      params?.category ?? '',
      params?.limit ?? 20,
    ] as const,

  restaurantDetail: (params: GetRestaurantDetailParams) =>
    [
      'restaurant',
      params.id,
      params.limitMenu ?? null,
      params.limitReview ?? null,
    ] as const,
  recommended: () => ['restaurants', 'recommended'] as const,

  bestSeller: (params?: GetBestSellerRestaurantsParams) =>
    [
      'restaurants',
      'best-seller',
      params?.page ?? 1,
      params?.limit ?? 20,
    ] as const,

  search: (params: SearchRestaurantsParams) =>
    [
      'restaurants',
      'search',
      params.q,
      params.page ?? 1,
      params.limit ?? 20,
    ] as const,

  //  NEW: key khusus infinite search (tanpa page supaya stable)
  searchInfinite: (params: { q: string; limit?: number }) =>
    [
      'restaurants',
      'search',
      'infinite',
      params.q,
      params.limit ?? 20,
    ] as const,
};

const getApiErrorMessage = (error: unknown): string => {
  const fallback = 'Unexpected error. Please try again.';
  if (!error || typeof error !== 'object') return fallback;

  const axiosErr = error as AxiosError<ApiErrorResponse>;
  const messageFromServer = axiosErr.response?.data?.message;

  if (
    typeof messageFromServer === 'string' &&
    messageFromServer.trim().length > 0
  ) {
    return messageFromServer;
  }
  if (axiosErr.message && axiosErr.message.trim().length > 0) {
    return axiosErr.message;
  }
  return fallback;
};

const assertSuccess = <TData>(
  response: ApiSuccessResponse<TData> | ApiErrorResponse
): ApiSuccessResponse<TData> => {
  if (response.success) return response;
  throw new Error(response.message || 'Request failed');
};

const sanitizeRestaurantsParams = (
  params?: GetRestaurantsParams
): GetRestaurantsParams | undefined => {
  if (!params) return undefined;

  const clean: GetRestaurantsParams = { ...params };

  if (
    typeof clean.location === 'string' &&
    clean.location.trim().length === 0
  ) {
    delete (clean as Partial<GetRestaurantsParams>).location;
  }

  if (
    typeof clean.category === 'string' &&
    clean.category.trim().length === 0
  ) {
    delete (clean as Partial<GetRestaurantsParams>).category;
  }

  if (typeof clean.range !== 'number' || Number.isNaN(clean.range)) {
    delete (clean as Partial<GetRestaurantsParams>).range;
  }

  if (!clean.page || clean.page < 1) clean.page = 1;
  if (!clean.limit || clean.limit < 1) clean.limit = 20;

  return clean;
};

const fetchRestaurants = async (
  params?: GetRestaurantsParams
): Promise<RestaurantsListData> => {
  try {
    const res = await api.get<
      ApiSuccessResponse<RestaurantsListData> | ApiErrorResponse
    >('/api/resto', { params: sanitizeRestaurantsParams(params) });
    return assertSuccess(res.data).data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
};

const fetchRestaurantDetail = async (
  params: GetRestaurantDetailParams
): Promise<RestaurantDetail> => {
  const { id, limitMenu, limitReview } = params;
  try {
    const res = await api.get<
      ApiSuccessResponse<RestaurantDetail> | ApiErrorResponse
    >(`/api/resto/${id}`, { params: { limitMenu, limitReview } });
    return assertSuccess(res.data).data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
};

const fetchRecommendedRestaurants =
  async (): Promise<RecommendedRestaurantsData> => {
    try {
      const res = await api.get<
        ApiSuccessResponse<RecommendedRestaurantsData> | ApiErrorResponse
      >('/api/resto/recommended');
      return assertSuccess(res.data).data;
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  };

const fetchBestSellerRestaurants = async (
  params?: GetBestSellerRestaurantsParams
): Promise<BestSellerRestaurantsData> => {
  try {
    const res = await api.get<
      ApiSuccessResponse<BestSellerRestaurantsData> | ApiErrorResponse
    >('/api/resto/best-seller', { params });
    return assertSuccess(res.data).data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
};

const fetchSearchRestaurants = async (
  params: SearchRestaurantsParams
): Promise<SearchRestaurantsData> => {
  try {
    const res = await api.get<
      ApiSuccessResponse<SearchRestaurantsData> | ApiErrorResponse
    >('/api/resto/search', { params });
    return assertSuccess(res.data).data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
};

/**
 *  FIX: accept React Query options (e.g., enabled)
 * So caller can do:
 *   useRestaurantsQuery(params, { enabled: condition })
 */
export const useRestaurantsQuery = (
  params?: GetRestaurantsParams,
  options?: Omit<
    UseQueryOptions<RestaurantsListData, Error, RestaurantsListData>,
    'queryKey' | 'queryFn'
  >
) => {
  return useQuery({
    queryKey: restaurantQueryKeys.restaurants(params),
    queryFn: () => fetchRestaurants(params),
    ...options,
  });
};

export const useInfiniteRestaurantsQuery = (
  params?: Omit<GetRestaurantsParams, 'page'>
) => {
  return useInfiniteQuery({
    queryKey: restaurantQueryKeys.restaurantsInfinite(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchRestaurants({
        ...params,
        page: Number(pageParam),
      }),
    getNextPageParam: (lastPage) => {
      const current = lastPage.pagination?.page ?? 1;
      const totalPages = lastPage.pagination?.totalPages ?? 1;
      if (current < totalPages) return current + 1;
      return undefined;
    },
  });
};

export const useRestaurantDetailQuery = (params: GetRestaurantDetailParams) => {
  return useQuery({
    queryKey: restaurantQueryKeys.restaurantDetail(params),
    queryFn: () => fetchRestaurantDetail(params),
    enabled: Number.isFinite(params.id) && params.id > 0,
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey;

      if (
        Array.isArray(previousKey) &&
        previousKey[0] === 'restaurant' &&
        previousKey[1] === params.id
      ) {
        return previousData;
      }

      return undefined;
    },
  });
};

export const useRecommendedRestaurantsQuery = () => {
  return useQuery({
    queryKey: restaurantQueryKeys.recommended(),
    queryFn: fetchRecommendedRestaurants,
  });
};

export const useBestSellerRestaurantsQuery = (
  params?: GetBestSellerRestaurantsParams
) => {
  return useQuery({
    queryKey: restaurantQueryKeys.bestSeller(params),
    queryFn: () => fetchBestSellerRestaurants(params),
  });
};

export const useSearchRestaurantsQuery = (params: SearchRestaurantsParams) => {
  return useQuery({
    queryKey: restaurantQueryKeys.search(params),
    queryFn: () => fetchSearchRestaurants(params),
    enabled: params.q.trim().length > 0,
  });
};

//  NEW: infinite search untuk tombol "Show More" di halaman /search
export const useInfiniteSearchRestaurantsQuery = (params: {
  q: string;
  limit?: number;
}) => {
  const q = params.q.trim();
  const limit = params.limit ?? 20;

  return useInfiniteQuery({
    queryKey: restaurantQueryKeys.searchInfinite({ q, limit }),
    initialPageParam: 1,
    enabled: q.length > 0,
    queryFn: ({ pageParam }) =>
      fetchSearchRestaurants({
        q,
        limit,
        page: Number(pageParam),
      }),
    getNextPageParam: (lastPage) => {
      const current = lastPage.pagination?.page ?? 1;
      const totalPages = lastPage.pagination?.totalPages ?? 1;
      if (current < totalPages) return current + 1;
      return undefined;
    },
  });
};
