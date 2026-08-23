// src/app/profile/page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileLayout } from '@/components/profile/ProfileLayout';
import { useProfileQuery } from '@/services/queries/auth';

const PAGE_WRAP =
  'mx-auto w-full max-w-360 px-6 pt-12 md:px-10 lg:px-16 xl:px-30';
const CARD = 'rounded-2xl bg-white p-6 shadow-sm';

const ProfileContent = () => {
  const { data: profile, isLoading, isError } = useProfileQuery();
  const user = profile?.data;

  // Prevent hydration mismatch.
  // - On server: query is disabled (no window/token) => user is undefined.
  // - Treat "no user yet" as loading unless we explicitly have an error.
  const shouldShowLoading = isLoading || (!isError && !user);

  if (shouldShowLoading) {
    return (
      <div className={PAGE_WRAP}>
        <div className={CARD}>Loading...</div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className={PAGE_WRAP}>
        <div className={CARD}>Failed to load profile.</div>
      </div>
    );
  }

  return <ProfileLayout user={user} />;
};

const ProfilePage = () => {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
};

export default ProfilePage;
