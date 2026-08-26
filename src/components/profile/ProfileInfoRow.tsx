type ProfileInfoRowProps = {
  label: string;
  value?: string | null;
};

export const ProfileInfoRow = ({ label, value }: ProfileInfoRowProps) => {
  const displayValue = value && value.trim().length > 0 ? value : '-';

  return (
    <div className='flex min-w-0 flex-col items-start gap-1 py-2 xl:flex-row xl:items-center xl:justify-between xl:gap-6'>
      <span className='shrink-0 text-sm text-muted-foreground'>{label}</span>
      <span className='min-w-0 max-w-full break-words text-left text-sm font-semibold text-foreground xl:flex-1 xl:text-right'>
        {displayValue}
      </span>
    </div>
  );
};
