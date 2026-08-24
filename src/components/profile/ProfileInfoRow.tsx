type ProfileInfoRowProps = {
  label: string;
  value?: string | null;
};

export const ProfileInfoRow = ({ label, value }: ProfileInfoRowProps) => {
  const displayValue = value && value.trim().length > 0 ? value : '-';

  return (
    <div className='flex min-w-0 flex-col items-start gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
      <span className='shrink-0 text-sm text-muted-foreground'>{label}</span>
      <span className='min-w-0 max-w-full break-words text-left text-sm font-semibold text-foreground sm:flex-1 sm:text-right'>
        {displayValue}
      </span>
    </div>
  );
};
