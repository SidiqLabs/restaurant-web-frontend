import Image from 'next/image';

import {
  QTY_ICON_ADD,
  QTY_ICON_MINUS,
  QTY_ICON_SIZE,
} from '@/components/icons/qty';
import { cn, formatCurrencyIDR } from '@/lib/utils';
import type { CartItem } from '@/types/cart';

type CartItemRowProps = {
  item: CartItem;
  disabled?: boolean;

  onDecrease: () => void;
  onIncrease: () => void;

  // UI-only (optional): show subtle pending indicator on buttons
  isUpdating?: boolean;
};

const QTY_BTN_BASE =
  'inline-flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9';
const QTY_BTN_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const CartItemRow = ({
  item,
  disabled = false,
  onDecrease,
  onIncrease,
  isUpdating = false,
}: CartItemRowProps) => {

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 rounded-2xl px-2 py-3 sm:gap-3 sm:px-3',
        'hover:bg-muted/40',
        'focus-within:bg-muted/40'
      )}
    >
      <Image
        src={item.menu.image}
        alt={item.menu.foodName}
        width={56}
        height={56}
        className='h-12 w-12 flex-none rounded-xl bg-muted object-cover sm:h-14 sm:w-14'
      />

      <div className='min-w-0 flex-1 overflow-hidden'>
        <p className='whitespace-normal break-words text-sm font-semibold leading-snug sm:truncate'>
          {item.menu.foodName}
        </p>
        <p className='mt-0.5 truncate text-xs text-muted-foreground'>
          {formatCurrencyIDR(item.menu.price)}
        </p>
      </div>

      {/* Qty control (match Checkout icon + sizing) */}
      <div className='flex shrink-0 items-center gap-1.5 sm:gap-2'>
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onDecrease();
          }}
          disabled={disabled}
          className={cn(
            QTY_BTN_BASE,
            'border bg-card hover:bg-muted disabled:opacity-60',
            QTY_BTN_FOCUS
          )}
          aria-label='Decrease quantity'
          title='Decrease'
        >
          {isUpdating ? (
            ''
          ) : (
            <Image
              src={QTY_ICON_MINUS}
              alt=''
              aria-hidden='true'
              width={QTY_ICON_SIZE}
              height={QTY_ICON_SIZE}
            />
          )}
        </button>

        <span className='min-w-5 text-center text-sm font-semibold sm:min-w-6'>
          {item.quantity}
        </span>

        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onIncrease();
          }}
          disabled={disabled}
          className={cn(
            QTY_BTN_BASE,
            'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60',
            QTY_BTN_FOCUS
          )}
          aria-label='Increase quantity'
          title='Increase'
        >
          {isUpdating ? (
            ''
          ) : (
            <Image
              src={QTY_ICON_ADD}
              alt=''
              aria-hidden='true'
              width={QTY_ICON_SIZE}
              height={QTY_ICON_SIZE}
            />
          )}
        </button>
      </div>

      {/* Item total (right) */}
      <div className='hidden text-sm font-semibold sm:block'>
        {formatCurrencyIDR(item.itemTotal)}
      </div>


    </div>
  );
};

export default CartItemRow;
