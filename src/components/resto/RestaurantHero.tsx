'use client';

import Image from 'next/image';

import { Button } from '@/components/ui/button';
import type { RestaurantDetail } from '@/types/restaurant';

type Props = {
  restaurant: RestaurantDetail;
};

const formatDistance = (distance?: number) => {
  if (typeof distance !== 'number' || Number.isNaN(distance)) return null;
  return `${distance.toFixed(1)} km`;
};

export const RestaurantHero = ({ restaurant }: Props) => {
  const images = restaurant.images ?? [];

  const main = images[0] ?? '/assets/images/placeholder-food.jpg';
  const side1 = images[1] ?? main;
  const side2 = images[2] ?? main;
  const side3 = images[3] ?? main;

  const ratingValue = restaurant.averageRating ?? restaurant.star;

  return (
    <section className='space-y-4'>
      {/* ===== Gallery ===== */}
      <div className='grid gap-3 lg:grid-cols-2 lg:gap-5'>
        {/* LEFT BIG (desktop fixed height) */}
        <div className='overflow-hidden rounded-2xl border bg-card'>
          <div className='relative aspect-16/10 w-full lg:h-[470px] lg:aspect-auto'>
            <Image
              src={main}
              alt={`${restaurant.name} main`}
              fill
              className='object-cover'
              sizes='(min-width: 1024px) 50vw, 100vw'
              priority
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className='grid gap-3 lg:grid-rows-2 lg:gap-5'>
          {/* RIGHT TOP */}
          <div className='overflow-hidden rounded-2xl border bg-card'>
            <div className='relative aspect-16/10 w-full lg:h-[225px] lg:aspect-auto'>
              <Image
                src={side1}
                alt={`${restaurant.name} photo 2`}
                fill
                className='object-cover'
                sizes='(min-width: 1024px) 50vw, 100vw'
              />
            </div>
          </div>

          {/* RIGHT BOTTOM (2 small) */}
          <div className='grid grid-cols-2 gap-3 lg:gap-5'>
            <div className='overflow-hidden rounded-2xl border bg-card'>
              <div className='relative aspect-16/10 w-full lg:h-[225px] lg:aspect-auto'>
                <Image
                  src={side2}
                  alt={`${restaurant.name} photo 3`}
                  fill
                  className='object-cover'
                  sizes='(min-width: 1024px) 25vw, 50vw'
                />
              </div>
            </div>

            <div className='overflow-hidden rounded-2xl border bg-card'>
              <div className='relative aspect-16/10 w-full lg:h-[225px] lg:aspect-auto'>
                <Image
                  src={side3}
                  alt={`${restaurant.name} photo 4`}
                  fill
                  className='object-cover'
                  sizes='(min-width: 1024px) 25vw, 50vw'
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Info row (match Figma spacing) ===== */}
      <div className='flex items-center justify-between gap-4'>
        {/* Left cluster */}
        <div className='flex min-w-0 items-center gap-4'>
          {/* Logo: 56px mobile, 120px desktop */}
          <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-full border bg-white lg:h-[120px] lg:w-[120px]'>
            <Image
              src={restaurant.logo}
              alt={`${restaurant.name} logo`}
              fill
              className='object-contain p-1'
              sizes='(min-width: 1024px) 120px, 56px'
            />
          </div>

          {/* Text */}
          <div className='min-w-0'>
            <h1 className='truncate text-xl font-semibold leading-tight text-foreground lg:text-3xl'>
              {restaurant.name}
            </h1>

            <div className='mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <Image
                  src='/assets/icons/star.svg'
                  alt='rating'
                  width={14}
                  height={14}
                />
                <span className='font-medium text-foreground'>
                  {restaurant.averageRating ?? restaurant.star ?? 0}
                </span>
              </div>
              <span className='text-muted-foreground'></span>
              <span className='truncate'>{restaurant.place ?? '-'}</span>
              {formatDistance(restaurant.distance) && (
                <>
                  <span className='text-muted-foreground'></span>
                  <span>{formatDistance(restaurant.distance)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Share */}
        <Button
          type='button'
          variant='outline'
          className='h-11 shrink-0 rounded-full px-5'
          aria-label='Share restaurant'
        >
          <span className='inline-flex items-center gap-2'>
            <Image
              src='/assets/icons/share.svg'
              alt=''
              aria-hidden='true'
              width={16}
              height={16}
            />
            <span className='text-sm font-medium'>Share</span>
          </span>
        </Button>
      </div>

      <div className='border-b' />
    </section>
  );
};
