// src/components/profile/LocationModal.tsx
'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DELIVERY_LOCATION_EVENT,
  DELIVERY_LOCATION_KEY,
  readDeliveryLocationDraft,
} from '@/lib/delivery-location';
import { geocodeAddress, reverseGeocode } from '@/services/geocoding/google';
import type { DeliveryLocationDraft, GeocodeResult } from '@/types/location';

const ICONS = {
  close: '/assets/icons/x-close.svg',
  marker: '/assets/icons/marker-pin.svg',
} as const;

const CLOSE_ICON_SIZE = 24;

type LocationModalProps = {
  open: boolean;
  onClose: () => void;
  useCurrentLocationOnOpen?: boolean;
  contactPhone?: string;
  onPhoneSave?: (phone: string) => void;
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

export const LocationModal = ({
  open,
  onClose,
  useCurrentLocationOnOpen = false,
  contactPhone,
  onPhoneSave,
}: LocationModalProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const requestId = useRef(0);
  const busyRef = useRef(false);

  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [addressDetailError, setAddressDetailError] = useState('');
  const [geo, setGeo] = useState<GeocodeResult | null>(null);
  const [localError, setLocalError] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const isBusy = isGeocoding || isSaving;

  const canDetect = useMemo(
    () => address.trim().length >= 6 && !isBusy,
    [address, isBusy]
  );

  const canSave = address.trim().length >= 10 && !isBusy;

  const detectCurrentLocation = useCallback(async () => {
    if (busyRef.current) return;
    if (!navigator.geolocation) {
      setLocalError('Location is unavailable in this browser. Enter your address manually.');
      return;
    }
    busyRef.current = true;
    const id = ++requestId.current;
    setIsGeocoding(true);
    setLocalError('');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 12000,
          maximumAge: 0,
          enableHighAccuracy: true,
        });
      });
      if (id !== requestId.current) return;
      const result = await reverseGeocode(
        position.coords.latitude, position.coords.longitude
      );
      if (id !== requestId.current) return;
      setGeo(result);
      setAddress(result.formattedAddress);
      setAddressDetail('');
    } catch (err) {
      if (id !== requestId.current) return;
      const denied = typeof err === 'object' && err !== null &&
        'code' in err && err.code === 1;
      setLocalError(denied
        ? 'Location permission was denied. Enter your address manually.'
        : 'Could not find your current address. Try again or enter it manually.');
    } finally {
      if (id === requestId.current) {
        busyRef.current = false;
        setIsGeocoding(false);
      }
    }
  }, []);

  const safeClose = useCallback(() => {
    if (isSaving) return;
    // Permission prompts may remain unanswered; cancellation must stay available.
    requestId.current += 1;
    busyRef.current = false;
    setIsGeocoding(false);
    onClose();
  }, [isSaving, onClose]);

  useEffect(() => {
    if (!open) return;
    const unlock = lockBodyScroll();
    const previousFocus = document.activeElement;

    // Focus after paint, safer on mobile sheets
    requestAnimationFrame(() => closeBtnRef.current?.focus());

    return () => {
      unlock();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
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
    const draft = readDeliveryLocationDraft();
    setAddress(draft?.formattedAddress ?? '');
    setAddressDetail(draft?.addressDetail ?? '');
    setAddressDetailError('');
    setGeo(
      draft && draft.latitude !== undefined && draft.longitude !== undefined
        ? { formattedAddress: draft.formattedAddress, latitude: draft.latitude, longitude: draft.longitude }
        : null
    );
    setLocalError('');
    setIsGeocoding(false);
    setIsSaving(false);
    setPhone(contactPhone ?? '');
    setPhoneError('');
    busyRef.current = false;
    if (useCurrentLocationOnOpen) void detectCurrentLocation();
    return () => {
      requestId.current += 1;
      busyRef.current = false;
    };
  }, [open, contactPhone, useCurrentLocationOnOpen, detectCurrentLocation]);

  const handleDetect = async () => {
    if (busyRef.current) return;
    setLocalError('');
    setGeo(null);

    const trimmed = address.trim();
    if (trimmed.length < 6) {
      setLocalError('Please enter a more specific address.');
      return;
    }

    busyRef.current = true;
    const id = ++requestId.current;
    setIsGeocoding(true);
    try {
      const res = await geocodeAddress(trimmed);
      if (id !== requestId.current) return;
      setGeo(res);
      setAddress(res.formattedAddress);
    } catch (err) {
      if (id !== requestId.current) return;
      setLocalError(
        (err instanceof Error ? err.message : 'Failed to detect location.') +
          ' You can still enter and save your address manually.'
      );
    } finally {
      if (id === requestId.current) {
        busyRef.current = false;
        setIsGeocoding(false);
      }
    }
  };

  const handleSave = () => {
    if (busyRef.current) return;
    if (address.trim().length < 10) {
      setLocalError('Please enter a valid delivery address (min 10 characters).');
      return;
    }

    const trimmedAddressDetail = addressDetail.trim();

    if (!trimmedAddressDetail) {
      setAddressDetailError('Address detail is required.');
      return;
    }

    if (contactPhone !== undefined && phone.trim().length < 8) {
      setPhoneError('Phone is required (min 8 characters).');
      return;
    }

    setAddressDetailError('');
    setIsSaving(true);
    busyRef.current = true;

    const draft: DeliveryLocationDraft = {
      formattedAddress: address.trim(),
      addressDetail: trimmedAddressDetail,
      ...(geo ? { latitude: geo.latitude, longitude: geo.longitude } : {}),
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(DELIVERY_LOCATION_KEY, JSON.stringify(draft));
      window.dispatchEvent(new Event(DELIVERY_LOCATION_EVENT));
      onPhoneSave?.(phone.trim());
      onClose();
    } catch {
      setLocalError('Failed to save location.');
    } finally {
      setIsSaving(false);
      busyRef.current = false;
    }
  };

  if (!open) return null;

  return (
    <div
      className={[
        // overlay
        'fixed inset-0 z-70 bg-foreground/40',
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
          'p-4 sm:p-6',
        ].join(' ')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0 flex-1'>
            <h2 className='text-lg font-semibold'>Delivery Address</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              Confirm your delivery destination and address details.
            </p>
          </div>

          <button
            ref={closeBtnRef}
            type='button'
            onClick={safeClose}
            disabled={isSaving}
            aria-label='Close delivery address modal'
            className='grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-background hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-60'
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
          <Button
            type='button'
            variant='neutral'
            className='h-12 w-full rounded-full'
            onClick={detectCurrentLocation}
            disabled={isBusy}
          >
            {isGeocoding ? 'Finding location...' : 'Use Current Location'}
          </Button>
          <label htmlFor='delivery-street-address' className='block text-sm font-medium'>
            Delivery Address
          </label>
          <textarea
            id='delivery-street-address'
            rows={3}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setGeo(null);
              setLocalError('');
            }}
            maxLength={200}
            placeholder='Example: Jl. Ahmad Yani No. 10, Bekasi'
            disabled={isBusy}
            className='w-full min-w-0 resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none focus-visible:border-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-muted-foreground/20 disabled:opacity-60'
          />

          <Button
            variant='neutral'
            className='h-12 w-full rounded-full'
            onClick={handleDetect}
            disabled={!canDetect}
          >
            {isGeocoding ? 'Detecting...' : 'Detect Location'}
          </Button>

          {(
            <div className='space-y-3'>
              {geo && <div className='rounded-2xl border bg-muted/30 p-4 text-sm'>
                <p className='font-semibold'>Location found</p>
                <p className='mt-1 break-words text-muted-foreground'>
                  {geo.formattedAddress}
                </p>
              </div>}

              <div className='space-y-2'>
                <label
                  htmlFor='delivery-address-detail'
                  className='text-sm font-medium'
                >
                  Address Detail
                </label>

                <textarea
                  id='delivery-address-detail'
                  value={addressDetail}
                  onChange={(e) => {
                    setAddressDetail(e.target.value);

                    if (addressDetailError) {
                      setAddressDetailError('');
                    }
                  }}
                  placeholder='House no., block, RT/RW, floor, landmark, etc.'
                  maxLength={250}
                  rows={3}
                  required
                  aria-invalid={Boolean(addressDetailError)}
                  aria-describedby='delivery-address-detail-message'
                  disabled={isBusy}
                  className={[
                    'w-full resize-none rounded-xl border bg-background p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60',
                    addressDetailError
                      ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
                      : 'border-input hover:border-muted-foreground/40 focus:border-muted-foreground/60 focus:ring-2 focus:ring-muted-foreground/20',
                  ].join(' ')}
                />

                {addressDetailError ? (
                  <p
                    id='delivery-address-detail-message'
                    className='text-xs text-destructive'
                  >
                    {addressDetailError}
                  </p>
                ) : (
                  <p
                    id='delivery-address-detail-message'
                    className='text-xs text-muted-foreground'
                  >
                    Required. Add details that help the courier find the exact
                    location.
                  </p>
                )}
              </div>
            </div>
          )}

          {contactPhone !== undefined && (
            <div className='space-y-2'>
              <label htmlFor='delivery-contact-phone' className='text-sm font-medium'>Phone</label>
              <Input
                id='delivery-contact-phone'
                type='tel'
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                disabled={isBusy}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? 'delivery-phone-error' : undefined}
              />
              {phoneError && <p id='delivery-phone-error' className='text-xs text-destructive'>{phoneError}</p>}
            </div>
          )}

          {localError && (
            <p role='alert' className='break-words text-sm text-destructive'>{localError}</p>
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
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
