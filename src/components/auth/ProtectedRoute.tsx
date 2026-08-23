'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { buildLoginRedirectHref } from '@/lib/utils';
import { AUTH_TOKEN_EVENT, authTokenStorage } from '@/services/api/axios';
import { useProfileQuery } from '@/services/queries/auth';

type ProtectedRouteProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

const PAGE_WRAP =
  'mx-auto w-full max-w-360 px-6 pt-12 md:px-10 lg:px-16 xl:px-30';
const CARD = 'rounded-2xl bg-white p-6 shadow-sm';

const getCurrentInternalPath = () => {
  if (typeof window === 'undefined') return '/';

  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
};

const DefaultProtectedRouteFallback = () => {
  return (
    <div className={PAGE_WRAP}>
      <div className={CARD}>Checking session...</div>
    </div>
  );
};

export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
  const router = useRouter();
  const profileQuery = useProfileQuery();
  const user = profileQuery.data?.data ?? null;

  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTokenState = () => {
      setHasToken(Boolean(authTokenStorage.get()));
      setIsAuthResolved(true);
    };

    syncTokenState();
    window.addEventListener(AUTH_TOKEN_EVENT, syncTokenState);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'access_token') syncTokenState();
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(AUTH_TOKEN_EVENT, syncTokenState);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!isAuthResolved) return;

    if (!hasToken) {
      router.replace(buildLoginRedirectHref(getCurrentInternalPath()));
    }
  }, [hasToken, isAuthResolved, router]);

  useEffect(() => {
    if (!isAuthResolved || !hasToken || !profileQuery.isError) return;

    authTokenStorage.clear();
    router.replace(buildLoginRedirectHref(getCurrentInternalPath()));
  }, [hasToken, isAuthResolved, profileQuery.isError, router]);

  const isCheckingProfile = profileQuery.isLoading || !user;
  const shouldShowFallback =
    !isAuthResolved ||
    hasToken === false ||
    profileQuery.isError ||
    isCheckingProfile;

  if (shouldShowFallback) {
    return <>{fallback ?? <DefaultProtectedRouteFallback />}</>;
  }

  return <>{children}</>;
};
