// src/components/account/OrdersSidebar.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  AccountSidebarNav,
  type AccountSidebarNavItem,
} from '@/components/account/AccountSidebarNav';
import { ArrowCircleIcon } from '@/components/icons/ArrowCircleIcon';
import { FileIcon } from '@/components/icons/FileIcon';
import { MarkerPinIcon } from '@/components/icons/MarkerPinIcon';
import { cn } from '@/lib/utils';
import { authTokenStorage } from '@/services/api/axios';
import { authQueryKeys } from '@/services/queries/auth';
import { cartQueryKeys } from '@/services/queries/cart';

type OrdersSidebarProps = {
  userName?: string;
  avatarUrl?: string | null;
};

const isLikelyAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const getInitial = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'G';
  return trimmed.slice(0, 1).toUpperCase();
};

const FOCUS_DELIVERY_PROFILE_HREF = '/profile?focus=delivery';

const OrdersSidebar = ({
  userName = 'Guest',
  avatarUrl,
}: OrdersSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isOrders = pathname === '/orders';

  const safeAvatar =
    typeof avatarUrl === 'string' && isLikelyAbsoluteUrl(avatarUrl)
      ? avatarUrl
      : null;

  const handleLogout = useCallback(async () => {
    // Match ProfileSidebar behavior: clear caches + token, then redirect.
    await queryClient.cancelQueries({ queryKey: authQueryKeys.profile });
    queryClient.setQueryData(authQueryKeys.profile, undefined);
    queryClient.removeQueries({ queryKey: authQueryKeys.profile });

    await queryClient.cancelQueries({ queryKey: cartQueryKeys.all });
    queryClient.setQueryData(cartQueryKeys.all, undefined);
    queryClient.removeQueries({ queryKey: cartQueryKeys.all });

    authTokenStorage.clear();
    router.replace('/auth/login');
  }, [queryClient, router]);

  const items = useMemo<AccountSidebarNavItem[]>(() => {
    return [
      {
        key: 'delivery',
        label: 'Delivery Address',
        href: FOCUS_DELIVERY_PROFILE_HREF,
        icon: <MarkerPinIcon className='h-5 w-5' aria-hidden />,
      },
      {
        key: 'orders',
        label: 'My Orders',
        href: '/orders',
        isActive: isOrders,
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
  }, [handleLogout, isOrders]);

  return (
    <aside className='w-full'>
      <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
        {/* Profile navigation */}
        <Link
          href='/profile'
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium leading-5 transition-colors',
            'text-foreground hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'cursor-pointer'
          )}
          aria-label='Open profile'
        >
          <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted'>
            {safeAvatar ? (
              <Image
                src={safeAvatar}
                alt={userName}
                fill
                sizes='40px'
                className='object-cover'
              />
            ) : (
              <div className='grid h-full w-full place-items-center text-sm font-semibold text-muted-foreground'>
                {getInitial(userName)}
              </div>
            )}
          </div>

          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-semibold text-current'>{userName}</div>
          </div>
        </Link>

        {/* Menu (shared) */}
        <AccountSidebarNav items={items} />
      </div>
    </aside>
  );
};

export default OrdersSidebar;
