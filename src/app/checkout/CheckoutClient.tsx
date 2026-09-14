// src/app/checkout/CheckoutClient.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import { Toast } from '@/components/common/Toast';
import { ToastViewport } from '@/components/common/ToastViewport';
import { Button } from '@/components/ui/button';
import { CheckoutDeliveryAddress } from '@/components/checkout/CheckoutDeliveryAddress';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  QTY_ICON_ADD,
  QTY_ICON_MINUS,
  QTY_ICON_SIZE,
} from '@/components/icons/qty';
import {
  DELIVERY_LOCATION_EVENT,
  formatDeliveryAddress,
  readDeliveryLocationDraft,
} from '@/lib/delivery-location';
import { cn } from '@/lib/utils';
import {
  mapCartToCheckoutPayload,
  type CheckoutFormValues,
} from '@/services/adapters/checkout';
import { useProfileQuery } from '@/services/queries/auth';
import {
  useCartQuery,
  useDeleteCartItemMutation,
  useUpdateCartItemMutation,
} from '@/services/queries/cart';
import {
  ordersQueryHelpers,
  useCheckoutMutation,
} from '@/services/queries/orders';
import type { CartItem } from '@/types/cart';

const paymentOptions = [
  {
    value: 'BNI Bank Negara Indonesia',
    label: 'Bank Negara Indonesia',
    icon: '/assets/icons/bni.svg',
  },
  {
    value: 'BRI Bank Rakyat Indonesia',
    label: 'Bank Rakyat Indonesia',
    icon: '/assets/icons/bri.svg',
  },
  {
    value: 'BCA Bank Central Asia',
    label: 'Bank Central Asia',
    icon: '/assets/icons/bca.svg',
  },
  {
    value: 'Mandiri',
    label: 'Mandiri',
    icon: '/assets/icons/mandiri.svg',
  },
] as const;

const formSchema = z.object({
  deliveryAddress: z
    .string()
    .trim()
    .min(10, 'Address is required (min 10 chars).'),
  phone: z.string().trim().min(8, 'Phone is required.'),
  paymentMethod: z.string().trim().min(1, 'Payment method is required.'),
  notes: z.string().trim().optional(),
});

type FieldErrors = Partial<Record<keyof CheckoutFormValues, string>>;

type ToastState =
  | {
      open: true;
      title: string;
      message: string;
    }
  | {
      open: false;
      title?: string;
      message?: string;
    };

const moneyIdr = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
    value
  );

// Figma desktop content width: 1000px
const PAGE_CONTAINER = 'mx-auto w-full max-w-[1000px]';

// Toast icon (danger)
const TOAST_ICON_DANGER = '/assets/icons/danger.svg';

const CheckoutClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedItemsParam = searchParams.get('items');

  const requestedItemIds = useMemo(() => {
    if (!selectedItemsParam) return null;

    const ids = selectedItemsParam
      .split(',')
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    return new Set(ids);
  }, [selectedItemsParam]);

  const { data: profileRes } = useProfileQuery();
  const profile = profileRes?.data;

  const {
    data: cartData,
    isLoading: isCartLoading,
    isError: isCartError,
    error: cartError,
    refetch: refetchCart,
  } = useCartQuery();

  const selectedCartData = useMemo(() => {
    if (!cartData) return undefined;
    if (requestedItemIds === null) return cartData;

    const cart = cartData.cart
      .map((group) => {
        const items = group.items.filter((item) =>
          requestedItemIds.has(item.id)
        );

        return {
          ...group,
          items,
          subtotal: items.reduce(
            (total, item) => total + item.itemTotal,
            0
          ),
        };
      })
      .filter((group) => group.items.length > 0);

    const totalItems = cart.reduce(
      (total, group) =>
        total +
        group.items.reduce(
          (quantity, item) => quantity + item.quantity,
          0
        ),
      0
    );

    const totalPrice = cart.reduce(
      (total, group) => total + group.subtotal,
      0
    );

    return {
      ...cartData,
      cart,
      summary: {
        ...cartData.summary,
        restaurantCount: cart.length,
        totalItems,
        totalPrice,
      },
    };
  }, [cartData, requestedItemIds]);

  const updateQty = useUpdateCartItemMutation();
  const deleteItem = useDeleteCartItemMutation();
  const checkout = useCheckoutMutation();

  const [values, setValues] = useState<CheckoutFormValues>({
    deliveryAddress: '',
    phone: '',
    paymentMethod: paymentOptions[0].value,
    notes: '',
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string>('');

  const [pendingUpdateId, setPendingUpdateId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const itemMutationInFlight = useRef(false);
  const [removeTarget, setRemoveTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const isItemMutationPending =
    pendingUpdateId !== null || pendingDeleteId !== null;

  const deliveryActionRef = useRef<HTMLButtonElement | null>(null);

  // Item action reveal (Remove hidden until row clicked)
  const [activeItemId, setActiveItemId] = useState<number | null>(null);

  // Toast (component-based)
  const [toast, setToast] = useState<ToastState>({ open: false });

  const closeToast = () => setToast({ open: false });

  const showDangerToast = (message: string, title = 'There was a problem') => {
    setToast({ open: true, title, message });
  };

  const clearServerError = () => setServerError('');

  const isCartEmpty = useMemo(() => {
    const totalItems = selectedCartData?.summary.totalItems ?? 0;
    const groups = selectedCartData?.cart ?? [];
    return totalItems <= 0 || groups.length === 0;
  }, [selectedCartData]);

  const summary = useMemo(() => {
    const subtotal = selectedCartData?.summary.totalPrice ?? 0;

    // UI-only fees (backend returns real pricing after success)
    const deliveryFee = subtotal > 0 ? 10_000 : 0;
    const serviceFee = subtotal > 0 ? 1_000 : 0;

    return {
      subtotal,
      deliveryFee,
      serviceFee,
      totalPrice: subtotal + deliveryFee + serviceFee,
      totalItems: selectedCartData?.summary.totalItems ?? 0,
    };
  }, [selectedCartData]);

  const setField = <K extends keyof CheckoutFormValues>(
    key: K,
    val: CheckoutFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    clearServerError();
  };

  const validate = (): boolean => {
    const parsed = formSchema.safeParse(values);

    if (parsed.success) {
      setErrors({});
      return true;
    }

    const next: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof CheckoutFormValues | undefined;
      if (field) next[field] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const handleSubmit = async () => {
    if (itemMutationInFlight.current || checkout.isPending) return;
    clearServerError();

    if (!cartData || !selectedCartData || isCartEmpty) {
      const msg = 'Your cart is empty.';
      setServerError(msg);
      showDangerToast(msg, 'Cannot checkout');
      return;
    }

    if (!validate()) {
      if (values.deliveryAddress.trim().length < 10 || values.phone.trim().length < 8) {
        deliveryActionRef.current?.scrollIntoView({ block: 'center' });
        deliveryActionRef.current?.focus({ preventScroll: true });
      }
      showDangerToast(
        'Please fix the form errors before checkout.',
        'Invalid form'
      );
      return;
    }

    const payload = mapCartToCheckoutPayload(selectedCartData, values);

    const purchasedCartItemIds = selectedCartData.cart.flatMap((group) =>
      group.items.map((item) => item.id)
    );

    const allCartItemIds = cartData.cart.flatMap((group) =>
      group.items.map((item) => item.id)
    );

    const purchasedIdSet = new Set(purchasedCartItemIds);

    const clearEntireCart =
      allCartItemIds.length > 0 &&
      purchasedCartItemIds.length === allCartItemIds.length &&
      allCartItemIds.every((id) => purchasedIdSet.has(id));

    try {
      const res = await checkout.mutateAsync({
        payload,
        purchasedCartItemIds,
        clearEntireCart,
      });
      const txId = res.data.transaction.transactionId;

      router.push(`/payment-success?tx=${encodeURIComponent(txId)}`);
    } catch (err) {
      const msg = ordersQueryHelpers.getApiErrorMessage(err);
      setServerError(msg);
      showDangerToast(msg, 'Checkout failed');
    }
  };

  // Prefill phone from profile (best effort). Do not overwrite manual edits.
  useEffect(() => {
    if (!profile?.phone) return;

    setValues((prev) => {
      if (prev.phone.trim()) return prev;
      return { ...prev, phone: profile.phone };
    });
  }, [profile?.phone]);

  // Delivery selection is authoritative, including subsequent changes/removal.
  useEffect(() => {
    const syncDraft = () => {
      const draft = readDeliveryLocationDraft();
      setValues((prev) => ({
        ...prev,
        deliveryAddress: draft ? formatDeliveryAddress(draft) : '',
      }));
      setErrors((prev) => ({ ...prev, deliveryAddress: undefined }));
    };
    syncDraft();
    window.addEventListener(DELIVERY_LOCATION_EVENT, syncDraft);
    window.addEventListener('storage', syncDraft);
    return () => {
      window.removeEventListener(DELIVERY_LOCATION_EVENT, syncDraft);
      window.removeEventListener('storage', syncDraft);
    };
  }, []);

  const runItemMutation = async (
    opts:
      | { id: number; kind: 'update'; nextQty: number }
      | { id: number; kind: 'delete' }
  ) => {
    if (itemMutationInFlight.current || checkout.isPending) return;
    if (
      opts.kind === 'update' &&
      (!Number.isInteger(opts.nextQty) || opts.nextQty < 1)
    ) return;

    // Cart mutations roll back a whole-cart snapshot, so serialize them here.
    itemMutationInFlight.current = true;
    clearServerError();

    if (opts.kind === 'update') setPendingUpdateId(opts.id);
    if (opts.kind === 'delete') setPendingDeleteId(opts.id);

    try {
      if (opts.kind === 'update') {
        await updateQty.mutateAsync({ id: opts.id, quantity: opts.nextQty });
      } else {
        await deleteItem.mutateAsync({ id: opts.id });
        setActiveItemId((prev) => (prev === opts.id ? null : prev));
      }
      // Join the invalidation's refetch before accepting another interaction.
      await refetchCart({ cancelRefetch: false });
    } catch (err) {
      const msg = ordersQueryHelpers.getApiErrorMessage(err);
      setServerError(msg);
      showDangerToast(msg, 'Update failed');
    } finally {
      itemMutationInFlight.current = false;
      if (opts.kind === 'update') setPendingUpdateId(null);
      if (opts.kind === 'delete') {
        setPendingDeleteId(null);
        setRemoveTarget(null);
      }
    }
  };

  const requestRemove = (item: CartItem) => {
    if (itemMutationInFlight.current || checkout.isPending) return;
    setRemoveTarget({ id: item.id, name: item.menu.foodName });
  };

  const handleDecrease = (item: CartItem) => {
    if (item.quantity <= 1) {
      requestRemove(item);
      return;
    }
    return runItemMutation({ id: item.id, kind: 'update', nextQty: item.quantity - 1 });
  };

  const handleIncrease = async (id: number, nextQty: number) =>
    runItemMutation({ id, kind: 'update', nextQty });

  const handleRemove = async (id: number) =>
    runItemMutation({ id, kind: 'delete' });

  return (
    <main className='w-full bg-muted/30 px-4 pb-16 pt-10 sm:px-6 lg:px-16'>
      <ToastViewport>
        <Toast
          open={toast.open}
          variant='danger'
          title={toast.open ? toast.title : ''}
          description={toast.open ? toast.message : ''}
          iconSrc={TOAST_ICON_DANGER}
          autoCloseMs={3000}
          onClose={closeToast}
        />
      </ToastViewport>

      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open && !itemMutationInFlight.current) setRemoveTarget(null);
        }}
      >
        <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto'>
          <DialogHeader>
            <div className='min-w-0'>
              <DialogTitle className='text-lg font-semibold text-foreground'>
                Remove this item?
              </DialogTitle>
              <DialogDescription className='mt-1 text-sm leading-6 text-muted-foreground'>
                Removing this item will delete it from your cart.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <p className='break-words text-sm leading-6 text-muted-foreground'>
              {removeTarget
                ? `Are you sure you want to remove ${removeTarget.name}?`
                : 'Are you sure you want to remove this item?'}
            </p>
          </DialogBody>
          <DialogFooter className='flex-col-reverse sm:flex-row'>
            <Button
              type='button'
              variant='neutral'
              className='w-full rounded-full sm:w-auto'
              onClick={() => setRemoveTarget(null)}
              disabled={isItemMutationPending}
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              className='w-full rounded-full sm:w-auto'
              onClick={() => {
                if (removeTarget) void handleRemove(removeTarget.id);
              }}
              disabled={!removeTarget || isItemMutationPending}
            >
              {pendingDeleteId !== null ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={PAGE_CONTAINER}>
        <h1 className='text-3xl font-semibold tracking-tight'>Checkout</h1>

        <div className='mt-8 grid min-w-0 gap-5 lg:grid-cols-[590px_minmax(0,1fr)]'>
          {/* LEFT */}
          <div className='min-w-0 space-y-5'>
            <CheckoutDeliveryAddress
              address={values.deliveryAddress}
              phone={values.phone}
              addressError={errors.deliveryAddress}
              phoneError={errors.phone}
              disabled={checkout.isPending}
              actionRef={deliveryActionRef}
              onPhoneSave={(phone) => setField('phone', phone)}
            />

            {/* Items */}
            <section className='rounded-2xl border bg-card p-4 shadow-sm sm:p-5'>
              <div className='mt-4'>
                {isCartLoading ? (
                  <p className='text-sm text-muted-foreground'>
                    Loading cart...
                  </p>
                ) : isCartError ? (
                  <p className='text-sm text-destructive'>
                    {cartError instanceof Error
                      ? cartError.message
                      : 'Failed to load cart'}
                  </p>
                ) : isCartEmpty ? (
                  <p className='text-sm text-muted-foreground'>
                    Your cart is empty.
                  </p>
                ) : (
                  <div className='space-y-5'>
                    {selectedCartData?.cart.map((group) => (
                      <div key={group.restaurant.id} className='min-w-0 space-y-3'>
                        <div className='flex min-w-0 items-center justify-between gap-3'>
                          <div className='flex min-w-0 flex-1 items-center gap-2'>
                            <Image
                              src='/assets/icons/restaurant.svg'
                              alt=''
                              aria-hidden='true'
                              width={32}
                              height={32}
                              className='shrink-0'
                            />
                            <span className='min-w-0 truncate text-sm font-semibold'>
                              {group.restaurant.name}
                            </span>
                          </div>

                          <Link
                            href='/'
                            className='shrink-0 rounded-full border bg-background px-4 py-2 text-xs font-medium hover:bg-muted'
                          >
                            Add item
                          </Link>
                        </div>

                        <div className='space-y-3'>
                          {group.items.map((item) => {
                            const isUpdatingThis = pendingUpdateId === item.id;
                            const isDeletingThis = pendingDeleteId === item.id;

                            const disableItemActions =
                              checkout.isPending ||
                              isItemMutationPending;

                            const isActive = activeItemId === item.id;

                            const toggleActive = () =>
                              setActiveItemId((prev) =>
                                prev === item.id ? null : item.id
                              );

                            return (
                              <div
                                key={item.id}
                                role='button'
                                tabIndex={0}
                                onClick={toggleActive}
                                onKeyDown={(e) => {
                                  if (e.target !== e.currentTarget) return;
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleActive();
                                  }
                                }}
                                className={cn(
                                  'flex min-w-0 items-center gap-2 rounded-2xl bg-background p-2 sm:gap-4 sm:p-3',
                                  'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring'
                                )}
                              >
                                <div className='flex min-w-0 flex-1 items-center gap-2 sm:gap-3'>
                                  <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-16 sm:w-16'>
                                    <Image
                                      src={item.menu.image}
                                      alt={item.menu.foodName}
                                      fill
                                      sizes='64px'
                                      className='object-cover'
                                    />
                                  </div>

                                  <div className='min-w-0 flex-1'>
                                    <p className='whitespace-normal break-words text-sm font-medium leading-snug sm:truncate'>
                                      {item.menu.foodName}
                                    </p>
                                    <p className='mt-0.5 truncate text-sm font-semibold'>
                                      {moneyIdr(item.menu.price)}
                                    </p>
                                  </div>
                                </div>

                                <div className='flex shrink-0 items-center gap-1.5 sm:gap-2'>
                                  <button
                                    type='button'
                                    className='inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-muted disabled:opacity-60'
                                    disabled={disableItemActions}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleDecrease(item);
                                    }}
                                    aria-label='Decrease quantity'
                                  >
                                    {isUpdatingThis ? (
                                      ''
                                    ) : (
                                      <Image
                                        src={QTY_ICON_MINUS}
                                        alt=''
                                        aria-hidden='true'
                                        width={QTY_ICON_SIZE}
                                        height={QTY_ICON_SIZE}
                                      />
                                    )}
                                  </button>

                                  <span className='min-w-5 text-center text-sm font-semibold sm:min-w-6'>
                                    {item.quantity}
                                  </span>

                                  <button
                                    type='button'
                                    className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60'
                                    disabled={disableItemActions}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleIncrease(
                                        item.id,
                                        item.quantity + 1
                                      );
                                    }}
                                    aria-label='Increase quantity'
                                  >
                                    {isUpdatingThis ? (
                                      ''
                                    ) : (
                                      <Image
                                        src={QTY_ICON_ADD}
                                        alt=''
                                        aria-hidden='true'
                                        width={QTY_ICON_SIZE}
                                        height={QTY_ICON_SIZE}
                                      />
                                    )}
                                  </button>

                                  <button
                                    type='button'
                                    className={cn(
                                      'overflow-hidden whitespace-nowrap text-xs transition-all',
                                      'text-muted-foreground hover:text-destructive hover:underline disabled:opacity-60',
                                      isActive
                                        ? 'ml-2 w-auto opacity-100'
                                        : 'ml-0 w-0 opacity-0 pointer-events-none'
                                    )}
                                    aria-hidden={!isActive}
                                    tabIndex={isActive ? 0 : -1}
                                    disabled={disableItemActions}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestRemove(item);
                                    }}
                                  >
                                    {isDeletingThis ? 'Removing...' : 'Remove'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <aside className='min-w-0'>
            <section className='rounded-2xl border bg-card p-4 shadow-sm sm:p-5'>
              <h2 className='text-sm font-semibold'>Payment Method</h2>

              <div className='mt-4 space-y-3'>
                {paymentOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3',
                      values.paymentMethod === opt.value
                        ? 'border-primary'
                        : 'border-input'
                    )}
                  >
                    <div className='flex min-w-0 flex-1 items-center gap-3'>
                      <div className='relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted'>
                        <Image
                          src={opt.icon}
                          alt={opt.label}
                          fill
                          sizes='32px'
                          className='object-contain p-1'
                        />
                      </div>
                      <span className='min-w-0 truncate text-sm font-medium'>
                        {opt.label}
                      </span>
                    </div>

                    <input
                      type='radio'
                      name='paymentMethod'
                      value={opt.value}
                      checked={values.paymentMethod === opt.value}
                      onChange={() => setField('paymentMethod', opt.value)}
                      className='h-4 w-4 shrink-0 accent-primary'
                      disabled={checkout.isPending}
                    />
                  </label>
                ))}
              </div>

              <div className='mt-4'>
                <label className='block text-xs font-medium text-muted-foreground'>
                  Notes (optional)
                </label>
                <textarea
                  className='mt-1 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none transition-colors hover:border-muted-foreground/40 focus:border-muted-foreground/60 focus:ring-2 focus:ring-muted-foreground/20'
                  rows={3}
                  value={values.notes ?? ''}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder='Please ring the doorbell'
                  disabled={checkout.isPending}
                />
              </div>

              <div className='mt-5 border-t border-dashed pt-5'>
                <h2 className='text-sm font-semibold'>Payment Summary</h2>

                <div className='mt-4 space-y-3 text-sm'>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='min-w-0 text-muted-foreground'>
                      Price ( {summary.totalItems} items)
                    </span>
                    <span className='shrink-0 font-medium'>
                      {moneyIdr(summary.subtotal)}
                    </span>
                  </div>

                  <div className='flex items-center justify-between gap-3'>
                    <span className='min-w-0 text-muted-foreground'>Delivery Fee</span>
                    <span className='shrink-0 font-medium'>
                      {moneyIdr(summary.deliveryFee)}
                    </span>
                  </div>

                  <div className='flex items-center justify-between gap-3'>
                    <span className='min-w-0 text-muted-foreground'>Service Fee</span>
                    <span className='shrink-0 font-medium'>
                      {moneyIdr(summary.serviceFee)}
                    </span>
                  </div>

                  <div className='mt-2 pt-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='min-w-0 font-semibold'>Total</span>
                      <span className='shrink-0 text-lg font-semibold'>
                        {moneyIdr(summary.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {serverError ? (
                  <p className='mt-3 text-sm text-destructive'>{serverError}</p>
                ) : null}

                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={
                    checkout.isPending || isItemMutationPending || isCartLoading || isCartEmpty
                  }
                  className='mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60'
                >
                  {checkout.isPending ? 'Processing...' : 'Buy'}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CheckoutClient;
