'use client';

import { Check, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

type SelectionCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  className?: string;
};

const SelectionCheckbox = ({
  checked,
  indeterminate = false,
  disabled = false,
  onCheckedChange,
  ariaLabel,
  className,
}: SelectionCheckboxProps) => {
  const isActive = checked || indeterminate;

  return (
    <button
      type='button'
      role='checkbox'
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(indeterminate ? true : !checked)}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border',
        'transition-[background-color,border-color,box-shadow,opacity] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        isActive
          ? 'border-primary bg-primary text-primary-foreground hover:opacity-90'
          : 'border-border bg-card text-transparent hover:border-primary/40 hover:bg-[var(--interaction-hover)]',
        className
      )}
    >
      {indeterminate ? (
        <Minus className='h-4 w-4' strokeWidth={3} aria-hidden='true' />
      ) : checked ? (
        <Check className='h-4 w-4' strokeWidth={3} aria-hidden='true' />
      ) : null}
    </button>
  );
};

export default SelectionCheckbox;
