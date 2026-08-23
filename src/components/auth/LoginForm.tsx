'use client';

import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { getSafeInternalRedirectPath } from '@/lib/utils';
import { authTokenStorage } from '@/services/api/axios';
import {
  authQueryKeys,
  fetchProfile,
  getApiErrorMessage,
  useLoginMutation,
} from '@/services/queries/auth';
import type { LoginRequest } from '@/types/auth';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getPostLoginRedirectPath = () => {
  if (typeof window === 'undefined') return '/';

  const params = new URLSearchParams(window.location.search);
  return getSafeInternalRedirectPath(params.get('redirect'), '/');
};

const LoginForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string>('');

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const e = normalizeEmail(email);

    if (!e) next.email = 'Email must be filled in.';
    else if (!/^\S+@\S+\.\S+$/.test(e)) next.email = 'Invalid email format.';

    if (!password) next.password = 'Password must be filled in.';
    else if (password.length < 6) next.password = 'Password min 6 chars.';

    return next;
  };

  const runRealLogin = async () => {
    setServerError('');

    const payload: LoginRequest = {
      email: normalizeEmail(email),
      password,
    };

    //  single contract: hook expects { payload, rememberMe }
    await loginMutation.mutateAsync({ payload, rememberMe });

    //  token is already stored by the hook. Just verify it exists.
    const token = authTokenStorage.get();
    if (!token) {
      throw new Error('Login succeeded but token is missing in storage.');
    }

    // prime profile cache so header/avatar updates immediately
    try {
      await queryClient.fetchQuery({
        queryKey: authQueryKeys.profile,
        queryFn: fetchProfile,
      });
    } catch {
      // best effort
    }

    router.replace(getPostLoginRedirectPath());
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors = validate();
    const hasErrors = Boolean(nextErrors.email || nextErrors.password);

    if (hasErrors) {
      setErrors(nextErrors);
      setServerError('');
      return;
    }

    try {
      await runRealLogin();
    } catch (err) {
      setServerError(getApiErrorMessage(err));

      if (axios.isAxiosError(err) && err.response?.status === 401) {
        authTokenStorage.clear();
      }
    }
  };

  const loading = loginMutation.isPending;

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex flex-col gap-3'>
        <div className='flex items-center gap-3'>
          <Image
            src='/assets/icons/logo.svg'
            alt='Foody logo'
            width={32}
            height={32}
            priority
          />
          <span className='text-xl font-semibold text-foreground'>Foody</span>
        </div>

        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold text-foreground'>
            Welcome Back
          </h1>
          <p className='text-sm text-muted-foreground'>
            Good to see you again! Lets eat
          </p>
        </div>
      </header>

      {serverError ? (
        <div className='rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3'>
          <p className='text-sm text-destructive'>{serverError}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <div className='space-y-2'>
          <Input
            type='email'
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setServerError('');
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder='Email'
            aria-invalid={Boolean(errors.email)}
            className={[
              'h-12 rounded-xl bg-card',
              errors.email
                ? 'border-destructive focus-visible:ring-destructive'
                : '',
            ].join(' ')}
          />
          {errors.email ? (
            <p className='text-xs text-destructive'>{errors.email}</p>
          ) : null}
        </div>

        <div className='space-y-2'>
          <div className='relative'>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setServerError('');
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder='Password'
              aria-invalid={Boolean(errors.password)}
              className={[
                'h-12 rounded-xl bg-card pr-12',
                errors.password
                  ? 'border-destructive focus-visible:ring-destructive'
                  : '',
              ].join(' ')}
            />

            <button
              type='button'
              onClick={() => setShowPassword((s) => !s)}
              className='absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className='h-4 w-4' />
              ) : (
                <Eye className='h-4 w-4' />
              )}
            </button>
          </div>

          {errors.password ? (
            <p className='text-xs text-destructive'>{errors.password}</p>
          ) : null}
        </div>

        <label className='flex cursor-pointer items-center gap-2 text-sm text-muted-foreground'>
          <Checkbox
            checked={rememberMe}
            onCheckedChange={(v) => setRememberMe(Boolean(v))}
            className='h-4 w-4 rounded-sm data-[state=checked]:bg-primary data-[state=checked]:border-primary'
          />
          Remember Me
        </label>

        <Button
          type='submit'
          disabled={loading}
          className='h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90'
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </section>
  );
};

export default LoginForm;
