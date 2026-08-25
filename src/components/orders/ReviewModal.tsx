// src/components/orders/ReviewModal.tsx
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ReviewStarIcon from '@/components/icons/ReviewStarIcon';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/services/queries/auth';
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useUpdateReviewMutation,
} from '@/services/queries/reviews';
import type { MyReviewItem } from '@/types/review';

const ICONS = {
  close: '/assets/icons/x-close.svg',
} as const;

const CLOSE_ICON_SIZE = 24;

// Modal star sizing: keep the same button hit area (h-10 w-10),
// but standardize icon size via a single tokenized class.
const MODAL_STAR_SIZE_CLASS = 'h-[20px] w-[20px]';

type ReviewModalProps = {
  open: boolean;
  onClose: () => void;

  transactionId: string;
  restaurantId: number;
  restaurantName?: string;
  menuIds: number[];

  // if exists => edit mode
  existingReview?: MyReviewItem | null;
  remainingReviewCount?: number;
  onReviewSubmitted?: () => void;
  onReviewNext?: () => void;
};

type SubmittedReview = {
  id?: number;
  restaurantId: number;
  restaurantName: string;
  star: number;
  comment: string;
};

const clampStar = (v: number) => Math.max(0, Math.min(5, v));

const getFocusable = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(',')));
};

const lockBodyScroll = () => {
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = prev;
  };
};

const ReviewStars = ({ value }: { value: number }) => {
  const safeValue = clampStar(value);

  return (
    <div
      className='flex items-center justify-center gap-1.5'
      aria-label={`Rating ${safeValue} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const active = i < safeValue;

        return (
          <ReviewStarIcon
            key={i}
            aria-hidden='true'
            className={cn(
              MODAL_STAR_SIZE_CLASS,
              active ? 'text-star' : 'text-muted-foreground'
            )}
          />
        );
      })}
    </div>
  );
};

const ReviewModal = ({
  open,
  onClose,
  transactionId,
  restaurantId,
  restaurantName,
  menuIds,
  existingReview,
  remainingReviewCount = 0,
  onReviewSubmitted,
  onReviewNext,
}: ReviewModalProps) => {
  const router = useRouter();
  const isEditMode = Boolean(existingReview?.id);

  // IMPORTANT:
  // Modal is expected to be remounted via key in parent when opening,
  // so initializers are safe and avoid "setState in effect" lint drama.
  const [selectedStar, setSelectedStar] = useState<number>(
    existingReview?.star ?? 0
  );
  const [hoverStar, setHoverStar] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment ?? '');
  const [localError, setLocalError] = useState<string>('');
  const [submittedReview, setSubmittedReview] =
    useState<SubmittedReview | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const createReview = useCreateReviewMutation();
  const updateReview = useUpdateReviewMutation();
  const deleteReview = useDeleteReviewMutation();

  const isSubmitting =
    createReview.isPending || updateReview.isPending || deleteReview.isPending;

  const previewStar = clampStar(hoverStar || selectedStar);
  const hasRemainingReviews = remainingReviewCount > 0 && Boolean(onReviewNext);

  const canSubmit = useMemo(() => {
    const hasStar = selectedStar >= 1 && selectedStar <= 5;
    const hasComment = comment.trim().length > 0;
    const hasMenus = Array.isArray(menuIds) && menuIds.length > 0;
    return hasStar && hasComment && hasMenus && !isSubmitting;
  }, [selectedStar, comment, menuIds, isSubmitting]);

  const safeClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  // body scroll lock + initial focus
  useEffect(() => {
    if (!open) return;

    const unlock = lockBodyScroll();
    window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    return unlock;
  }, [open]);

  // Escape + minimal focus trap
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        safeClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const root = dialogRef.current;
      const focusables = getFocusable(root);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || active === root) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, safeClose]);

  const handleOverlayMouseDown = () => {
    safeClose();
  };

  const setHover = (value: number) => setHoverStar(clampStar(value));

  const handleViewReview = () => {
    if (!submittedReview) return;

    router.push(`/resto/${submittedReview.restaurantId}#reviews`);
    onClose();
  };

  const handleSubmit = async () => {
    setLocalError('');

    if (selectedStar < 1 || selectedStar > 5) {
      setLocalError('Please select a rating (1-5).');
      return;
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      setLocalError('Please write a short comment.');
      return;
    }

    if (!menuIds.length) {
      setLocalError('No menu items found for this transaction.');
      return;
    }

    try {
      if (isEditMode && existingReview?.id) {
        await updateReview.mutateAsync({
          id: existingReview.id,
          payload: { star: selectedStar, comment: trimmed },
        });
        onClose();
        return;
      }

      const res = await createReview.mutateAsync({
        transactionId,
        restaurantId,
        star: selectedStar,
        comment: trimmed,
        menuIds,
      });

      const review = res.data.review;
      setSubmittedReview({
        id: review.id,
        restaurantId,
        restaurantName:
          review.restaurant?.name ?? restaurantName ?? 'Restaurant',
        star: review.star ?? selectedStar,
        comment: review.comment ?? trimmed,
      });
      onReviewSubmitted?.();
    } catch (err) {
      setLocalError(getApiErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!existingReview?.id) return;

    setLocalError('');

    // minimal confirm, no fancy dialog dulu
    const ok = window.confirm('Delete this review?');
    if (!ok) return;

    try {
      await deleteReview.mutateAsync(existingReview.id);
      onClose();
    } catch (err) {
      setLocalError(getApiErrorMessage(err));
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center px-4',
        'bg-foreground/40'
      )}
      role='dialog'
      aria-modal='true'
      aria-label={submittedReview ? 'Review Submitted' : 'Write a Review'}
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={dialogRef}
        className={cn(
          'w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm',
          'max-h-[calc(100vh-32px)] overflow-y-auto outline-none'
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <div className='text-lg font-semibold text-foreground'>
              {submittedReview
                ? 'Review Submitted'
                : isEditMode
                  ? 'Edit Review'
                  : 'Give Review'}
            </div>
            {restaurantName && !submittedReview ? (
              <p className='mt-1 truncate text-sm text-muted-foreground'>
                {restaurantName}
              </p>
            ) : null}
          </div>

          <button
            ref={closeBtnRef}
            type='button'
            onClick={safeClose}
            disabled={isSubmitting}
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full border bg-background',
              'hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSubmitting ? 'opacity-60' : ''
            )}
            aria-label='Close'
          >
            <Image
              src={ICONS.close}
              alt=''
              aria-hidden='true'
              width={CLOSE_ICON_SIZE}
              height={CLOSE_ICON_SIZE}
            />
          </button>
        </div>

        {submittedReview ? (
          <div className='mt-5 space-y-5'>
            <div className='rounded-2xl border bg-background p-4 text-center'>
              <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground'>
                ✓
              </div>
              <p className='mt-3 text-sm font-medium text-muted-foreground'>
                Your review has been submitted.
              </p>
            </div>

            <div className='rounded-2xl border bg-background p-4'>
              <p className='break-words text-center text-base font-semibold text-foreground'>
                {submittedReview.restaurantName}
              </p>

              <div className='mt-3'>
                <ReviewStars value={submittedReview.star} />
              </div>

              <p className='mt-4 break-words rounded-xl bg-card p-3 text-sm leading-relaxed text-foreground'>
                "{submittedReview.comment}"
              </p>
            </div>

            <p className='text-center text-sm text-muted-foreground'>
              {hasRemainingReviews
                ? `${remainingReviewCount} restaurant${
                    remainingReviewCount === 1 ? '' : 's'
                  } remaining`
                : 'All available reviews completed'}
            </p>

            <div className='flex flex-col gap-3'>
              {hasRemainingReviews ? (
                <button
                  type='button'
                  onClick={onReviewNext}
                  className={cn(
                    'h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground',
                    'hover:opacity-90 active:opacity-95',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  Review Next
                </button>
              ) : null}

              <button
                type='button'
                onClick={handleViewReview}
                className={cn(
                  'h-12 w-full rounded-full text-sm font-semibold',
                  hasRemainingReviews
                    ? 'border bg-background text-foreground hover:bg-muted'
                    : 'bg-primary text-primary-foreground hover:opacity-90 active:opacity-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                View Review
              </button>

              {!hasRemainingReviews ? (
                <button
                  type='button'
                  onClick={safeClose}
                  className={cn(
                    'h-12 w-full rounded-full border bg-background text-sm font-semibold text-foreground',
                    'hover:bg-muted',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  Back to My Orders
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {/* Rating */}
            <div className='mt-5 text-center'>
              <div className='text-sm font-semibold text-foreground'>
                Give Rating
              </div>

              <div className='mt-3 flex items-center justify-center gap-3'>
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1;
                  const active = starValue <= previewStar;

                  return (
                    <button
                      key={starValue}
                      type='button'
                      disabled={isSubmitting}
                      onClick={() => setSelectedStar(starValue)}
                      onMouseEnter={() => setHover(starValue)}
                      onMouseLeave={() => setHover(0)}
                      className={cn(
                        'grid h-10 w-10 place-items-center rounded-full',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isSubmitting ? 'opacity-70' : 'hover:bg-muted'
                      )}
                      aria-label={`${starValue} star`}
                      aria-pressed={selectedStar === starValue}
                    >
                      <ReviewStarIcon
                        aria-hidden='true'
                        className={cn(
                          MODAL_STAR_SIZE_CLASS,
                          active ? 'text-star' : 'text-muted-foreground'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div className='mt-5'>
              <label className='sr-only' htmlFor='review-comment'>
                Review comment
              </label>
              <textarea
                id='review-comment'
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder='Please share your thoughts about our service!'
                disabled={isSubmitting}
                className={cn(
                  'min-h-35 w-full resize-none rounded-2xl border bg-background p-4 text-sm text-foreground',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              />
            </div>

            {/* Error */}
            {localError ? (
              <p className='mt-3 text-sm text-destructive' aria-live='polite'>
                {localError}
              </p>
            ) : null}

            {/* Footer */}
            <div className='mt-5 flex flex-col gap-3'>
              <button
                type='button'
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground',
                  'hover:opacity-90 active:opacity-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  !canSubmit ? 'opacity-60' : ''
                )}
              >
                {isSubmitting ? 'Sending...' : isEditMode ? 'Update' : 'Send'}
              </button>

              {isEditMode ? (
                <button
                  type='button'
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className={cn(
                    'h-12 w-full rounded-full border bg-background text-sm font-semibold text-foreground',
                    'hover:bg-muted',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSubmitting ? 'opacity-60' : ''
                  )}
                >
                  Delete Review
                </button>
              ) : null}

              <button
                type='button'
                onClick={safeClose}
                disabled={isSubmitting}
                className={cn(
                  'h-12 w-full rounded-full border bg-background text-sm font-semibold text-foreground',
                  'hover:bg-muted',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSubmitting ? 'opacity-60' : ''
                )}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
