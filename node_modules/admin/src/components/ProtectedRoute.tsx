import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  // Bypass for scaffolding, switch to check isAuthenticated later
  return <>{children}</>; 
};
