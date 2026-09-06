// src/components/account/AccountSidebarNav.tsx
'use client';

import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

type NavItemBase = {
  key: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;

  /**
   * Optional right-side adornment (e.g. a subtle status icon).
   * Pure UI only: it will be rendered as-is.
   */
  endAdornment?: React.ReactNode;
};

type NavItemHref = NavItemBase & {
  href: string;
  onClick?: never;
};

type NavItemAction = NavItemBase & {
  onClick: () => void;
  href?: never;
};

export type AccountSidebarNavItem = NavItemHref | NavItemAction;

type AccountSidebarNavProps = {
  items: AccountSidebarNavItem[];
};

const ITEM_BASE = cn(
  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium leading-5 transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'cursor-pointer'
);

const ITEM_INACTIVE = 'text-foreground hover:bg-muted';
const ITEM_ACTIVE = 'bg-accent text-primary font-semibold hover:bg-accent';
const ICON_SLOT = cn(
  'grid h-5 w-5 shrink-0 place-items-center text-current',
  '[&>img]:h-5 [&>img]:w-5 [&>svg]:h-5 [&>svg]:w-5'
);

const isHrefItem = (item: AccountSidebarNavItem): item is NavItemHref => {
  return typeof (item as NavItemHref).href === 'string';
};

export const AccountSidebarNav = ({ items }: AccountSidebarNavProps) => {
  return (
    <nav className='mt-5 space-y-2'>
      {items.map((item) => {
        const className = cn(
          ITEM_BASE,
          item.isActive ? ITEM_ACTIVE : ITEM_INACTIVE
        );

        const content = (
          <>
            <span className={ICON_SLOT} aria-hidden='true'>
              {item.icon}
            </span>
            <span className='min-w-0 flex-1 truncate'>{item.label}</span>
            {item.endAdornment ? (
              <span className={ICON_SLOT} aria-hidden='true'>
                {item.endAdornment}
              </span>
            ) : null}
          </>
        );

        if (isHrefItem(item)) {
          return (
            <Link
              key={item.key}
              href={item.href}
              className={className}
              aria-current={item.isActive ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type='button'
            onClick={item.onClick}
            className={className}
            aria-current={item.isActive ? 'page' : undefined}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
};
