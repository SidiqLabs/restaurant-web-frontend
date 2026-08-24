'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

import { RestaurantDetailView } from '@/components/resto/RestaurantDetailView';
import { useRestaurantDetailQuery } from '@/services/queries/restaurants';

const REVIEW_BATCH_SIZE = 6;

export const RestaurantDetailClient = () => {
  const params = useParams();
  const id = Number(params.id);
  const [reviewLimitState, setReviewLimitState] = useState({
    restaurantId: Number.isFinite(id) ? id : 0,
    limit: REVIEW_BATCH_SIZE,
  });

  const reviewLimit =
    reviewLimitState.restaurantId === id
      ? reviewLimitState.limit
      : REVIEW_BATCH_SIZE;

  const query = useRestaurantDetailQuery({ id, limitReview: reviewLimit });

  if (Number.isNaN(id)) return <p className='p-6'>Invalid restaurant id.</p>;

  if (query.isLoading) {
    return <p className='p-6'>Loading restaurant...</p>;
  }

  if (query.isError) {
    return (
      <p className='p-6'>
        Error: {query.error instanceof Error ? query.error.message : 'Unknown'}
      </p>
    );
  }

  if (!query.data) return <p className='p-6'>Restaurant not found.</p>;

  const isLoadingMoreReviews =
    query.isFetching &&
    !query.isLoading &&
    reviewLimit > (query.data.reviews?.length ?? 0);

  const handleLoadMoreReviews = () => {
    const totalReviews =
      query.data?.totalReviews ?? reviewLimit + REVIEW_BATCH_SIZE;

    setReviewLimitState((current) => {
      const currentLimit =
        current.restaurantId === id ? current.limit : REVIEW_BATCH_SIZE;
      const nextLimit = Math.min(
        currentLimit + REVIEW_BATCH_SIZE,
        totalReviews
      );

      return { restaurantId: id, limit: nextLimit };
    });
  };

  return (
    <RestaurantDetailView
      restaurant={query.data}
      isLoadingMoreReviews={isLoadingMoreReviews}
      onLoadMoreReviews={handleLoadMoreReviews}
    />
  );
};
