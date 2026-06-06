export type UserRole = 'ADMIN' | 'PROCUREMENT_OFFICER' | 'MANAGER' | 'VENDOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId?: string;
  vendorId?: string; // Links user to a specific vendor if role === 'VENDOR'
}

export interface Vendor {
  id: string;
  companyName: string;
  gstNumber: string;
  category: string;
  contactEmail: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  rating: number; // 1 to 5 scale
  location: string; // Indian State, e.g. "Maharashtra", "Karnataka", "Delhi"
}

export interface RFQ {
  id: string;
  title: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'AWARDED';
  createdBy: string; // User ID
  createdAt: string;
}

export interface RFQItem {
  id: string;
  rfqId: string;
  description: string;
  quantity: number;
  unit: string; // e.g. "units", "kg", "hours"
}

export interface RFQVendor {
  id: string;
  rfqId: string;
  vendorId: string;
}

export interface Quotation {
  id: string;
  rfqId: string;
  vendorId: string;
  totalPrice: number;
  deliveryDays: number;
  notes: string;
  status: 'DRAFT' | 'SUBMITTED' | 'AWARDED' | 'REJECTED';
  submittedAt?: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  rfqItemId: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Approval {
  id: string;
  quotationId: string;
  approverId: string; // User ID of the manager
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string;
  actionedAt?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  approvalId: string;
  poNumber: string; // PO-YYYY-NNNN
  amount: number;
  status: 'DRAFT' | 'ISSUED' | 'ACKNOWLEDGED';
  issuedAt?: string;
}

export interface Invoice {
  id: string;
  poId: string;
  invoiceNumber: string; // INV-YYYY-NNNN
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID';
  invoiceDate: string;
}

export interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string; // e.g., "Created RFQ", "Approved Quotation"
  entityType: 'VENDOR' | 'RFQ' | 'QUOTATION' | 'APPROVAL' | 'PO' | 'INVOICE';
  entityId: string;
  timestamp: string;
  details: string;
}

export interface Notification {
  id: string;
  role: UserRole;
  vendorId?: string; // If targeting a specific vendor's portal
  message: string;
  read: boolean;
  createdAt: string;
}
