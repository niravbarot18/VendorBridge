export type Permission = 
  | 'VIEW_DASHBOARD'
  | 'MANAGE_USERS'
  | 'MANAGE_VENDORS'
  | 'MANAGE_RFQS'
  | 'COMPARE_QUOTATIONS'
  | 'MANAGE_APPROVALS'
  | 'MANAGE_DOCUMENTS'
  | 'VIEW_REPORTS';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    'VIEW_DASHBOARD',
    'MANAGE_USERS',
    'MANAGE_VENDORS',
    'MANAGE_RFQS',
    'COMPARE_QUOTATIONS',
    'MANAGE_APPROVALS',
    'MANAGE_DOCUMENTS',
    'VIEW_REPORTS'
  ],
  PROCUREMENT_OFFICER: [
    'VIEW_DASHBOARD',
    'MANAGE_VENDORS',
    'MANAGE_RFQS',
    'COMPARE_QUOTATIONS',
    'MANAGE_APPROVALS',
    'MANAGE_DOCUMENTS',
    'VIEW_REPORTS'
  ],
  MANAGER: [
    'VIEW_DASHBOARD',
    'MANAGE_APPROVALS',
    'MANAGE_DOCUMENTS',
    'VIEW_REPORTS'
  ],
  VENDOR: [
    'MANAGE_RFQS', // Bidding on assigned RFQs
    'MANAGE_DOCUMENTS' // Viewing/Acknowledging POs & Invoices
  ]
};

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}
