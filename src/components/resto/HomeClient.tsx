// src/components/resto/HomeClient.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ShowMoreButton } from '@/components/common/ShowMoreButton';
import { Toast } from '@/components/common/Toast';
import { ToastViewport } from '@/components/common/ToastViewport';
import { RestaurantList } from '@/components/resto/RestaurantList';
import { Input } from '@/components/ui/input';
import { useInfiniteRestaurantsQuery } from '@/services/queries/restaurants';

const shortcuts = [
  {
    label: 'All Restaurant',
    icon: '/assets/icons/all-restaurant.svg',
    href: '/category/all',
  },
  {
    label: 'Nearby',
    icon: '/assets/icons/nearby.svg',
    href: '/category/nearby',
  },
  {
    label: 'Discount',
    icon: '/assets/icons/discount.svg',
    href: '/category/discount',
  },
  {
    label: 'Best Seller',
    icon: '/assets/icons/best-seller.svg',
    href: '/category/best-seller',
  },
  {
    label: 'Delivery',
    icon: '/assets/icons/delivery.svg',
    href: '/category/delivery',
  },
  { label: 'Lunch', icon: '/assets/icons/lunch.svg', href: '/category/lunch' },
] as const;

export const HomeClient = () => {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [isNoMoreToastOpen, setIsNoMoreToastOpen] = useState(false);

  const hasQuery = searchValue.trim().length > 0;

  const restaurantsInfinite = useInfiniteRestaurantsQuery({ limit: 9 });

  const restaurants = useMemo(() => {
    const pages = restaurantsInfinite.data?.pages ?? [];
    return pages.flatMap((p) => p.restaurants ?? []);
  }, [restaurantsInfinite.data]);

  const isInitialLoading = restaurantsInfinite.isLoading;
  const isError = restaurantsInfinite.isError;
  const errorMessage = restaurantsInfinite.error?.message ?? 'Unknown error';

  const canShowMore = Boolean(restaurantsInfinite.hasNextPage);
  const isLoadingMore = restaurantsInfinite.isFetchingNextPage;
  const isExhausted =
    restaurantsInfinite.isSuccess &&
    restaurantsInfinite.hasNextPage === false &&
    !isLoadingMore;

  const handleSubmitSearch = () => {
    const q = searchValue.trim();
    if (!q) return;

    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <main>
      <ToastViewport>
        <Toast
          open={isNoMoreToastOpen}
          variant='info'
          title='Info'
          description='No more restaurants to show.'
          autoCloseMs={3000}
          onClose={() => setIsNoMoreToastOpen(false)}
        />
      </ToastViewport>

      {/* Hero */}
      <section className='relative'>
        <div className='relative h-110 w-full overflow-hidden sm:h-140'>
          <Image
            src='/assets/images/hero-home.svg'
            alt=''
            aria-hidden='true'
            fill
            priority
            className='object-cover'
          />
          <div className='absolute inset-0 bg-black/60' />
        </div>

        {/* Hero content */}
        <div className='pointer-events-none absolute inset-0'>
          <div className='mx-auto flex h-full max-w-360 flex-col items-center justify-center px-6 text-center lg:px-16 xl:px-30'>
            <h1 className='text-4xl font-semibold tracking-tight text-white sm:text-5xl'>
              Explore Culinary Experiences
            </h1>

            <p className='mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base'>
              Search and refine your choice to discover the perfect restaurant.
            </p>

            {/* Search pill */}
            <div className='pointer-events-auto mx-auto mt-8 w-full max-w-[42rem]'>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitSearch();
                }}
                className='relative rounded-full bg-white px-5 py-3 shadow-sm'
              >
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className='h-10 border-0 bg-transparent pl-11 pr-28 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0'
                  placeholder='Search restaurants, food and drink'
                />

                <Image
                  src='/assets/icons/search.svg'
                  alt=''
                  aria-hidden='true'
                  width={18}
                  height={18}
                  className='pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 opacity-60'
                />

                <button
                  type='submit'
                  disabled={!hasQuery}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${hasQuery ? 'opacity-100' : 'pointer-events-none opacity-0'}
                  `}
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Shortcuts row */}
      <section className='mx-auto mt-14 max-w-360 px-6 lg:px-16 xl:px-30'>
        <div className='rounded-3xl bg-white p-6 shadow-sm'>
          <div className='grid grid-cols-3 gap-5 sm:grid-cols-6'>
            {shortcuts.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className='group flex flex-col items-center gap-3 rounded-2xl p-3 transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30'>
                  <Image
                    src={item.icon}
                    alt=''
                    aria-hidden='true'
                    width={28}
                    height={28}
                    className='transition group-hover:scale-[1.03]'
                  />
                </div>
                <span className='text-xs font-medium text-foreground'>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended */}
      <section className='mx-auto mt-14 max-w-360 px-6 pb-14 lg:px-16 xl:px-30'>
        <div className='mb-7 flex items-center justify-between'>
          <h2 className='text-xl font-semibold text-foreground'>Recommended</h2>
          <Link
            href='/category/all'
            className='text-sm font-medium text-primary hover:opacity-90'
          >
            See All
          </Link>
        </div>

        {isInitialLoading ? (
          <div className='rounded-2xl border bg-card p-6 text-sm text-muted-foreground'>
            Loading recommended...
          </div>
        ) : isError ? (
          <div className='rounded-2xl border bg-card p-6 text-sm text-destructive'>
            Error: {errorMessage}
          </div>
        ) : (
          <RestaurantList restaurants={restaurants} />
        )}

        <div className='mt-10 flex justify-center'>
          <ShowMoreButton
            canShowMore={canShowMore}
            isLoadingMore={isLoadingMore}
            onClickAction={() => restaurantsInfinite.fetchNextPage()}
            onUnavailableAction={
              isExhausted ? () => setIsNoMoreToastOpen(true) : undefined
            }
          />
        </div>
      </section>
    </main>
  );
};
