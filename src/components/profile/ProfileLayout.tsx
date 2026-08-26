// src/components/profile/ProfileLayout.tsx
'use client';

import { useEffect, useState } from 'react';

import { LocationModal } from '@/components/profile/LocationModal';
import { ProfileMainCard } from '@/components/profile/ProfileMainCard';
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import {
  DELIVERY_LOCATION_EVENT,
  readDeliveryLocationDraft,
} from '@/lib/delivery-location';
import type { AuthUser } from '@/types/auth';
import type { DeliveryLocationDraft } from '@/types/location';

type ProfileLayoutProps = {
  user: AuthUser;
};

export const ProfileLayout = ({ user }: ProfileLayoutProps) => {
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] =
    useState<DeliveryLocationDraft | null>(null);

  useEffect(() => {
    const syncDeliveryLocation = () => {
      setDeliveryLocation(readDeliveryLocationDraft());
    };

    syncDeliveryLocation();

    window.addEventListener(
      DELIVERY_LOCATION_EVENT,
      syncDeliveryLocation
    );

    return () => {
      window.removeEventListener(
        DELIVERY_LOCATION_EVENT,
        syncDeliveryLocation
      );
    };
  }, []);

  return (
    <div className='w-full bg-background'>
      <div className='mx-auto w-full max-w-360 px-4 sm:px-6 md:px-10 lg:px-16 xl:px-30'>
        <div className='pt-8 lg:pt-12'>
          <div className='grid min-w-0 gap-6 xl:gap-8 xl:grid-cols-[240px_minmax(0,524px)_minmax(0,1fr)] xl:items-start'>
            <div className='hidden xl:block'>
              <ProfileSidebar
                user={user}
                onOpenDeliveryAddressAction={() => setIsDeliveryModalOpen(true)}
              />
            </div>

            <ProfileMainCard
              user={user}
              deliveryLocation={deliveryLocation}
              onOpenDeliveryAddressAction={() =>
                setIsDeliveryModalOpen(true)
              }
            />

            <div className='hidden xl:block' aria-hidden='true' />
          </div>

          <div className='h-16' />
        </div>
      </div>

      <LocationModal
        open={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />
    </div>
  );
};
