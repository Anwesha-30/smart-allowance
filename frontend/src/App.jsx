import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { useWallet } from "@/hooks/useWallet";
import LoadingSpinner from "@/components/LoadingSpinner";

const LandingPage      = lazy(() => import("@/pages/LandingPage"));
const ParentDashboard  = lazy(() => import("@/pages/ParentDashboard"));
const ChildDashboard   = lazy(() => import("@/pages/ChildDashboard"));
const AllowancePage    = lazy(() => import("@/pages/AllowancePage"));
const TransactionsPage = lazy(() => import("@/pages/TransactionsPage"));
const SettingsPage     = lazy(() => import("@/pages/SettingsPage"));
const NotFound         = lazy(() => import("@/pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" label="Loading…" />
    </div>
  );
}

/** Redirect to / if no role chosen yet */
function RoleRoute({ requiredRole, children }) {
  const { role, isDemoMode } = useWallet();
  // Allow if role matches OR in full demo mode with correct section
  if (role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public — role selection / landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Parent routes */}
        <Route path="/parent" element={<RoleRoute requiredRole="parent"><ParentDashboard /></RoleRoute>} />
        <Route path="/parent/allowance"    element={<RoleRoute requiredRole="parent"><AllowancePage /></RoleRoute>} />
        <Route path="/parent/transactions" element={<RoleRoute requiredRole="parent"><TransactionsPage mode="parent" /></RoleRoute>} />
        <Route path="/parent/settings"     element={<RoleRoute requiredRole="parent"><SettingsPage /></RoleRoute>} />

        {/* Child routes */}
        <Route path="/child" element={<RoleRoute requiredRole="child"><ChildDashboard /></RoleRoute>} />
        <Route path="/child/transactions"  element={<RoleRoute requiredRole="child"><TransactionsPage mode="child" /></RoleRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
