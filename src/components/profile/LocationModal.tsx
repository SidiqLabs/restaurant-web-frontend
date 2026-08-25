// src/components/profile/LocationModal.tsx
'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DELIVERY_LOCATION_EVENT,
  DELIVERY_LOCATION_KEY,
} from '@/lib/delivery-location';
import { geocodeAddress } from '@/services/geocoding/google';
import type { DeliveryLocationDraft } from '@/types/location';

const ICONS = {
  close: '/assets/icons/x-close.svg',
  marker: '/assets/icons/marker-pin.svg',
} as const;

const CLOSE_ICON_SIZE = 24;

type LocationModalProps = {
  open: boolean;
  onClose: () => void;
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

const getFocusable = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(',')));
};

const lockBodyScroll = () => {
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = prev;
  };
};

export const LocationModal = ({ open, onClose }: LocationModalProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [geo, setGeo] = useState<GeocodeResult | null>(null);
  const [localError, setLocalError] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isBusy = isGeocoding || isSaving;

  const canDetect = useMemo(
    () => address.trim().length >= 6 && !isBusy,
    [address, isBusy]
  );

  const canSave = useMemo(() => Boolean(geo) && !isBusy, [geo, isBusy]);

  const safeClose = useCallback(() => {
    if (!isBusy) onClose();
  }, [isBusy, onClose]);

  useEffect(() => {
    if (!open) return;
    const unlock = lockBodyScroll();

    // Focus after paint, safer on mobile sheets
    requestAnimationFrame(() => closeBtnRef.current?.focus());

    return unlock;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        safeClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const root = dialogRef.current;
      const focusables = getFocusable(root);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, safeClose]);

  useEffect(() => {
    if (!open) return;
    setAddress('');
    setAddressDetail('');
    setGeo(null);
    setLocalError('');
    setIsGeocoding(false);
    setIsSaving(false);
  }, [open]);

  const handleDetect = async () => {
    setLocalError('');
    setGeo(null);
    setAddressDetail('');

    const trimmed = address.trim();
    if (trimmed.length < 6) {
      setLocalError('Please enter a more specific address.');
      return;
    }

    setIsGeocoding(true);
    try {
      const res = await geocodeAddress(trimmed);
      setGeo(res);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to detect location.'
      );
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSave = () => {
    if (!geo) {
      setLocalError('Please detect location first.');
      return;
    }

    setIsSaving(true);

    const draft: DeliveryLocationDraft = {
      formattedAddress: geo.formattedAddress,
      addressDetail: addressDetail.trim() || undefined,
      latitude: geo.latitude,
      longitude: geo.longitude,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(DELIVERY_LOCATION_KEY, JSON.stringify(draft));
      window.dispatchEvent(new Event(DELIVERY_LOCATION_EVENT));
      onClose();
    } catch {
      setLocalError('Failed to save location.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={[
        // overlay
        'fixed inset-0 z-50 bg-foreground/40',
        // layout:
        // - mobile: align to top, give breathing space
        // - sm+: center
        'flex items-start justify-center sm:items-center',
        // padding to avoid notch/address bar + allow scrolling space
        'px-4 pb-6 pt-[calc(env(safe-area-inset-top)+16px)] sm:py-6',
      ].join(' ')}
      role='dialog'
      aria-modal='true'
      aria-label='Delivery Address'
      onMouseDown={safeClose}
    >
      <div
        ref={dialogRef}
        className={[
          'w-full max-w-md rounded-2xl border border-border bg-card shadow-sm',
          // Critical mobile fix: prevent content clipping.
          // give modal a max height and make its content scroll if needed
          'max-h-[calc(100dvh-32px-env(safe-area-inset-top))] overflow-y-auto',
          // padding
          'p-6',
        ].join(' ')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className='flex items-start justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>Delivery Address</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              Type your address and we&apos;ll detect your delivery location.
            </p>
          </div>

          <button
            ref={closeBtnRef}
            onClick={safeClose}
            disabled={isBusy}
            aria-label='Close delivery address modal'
            className='grid h-10 w-10 place-items-center rounded-full border bg-background hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-60'
          >
            <Image
              src={ICONS.close}
              alt=''
              width={CLOSE_ICON_SIZE}
              height={CLOSE_ICON_SIZE}
              aria-hidden='true'
            />
          </button>
        </div>

        <div className='mt-5 space-y-3'>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder='Example: Jl. Ahmad Yani No. 10, Bekasi'
            disabled={isBusy}
          />

          <Button
            variant='neutral'
            className='h-12 w-full rounded-full'
            onClick={handleDetect}
            disabled={!canDetect}
          >
            {isGeocoding ? 'Detecting...' : 'Detect Location'}
          </Button>

          {geo && (
            <div className='space-y-3'>
              <div className='rounded-2xl border bg-muted/30 p-4 text-sm'>
                <p className='font-semibold'>Location found</p>
                <p className='mt-1 text-muted-foreground'>
                  {geo.formattedAddress}
                </p>
              </div>

              <div className='space-y-2'>
                <label
                  htmlFor='delivery-address-detail'
                  className='text-sm font-medium'
                >
                  Address Detail
                  <span className='ml-1 font-normal text-muted-foreground'>
                    (Optional)
                  </span>
                </label>

                <textarea
                  id='delivery-address-detail'
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder='House no., block, RT/RW, floor, landmark, etc.'
                  maxLength={250}
                  rows={3}
                  disabled={isBusy}
                  className='w-full resize-none rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
                />

                <p className='text-xs text-muted-foreground'>
                  Add details that help the courier find the exact location.
                </p>
              </div>
            </div>
          )}

          {localError && (
            <p className='text-sm text-destructive'>{localError}</p>
          )}
        </div>

        <div className='mt-5 flex flex-col gap-3'>
          <Button
            className='h-12 w-full rounded-full'
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <Button
            variant='neutral'
            className='h-12 w-full rounded-full'
            onClick={safeClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
