import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * formatCurrencyIDR
 * - "currency formatter" (pemformat mata uang)
 * - Gunakan ini untuk semua tampilan harga agar konsisten
 */
export function formatCurrencyIDR(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

const INTERNAL_REDIRECT_BASE_URL = 'https://foody.local';

export const getSafeInternalRedirectPath = (
  value: string | null | undefined,
  fallback = '/'
): string => {
  const safeFallback =
    fallback.startsWith('/') && !fallback.startsWith('//') ? fallback : '/';

  if (!value) return safeFallback;

  const redirectPath = value.trim();

  if (
    !redirectPath.startsWith('/') ||
    redirectPath.startsWith('//') ||
    redirectPath.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(redirectPath)
  ) {
    return safeFallback;
  }

  try {
    const parsed = new URL(redirectPath, INTERNAL_REDIRECT_BASE_URL);
    const internalPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (parsed.origin !== INTERNAL_REDIRECT_BASE_URL) return safeFallback;
    if (parsed.pathname === '/auth/login') return safeFallback;
    if (parsed.pathname === '/auth/register') return safeFallback;

    return internalPath || safeFallback;
  } catch {
    return safeFallback;
  }
};

export const buildLoginRedirectHref = (targetPath: string): string =>
  '/auth/login?redirect=' + encodeURIComponent(
    getSafeInternalRedirectPath(targetPath, '/')
  );
