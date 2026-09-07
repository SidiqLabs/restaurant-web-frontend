// src/components/account/ProfileSidebar.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  AccountSidebarNav,
  type AccountSidebarNavItem,
} from '@/components/account/AccountSidebarNav';
import { ArrowCircleIcon } from '@/components/icons/ArrowCircleIcon';
import { FileIcon } from '@/components/icons/FileIcon';
import { MarkerPinIcon } from '@/components/icons/MarkerPinIcon';
import { ProfilePhotoPreviewDialog } from '@/components/profile/ProfilePhotoPreviewDialog';
import { cn } from '@/lib/utils';
import { authTokenStorage } from '@/services/api/axios';
import { authQueryKeys } from '@/services/queries/auth';
import { cartQueryKeys } from '@/services/queries/cart';
import type { AuthUser } from '@/types/auth';

type ProfileSidebarProps = {
  user: AuthUser;
  hasDeliveryLocation: boolean;
};

const isLikelyAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const getInitial = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'G';
  return trimmed.slice(0, 1).toUpperCase();
};

const FOCUS_PARAM = 'focus';
const FOCUS_DELIVERY = 'delivery';

export const ProfileSidebar = ({
  user,
  hasDeliveryLocation,
}: ProfileSidebarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const displayName = user.name?.trim() ? user.name : 'User';

  const avatarRaw = user.avatar ?? '';
  const avatarUrl =
    avatarRaw && isLikelyAbsoluteUrl(avatarRaw) ? avatarRaw : null;

  const hasLocation = hasDeliveryLocation;

  // Active state from URL param (?focus=delivery)
  const focus = searchParams.get(FOCUS_PARAM);
  const isDeliveryActive = focus === FOCUS_DELIVERY;
  const isProfileActive = !isDeliveryActive;

  const setFocusDelivery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(FOCUS_PARAM, FOCUS_DELIVERY);
    router.replace(`/profile?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleLogout = useCallback(async () => {
    // 1) Clear React Query caches that relate to auth/user/cart
    await queryClient.cancelQueries({ queryKey: authQueryKeys.profile });
    queryClient.setQueryData(authQueryKeys.profile, undefined);
    queryClient.removeQueries({ queryKey: authQueryKeys.profile });

    await queryClient.cancelQueries({ queryKey: cartQueryKeys.all });
    queryClient.setQueryData(cartQueryKeys.all, undefined);
    queryClient.removeQueries({ queryKey: cartQueryKeys.all });

    // 2) Clear token
    authTokenStorage.clear();

    // 3) Redirect
    router.replace('/auth/login');
  }, [queryClient, router]);

  const items = useMemo<AccountSidebarNavItem[]>(() => {
    const deliveryIcon = (
      <MarkerPinIcon className='h-5 w-5' aria-hidden />
    );
    return [
      {
        key: 'delivery',
        label: 'Delivery Address',
        icon: deliveryIcon,
        onClick: setFocusDelivery,
        isActive: isDeliveryActive,
      },
      {
        key: 'orders',
        label: 'My Orders',
        href: '/orders',
        icon: <FileIcon className='h-5 w-5' aria-hidden />,
      },
      {
        key: 'logout',
        label: 'Logout',
        onClick: () => {
          void handleLogout();
        },
        icon: <ArrowCircleIcon className='h-5 w-5' aria-hidden />,
      },
    ];
  }, [handleLogout, setFocusDelivery, hasLocation, isDeliveryActive]);

  return (
    <aside className='w-full'>
      <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
        {/* Profile navigation */}
        <div
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium leading-5 transition-colors',
            isProfileActive
              ? 'bg-nav-active text-nav-active-foreground font-semibold hover:bg-nav-active'
              : 'text-foreground hover:bg-nav-hover'
          )}
        >
          {avatarUrl ? (
            <ProfilePhotoPreviewDialog
              src={avatarUrl}
              alt={`${displayName} profile photo`}
            >
              <button
                type='button'
                className={cn(
                  'relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted',
                  'cursor-pointer transition-opacity hover:opacity-90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
                aria-label='Preview profile photo'
              >
                <Image
                  src={avatarUrl}
                  alt=''
                  aria-hidden='true'
                  fill
                  sizes='40px'
                  className='object-cover'
                />
              </button>
            </ProfilePhotoPreviewDialog>
          ) : (
            <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted'>
              <div className='grid h-full w-full place-items-center text-sm font-semibold text-muted-foreground'>
                {getInitial(displayName)}
              </div>
            </div>
          )}

          <Link
            href='/profile'
            className={cn(
              'min-w-0 flex-1 rounded-md text-current',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
            aria-current={isProfileActive ? 'page' : undefined}
            aria-label='Open profile'
          >
            <p className='truncate text-sm font-semibold text-current'>
              {displayName}
            </p>
          </Link>
        </div>

        {/* Navigation (shared) */}
        <AccountSidebarNav items={items} />
      </div>
    </aside>
  );
};
