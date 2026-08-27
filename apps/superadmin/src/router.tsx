import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './lib/auth';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BusinessesPage } from './pages/BusinessesPage';
import { BusinessDetailPage } from './pages/BusinessDetailPage';
import { RidersPage } from './pages/RidersPage';
import { LogsPage } from './pages/LogsPage';

const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || user?.role !== 'SUPERADMIN') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const PublicOnlyRoute = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user?.role === 'SUPERADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '/',
            element: <DashboardPage />,
          },
          {
            path: '/businesses',
            element: <BusinessesPage />,
          },
          {
            path: '/businesses/:id',
            element: <BusinessDetailPage />,
          },
          {
            path: '/riders',
            element: <RidersPage />,
          },
          {
            path: '/logs',
            element: <LogsPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
