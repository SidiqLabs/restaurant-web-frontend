import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import OrdersClient from './OrdersClient';

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersClient />
    </ProtectedRoute>
  );
}
