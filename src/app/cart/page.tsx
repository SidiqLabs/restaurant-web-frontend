import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import CartClient from './CartClient';

const CartPage = () => {
  return (
    <ProtectedRoute>
      <CartClient />
    </ProtectedRoute>
  );
};

export default CartPage;
