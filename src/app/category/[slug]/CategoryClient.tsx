// src/app/category/[slug]/CategoryClient.tsx
'use client';

import Link from 'next/link';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from '@/lib/store';
import { useRestaurantsQuery } from '@/services/queries/restaurants';
import type {
  GetRestaurantsParams,
  RestaurantListItem,
} from '@/types/restaurant';

import {
  resetFilters,
  setCategorySlug,
  setPriceMax,
  setPriceMin,
  setRange,
  setRatingMin,
  setSearchQuery,
  setSortBy,
  type SortBy,
} from '@/features/filters/filtersSlice';

import { CategoryFilterPanel } from '@/components/resto/CategoryFilterPanel';
import { RestaurantList } from '@/components/resto/RestaurantList';

const SUPPORTED_SLUGS = new Set(['all', 'nearby']);
const UNSUPPORTED_SLUGS = new Set([
  'discount',
  'best-seller',
  'delivery',
  'lunch',
]);

const normalizeSlug = (slug?: string | null) =>
  (slug ?? 'all').trim().toLowerCase();

const EMPTY_RESTAURANTS: RestaurantListItem[] = [];

type Props = {
  slug: string;
};

export default function CategoryClient({ slug }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector((s: RootState) => s.filters);

  // UI-only (drawer)
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categorySlug = useMemo(() => normalizeSlug(slug), [slug]);

  const isSupported = SUPPORTED_SLUGS.has(categorySlug);
  const isUnsupported = UNSUPPORTED_SLUGS.has(categorySlug);

  // keep Redux category in sync (route-driven)
  useEffect(() => {
    dispatch(setCategorySlug(categorySlug));
  }, [categorySlug, dispatch]);

  /**
   *  Keyed remount for filter panel draft state.
   * When committed Redux values change (especially reset), panel remounts and draft resets.
   */
  const filterPanelKey = useMemo(() => {
    return [
      categorySlug,
      filters.range ?? 'null',
      filters.priceMin ?? 'null',
      filters.priceMax ?? 'null',
      filters.ratingMin ?? 'null',
      filters.searchQuery,
      filters.sortBy,
    ].join('|');
  }, [
    categorySlug,
    filters.range,
    filters.priceMin,
    filters.priceMax,
    filters.ratingMin,
    filters.searchQuery,
    filters.sortBy,
  ]);

  /**
   * Server params (Swagger-aligned)
   * - Distance is UI-only: DO NOT send `range` (and no `location` exists in Figma).
   * - Keep server-supported filters: priceMin/priceMax/rating/category/page/limit.
   */
  const serverParams = useMemo((): GetRestaurantsParams => {
    const params: GetRestaurantsParams = { page: 1, limit: 50 };

    if (typeof filters.priceMin === 'number')
      params.priceMin = filters.priceMin;
    if (typeof filters.priceMax === 'number')
      params.priceMax = filters.priceMax;
    if (typeof filters.ratingMin === 'number')
      params.rating = filters.ratingMin;

    // Optional: if backend supports category filter; depends on your API/slug mapping.
    // Keeping it OFF by default to avoid assumptions.
    // if (categorySlug !== 'all' && categorySlug !== 'nearby') params.category = categorySlug;

    return params;
  }, [filters.priceMin, filters.priceMax, filters.ratingMin]);

  const canFetch = isSupported && !isUnsupported;
  const query = useRestaurantsQuery(serverParams, { enabled: canFetch });

  const restaurantsFromServer = query.data?.restaurants ?? EMPTY_RESTAURANTS;

  /**
   * Pipeline:
   * 1) search by name (client)
   * 2) sort (client)
   *
   * Distance is UI-only and does NOT affect results.
   */
  const filteredRestaurants = useMemo(() => {
    if (!isSupported) return [];

    let items = restaurantsFromServer.slice();

    // 1) Search by restaurant name
    const q = filters.searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      items = items.filter((r) => (r.name ?? '').toLowerCase().includes(q));
    }

    // 2) Sort
    items.sort((a, b) => compareRestaurants(a, b, filters.sortBy));

    return items;
  }, [isSupported, restaurantsFromServer, filters.searchQuery, filters.sortBy]);

  const pageTitle =
    categorySlug === 'nearby' ? 'Nearby Restaurants' : 'All Restaurant';

  const closeFilter = () => setIsFilterOpen(false);
  const openFilter = () => setIsFilterOpen(true);

  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.sortBy !== 'rating-desc' ||
    filters.range !== null ||
    filters.priceMin !== null ||
    filters.priceMax !== null ||
    filters.ratingMin !== null;

  // ==== UI BELOW THIS LINE: keep as-is (layout locked) ====

  if (isUnsupported || !isSupported) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-10'>
        <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-foreground'>
            Category not available yet
          </h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            Kategori ini belum didukung oleh backend/roadmap saat ini.
          </p>

          <div className='mt-4 flex flex-wrap gap-3'>
            <Link
              href='/'
              className='rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            >
              Back to Home
            </Link>
            <Link
              href='/category/all'
              className='rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            >
              All Restaurant
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-10'>
        <p className='text-sm text-muted-foreground'>Loading restaurants...</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-10'>
        <p className='text-sm text-destructive'>
          Error: {query.error?.message}
        </p>
        <div className='mt-4'>
          <Link className='text-sm underline underline-offset-4' href='/'>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-6xl px-4 py-10'>
      <div className='mb-6 md:flex md:items-center md:justify-between md:gap-4'>
        <h1 className='text-2xl font-semibold text-foreground'>{pageTitle}</h1>

        <div className='mt-3 flex w-full items-center gap-2 md:mt-0 md:w-auto md:gap-3'>
          <button
            type='button'
            onClick={openFilter}
            className='inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden'
            aria-label='Open filters'
          >
            <SlidersHorizontal className='h-4 w-4' aria-hidden='true' />
            <span>Filter</span>
          </button>

          {hasActiveFilters ? (
            <button
              type='button'
              onClick={() => {
                dispatch(resetFilters());
                closeFilter();
              }}
              className='inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden'
              aria-label='Reset filters'
            >
              <RotateCcw className='h-4 w-4' aria-hidden='true' />
              <span>Reset</span>
            </button>
          ) : null}

          <button
            type='button'
            onClick={() => {
              dispatch(resetFilters());
              closeFilter();
            }}
            className='hidden rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:inline-flex'
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]'>
        <div className='hidden md:block' key={`desktop-${filterPanelKey}`}>
          <DraftFilterPanel
            key={filterPanelKey}
            filters={filters}
            onCommit={(payload) => {
              // commit only when user hits Enter/Apply in panel
              dispatch(setPriceMin(payload.priceMin));
              dispatch(setPriceMax(payload.priceMax));
            }}
            onChangeRange={(v) => dispatch(setRange(v))}
            onChangeRating={(v) => dispatch(setRatingMin(v))}
            onChangeSearch={(v) => dispatch(setSearchQuery(v))}
            onChangeSort={(v) => dispatch(setSortBy(v))}
          />
        </div>

        <div className='min-w-0'>
          <RestaurantList restaurants={filteredRestaurants} />
        </div>
      </div>

      <MobileFilterDrawer
        open={isFilterOpen}
        title='Filter'
        onClose={closeFilter}
      >
        <div key={`mobile-${filterPanelKey}`}>
          <DraftFilterPanel
            key={filterPanelKey}
            filters={filters}
            onCommit={(payload) => {
              dispatch(setPriceMin(payload.priceMin));
              dispatch(setPriceMax(payload.priceMax));
              closeFilter();
            }}
            onChangeRange={(v) => dispatch(setRange(v))}
            onChangeRating={(v) => dispatch(setRatingMin(v))}
            onChangeSearch={(v) => dispatch(setSearchQuery(v))}
            onChangeSort={(v) => dispatch(setSortBy(v))}
          />
        </div>
      </MobileFilterDrawer>
    </div>
  );
}

type DraftCommitPayload = {
  priceMin: number | null;
  priceMax: number | null;
};

function DraftFilterPanel(props: {
  filters: RootState['filters'];
  onCommit: (payload: DraftCommitPayload) => void;
  onChangeRange: (v: number | null) => void;
  onChangeRating: (v: number | null) => void;
  onChangeSearch: (v: string) => void;
  onChangeSort: (v: SortBy) => void;
}) {
  const {
    filters,
    onCommit,
    onChangeRange,
    onChangeRating,
    onChangeSearch,
    onChangeSort,
  } = props;

  //  draft lives here, not in CategoryClient
  const [draftPriceMin, setDraftPriceMin] = useState<number | null>(
    filters.priceMin
  );
  const [draftPriceMax, setDraftPriceMax] = useState<number | null>(
    filters.priceMax
  );

  const commitPrice = () => {
    const min =
      typeof draftPriceMin === 'number' && !Number.isNaN(draftPriceMin)
        ? draftPriceMin
        : null;
    const max =
      typeof draftPriceMax === 'number' && !Number.isNaN(draftPriceMax)
        ? draftPriceMax
        : null;

    onCommit({ priceMin: min, priceMax: max });
  };

  const commitAll = () => {
    const min =
      typeof draftPriceMin === 'number' && !Number.isNaN(draftPriceMin)
        ? draftPriceMin
        : null;
    const max =
      typeof draftPriceMax === 'number' && !Number.isNaN(draftPriceMax)
        ? draftPriceMax
        : null;

    onCommit({ priceMin: min, priceMax: max });
  };

  return (
    <>
      <CategoryFilterPanel
        range={filters.range}
        onChangeRange={onChangeRange}
        searchQuery={filters.searchQuery}
        onChangeSearch={onChangeSearch}
        sortBy={filters.sortBy}
        onChangeSort={onChangeSort}
        priceMin={draftPriceMin}
        priceMax={draftPriceMax}
        onChangePriceMin={(v) => setDraftPriceMin(v)}
        onChangePriceMax={(v) => setDraftPriceMax(v)}
        onSubmitPrice={commitPrice}
        ratingMin={filters.ratingMin}
        onChangeRatingMin={onChangeRating}
      />

      <div className='mt-4 space-y-2 md:hidden'>
        <button
          type='button'
          onClick={commitAll}
          className='w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        >
          Apply
        </button>
      </div>
    </>
  );
}

const compareRestaurants = (
  a: RestaurantListItem,
  b: RestaurantListItem,
  sortBy: SortBy
) => {
  if (sortBy === 'rating-desc') return b.star - a.star;
  if (sortBy === 'name-asc') return a.name.localeCompare(b.name);

  const aMin = a.priceRange?.min;
  const bMin = b.priceRange?.min;

  const aVal = typeof aMin === 'number' ? aMin : Number.POSITIVE_INFINITY;
  const bVal = typeof bMin === 'number' ? bMin : Number.POSITIVE_INFINITY;

  if (sortBy === 'price-asc') return aVal - bVal;
  return bVal - aVal;
};

type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

const MobileFilterDrawer = ({
  open,
  title,
  onClose,
  children,
}: DrawerProps) => {
  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 md:hidden'
      role='dialog'
      aria-modal='true'
      aria-label={title}
    >
      <button
        type='button'
        aria-label='Close filters overlay'
        onClick={onClose}
        className='absolute inset-0 bg-foreground/40 backdrop-blur-[1px]'
      />
      <div className='absolute right-0 top-0 h-full w-[88%] max-w-[360px] overflow-y-auto border-l border-border bg-card p-4 shadow-lg'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <p className='text-base font-semibold text-foreground'>{title}</p>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            aria-label='Close filters'
          >
            <X className='h-5 w-5' aria-hidden='true' />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
