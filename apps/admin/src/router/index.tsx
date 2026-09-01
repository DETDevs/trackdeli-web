import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuthStore } from "../store/auth.store";

import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { OrdersPage } from "../pages/OrdersPage";
import { CreateOrderPage } from "../pages/CreateOrderPage";
import { OrderDetailPage } from "../pages/OrderDetailPage";
import { StaffPage } from "../pages/StaffPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { ClientsPage } from "../pages/ClientsPage";
import { CommissionsPage } from "../pages/CommissionsPage";
import { InviteCodesPage } from "../pages/InviteCodesPage";

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "orders/new", element: <CreateOrderPage /> },
      { path: "orders/:id", element: <OrderDetailPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "staff", element: <StaffPage /> },
      { path: "invites", element: <InviteCodesPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "commissions", element: <CommissionsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
], {
  future: {
    v7_normalizeFormMethod: true,
    v7_fetcherPersist: true,
    v7_partialHydration: true,
    v7_relativeSplatPath: true,
    v7_skipActionErrorRevalidation: true,
  }
});

export default router;
