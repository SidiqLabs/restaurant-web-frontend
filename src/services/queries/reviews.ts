// src/services/queries/reviews.ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { api } from '@/services/api/axios';
import { restaurantQueryKeys } from '@/services/queries/restaurants';
import type {
  CreateReviewRequest,
  CreateReviewResponse,
  DeleteReviewResponse,
  MyReviewsResponse,
  RestaurantReviewsResponse,
  UpdateReviewRequest,
  UpdateReviewResponse,
} from '@/types/review';

export const reviewQueryKeys = {
  root: ['review'] as const,

  myReviews: (params: { page: number; limit: number }) =>
    [...reviewQueryKeys.root, 'my-reviews', params.page, params.limit] as const,

  restaurantReviews: (params: {
    restaurantId: number;
    page: number;
    limit: number;
  }) =>
    [
      ...reviewQueryKeys.root,
      'restaurant',
      params.restaurantId,
      params.page,
      params.limit,
    ] as const,
};

// ---- API calls ----
const createReviewApi = async (
  payload: CreateReviewRequest
): Promise<CreateReviewResponse> => {
  const res = await api.post<CreateReviewResponse>('/api/review', payload);
  return res.data;
};

const updateReviewApi = async (
  id: number,
  payload: UpdateReviewRequest
): Promise<UpdateReviewResponse> => {
  const res = await api.put<UpdateReviewResponse>(`/api/review/${id}`, payload);
  return res.data;
};

const deleteReviewApi = async (id: number): Promise<DeleteReviewResponse> => {
  const res = await api.delete<DeleteReviewResponse>(`/api/review/${id}`);
  return res.data;
};

const fetchMyReviews = async (params: {
  page: number;
  limit: number;
}): Promise<MyReviewsResponse> => {
  const res = await api.get<MyReviewsResponse>('/api/review/my-reviews', {
    params,
  });
  return res.data;
};

const fetchRestaurantReviews = async (params: {
  restaurantId: number;
  page: number;
  limit: number;
}): Promise<RestaurantReviewsResponse> => {
  const res = await api.get<RestaurantReviewsResponse>(
    `/api/review/restaurant/${params.restaurantId}`,
    { params: { page: params.page, limit: params.limit } }
  );
  return res.data;
};

// ---- hooks ----
export const useMyReviewsQuery = (
  params: { page: number; limit: number },
  options?: Omit<UseQueryOptions<MyReviewsResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: reviewQueryKeys.myReviews(params),
    queryFn: () => fetchMyReviews(params),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useRestaurantReviewsQuery = (
  params: { restaurantId: number; page: number; limit: number },
  options?: Omit<
    UseQueryOptions<RestaurantReviewsResponse>,
    'queryKey' | 'queryFn'
  >
) => {
  return useQuery({
    queryKey: reviewQueryKeys.restaurantReviews(params),
    queryFn: () => fetchRestaurantReviews(params),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useCreateReviewMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReviewRequest) => createReviewApi(payload),
    onSuccess: (_res, payload) => {
      // refresh anything review-related
      qc.invalidateQueries({ queryKey: reviewQueryKeys.root });
      qc.invalidateQueries({
        queryKey: restaurantQueryKeys.restaurantDetail({
          id: payload.restaurantId,
        }),
      });
    },
  });
};

export const useUpdateReviewMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: number; payload: UpdateReviewRequest }) =>
      updateReviewApi(vars.id, vars.payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: reviewQueryKeys.root });

      const restaurantId = res.data.review.restaurant?.id;
      if (typeof restaurantId === 'number' && Number.isFinite(restaurantId)) {
        qc.invalidateQueries({
          queryKey: restaurantQueryKeys.restaurantDetail({ id: restaurantId }),
        });
      }
    },
  });
};

export const useDeleteReviewMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteReviewApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewQueryKeys.root });
    },
  });
};
