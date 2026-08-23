// src/app/payment-success/page.tsx
import { Suspense } from 'react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import PaymentSuccessClient from './PaymentSuccessClient';

export const dynamic = 'force-dynamic';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute>
        <PaymentSuccessClient />
      </ProtectedRoute>
    </Suspense>
  );
}
