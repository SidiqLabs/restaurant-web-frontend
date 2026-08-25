'use client';

import { useMemo, useState } from 'react';

import { ShowMoreButton } from '@/components/common/ShowMoreButton';
import { Toast } from '@/components/common/Toast';
import { ToastViewport } from '@/components/common/ToastViewport';
import ReviewStarIcon from '@/components/icons/ReviewStarIcon';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RestaurantDetail } from '@/types/restaurant';

type Props = {
  restaurant: RestaurantDetail;
  isLoadingMoreReviews?: boolean;
  onLoadMoreReviews?: () => void;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const STAR_SIZE_CLASS = 'h-[18px] w-[18px]';
const STAR_ROW_CLASS = 'flex items-center gap-1';

// UI helper (presentation only)
const Stars = ({ value }: { value: number }) => {
  const safeValue = Math.max(0, Math.min(5, value));

  return (
    <div className={STAR_ROW_CLASS} aria-label={`Rating ${safeValue} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const active = i < safeValue;

        return (
          <ReviewStarIcon
            key={i}
            aria-hidden='true'
            className={cn(
              STAR_SIZE_CLASS,
              active ? 'text-star' : 'text-muted-foreground'
            )}
          />
        );
      })}
    </div>
  );
};

export const ReviewSection = ({
  restaurant,
  isLoadingMoreReviews = false,
  onLoadMoreReviews,
}: Props) => {
  const [isNoMoreToastOpen, setIsNoMoreToastOpen] = useState(false);

  const reviews = useMemo(() => {
    const uniqueReviews = new Map<number, RestaurantDetail['reviews'][number]>();

    for (const review of restaurant.reviews ?? []) {
      if (!uniqueReviews.has(review.id)) {
        uniqueReviews.set(review.id, review);
      }
    }

    return Array.from(uniqueReviews.values());
  }, [restaurant.reviews]);

  const loaded = reviews.length;

  const totalFromServer = restaurant.totalReviews;
  const hasServerTotal =
    typeof totalFromServer === 'number' && Number.isFinite(totalFromServer);

  const total = hasServerTotal ? totalFromServer : loaded;
  const hasMoreOnServer = hasServerTotal && loaded < total;

  const rating = restaurant.averageRating ?? restaurant.star;

  const canShowMore = hasMoreOnServer && Boolean(onLoadMoreReviews);
  const isExhausted = loaded > 0 && !canShowMore && !isLoadingMoreReviews;

  const handleShowMore = () => {
    if (!canShowMore || isLoadingMoreReviews) return;
    onLoadMoreReviews?.();
  };

  const totalLabel = hasMoreOnServer ? `${loaded}/${total}` : `${total}`;

  return (
    <>
      <ToastViewport>
        <Toast
          open={isNoMoreToastOpen}
          variant='info'
          title='Info'
          description='No more reviews to show.'
          autoCloseMs={3000}
          onClose={() => setIsNoMoreToastOpen(false)}
        />
      </ToastViewport>

      <section id='reviews' className='scroll-mt-24 space-y-5'>
        {/* Header */}
        <div className='space-y-1.5'>
          <h2 className='text-xl font-semibold tracking-tight md:text-2xl'>
            Review
          </h2>

          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <ReviewStarIcon
                aria-hidden='true'
                className={cn(STAR_SIZE_CLASS, 'text-star')}
              />
              <span className='font-semibold text-foreground'>{rating}</span>
            </div>
            <span>({totalLabel} Ulasan)</span>
          </div>
        </div>

        {/* Body */}
        {loaded === 0 ? (
          <p className='text-sm text-muted-foreground'>No reviews.</p>
        ) : (
          <div className='grid gap-5 lg:grid-cols-2'>
            {reviews.map((review) => (
              <Card
                key={review.id}
                className='rounded-2xl border p-5 shadow-sm md:p-6'
              >
                <div className='flex items-start gap-4'>
                  {/* Avatar */}
                  <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-white'>
                    {/* Keep as-is; not part of D3.e */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={review.user.avatar || '/assets/icons/avatar.svg'}
                      alt={`${review.user.name} avatar`}
                      className='h-full w-full object-cover'
                      loading='lazy'
                    />
                  </div>

                  {/* Content */}
                  <div className='min-w-0 flex-1 space-y-3'>
                    <div className='space-y-1'>
                      <p className='truncate text-sm font-semibold text-foreground'>
                        {review.user.name}
                      </p>

                      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                        <Stars value={review.star} />
                        <p className='text-xs text-muted-foreground'>
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>

                    <p className='text-sm leading-relaxed text-foreground'>
                      {review.comment ?? ''}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        {loaded > 0 ? (
          <div className='flex justify-center pt-3'>
            <ShowMoreButton
              canShowMore={canShowMore}
              isLoadingMore={isLoadingMoreReviews}
              onClickAction={handleShowMore}
              onUnavailableAction={
                isExhausted ? () => setIsNoMoreToastOpen(true) : undefined
              }
            />
          </div>
        ) : null}
      </section>
    </>
  );
};
