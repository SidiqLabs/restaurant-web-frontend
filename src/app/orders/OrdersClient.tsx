// src/app/orders/OrdersClient.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import OrdersSidebar from '@/components/orders/OrdersSidebar';
import ReviewModal from '@/components/orders/ReviewModal';
import { cn } from '@/lib/utils';
import { useProfileQuery } from '@/services/queries/auth';
import { useOrdersQuery } from '@/services/queries/orders';
import { useMyReviewsQuery } from '@/services/queries/reviews';
import type { TransactionStatus } from '@/types/order';
import type { MyReviewItem } from '@/types/review';

const ICONS = {
  search: '/assets/icons/search.svg',
} as const;

const statusTabs = [
  { label: 'Preparing', value: 'preparing' },
  { label: 'On the Way', value: 'on_the_way' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Done', value: 'done' },
  { label: 'Canceled', value: 'canceled' },
] as const;

type StatusTabValue = (typeof statusTabs)[number]['value'];

const moneyIdr = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
    value
  );

const normalizeText = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '');

const makeReviewKey = (transactionId: string, restaurantId: number) =>
  `${transactionId}::${restaurantId}`;

type ReviewModalState =
  | { open: false }
  | {
      open: true;
      transactionId: string;
      restaurantName: string;
      restaurantId: number;
      menuIds: number[];
      existingReview: MyReviewItem | null;
    };

type RowItem = {
  menuId: number;
  menuName: string;
  quantity: number;
  price: number;
  image?: string;
};

type NormalizedOrderRow = {
  id: number;
  transactionId: string;
  status: TransactionStatus;

  restaurantName: string;
  restaurantLogo?: string;
  restaurantId: number;

  menuIds: number[];
  thumb: string;

  // “preview” (item pertama)
  itemName: string;
  qtyText: string;

  // full list
  items: RowItem[];

  total: number;

  existingReview: MyReviewItem | null;

  rowKey: string;
};

const OrdersClient = () => {
  const [status, setStatus] = useState<StatusTabValue>('done');
  const [search, setSearch] = useState<string>('');
  const [reviewModal, setReviewModal] = useState<ReviewModalState>({
    open: false,
  });
  const [completedReviewKeys, setCompletedReviewKeys] = useState<Set<string>>(
    () => new Set()
  );

  // Track expanded state per row (transaction+restaurant)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Figma-feel: jangan kebanyakan card numpuk
  const page = 1;
  const limit = 5;

  const { data: profileResponse } = useProfileQuery();
  const user = profileResponse?.data ?? null;

  const userName = user?.name?.trim() ? user.name : 'Guest';
  const avatarUrl = user?.avatar ?? null;

  const { data, isLoading, isError, error } = useOrdersQuery({
    status,
    page,
    limit,
  });

  const myReviewsPage = 1;
  const myReviewsLimit = 50;
  const { data: myReviewsRes } = useMyReviewsQuery(
    { page: myReviewsPage, limit: myReviewsLimit },
    { enabled: typeof window !== 'undefined' }
  );

  const reviewByTxAndRestaurant = useMemo(() => {
    const list = myReviewsRes?.data.reviews ?? [];
    const map = new Map<string, MyReviewItem>();

    for (const r of list) {
      const restaurantId =
        (r as MyReviewItem & { restaurantId?: number }).restaurantId ??
        r.restaurant?.id;

      if (typeof r.transactionId !== 'string' || !r.transactionId.trim())
        continue;
      if (typeof restaurantId !== 'number' || !Number.isFinite(restaurantId))
        continue;

      map.set(makeReviewKey(r.transactionId, restaurantId), r);
    }

    return map;
  }, [myReviewsRes]);

  const normalized = useMemo<NormalizedOrderRow[]>(() => {
    const orders = data?.data.orders ?? [];
    const rows: NormalizedOrderRow[] = [];

    for (const tx of orders) {
      const txId = tx.transactionId;
      const txStatus = tx.status as TransactionStatus;

      const groups = Array.isArray(tx.restaurants) ? tx.restaurants : [];

      const txSubtotal = tx.pricing?.subtotal ?? 0;
      const txServiceFee = tx.pricing?.serviceFee ?? 0;
      const txDeliveryFee = tx.pricing?.deliveryFee ?? 0;

      const safeTxSubtotal =
        typeof txSubtotal === 'number' && txSubtotal > 0 ? txSubtotal : 0;

      for (const group of groups) {
        const restaurantName = group.restaurant?.name ?? 'Restaurant';
        const restaurantLogo = group.restaurant?.logo;
        const restaurantId = group.restaurant?.id ?? 0;

        const itemsRaw = Array.isArray(group.items) ? group.items : [];

        const items: RowItem[] = itemsRaw
          .map((i) => ({
            menuId: i.menuId,
            menuName: i.menuName,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
          }))
          .filter(
            (i) =>
              typeof i.menuId === 'number' &&
              Number.isFinite(i.menuId) &&
              typeof i.menuName === 'string'
          );

        const firstItem = items[0];

        const itemName = firstItem?.menuName ?? 'Menu';
        const qty = firstItem?.quantity ?? 0;
        const price = firstItem?.price ?? 0;

        const thumb = firstItem?.image || restaurantLogo || '';

        const qtyText =
          qty && price
            ? `${qty}  ${moneyIdr(price)}`
            : qty
              ? `${qty} item`
              : '';

        const menuIdsRaw = items.map((i) => i.menuId);
        const menuIds = Array.from(new Set(menuIdsRaw)).filter(
          (x) => typeof x === 'number' && Number.isFinite(x)
        );

        const groupSubtotal = group.subtotal ?? 0;

        const ratio =
          safeTxSubtotal > 0 && typeof groupSubtotal === 'number'
            ? groupSubtotal / safeTxSubtotal
            : 0;

        const allocatedServiceFee = Math.round(txServiceFee * ratio);
        const allocatedDeliveryFee = Math.round(txDeliveryFee * ratio);

        const total =
          typeof groupSubtotal === 'number'
            ? groupSubtotal + allocatedServiceFee + allocatedDeliveryFee
            : 0;

        const existingReview =
          typeof restaurantId === 'number' && restaurantId > 0
            ? (reviewByTxAndRestaurant.get(makeReviewKey(txId, restaurantId)) ??
              null)
            : null;

        const rowKey = makeReviewKey(txId, restaurantId);

        rows.push({
          id: tx.id,
          transactionId: txId,
          status: txStatus,
          restaurantName,
          restaurantLogo,
          restaurantId,
          menuIds,
          thumb,
          itemName,
          qtyText,
          items,
          total,
          existingReview,
          rowKey,
        });
      }
    }

    return rows;
  }, [data, reviewByTxAndRestaurant]);

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return normalized;

    return normalized.filter((o) => {
      const haystack = normalizeText(
        `${o.restaurantName} ${o.itemName} ${o.transactionId}`
      );
      return haystack.includes(q);
    });
  }, [normalized, search]);

  const currentReviewRowKey = reviewModal.open
    ? makeReviewKey(reviewModal.transactionId, reviewModal.restaurantId)
    : '';

  const remainingReviewCount = useMemo(() => {
    if (!reviewModal.open) return 0;

    return normalized.filter((row) => {
      return (
        row.rowKey !== currentReviewRowKey &&
        row.restaurantId > 0 &&
        row.menuIds.length > 0 &&
        !row.existingReview?.id &&
        !completedReviewKeys.has(row.rowKey)
      );
    }).length;
  }, [completedReviewKeys, currentReviewRowKey, normalized, reviewModal.open]);

  const nextReviewTarget = useMemo(() => {
    if (!reviewModal.open) return null;

    const currentIndex = normalized.findIndex(
      (row) => row.rowKey === currentReviewRowKey
    );
    const orderedRows =
      currentIndex >= 0
        ? [
            ...normalized.slice(currentIndex + 1),
            ...normalized.slice(0, currentIndex),
          ]
        : normalized;

    return (
      orderedRows.find(
        (row) =>
          row.rowKey !== currentReviewRowKey &&
          row.restaurantId > 0 &&
          row.menuIds.length > 0 &&
          !row.existingReview?.id &&
          !completedReviewKeys.has(row.rowKey)
      ) ?? null
    );
  }, [completedReviewKeys, currentReviewRowKey, normalized, reviewModal.open]);

  const isUnauthorized =
    error instanceof Error &&
    normalizeText(error.message).includes(
      normalizeText('access token required')
    );

  const toggleExpanded = (rowKey: string) => {
    setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

  const openReviewModal = (args: {
    transactionId: string;
    restaurantName: string;
    restaurantId: number;
    menuIds: number[];
    existingReview: MyReviewItem | null;
  }) => {
    setReviewModal({ open: true, ...args });
  };

  const openReviewModalFromRow = (row: NormalizedOrderRow) => {
    openReviewModal({
      transactionId: row.transactionId,
      restaurantName: row.restaurantName,
      restaurantId: row.restaurantId,
      menuIds: row.menuIds,
      existingReview: row.existingReview,
    });
  };

  const closeReviewModal = () => setReviewModal({ open: false });

  const handleReviewSubmitted = () => {
    if (!currentReviewRowKey) return;

    setCompletedReviewKeys((prev) => {
      if (prev.has(currentReviewRowKey)) return prev;

      const next = new Set(prev);
      next.add(currentReviewRowKey);
      return next;
    });
  };

  const handleReviewNext = () => {
    if (!nextReviewTarget) return;
    openReviewModalFromRow(nextReviewTarget);
  };

  return (
    <main className='mx-auto w-full max-w-[1200px] px-4 pb-16 pt-10 sm:px-6 lg:px-8'>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:items-start'>
        <div className='hidden lg:block'>
          <OrdersSidebar userName={userName} avatarUrl={avatarUrl} />
        </div>

        <section>
          <h1 className='text-3xl font-semibold tracking-tight'>My Orders</h1>

          <div className='mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6'>
            {/* Search */}
            <div className='flex items-center gap-3 rounded-full border bg-background px-4 py-3'>
              <Image
                src={ICONS.search}
                alt=''
                width={18}
                height={18}
                className='opacity-70'
                aria-hidden='true'
              />
              <input
                className='w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground'
                placeholder='Search'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label='Search orders'
              />
            </div>

            {/* Status tabs */}
            <div className='mt-5'>
              <div className='text-sm font-medium'>Status</div>

              <div className='mt-3 flex flex-wrap gap-2'>
                {statusTabs.map((t) => (
                  <button
                    key={t.value}
                    type='button'
                    onClick={() => setStatus(t.value)}
                    className={cn(
                      'h-9 rounded-full border px-4 text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      status === t.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'bg-background hover:bg-muted'
                    )}
                    aria-pressed={status === t.value}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className='mt-6 space-y-4'>
              {isLoading ? (
                <p className='text-sm text-muted-foreground'>
                  Loading orders...
                </p>
              ) : isError ? (
                <div className='rounded-xl border bg-background p-4'>
                  <p className='text-sm text-destructive'>
                    {error instanceof Error
                      ? error.message
                      : 'Failed to load orders'}
                  </p>

                  {isUnauthorized ? (
                    <p className='mt-2 text-sm text-muted-foreground'>
                      Please login to view your orders.{' '}
                      <Link
                        href='/auth/login'
                        className='font-medium text-primary underline-offset-4 hover:underline'
                      >
                        Go to Login
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : filtered.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  No orders found.
                </p>
              ) : (
                filtered.map((o) => {
                  const isEdit = Boolean(o.existingReview?.id);
                  const expanded = Boolean(expandedRows[o.rowKey]);
                  const extraCount = Math.max(0, o.items.length - 1);

                  return (
                    <article
                      key={o.rowKey}
                      className='rounded-2xl border bg-background px-4 py-4 sm:px-5 sm:py-4'
                    >
                      {/* Top: restaurant */}
                      <div className='flex items-center gap-3'>
                        <div className='relative h-9 w-9 overflow-hidden rounded-xl bg-muted'>
                          {o.restaurantLogo ? (
                            <Image
                              src={o.restaurantLogo}
                              alt={o.restaurantName}
                              fill
                              sizes='36px'
                              className='object-cover'
                            />
                          ) : null}
                        </div>

                        <div className='min-w-0'>
                          <div className='truncate text-sm font-semibold'>
                            {o.restaurantName}
                          </div>
                        </div>
                      </div>

                      {/* Middle: preview item */}
                      <div className='mt-3 flex items-center gap-4'>
                        <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted'>
                          {o.thumb ? (
                            <Image
                              src={o.thumb}
                              alt={o.itemName}
                              fill
                              sizes='56px'
                              className='object-cover'
                            />
                          ) : null}
                        </div>

                        <div className='min-w-0 flex-1'>
                          <div className='truncate text-sm font-medium'>
                            {o.itemName}
                          </div>
                          <div className='mt-1 text-sm font-semibold'>
                            {o.qtyText || ''}
                          </div>

                          {/* Expand toggle */}
                          {extraCount > 0 ? (
                            <button
                              type='button'
                              onClick={() => toggleExpanded(o.rowKey)}
                              className={cn(
                                'mt-2 inline-flex items-center text-xs font-medium text-primary',
                                'hover:underline underline-offset-4',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                              )}
                              aria-expanded={expanded}
                            >
                              {expanded
                                ? 'Hide items'
                                : `View ${extraCount} more item${
                                    extraCount > 1 ? 's' : ''
                                  }`}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Expanded items list */}
                      {expanded && o.items.length > 1 ? (
                        <div className='mt-3 rounded-xl border bg-card p-3'>
                          <div className='space-y-2'>
                            {o.items.map((it) => {
                              const lineTotal =
                                (it.quantity ?? 0) * (it.price ?? 0);

                              return (
                                <div
                                  key={it.menuId}
                                  className='flex items-start justify-between gap-3'
                                >
                                  <div className='min-w-0'>
                                    <div className='truncate text-sm font-medium text-foreground'>
                                      {it.menuName}
                                    </div>
                                    <div className='mt-0.5 text-xs text-muted-foreground'>
                                      {it.quantity} × {moneyIdr(it.price)}
                                    </div>
                                  </div>
                                  <div className='shrink-0 text-sm font-semibold text-foreground'>
                                    {moneyIdr(lineTotal)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {/* Divider */}
                      <div className='mt-3 h-px w-full bg-border' />

                      {/* Bottom */}
                      <div className='mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div>
                          <div className='text-xs text-muted-foreground'>
                            Total
                          </div>
                          <div className='text-sm font-semibold'>
                            {moneyIdr(o.total)}
                          </div>
                        </div>

                        <button
                          type='button'
                          onClick={() => openReviewModalFromRow(o)}
                          className={cn(
                            'h-11 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground',
                            'hover:opacity-90 active:opacity-95',
                            'w-full sm:w-auto',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                          )}
                        >
                          {isEdit ? 'Edit Review' : 'Give Review'}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {reviewModal.open ? (
        <ReviewModal
          key={`${reviewModal.transactionId}::${reviewModal.restaurantId}::${
            reviewModal.existingReview?.id ?? 'new'
          }`}
          open={reviewModal.open}
          onClose={() => {
            closeReviewModal();
          }}
          transactionId={reviewModal.transactionId}
          restaurantId={reviewModal.restaurantId}
          restaurantName={reviewModal.restaurantName}
          menuIds={reviewModal.menuIds}
          existingReview={reviewModal.existingReview}
          remainingReviewCount={remainingReviewCount}
          onReviewSubmitted={handleReviewSubmitted}
          onReviewNext={nextReviewTarget ? handleReviewNext : undefined}
        />
      ) : null}
    </main>
  );
};

export default OrdersClient;
