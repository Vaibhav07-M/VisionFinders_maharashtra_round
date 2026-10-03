import React from 'react';
import { Navigate } from 'react-router-dom';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';
import { AdminDashboardPage } from './AdminDashboardPage';

// /admin/live now seamlessly aliases the unified Dashboard & Live Radar without crashing.
// Wrapped in AdminErrorBoundary to strictly prevent any unhandled render exceptions.
export const LiveOperationsPage: React.FC = () => {
  return (
    <AdminErrorBoundary>
      <AdminDashboardPage />
    </AdminErrorBoundary>
  );
};
