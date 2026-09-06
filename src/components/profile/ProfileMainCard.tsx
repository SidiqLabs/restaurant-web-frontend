// src/components/profile/ProfileMainCard.tsx
'use client';

import Image from 'next/image';
import * as React from 'react';

import { ProfileForm } from '@/components/profile/ProfileForm';
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/types/auth';

type ProfileMainCardProps = {
  user: AuthUser;
};

const isLikelyAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const getInitial = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'G';
  return trimmed.slice(0, 1).toUpperCase();
};

// Keep tokens, avoid hardcoded white.
// Also keep styling consistent with other cards (ProfileSidebar already uses bg-card + border)
const CARD = 'w-full max-w-full rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6';

export const ProfileMainCard = ({
  user,
}: ProfileMainCardProps) => {
  const [isEditing, setIsEditing] = React.useState(false);

  const displayName = user.name?.trim() ? user.name : 'User';

  const avatarRaw = user.avatar ?? '';
  const avatarUrl =
    typeof avatarRaw === 'string' &&
    avatarRaw.trim() &&
    isLikelyAbsoluteUrl(avatarRaw)
      ? avatarRaw
      : null;

  return (
    <section className='min-w-0 w-full'>
      <h1 className='mb-4 text-2xl font-semibold text-foreground'>Profile</h1>

      <div className={CARD}>
        {!isEditing ? (
          <>
            <div className='grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-4'>
              <div className='relative h-12 w-12 overflow-hidden sm:h-14 sm:w-14 rounded-full bg-muted'>
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt='User avatar'
                    fill
                    sizes='(min-width: 640px) 56px, 48px'
                    className='object-cover'
                  />
                ) : (
                  <div className='grid h-full w-full place-items-center text-sm font-semibold text-muted-foreground'>
                    {getInitial(displayName)}
                  </div>
                )}
              </div>

              <div className='min-w-0'>
                <ProfileInfoRow label='Name' value={displayName} />
                <div className='h-px w-full bg-muted' />
                <ProfileInfoRow label='Email' value={user.email} />
                <div className='h-px w-full bg-muted' />
                <ProfileInfoRow label='Nomor Handphone' value={user.phone} />
              </div>
            </div>


            <Button
              type='button'
              className={cn(
                'mt-6 h-12 w-full rounded-full text-sm font-semibold'
              )}
              onClick={() => setIsEditing(true)}
            >
              Update Profile
            </Button>
          </>
        ) : (
          <ProfileForm
            // Force a fresh form instance when entering edit mode.
            // This prevents stale file input state (common avatar upload pitfall).
            key={`profile-form-${user.id}-${user.createdAt}`}
            user={user}
            onCancelAction={() => setIsEditing(false)}
            onSuccessAction={() => setIsEditing(false)}
          />
        )}
      </div>
    </section>
  );
};
