'use client';

import type { RestaurantDetail } from '@/types/restaurant';

import MenuSection from '@/components/resto/MenuSection';
import { RestaurantHero } from '@/components/resto/RestaurantHero';
import { ReviewSection } from '@/components/resto/ReviewSection';

type Props = {
  restaurant: RestaurantDetail;
  isLoadingMoreReviews?: boolean;
  onLoadMoreReviews?: () => void;
};

export const RestaurantDetailView = ({
  restaurant,
  isLoadingMoreReviews = false,
  onLoadMoreReviews,
}: Props) => {
  return (
    <main className='mx-auto w-full max-w-6xl px-4 pb-12 pt-6 md:px-6'>
      <div className='space-y-10'>
        <RestaurantHero restaurant={restaurant} />
        <MenuSection restaurant={restaurant} defaultType='all' />
        <ReviewSection
          restaurant={restaurant}
          isLoadingMoreReviews={isLoadingMoreReviews}
          onLoadMoreReviews={onLoadMoreReviews}
        />
      </div>
    </main>
  );
};

export default RestaurantDetailView;
