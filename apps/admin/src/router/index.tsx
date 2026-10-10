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
import { TeamPage } from "../pages/TeamPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { ClientsPage } from "../pages/ClientsPage";
import { CustomersPage } from "../pages/CustomersPage";
import { CommissionsPage } from "../pages/CommissionsPage";
import { InviteCodesPage } from "../pages/InviteCodesPage";

import { PosDashboardPage } from "../pages/pos/PosDashboardPage";
import { PosSalesPage } from "../pages/pos/PosSalesPage";
import { PosAnalyticsPage } from "../pages/pos/PosAnalyticsPage";
import { PosInventoryPage } from "../pages/pos/PosInventoryPage";
import { PosCashRegistersPage } from "../pages/pos/PosCashRegistersPage";
import { PosCobrarPage } from "../pages/pos/PosCobrarPage";
import { useMyProducts } from "../hooks/useMyProducts";

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const RootIndex = () => {
  const { data: productsData, isLoading } = useMyProducts();

  if (isLoading) {
    return null;
  }

  const isDeliveryActive = productsData?.products?.DELIVERY?.status === 'ACTIVE';
  const isPosActive = productsData?.products?.POS?.status === 'ACTIVE';

  if (!isDeliveryActive && isPosActive) {
    return <Navigate to="/pos/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
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
      { index: true, element: <RootIndex /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "orders/new", element: <CreateOrderPage /> },
      { path: "orders/:id", element: <OrderDetailPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/:id", element: <CustomersPage /> },
      { path: "team", element: <TeamPage /> },
      { path: "staff", element: <StaffPage /> },
      { path: "invites", element: <InviteCodesPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "commissions", element: <CommissionsPage /> },
      { path: "settings", element: <SettingsPage /> },
      // Módulos POS (Backoffice de consulta - Ticket 144b)
      { path: "pos/dashboard", element: <PosDashboardPage /> },
      { path: "pos/sales", element: <PosSalesPage /> },
      { path: "pos/analytics", element: <PosAnalyticsPage /> },
      { path: "pos/inventory", element: <PosInventoryPage /> },
      { path: "pos/cash-registers", element: <PosCashRegistersPage /> },
      { path: "pos/reports", element: <ReportsPage /> },
      { path: "pos/cobrar", element: <PosCobrarPage /> },
    ],
  },
  {
    path: "*",
    element: <RootIndex />,
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
