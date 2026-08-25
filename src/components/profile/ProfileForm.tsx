// src/components/profile/ProfileForm.tsx
'use client';

import Image from 'next/image';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  authQueryHelpers,
  useUpdateProfileMutation,
} from '@/services/queries/auth';
import type { AuthUser } from '@/types/auth';

type Props = {
  user: AuthUser;
  onCancelAction?: () => void;
  onSuccessAction?: () => void;
};

type FieldErrors = Partial<
  Record<'name' | 'email' | 'phone' | 'avatar', string>
>;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const normalizeTrim = (v: string) => v.trim();

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export function ProfileForm({ user, onCancelAction, onSuccessAction }: Props) {
  const [name, setName] = React.useState(user.name ?? '');
  const [email, setEmail] = React.useState(user.email ?? '');
  const [phone, setPhone] = React.useState(user.phone ?? '');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);

  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string>('');
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string>('');
  const [successMsg, setSuccessMsg] = React.useState<string>('');

  const initialRef = React.useRef({
    name: user.name ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    avatar: user.avatar ?? '',
  });

  const updateMutation = useUpdateProfileMutation();
  const isPending = updateMutation.isPending;

  React.useEffect(() => {
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setPhone(user.phone ?? '');
    setAvatarFile(null);

    initialRef.current = {
      name: user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      avatar: user.avatar ?? '',
    };

    setFieldErrors({});
    setFormError('');
    setSuccessMsg('');
    setAvatarPreviewUrl('');
  }, [user]);

  React.useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const validate = (): boolean => {
    const nextErrors: FieldErrors = {};

    const n = normalizeTrim(name);
    const e = normalizeTrim(email);
    const p = normalizeTrim(phone);

    if (!n) nextErrors.name = 'Name is required.';
    if (!e) nextErrors.email = 'Email is required.';
    if (e && !isValidEmail(e)) nextErrors.email = 'Email format is invalid.';
    if (!p) nextErrors.phone = 'Phone is required.';

    if (avatarFile) {
      if (!avatarFile.type.startsWith('image/')) {
        nextErrors.avatar = 'Avatar must be an image file.';
      } else if (avatarFile.size > MAX_AVATAR_BYTES) {
        nextErrors.avatar = 'Avatar max size is 5MB.';
      }
    }

    const noTextChanges =
      n === initialRef.current.name &&
      e === initialRef.current.email &&
      p === initialRef.current.phone;

    const noAvatarChange = !avatarFile;

    if (
      Object.keys(nextErrors).length === 0 &&
      noTextChanges &&
      noAvatarChange
    ) {
      nextErrors.name = 'No changes detected.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();

    if (isPending) return;
    setFormError('');
    setSuccessMsg('');

    if (!validate()) return;

    const n = normalizeTrim(name);
    const e2 = normalizeTrim(email);
    const p = normalizeTrim(phone);

    const payload: {
      name?: string;
      email?: string;
      phone?: string;
      avatar?: File | null;
    } = {};

    if (n !== initialRef.current.name) payload.name = n;
    if (e2 !== initialRef.current.email) payload.email = e2;
    if (p !== initialRef.current.phone) payload.phone = p;
    if (avatarFile) payload.avatar = avatarFile;

    updateMutation.mutate(payload, {
      onSuccess: (res) => {
        initialRef.current = {
          name: res.data.name ?? '',
          email: res.data.email ?? '',
          phone: res.data.phone ?? '',
          avatar: res.data.avatar ?? '',
        };

        setAvatarFile(null);
        setFieldErrors({});
        setFormError('');
        setSuccessMsg('Profile updated successfully.');

        onSuccessAction?.();
      },
      onError: (err) => {
        const msg = authQueryHelpers.getApiErrorMessage(err);
        const list = authQueryHelpers.getApiErrorList(err);
        const combined = list.length ? `${msg}: ${list.join('  ')}` : msg;

        setFormError(combined);
      },
    });
  };

  return (
    <form onSubmit={onSubmit} className='space-y-4'>
      <div className='flex items-center gap-4'>
        <div className='relative h-14 w-14 overflow-hidden rounded-full bg-muted'>
          {avatarPreviewUrl ? (
            <Image
              src={avatarPreviewUrl}
              alt='Avatar preview'
              fill
              sizes='56px'
              className='object-cover'
            />
          ) : user.avatar ? (
            <Image
              src={user.avatar}
              alt='Current avatar'
              fill
              sizes='56px'
              className='object-cover'
            />
          ) : null}
        </div>

        <div className='min-w-0'>
          <p className='text-sm font-medium text-foreground'>Edit Profile</p>
          <p className='text-xs text-muted-foreground'>
            Avatar preview updates before submit.
          </p>
        </div>
      </div>

      <div className='space-y-1.5'>
        <label className='text-sm font-medium'>Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Your name'
          aria-invalid={Boolean(fieldErrors.name)}
          disabled={isPending}
        />
        {fieldErrors.name ? (
          <p className='text-xs text-destructive'>{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <label className='text-sm font-medium'>Email</label>
        <Input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='you@example.com'
          aria-invalid={Boolean(fieldErrors.email)}
          disabled={isPending}
        />
        {fieldErrors.email ? (
          <p className='text-xs text-destructive'>{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <label className='text-sm font-medium'>Phone</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder='081234567891'
          aria-invalid={Boolean(fieldErrors.phone)}
          disabled={isPending}
        />
        {fieldErrors.phone ? (
          <p className='text-xs text-destructive'>{fieldErrors.phone}</p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <label className='text-sm font-medium'>Avatar (optional)</label>
        <Input
          type='file'
          accept='image/*'
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          aria-invalid={Boolean(fieldErrors.avatar)}
          disabled={isPending}
        />
        <p className='text-xs text-muted-foreground'>
          Only image files. Max 5MB (server rule).
        </p>
        {fieldErrors.avatar ? (
          <p className='text-xs text-destructive'>{fieldErrors.avatar}</p>
        ) : null}
      </div>

      {formError ? (
        <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3'>
          <p className='text-sm text-destructive'>{formError}</p>
        </div>
      ) : null}

      {successMsg ? (
        <div className='rounded-md border border-border bg-muted/40 p-3'>
          <p className='text-sm'>{successMsg}</p>
        </div>
      ) : null}

      <div className='space-y-3 pt-2'>
        <Button
          type='submit'
          className='h-12 w-full rounded-full text-sm font-semibold'
          disabled={isPending}
        >
          {isPending ? 'Updating...' : 'Update Profile'}
        </Button>

        <Button
          type='button'
          variant='neutral'
          className='h-12 w-full rounded-full text-sm font-semibold'
          disabled={isPending}
          onClick={onCancelAction}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
