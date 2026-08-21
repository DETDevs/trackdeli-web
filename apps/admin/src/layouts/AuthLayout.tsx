import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Outlet />
    </div>
  );
};
