// src/components/common/ShowMoreButton.tsx
'use client';

type NewShapeProps = {
  //  Dipakai oleh HomeClient/MenuSection/ReviewSection/SearchClient (versi yang kamu pakai)
  canShowMore: boolean;
  isLoadingMore: boolean;
  onClickAction: () => void;
  onUnavailableAction?: () => void;
};

type LegacyShapeProps = {
  //  Backward compatible, if ada pemakaian lama
  label: string;
  description?: string;
  onClickAction: () => void;
  disabled?: boolean;
};

type ShowMoreButtonProps = NewShapeProps | LegacyShapeProps;

const ShowMoreButton = (props: ShowMoreButtonProps) => {
  const isNewShape = 'canShowMore' in props;

  const label = isNewShape ? 'Show More' : props.label;

  const unavailableWithFeedback =
    isNewShape &&
    !props.canShowMore &&
    !props.isLoadingMore &&
    Boolean(props.onUnavailableAction);

  const nativeDisabled = isNewShape
    ? props.isLoadingMore || (!props.canShowMore && !unavailableWithFeedback)
    : Boolean(props.disabled);

  const handleClick = () => {
    if (unavailableWithFeedback) {
      props.onUnavailableAction?.();
      return;
    }

    if (nativeDisabled) return;
    props.onClickAction();
  };

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={nativeDisabled}
      aria-disabled={unavailableWithFeedback || undefined}
      aria-label={label}
      className={[
        //  Figma: tombol kecil, centered, pill
        'inline-flex items-center justify-center',
        'rounded-full border bg-card',
        'px-8 py-3 text-sm font-semibold',
        'shadow-sm transition',
        'hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
      ].join(' ')}
    >
      {isNewShape && props.isLoadingMore ? 'Loading...' : label}
    </button>
  );
};

//  IMPORTANT: export keduanya, supaya semua import gaya lama tetap jalan.
export { ShowMoreButton };
export default ShowMoreButton;
