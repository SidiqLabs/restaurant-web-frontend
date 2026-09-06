import * as React from 'react';

type ArrowCircleIconProps = React.SVGProps<SVGSVGElement>;

export const ArrowCircleIcon = ({
  className,
  ...props
}: ArrowCircleIconProps) => {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      {...props}
    >
      <path
        d='M20.6622 17C18.9331 19.989 15.7014 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C15.7014 2 18.9331 4.01099 20.6622 7M12.0001 8L8.00007 12M8.00007 12L12.0001 16M8.00007 12H22.0001'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
};
