'use client';

// src/app/payment-success/PaymentSuccessClient.tsx
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useSyncExternalStore } from 'react';

import { useOrdersQuery } from '@/services/queries/orders';
import type { Transaction } from '@/types/order';

const LAST_TX_KEY = 'last_transaction';

const moneyIdr = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
    value
  );

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const parseTransaction = (raw: string | null): Transaction | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Transaction;
  } catch {
    return null;
  }
};

/**
 * Subscribe to storage changes.
 * Note: native `storage` event only fires across tabs/windows, not same-tab.
 * We also listen to a custom event so same-tab updates can notify if you ever dispatch it.
 */
const subscribeLastTransaction = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const onStorage = (e: StorageEvent) => {
    if (e.key === LAST_TX_KEY) onStoreChange();
  };

  const onCustom = () => onStoreChange();

  window.addEventListener('storage', onStorage);
  window.addEventListener('last-transaction', onCustom);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('last-transaction', onCustom);
  };
};

const getLastTxRaw = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(LAST_TX_KEY);
};

type DetailRowProps = {
  label: string;
  value: React.ReactNode;
  isTotal?: boolean;
  stackOnMobile?: boolean;
  valueClassName?: string;
};

const DetailRow = ({
  label,
  value,
  isTotal,
  stackOnMobile,
  valueClassName,
}: DetailRowProps) => {
  if (isTotal) {
    return (
      <div className='flex items-center justify-between px-6 py-5'>
        <div className='text-sm font-medium text-foreground'>{label}</div>
        <div className='text-right text-lg font-semibold text-foreground'>
          {value}
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'flex px-6 py-5 text-sm',
        stackOnMobile
          ? 'flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4'
          : 'items-center justify-between gap-4',
      ].join(' ')}
    >
      <div className='shrink-0 text-muted-foreground'>{label}</div>
      <div
        className={[
          'min-w-0 max-w-full font-semibold text-foreground',
          stackOnMobile ? 'text-left sm:flex-1 sm:text-right' : 'text-right',
          valueClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </div>
    </div>
  );
};

type TicketDividerProps = {
  notchBgClassName: string;
};

const TicketDivider = ({ notchBgClassName }: TicketDividerProps) => {
  return (
    <div className='relative py-2'>
      <div className='border-t border-dashed border-border/80' />
      <span
        className={[
          'absolute left-0 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-border/70',
          notchBgClassName,
        ].join(' ')}
      />
      <span
        className={[
          'absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-border/70',
          notchBgClassName,
        ].join(' ')}
      />
    </div>
  );
};

const PaymentSuccessClient = () => {
  const sp = useSearchParams();
  const txParam = sp.get('tx')?.trim() ?? '';

  /**
   *  Correct useSyncExternalStore:
   * Snapshot MUST be a stable primitive (string) when unchanged.
   * We store raw JSON string here, then parse with useMemo.
   */
  const cachedTxRaw = useSyncExternalStore(
    subscribeLastTransaction,
    getLastTxRaw,
    () => null
  );

  const cachedTx = useMemo(() => parseTransaction(cachedTxRaw), [cachedTxRaw]);

  const { data: ordersRes } = useOrdersQuery({
    status: 'done',
    page: 1,
    limit: 50,
  });

  const matchedTx = useMemo(() => {
    if (!txParam) return null;
    const orders = ordersRes?.data.orders ?? [];
    const found = orders.find((o) => o.transactionId === txParam);
    return found ?? null;
  }, [ordersRes, txParam]);

  const tx: Transaction | null = useMemo(() => {
    if (txParam) {
      if (cachedTx?.transactionId === txParam) return cachedTx;
      return matchedTx;
    }
    return cachedTx ?? matchedTx;
  }, [cachedTx, matchedTx, txParam]);

  const pricing = tx?.pricing;

  // keep notch background same as page background
  const notchBgClassName = 'bg-muted/30';

  return (
    <main className='min-h-screen w-full bg-muted/30 px-4 py-10 sm:py-12'>
      <div className='mx-auto flex w-full max-w-[520px] flex-col items-center'>
        {/* Brand */}
        <div className='mb-10 flex items-center justify-center'>
          <div className='flex items-center gap-3'>
            <Image
              src='/assets/icons/logo.svg'
              alt='Foody'
              width={44}
              height={44}
              priority
            />
            <span className='text-3xl font-semibold tracking-tight text-foreground'>
              Foody
            </span>
          </div>
        </div>

        {/* Card */}
        <section className='w-full rounded-3xl bg-card p-8 text-center shadow-md shadow-black/5 ring-1 ring-border/60'>
          {/* Success icon */}
          <div className='mx-auto grid h-16 w-16 place-items-center rounded-full bg-success ring-8 ring-success/15'>
            <svg
              width='40'
              height='40'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
              className='text-success-foreground'
            >
              <path
                d='M20 6L9 17l-5-5'
                stroke='currentColor'
                strokeWidth='2.8'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </div>

          <h1 className='mt-5 text-2xl font-semibold leading-tight tracking-tight text-foreground'>
            Payment Success
          </h1>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            Your payment has been successfully processed.
          </p>

          {/* Ticket */}
          <div className='mt-8 w-full overflow-hidden rounded-2xl bg-card ring-1 ring-border/60'>
            <div className='px-6 pt-6' />

            <TicketDivider notchBgClassName={notchBgClassName} />

            <div>
              <DetailRow
                label='Transaction ID'
                value={txParam || '-'}
                stackOnMobile
                valueClassName='break-all'
              />
              <DetailRow
                label='Date'
                value={tx?.createdAt ? formatDateTime(tx.createdAt) : '-'}
              />
              <DetailRow
                label='Payment Method'
                value={tx?.paymentMethod ?? '-'}
                stackOnMobile
                valueClassName='break-words'
              />
            </div>

            <TicketDivider notchBgClassName={notchBgClassName} />

            <div>
              <DetailRow
                label='Price'
                value={pricing ? moneyIdr(pricing.subtotal) : '-'}
              />
              <DetailRow
                label='Delivery Fee'
                value={pricing ? moneyIdr(pricing.deliveryFee) : '-'}
              />
              <DetailRow
                label='Service Fee'
                value={pricing ? moneyIdr(pricing.serviceFee) : '-'}
              />
            </div>

            <TicketDivider notchBgClassName={notchBgClassName} />

            <DetailRow
              label='Total'
              value={pricing ? moneyIdr(pricing.totalPrice) : '-'}
              isTotal
            />

            <div className='px-6 pb-6' />
          </div>

          <Link
            href='/orders'
            className='mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white'
          >
            See My Orders
          </Link>

          {!tx ? (
            <p className='mt-4 text-xs leading-5 text-muted-foreground'>
              (Transaction details not found yet. Check Orders to verify.)
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default PaymentSuccessClient;
