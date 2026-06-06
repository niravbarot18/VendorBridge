import { 
  User, Vendor, RFQ, RFQItem, RFQVendor, 
  Quotation, QuotationItem, Approval, 
  PurchaseOrder, Invoice, ActivityLog, Notification,
  UserRole
} from '../types';

// Company Details (For Tax Calculations - Company is located in Maharashtra, State Code 27)
export const COMPANY_DETAILS = {
  name: "VendorBridge Enterprises Ltd",
  gstin: "27AAACV1234A1Z5",
  state: "Maharashtra",
  stateCode: "27",
  address: "401, Tech Park, Bandra Kurla Complex, Mumbai, Maharashtra - 400051",
  email: "procurement@vendorbridge.com"
};

// Seed Data
const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Aarav Mehta', email: 'admin@vendorbridge.com', role: 'ADMIN', orgId: 'org1' },
  { id: 'u2', name: 'Priya Sharma', email: 'priya@vendorbridge.com', role: 'PROCUREMENT_OFFICER', orgId: 'org1' },
  { id: 'u3', name: 'Rajesh Patel', email: 'rajesh@vendorbridge.com', role: 'MANAGER', orgId: 'org1' },
  { id: 'u4', name: 'Vikram Gupta', email: 'user@techcorp.com', role: 'VENDOR', orgId: 'org1', vendorId: 'v1' },
  { id: 'u5', name: 'Anjali Nair', email: 'user@logix.com', role: 'VENDOR', orgId: 'org1', vendorId: 'v2' },
  { id: 'u6', name: 'Amit Singh', email: 'user@steelco.com', role: 'VENDOR', orgId: 'org1', vendorId: 'v3' }
];

const DEFAULT_VENDORS: Vendor[] = [
  { id: 'v1', companyName: 'TechCorp Solutions', gstNumber: '27AAAAA1111A1Z1', category: 'IT', contactEmail: 'sales@techcorp.com', status: 'ACTIVE', rating: 4.8, location: 'Maharashtra' },
  { id: 'v2', companyName: 'Logix Logistics', gstNumber: '29BBBBB2222B2Z2', category: 'Logistics', contactEmail: 'info@logix.com', status: 'ACTIVE', rating: 4.2, location: 'Karnataka' },
  { id: 'v3', companyName: 'SteelCo Manufacturing', gstNumber: '07CCCCC3333C3Z3', category: 'Manufacturing', contactEmail: 'procure@steelco.com', status: 'ACTIVE', rating: 3.9, location: 'Delhi' },
  { id: 'v4', companyName: 'Global Exports LLC', gstNumber: '19DDDDD4444D4Z4', category: 'Office Supplies', contactEmail: 'deals@global.com', status: 'BLACKLISTED', rating: 2.1, location: 'West Bengal' }
];

const DEFAULT_RFQS: RFQ[] = [
  { id: 'rfq-1', title: 'High-Performance Laptops for Engineering', description: 'Require 10 developer-grade laptops. Minimum specs: 32GB DDR5 RAM, 1TB NVMe SSD, Intel i9 / Apple M3 Pro, 16-inch display. Must include 3-year onsite support.', deadline: '2026-06-20', status: 'PUBLISHED', createdBy: 'u2', createdAt: '2026-06-01T10:00:00Z' },
  { id: 'rfq-2', title: 'Reinforced Industrial Steel Plates', description: 'Procurement of structural steel plates for heavy construction. Structural grade IS 2062 E250 Quality A. Quantity: 50 Tons. Delivery timeline is critical.', deadline: '2026-05-25', status: 'AWARDED', createdBy: 'u2', createdAt: '2026-05-10T09:30:00Z' },
  { id: 'rfq-3', title: 'Ergonomic Office Seating Refurbishment', description: 'Procuring high-back ergonomic chairs with mesh back, adjustable lumbar support, 3D armrests, and synchro-tilt mechanism.', deadline: '2026-06-30', status: 'DRAFT', createdBy: 'u2', createdAt: '2026-06-05T14:15:00Z' }
];

const DEFAULT_RFQ_ITEMS: RFQItem[] = [
  { id: 'ri-1', rfqId: 'rfq-1', description: 'Developer Laptops (32GB RAM, 1TB SSD, 16")', quantity: 10, unit: 'units' },
  { id: 'ri-2', rfqId: 'rfq-2', description: 'Reinforced Structural Steel Plates (IS 2062)', quantity: 50, unit: 'tons' },
  { id: 'ri-3', rfqId: 'rfq-3', description: 'Mesh Ergonomic High-Back Chairs', quantity: 30, unit: 'units' }
];

const DEFAULT_RFQ_VENDORS: RFQVendor[] = [
  { id: 'rv-1', rfqId: 'rfq-1', vendorId: 'v1' },
  { id: 'rv-2', rfqId: 'rfq-1', vendorId: 'v2' },
  { id: 'rv-3', rfqId: 'rfq-2', vendorId: 'v3' },
  { id: 'rv-4', rfqId: 'rfq-3', vendorId: 'v3' }
];

const DEFAULT_QUOTATIONS: Quotation[] = [
  { id: 'q-1', rfqId: 'rfq-2', vendorId: 'v3', totalPrice: 250000, deliveryDays: 12, notes: 'Direct ex-factory pricing. Logistics charges extra as actuals. 30 days credit terms requested.', status: 'AWARDED', submittedAt: '2026-05-20T11:00:00Z' },
  { id: 'q-2', rfqId: 'rfq-1', vendorId: 'v1', totalPrice: 1250000, deliveryDays: 5, notes: 'Premium models. Ready stock available, delivery within 5 days of PO. 3-year premium warranty included.', status: 'SUBMITTED', submittedAt: '2026-06-03T16:45:00Z' },
  { id: 'q-3', rfqId: 'rfq-1', vendorId: 'v2', totalPrice: 1180000, deliveryDays: 14, notes: 'Alternative brand proposal matching all performance parameters. Extended battery variant included.', status: 'SUBMITTED', submittedAt: '2026-06-04T10:12:00Z' }
];

const DEFAULT_QUOTATION_ITEMS: QuotationItem[] = [
  { id: 'qi-1', quotationId: 'q-1', rfqItemId: 'ri-2', unitPrice: 5000, totalPrice: 250000 },
  { id: 'qi-2', quotationId: 'q-2', rfqItemId: 'ri-1', unitPrice: 125000, totalPrice: 1250000 },
  { id: 'qi-3', quotationId: 'q-3', rfqItemId: 'ri-1', unitPrice: 118000, totalPrice: 1180000 }
];

const DEFAULT_APPROVALS: Approval[] = [
  { id: 'a-1', quotationId: 'q-1', approverId: 'u3', status: 'APPROVED', remarks: 'Recommended bid approved. Pricing is within historical range and delivery satisfies requirements.', actionedAt: '2026-05-26T09:15:00Z', createdAt: '2026-05-25T17:00:00Z' }
];

const DEFAULT_POS: PurchaseOrder[] = [
  { id: 'po-1', approvalId: 'a-1', poNumber: 'PO-2026-0001', amount: 250000, status: 'ISSUED', issuedAt: '2026-05-26T10:00:00Z' }
];

const DEFAULT_INVOICES: Invoice[] = [
  { 
    id: 'inv-1', 
    poId: 'po-1', 
    invoiceNumber: 'INV-2026-0001', 
    subtotal: 250000, 
    cgst: 0, 
    sgst: 0, 
    igst: 45000, // Interstate GST (Delhi v3 to Maharashtra COMPANY) - 18% of 250,000
    totalAmount: 295000, 
    status: 'SENT', 
    invoiceDate: '2026-05-28' 
  }
];

const DEFAULT_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'log-1', actorName: 'Priya Sharma', actorRole: 'PROCUREMENT_OFFICER', action: 'Created RFQ', entityType: 'RFQ', entityId: 'rfq-2', timestamp: '2026-05-10T09:30:00Z', details: 'Created draft RFQ for Reinforced Industrial Steel Plates' },
  { id: 'log-2', actorName: 'Priya Sharma', actorRole: 'PROCUREMENT_OFFICER', action: 'Published RFQ', entityType: 'RFQ', entityId: 'rfq-2', timestamp: '2026-05-11T11:00:00Z', details: 'Published RFQ-2 and invited SteelCo Manufacturing' },
  { id: 'log-3', actorName: 'SteelCo Sales', actorRole: 'VENDOR', action: 'Submitted Quotation', entityType: 'QUOTATION', entityId: 'q-1', timestamp: '2026-05-20T11:00:00Z', details: 'SteelCo submitted quotation of ₹2,50,000 for RFQ-2' },
  { id: 'log-4', actorName: 'Priya Sharma', actorRole: 'PROCUREMENT_OFFICER', action: 'Awarded RFQ', entityType: 'RFQ', entityId: 'rfq-2', timestamp: '2026-05-25T17:00:00Z', details: 'Awarded RFQ-2 to SteelCo Manufacturing and submitted for Manager approval' },
  { id: 'log-5', actorName: 'Rajesh Patel', actorRole: 'MANAGER', action: 'Approved Quotation', entityType: 'APPROVAL', entityId: 'a-1', timestamp: '2026-05-26T09:15:00Z', details: 'Approved SteelCo quotation: Price within bounds' },
  { id: 'log-6', actorName: 'Priya Sharma', actorRole: 'PROCUREMENT_OFFICER', action: 'Generated Purchase Order', entityType: 'PO', entityId: 'po-1', timestamp: '2026-05-26T10:00:00Z', details: 'Generated PO-2026-0001 for SteelCo Manufacturing' },
  { id: 'log-7', actorName: 'SteelCo Sales', actorRole: 'VENDOR', action: 'Sent Invoice', entityType: 'INVOICE', entityId: 'inv-1', timestamp: '2026-05-28T14:00:00Z', details: 'Generated invoice INV-2026-0001 with 18% IGST' },
  { id: 'log-8', actorName: 'Priya Sharma', actorRole: 'PROCUREMENT_OFFICER', action: 'Created RFQ', entityType: 'RFQ', entityId: 'rfq-1', timestamp: '2026-06-01T10:00:00Z', details: 'Created and published RFQ-1 for Laptops' }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: 'n-1', role: 'VENDOR', vendorId: 'v1', message: 'You have been invited to submit a quotation for: High-Performance Laptops for Engineering', read: false, createdAt: '2026-06-01T10:05:00Z' },
  { id: 'n-2', role: 'VENDOR', vendorId: 'v2', message: 'You have been invited to submit a quotation for: High-Performance Laptops for Engineering', read: false, createdAt: '2026-06-01T10:05:00Z' },
  { id: 'n-3', role: 'PROCUREMENT_OFFICER', message: 'TechCorp Solutions has submitted a quotation for RFQ: High-Performance Laptops for Engineering', read: false, createdAt: '2026-06-03T16:45:00Z' },
  { id: 'n-4', role: 'PROCUREMENT_OFFICER', message: 'Logix Logistics has submitted a quotation for RFQ: High-Performance Laptops for Engineering', read: false, createdAt: '2026-06-04T10:12:00Z' }
];

// DB Keys
const KEYS = {
  USERS: 'vb_users',
  VENDORS: 'vb_vendors',
  RFQS: 'vb_rfqs',
  RFQ_ITEMS: 'vb_rfq_items',
  RFQ_VENDORS: 'vb_rfq_vendors',
  QUOTATIONS: 'vb_quotations',
  QUOTATION_ITEMS: 'vb_quotation_items',
  APPROVALS: 'vb_approvals',
  POS: 'vb_pos',
  INVOICES: 'vb_invoices',
  ACTIVITY_LOGS: 'vb_activity_logs',
  NOTIFICATIONS: 'vb_notifications',
  CURRENT_USER: 'vb_current_user'
};

// Database Initialization
export const initDb = (force = false) => {
  const checkAndSet = <T>(key: string, defaultData: T) => {
    if (force || !localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultData));
    }
  };

  checkAndSet(KEYS.USERS, DEFAULT_USERS);
  checkAndSet(KEYS.VENDORS, DEFAULT_VENDORS);
  checkAndSet(KEYS.RFQS, DEFAULT_RFQS);
  checkAndSet(KEYS.RFQ_ITEMS, DEFAULT_RFQ_ITEMS);
  checkAndSet(KEYS.RFQ_VENDORS, DEFAULT_RFQ_VENDORS);
  checkAndSet(KEYS.QUOTATIONS, DEFAULT_QUOTATIONS);
  checkAndSet(KEYS.QUOTATION_ITEMS, DEFAULT_QUOTATION_ITEMS);
  checkAndSet(KEYS.APPROVALS, DEFAULT_APPROVALS);
  checkAndSet(KEYS.POS, DEFAULT_POS);
  checkAndSet(KEYS.INVOICES, DEFAULT_INVOICES);
  checkAndSet(KEYS.ACTIVITY_LOGS, DEFAULT_ACTIVITY_LOGS);
  checkAndSet(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);

  // Do not set default current user to allow login screen
  if (!localStorage.getItem(KEYS.CURRENT_USER)) {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }

  notifyDbChange();
};

// Custom event dispatch to force react components to re-render when storage updates
const DB_CHANGE_EVENT = 'vb_db_change';
const notifyDbChange = () => {
  window.dispatchEvent(new Event(DB_CHANGE_EVENT));
};

export const subscribeToDbChanges = (callback: () => void) => {
  window.addEventListener(DB_CHANGE_EVENT, callback);
  return () => window.removeEventListener(DB_CHANGE_EVENT, callback);
};

// Core CRUD getters & setters
export const db = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  setUsers: (data: User[]) => { localStorage.setItem(KEYS.USERS, JSON.stringify(data)); notifyDbChange(); },

  getVendors: (): Vendor[] => JSON.parse(localStorage.getItem(KEYS.VENDORS) || '[]'),
  setVendors: (data: Vendor[]) => { localStorage.setItem(KEYS.VENDORS, JSON.stringify(data)); notifyDbChange(); },

  getRFQs: (): RFQ[] => JSON.parse(localStorage.getItem(KEYS.RFQS) || '[]'),
  setRFQs: (data: RFQ[]) => { localStorage.setItem(KEYS.RFQS, JSON.stringify(data)); notifyDbChange(); },

  getRFQItems: (): RFQItem[] => JSON.parse(localStorage.getItem(KEYS.RFQ_ITEMS) || '[]'),
  setRFQItems: (data: RFQItem[]) => { localStorage.setItem(KEYS.RFQ_ITEMS, JSON.stringify(data)); notifyDbChange(); },

  getRFQVendors: (): RFQVendor[] => JSON.parse(localStorage.getItem(KEYS.RFQ_VENDORS) || '[]'),
  setRFQVendors: (data: RFQVendor[]) => { localStorage.setItem(KEYS.RFQ_VENDORS, JSON.stringify(data)); notifyDbChange(); },

  getQuotations: (): Quotation[] => JSON.parse(localStorage.getItem(KEYS.QUOTATIONS) || '[]'),
  setQuotations: (data: Quotation[]) => { localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(data)); notifyDbChange(); },

  getQuotationItems: (): QuotationItem[] => JSON.parse(localStorage.getItem(KEYS.QUOTATION_ITEMS) || '[]'),
  setQuotationItems: (data: QuotationItem[]) => { localStorage.setItem(KEYS.QUOTATION_ITEMS, JSON.stringify(data)); notifyDbChange(); },

  getApprovals: (): Approval[] => JSON.parse(localStorage.getItem(KEYS.APPROVALS) || '[]'),
  setApprovals: (data: Approval[]) => { localStorage.setItem(KEYS.APPROVALS, JSON.stringify(data)); notifyDbChange(); },

  getPOs: (): PurchaseOrder[] => JSON.parse(localStorage.getItem(KEYS.POS) || '[]'),
  setPOs: (data: PurchaseOrder[]) => { localStorage.setItem(KEYS.POS, JSON.stringify(data)); notifyDbChange(); },

  getInvoices: (): Invoice[] => JSON.parse(localStorage.getItem(KEYS.INVOICES) || '[]'),
  setInvoices: (data: Invoice[]) => { localStorage.setItem(KEYS.INVOICES, JSON.stringify(data)); notifyDbChange(); },

  getActivityLogs: (): ActivityLog[] => JSON.parse(localStorage.getItem(KEYS.ACTIVITY_LOGS) || '[]'),
  setActivityLogs: (data: ActivityLog[]) => { localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(data)); notifyDbChange(); },

  getNotifications: (): Notification[] => JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]'),
  setNotifications: (data: Notification[]) => { localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(data)); notifyDbChange(); },

  getCurrentUser: (): User | null => {
    const user = localStorage.getItem(KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
    notifyDbChange();
  }
};

// Database operation helpers
export const logActivity = (actorName: string, role: UserRole, action: string, type: ActivityLog['entityType'], id: string, details: string) => {
  const logs = db.getActivityLogs();
  const newLog: ActivityLog = {
    id: `log-${Date.now()}`,
    actorName,
    actorRole: role,
    action,
    entityType: type,
    entityId: id,
    timestamp: new Date().toISOString(),
    details
  };
  db.setActivityLogs([newLog, ...logs]);
};

export const createNotification = (role: UserRole, message: string, vendorId?: string) => {
  const notifications = db.getNotifications();
  const newNotif: Notification = {
    id: `n-${Date.now()}`,
    role,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    ...(vendorId ? { vendorId } : {})
  };
  db.setNotifications([newNotif, ...notifications]);
};

export const resetDatabase = () => {
  initDb(true);
};
