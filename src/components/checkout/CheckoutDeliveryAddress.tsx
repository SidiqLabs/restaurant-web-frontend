'use client';

import Image from 'next/image';
import { useState, type RefObject } from 'react';

import { LocationModal } from '@/components/profile/LocationModal';
import { Button } from '@/components/ui/button';

type CheckoutDeliveryAddressProps = {
  address: string;
  phone: string;
  addressError?: string;
  phoneError?: string;
  disabled: boolean;
  actionRef: RefObject<HTMLButtonElement | null>;
  onPhoneSave: (phone: string) => void;
};

export const CheckoutDeliveryAddress = ({
  address, phone, addressError, phoneError, disabled, actionRef, onPhoneSave,
}: CheckoutDeliveryAddressProps) => {
  const [mode, setMode] = useState<'manual' | 'current' | null>(null);
  const hasAddress = address.trim().length >= 10;

  return (
    <section
      aria-labelledby='checkout-delivery-heading'
      className='min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5'
    >
      <div className='flex items-center gap-2'>
        <Image src='/assets/icons/marker-pin-2.svg' alt='' aria-hidden='true' width={32} height={32} className='shrink-0' />
        <h2 id='checkout-delivery-heading' className='text-sm font-semibold'>Delivery Address</h2>
      </div>
      <div className='mt-3 min-w-0 space-y-2 text-sm'>
        <p className='break-words [overflow-wrap:anywhere]'>
          {hasAddress ? address : 'No delivery address selected'}
        </p>
        <p className='break-words [overflow-wrap:anywhere]'>
          <span className='text-muted-foreground'>Phone: </span>
          {phone.trim() || 'Add a delivery contact number'}
        </p>
        {addressError && <p id='checkout-address-error' role='alert' className='text-xs text-destructive'>{addressError}</p>}
        {phoneError && <p id='checkout-phone-error' role='alert' className='text-xs text-destructive'>{phoneError}</p>}
      </div>
      <div className='mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
        <Button
          ref={actionRef}
          type='button'
          variant={hasAddress ? 'neutral' : 'default'}
          className='min-h-12 w-full rounded-full sm:w-auto'
          disabled={disabled}
          aria-describedby={[addressError && 'checkout-address-error', phoneError && 'checkout-phone-error'].filter(Boolean).join(' ') || undefined}
          onClick={() => setMode('manual')}
        >
          {hasAddress ? 'Change Address' : 'Add Delivery Address'}
        </Button>
        {!hasAddress && (
          <Button
            type='button'
            variant='neutral'
            className='min-h-12 w-full rounded-full sm:w-auto'
            disabled={disabled}
            onClick={() => setMode('current')}
          >
            Use Current Location
          </Button>
        )}
      </div>
      <LocationModal
        open={mode !== null}
        onClose={() => setMode(null)}
        useCurrentLocationOnOpen={mode === 'current'}
        contactPhone={phone}
        onPhoneSave={onPhoneSave}
      />
    </section>
  );
};
