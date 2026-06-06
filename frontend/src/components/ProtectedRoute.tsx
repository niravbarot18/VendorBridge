import React from 'react';
import { Permission, hasPermission } from '../utils/permissions';
import { AccessDenied } from '../pages/AccessDenied';

interface ProtectedRouteProps {
  permission: Permission;
  role: string;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission, role, children }) => {
  if (!hasPermission(role, permission)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
};
