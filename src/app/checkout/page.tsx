import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import CheckoutClient from './CheckoutClient';

const CheckoutPage = () => {
  return (
    <ProtectedRoute>
      <CheckoutClient />
    </ProtectedRoute>
  );
};

export default CheckoutPage;
