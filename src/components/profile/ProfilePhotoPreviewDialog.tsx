'use client';

import Image from 'next/image';
import type { ReactElement } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ICONS = {
  close: '/assets/icons/x-close.svg',
} as const;

const CLOSE_ICON_SIZE = 20;

type ProfilePhotoPreviewDialogProps = {
  src: string;
  alt: string;
  children: ReactElement;
};

export const ProfilePhotoPreviewDialog = ({
  src,
  alt,
  children,
}: ProfilePhotoPreviewDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn(
          'w-[calc(100vw-2rem)] max-w-3xl overflow-hidden rounded-3xl p-0',
          'max-h-[calc(100dvh-2rem)]'
        )}
      >
        <DialogTitle className='sr-only'>Profile photo preview</DialogTitle>

        <div className='relative max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6'>
          <DialogClose asChild>
            <button
              type='button'
              className={cn(
                'absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-border bg-background shadow-sm',
                'transition-colors hover:bg-muted',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-label='Close profile photo preview'
            >
              <Image
                src={ICONS.close}
                alt=''
                aria-hidden='true'
                width={CLOSE_ICON_SIZE}
                height={CLOSE_ICON_SIZE}
              />
            </button>
          </DialogClose>

          <div className='flex items-center justify-center pt-10'>
            <div
              className={cn(
                'relative h-[70dvh] max-h-[calc(100dvh-8rem)] w-full max-w-3xl',
                'min-h-0'
              )}
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes='(min-width: 768px) 768px, calc(100vw - 4rem)'
                className='object-contain'
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
