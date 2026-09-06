// src/components/profile/ProfileLayout.tsx
'use client';

import { useSearchParams } from 'next/navigation';

import { useEffect, useState } from 'react';

import { LocationModal } from '@/components/profile/LocationModal';
import { DeliveryAddressCard } from '@/components/profile/DeliveryAddressCard';
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
  const searchParams = useSearchParams();
  const isDeliveryActive = searchParams.get('focus') === 'delivery';

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
      <div className='mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8'>
        <div className='pt-8 lg:pt-12'>
          <div className='grid min-w-0 gap-6 md:grid-cols-[220px_minmax(0,524px)] md:items-start xl:grid-cols-[240px_minmax(0,524px)] xl:gap-8'>
            <div className='hidden md:block'>
              <ProfileSidebar
                user={user}
                hasDeliveryLocation={Boolean(deliveryLocation)}
              />
            </div>

            {isDeliveryActive ? (
              <DeliveryAddressCard
                deliveryLocation={deliveryLocation}
                onOpenDeliveryAddressAction={() =>
                  setIsDeliveryModalOpen(true)
                }
              />
            ) : (
              <ProfileMainCard user={user} />
            )}

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
