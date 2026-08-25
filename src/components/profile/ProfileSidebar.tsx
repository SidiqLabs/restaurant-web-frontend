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
import { MarkerPinIcon } from '@/components/icons/MarkerPinIcon';
import { cn } from '@/lib/utils';
import { authTokenStorage } from '@/services/api/axios';
import { authQueryKeys } from '@/services/queries/auth';
import { cartQueryKeys } from '@/services/queries/cart';
import type { AuthUser } from '@/types/auth';

type ProfileSidebarProps = {
  user: AuthUser;
  onOpenDeliveryAddressAction: () => void;
};

const ICONS = {
  file: '/assets/icons/file.svg',
  logout: '/assets/icons/arrow-circle.svg',
} as const;

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
  onOpenDeliveryAddressAction,
}: ProfileSidebarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const displayName = user.name?.trim() ? user.name : 'User';

  const avatarRaw = user.avatar ?? '';
  const avatarUrl =
    avatarRaw && isLikelyAbsoluteUrl(avatarRaw) ? avatarRaw : null;

  const hasLocation =
    typeof user.latitude === 'number' &&
    typeof user.longitude === 'number' &&
    Number.isFinite(user.latitude) &&
    Number.isFinite(user.longitude) &&
    !(user.latitude === 0 && user.longitude === 0);

  // Active state from URL param (?focus=delivery)
  const focus = searchParams.get(FOCUS_PARAM);
  const isDeliveryActive = focus === FOCUS_DELIVERY;

  const setFocusDelivery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(FOCUS_PARAM, FOCUS_DELIVERY);
    router.replace(`/profile?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleOpenDelivery = useCallback(() => {
    // Keep existing behavior (open modal), and ensure highlight becomes active.
    onOpenDeliveryAddressAction();
    setFocusDelivery();
  }, [onOpenDeliveryAddressAction, setFocusDelivery]);

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
      <MarkerPinIcon
        className={cn(
          'h-5 w-5',
          isDeliveryActive ? 'text-primary' : 'text-foreground'
        )}
        aria-hidden
      />
    );

    const deliveryEndAdornment = hasLocation ? (
      <MarkerPinIcon
        className={cn(
          'h-[18px] w-[18px]',
          isDeliveryActive ? 'text-primary' : 'text-muted-foreground'
        )}
        aria-hidden
      />
    ) : null;

    return [
      {
        key: 'delivery',
        label: 'Delivery Address',
        icon: deliveryIcon,
        onClick: handleOpenDelivery,
        isActive: isDeliveryActive,
        endAdornment: deliveryEndAdornment,
      },
      {
        key: 'orders',
        label: 'My Orders',
        href: '/orders',
        icon: (
          <Image
            src={ICONS.file}
            alt=''
            width={20}
            height={20}
            aria-hidden='true'
          />
        ),
      },
      {
        key: 'logout',
        label: 'Logout',
        onClick: () => {
          void handleLogout();
        },
        icon: (
          <Image
            src={ICONS.logout}
            alt=''
            width={20}
            height={20}
            aria-hidden='true'
          />
        ),
      },
    ];
  }, [handleLogout, handleOpenDelivery, hasLocation, isDeliveryActive]);

  return (
    <aside className='w-full'>
      <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
        {/* Profile navigation */}
        <Link
          href='/profile'
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-foreground transition-colors',
            'hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'cursor-pointer',
            !isDeliveryActive && 'bg-muted/60'
          )}
          aria-current={!isDeliveryActive ? 'page' : undefined}
          aria-label='Open profile'
        >
          <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted'>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt='User avatar'
                fill
                sizes='40px'
                className='object-cover'
              />
            ) : (
              <div className='grid h-full w-full place-items-center text-xs font-semibold text-muted-foreground'>
                {getInitial(displayName)}
              </div>
            )}
          </div>

          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-semibold text-foreground'>
              {displayName}
            </p>
          </div>
        </Link>

        {/* Navigation (shared) */}
        <AccountSidebarNav items={items} />
      </div>
    </aside>
  );
};
