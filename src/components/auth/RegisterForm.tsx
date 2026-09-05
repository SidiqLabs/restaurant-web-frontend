'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authTokenStorage } from '@/services/api/axios';
import {
  authQueryKeys,
  fetchProfile,
  getApiErrorMessage,
  useRegisterMutation,
} from '@/services/queries/auth';
import type { RegisterRequest } from '@/types/auth';

type FieldErrors = Partial<
  Record<'name' | 'email' | 'phone' | 'password' | 'confirmPassword', string>
>;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const RegisterForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const registerMutation = useRegisterMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string>('');

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    const n = name.trim();
    const e = normalizeEmail(email);
    const p = phone.trim();

    if (!n) next.name = 'Name must be filled in.';
    else if (n.length < 2) next.name = 'Name too short.';

    if (!e) next.email = 'Email must be filled in.';
    else if (!/^\S+@\S+\.\S+$/.test(e)) next.email = 'Invalid email format.';

    if (!p) next.phone = 'Phone number must be filled in.';
    else if (!/^\d+$/.test(p)) next.phone = 'Phone must be numeric.';
    else if (p.length < 10) next.phone = 'Phone min 10 digits.';

    if (!password) next.password = 'Password must be filled in.';
    else if (password.length < 6) next.password = 'Password min 6 chars.';

    if (!confirmPassword)
      next.confirmPassword = 'Confirm password is required.';
    else if (confirmPassword !== password)
      next.confirmPassword = 'Confirm password does not match.';

    return next;
  };

  const clearFieldError = (key: keyof FieldErrors) => {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const runRegister = async () => {
    setServerError('');

    const payload: RegisterRequest = {
      name: name.trim(),
      email: normalizeEmail(email),
      phone: phone.trim(),
      password,
    };

    // Contract: the hook expects { payload, rememberMe }.
    await registerMutation.mutateAsync({ payload, rememberMe: true });

    // token may or may not exist depending on backend behavior
    const token = authTokenStorage.get();

    if (token) {
      try {
        await queryClient.fetchQuery({
          queryKey: authQueryKeys.profile,
          queryFn: fetchProfile,
        });
      } catch {
        // best effort
      }

      router.replace('/');
      return;
    }

    // no token returned: go login
    router.replace('/auth/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = validate();
    const hasErrors = Boolean(
      nextErrors.name ||
      nextErrors.email ||
      nextErrors.phone ||
      nextErrors.password ||
      nextErrors.confirmPassword
    );

    if (hasErrors) {
      setErrors(nextErrors);
      setServerError('');
      return;
    }

    try {
      await runRegister();
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  const loading = registerMutation.isPending;

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
            Create Account
          </h1>
          <p className='text-sm text-muted-foreground'>
            Fill your details to continue
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className='rounded-full bg-muted p-1'>
        <div className='grid grid-cols-2 gap-1'>
          <button
            type='button'
            onClick={() => router.push('/auth/login')}
            className='h-10 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground'
          >
            Sign in
          </button>

          <button
            type='button'
            className='h-10 rounded-full bg-card text-sm font-medium text-foreground shadow-sm'
            aria-current='page'
          >
            Sign up
          </button>
        </div>
      </div>

      {serverError ? (
        <div className='rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3'>
          <p className='text-sm text-destructive'>{serverError}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <div className='space-y-2'>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setServerError('');
              clearFieldError('name');
            }}
            placeholder='Name'
            aria-invalid={Boolean(errors.name)}
            className={[
              'h-12 rounded-xl bg-card',
              errors.name
                ? 'border-destructive focus-visible:ring-destructive'
                : '',
            ].join(' ')}
          />
          {errors.name ? (
            <p className='text-xs text-destructive'>{errors.name}</p>
          ) : null}
        </div>

        <div className='space-y-2'>
          <Input
            type='email'
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setServerError('');
              clearFieldError('email');
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
          <Input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setServerError('');
              clearFieldError('phone');
            }}
            placeholder='Number Phone'
            inputMode='numeric'
            aria-invalid={Boolean(errors.phone)}
            className={[
              'h-12 rounded-xl bg-card',
              errors.phone
                ? 'border-destructive focus-visible:ring-destructive'
                : '',
            ].join(' ')}
          />
          {errors.phone ? (
            <p className='text-xs text-destructive'>{errors.phone}</p>
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
                clearFieldError('password');
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

        <div className='space-y-2'>
          <div className='relative'>
            <Input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setServerError('');
                clearFieldError('confirmPassword');
              }}
              placeholder='Confirm Password'
              aria-invalid={Boolean(errors.confirmPassword)}
              className={[
                'h-12 rounded-xl bg-card pr-12',
                errors.confirmPassword
                  ? 'border-destructive focus-visible:ring-destructive'
                  : '',
              ].join(' ')}
            />
            <button
              type='button'
              onClick={() => setShowConfirm((s) => !s)}
              className='absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? (
                <EyeOff className='h-4 w-4' />
              ) : (
                <Eye className='h-4 w-4' />
              )}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className='text-xs text-destructive'>{errors.confirmPassword}</p>
          ) : null}
        </div>

        <Button
          type='submit'
          disabled={loading}
          className='h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90'
        >
          {loading ? 'Registering...' : 'Register'}
        </Button>
      </form>
    </section>
  );
};

export default RegisterForm;
