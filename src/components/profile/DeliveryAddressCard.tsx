'use client';

import { Button } from '@/components/ui/button';

import type { DeliveryLocationDraft } from '@/types/location';

type DeliveryAddressCardProps = {
  deliveryLocation: DeliveryLocationDraft | null;
  onOpenDeliveryAddressAction: () => void;
};

export const DeliveryAddressCard = ({
  deliveryLocation,
  onOpenDeliveryAddressAction,
}: DeliveryAddressCardProps) => {
  return (
    <section className='rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6'>
      <h1 className='mb-4 text-2xl font-semibold text-foreground'>
        Delivery Address
      </h1>

      <div className='rounded-xl border border-border bg-background p-4 sm:p-5'>
        <p className='text-sm font-medium text-muted-foreground'>
          Current delivery location
        </p>

        {deliveryLocation ? (
          <div className='mt-3 space-y-2'>
            <p className='break-words text-sm font-medium text-foreground'>
              {deliveryLocation.formattedAddress}
            </p>

            {deliveryLocation.addressDetail ? (
              <p className='break-words text-sm text-muted-foreground'>
                {deliveryLocation.addressDetail}
              </p>
            ) : null}
          </div>
        ) : (
          <p className='mt-3 text-sm text-muted-foreground'>
            No delivery address selected yet.
          </p>
        )}
      </div>

      <Button
        type='button'
        variant='neutral'
        className='mt-6 h-10 rounded-full px-4 text-sm font-medium'
        onClick={onOpenDeliveryAddressAction}
      >
        {deliveryLocation
          ? 'Change Delivery Address'
          : 'Add Delivery Address'}
      </Button>
    </section>
  );
};
