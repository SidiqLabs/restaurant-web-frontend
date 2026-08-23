'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { NotAvailableYet } from '@/components/common/NotAvailableYet';
import { ShowMoreButton } from '@/components/common/ShowMoreButton';
import { Toast } from '@/components/common/Toast';
import { ToastViewport } from '@/components/common/ToastViewport';
import {
  QTY_ICON_ADD,
  QTY_ICON_MINUS,
  QTY_ICON_SIZE,
} from '@/components/icons/qty';
import { cn, formatCurrencyIDR } from '@/lib/utils';
import { useAddToCartMutation } from '@/services/queries/cart';
import type { RestaurantDetail } from '@/types/restaurant';

type Props = {
  restaurant: RestaurantDetail;
  defaultType?: string;
};

type MenuLike = RestaurantDetail['menus'] extends Array<infer M> ? M : never;

const getMenuImage = (menu: MenuLike): string => {
  const m = menu as unknown as Record<string, unknown>;

  const candidates = [
    m.image,
    m.imageUrl,
    m.imageURL,
    m.photo,
    m.photoUrl,
    m.thumbnail,
    m.thumbnailUrl,
    m.picture,
    m.pictureUrl,
  ];

  const hit = candidates.find((v) => typeof v === 'string' && v.length > 0);
  return (hit as string) ?? '/assets/images/placeholder-food.jpg';
};

const normalizeTypeLabel = (type: string) => {
  if (type === 'all') return 'All Menu';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const MenuSection = ({ restaurant, defaultType = 'all' }: Props) => {
  const router = useRouter();
  const addToCart = useAddToCartMutation();

  const [activeType, setActiveType] = useState<string>(defaultType);

  // UI state (qty yang ditampilkan di halaman detail)
  const [qtyById, setQtyById] = useState<Record<number, number>>({});
  const [serverError, setServerError] = useState<string>('');
  const [isNoMoreToastOpen, setIsNoMoreToastOpen] = useState(false);

  const menus = useMemo(() => restaurant.menus ?? [], [restaurant.menus]);

  const types = useMemo(() => {
    const uniq = Array.from(new Set(menus.map((m) => m.type).filter(Boolean)));
    return ['all', ...uniq];
  }, [menus]);

  const filteredMenus = useMemo(() => {
    if (activeType === 'all') return menus;
    return menus.filter((m) => m.type === activeType);
  }, [menus, activeType]);

  const totalItems = useMemo(
    () => Object.values(qtyById).reduce((acc, v) => acc + v, 0),
    [qtyById]
  );

  const totalPrice = useMemo(() => {
    return Object.entries(qtyById).reduce((acc, [idStr, qty]) => {
      const id = Number(idStr);
      const menu = menus.find((m) => m.id === id);
      if (!menu) return acc;
      return acc + menu.price * qty;
    }, 0);
  }, [qtyById, menus]);

  const restaurantId = restaurant.id;

  const addOneToCart = async (menuId: number) => {
    setServerError('');

    if (!restaurantId) {
      setServerError('Restaurant id is missing. Cannot add to cart.');
      return;
    }

    // optimistic +1
    setQtyById((prev) => ({ ...prev, [menuId]: (prev[menuId] ?? 0) + 1 }));

    try {
      await addToCart.mutateAsync({
        restaurantId,
        menuId,
        quantity: 1,
      });
    } catch (err) {
      // rollback -1
      setQtyById((prev) => {
        const current = prev[menuId] ?? 0;
        const next = Math.max(0, current - 1);

        if (next === 0) {
          const clone = { ...prev };
          delete clone[menuId];
          return clone;
        }
        return { ...prev, [menuId]: next };
      });

      setServerError(
        err instanceof Error ? err.message : 'Failed to add item.'
      );
    }
  };

  const decLocal = (menuId: number) => {
    setServerError('');

    setQtyById((prev) => {
      const current = prev[menuId] ?? 0;
      const next = Math.max(0, current - 1);

      if (next === 0) {
        const clone = { ...prev };
        delete clone[menuId];
        return clone;
      }
      return { ...prev, [menuId]: next };
    });
  };

  const goCheckout = () => {
    router.push('/checkout');
  };

  // Checkout bar hanya muncul if ada item (sesuai Figma)
  const showCheckoutBar = totalItems > 0;
  const canCheckout = totalItems > 0 && !addToCart.isPending;

  return (
    <section className='mt-8'>
      <ToastViewport>
        <Toast
          open={isNoMoreToastOpen}
          variant='info'
          title='Info'
          description='No more menu items to show.'
          autoCloseMs={3000}
          onClose={() => setIsNoMoreToastOpen(false)}
        />
      </ToastViewport>

      {/* Title */}
      <h2 className='text-xl font-semibold tracking-tight md:text-2xl'>Menu</h2>

      {/* Tabs row (dekat title, tidak ketarik oleh summary bar) */}
      <div className='mt-3'>
        <div className='flex flex-wrap items-center gap-2'>
          {types.map((t) => (
            <button
              key={t}
              type='button'
              onClick={() => setActiveType(t)}
              className={cn(
                'h-10 rounded-full border px-5 text-sm font-semibold transition',
                activeType === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'bg-background hover:bg-muted'
              )}
            >
              {normalizeTypeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Checkout Summary Bar (separate section, like Figma) */}
      {showCheckoutBar ? (
        <div className='mt-4'>
          {/* Divider (top) */}
          <div className='border-b' />

          <div className='flex items-center justify-between gap-4 py-4'>
            {/* Left: items + total */}
            <div className='flex flex-col gap-1 text-sm'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <Image
                  src='/assets/icons/bag.svg'
                  alt=''
                  width={16}
                  height={16}
                  aria-hidden='true'
                />
                <span className='font-medium text-foreground'>
                  {totalItems}
                </span>
                <span>items</span>
              </div>

              <div className='font-semibold'>
                {formatCurrencyIDR(totalPrice)}
              </div>
            </div>

            {/* Right: checkout button */}
            <button
              type='button'
              onClick={goCheckout}
              disabled={!canCheckout}
              className={cn(
                'h-10 w-[160px] rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              {addToCart.isPending ? 'Loading' : 'Checkout'}
            </button>
          </div>

          {/* Divider (bottom) */}
          <div className='border-b' />
        </div>
      ) : (
        // Divider default (if bar tidak tampil, tetap ada garis pemisah seperti layout)
        <div className='mt-4 border-b' />
      )}

      {/* Error banner */}
      {serverError ? (
        <div className='mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3'>
          <p className='text-sm text-destructive'>{serverError}</p>
        </div>
      ) : null}

      {/* Grid menu cards */}
      <div className='mt-6'>
        {filteredMenus.length === 0 ? (
          <NotAvailableYet label='Menu not available yet' />
        ) : (
          <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
            {filteredMenus.map((menu) => {
              const qty = qtyById[menu.id] ?? 0;
              const img = getMenuImage(menu);

              return (
                <article
                  key={menu.id}
                  className='overflow-hidden rounded-2xl border bg-card'
                >
                  <div className='relative aspect-4/3 w-full overflow-hidden'>
                    <Image
                      src={img}
                      alt={menu.foodName}
                      fill
                      className='object-cover'
                      sizes='(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw'
                    />
                  </div>

                  <div className='p-3'>
                    <p className='truncate text-xs font-medium text-foreground'>
                      {menu.foodName}
                    </p>
                    <p className='mt-1 text-xs font-semibold'>
                      {formatCurrencyIDR(menu.price)}
                    </p>

                    <div className='mt-3 flex items-center justify-end'>
                      {qty === 0 ? (
                        <button
                          type='button'
                          onClick={() => addOneToCart(menu.id)}
                          disabled={addToCart.isPending}
                          className='h-8 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60'
                        >
                          Add
                        </button>
                      ) : (
                        <div className='flex items-center gap-2'>
                          <button
                            type='button'
                            onClick={() => decLocal(menu.id)}
                            className='inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-semibold hover:bg-muted'
                            aria-label='Decrease quantity'
                          >
                            <Image
                              src={QTY_ICON_MINUS}
                              alt=''
                              aria-hidden='true'
                              width={QTY_ICON_SIZE}
                              height={QTY_ICON_SIZE}
                            />
                          </button>

                          <span className='min-w-5 text-center text-xs font-semibold'>
                            {qty}
                          </span>

                          <button
                            type='button'
                            onClick={() => addOneToCart(menu.id)}
                            disabled={addToCart.isPending}
                            className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60'
                            aria-label='Increase quantity'
                          >
                            <Image
                              src={QTY_ICON_ADD}
                              alt=''
                              aria-hidden='true'
                              width={QTY_ICON_SIZE}
                              height={QTY_ICON_SIZE}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Show More button (Figma) */}
      <div className='mt-8 flex justify-center'>
        <ShowMoreButton
          canShowMore={false}
          isLoadingMore={false}
          onClickAction={() => undefined}
          onUnavailableAction={() => setIsNoMoreToastOpen(true)}
        />
      </div>
    </section>
  );
};

export default MenuSection;
