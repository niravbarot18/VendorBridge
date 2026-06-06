import { useState, useEffect } from 'react';
import { db, subscribeToDbChanges } from '../db/mockDb';
import { api } from '../api/client';
import { User, Vendor, RFQ, RFQItem, RFQVendor, Quotation, QuotationItem, Approval, PurchaseOrder, Invoice, ActivityLog, Notification, UserRole } from '../types';

// Map emails to seed passwords
const DEFAULT_PASSWORDS: Record<string, string> = {
  'admin@vendorbridge.com': 'Admin@123',
  'priya@vendorbridge.com': 'Officer@123',
  'rajesh@vendorbridge.com': 'Manager@123',
  'user@techcorp.com': 'Vendor@123',
  'user@logix.com': 'Vendor@123',
  'user@steelco.com': 'Vendor@123'
};

export const useAppState = () => {
  const [backendMode, setBackendModeState] = useState<boolean>(() => {
    return localStorage.getItem('vb_backend_mode') === 'true';
  });

  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  const [state, setState] = useState({
    currentUser: db.getCurrentUser(),
    users: db.getUsers(),
    vendors: db.getVendors(),
    rfqs: db.getRFQs(),
    rfqItems: db.getRFQItems(),
    rfqVendors: db.getRFQVendors(),
    quotations: db.getQuotations(),
    quotationItems: db.getQuotationItems(),
    approvals: db.getApprovals(),
    pos: db.getPOs(),
    invoices: db.getInvoices(),
    activityLogs: db.getActivityLogs(),
    notifications: db.getNotifications()
  });

  // Sync with localStorage when running in local mock mode
  useEffect(() => {
    if (backendMode) return;

    const handleDbChange = () => {
      setState({
        currentUser: db.getCurrentUser(),
        users: db.getUsers(),
        vendors: db.getVendors(),
        rfqs: db.getRFQs(),
        rfqItems: db.getRFQItems(),
        rfqVendors: db.getRFQVendors(),
        quotations: db.getQuotations(),
        quotationItems: db.getQuotationItems(),
        approvals: db.getApprovals(),
        pos: db.getPOs(),
        invoices: db.getInvoices(),
        activityLogs: db.getActivityLogs(),
        notifications: db.getNotifications()
      });
    };

    const unsubscribe = subscribeToDbChanges(handleDbChange);
    return () => unsubscribe();
  }, [backendMode]);

  // Sync with MySQL backend
  const fetchBackendData = async () => {
    try {
      // 1. Fetch backend health check
      const health = await fetch('http://localhost:5000/health').then(r => r.json()).catch(() => null);
      if (!health || health.status !== 'ok') {
        setBackendConnected(false);
        return;
      }
      setBackendConnected(true);

      // 2. Fetch data from backend
      const vendorsList = await api.getVendors().catch(() => []);
      const rfqsList = await api.getRFQs().catch(() => []);
      const approvalsList = await api.getApprovals().catch(() => []);
      const posList = await api.getPOs().catch(() => []);
      const invoicesList = await api.getInvoices().catch(() => []);
      const logsList = await api.getActivityLogs().catch(() => []);

      // Pull current user notifications
      const rawNotifs = await api.request('/dashboard/notifications').catch(() => []);

      // Derive line items from RFQs and Quotations to populate client UI state
      let derivedRfqItems: RFQItem[] = [];
      let derivedRfqVendors: RFQVendor[] = [];
      let derivedQuotations: Quotation[] = [];
      let derivedQuotationItems: QuotationItem[] = [];

      for (const rfq of rfqsList) {
        const detail = await api.getRFQDetails(rfq.id).catch(() => null);
        if (detail) {
          derivedRfqItems = [...derivedRfqItems, ...(detail.items || [])];
          derivedRfqVendors = [...derivedRfqVendors, ...(detail.rfqVendors || [])];
          derivedQuotations = [...derivedQuotations, ...(detail.quotations || [])];
          
          if (detail.quotations) {
            detail.quotations.forEach((q: any) => {
              derivedQuotationItems = [...derivedQuotationItems, ...(q.items || [])];
            });
          }
        }
      }

      setState(prev => ({
        ...prev,
        vendors: vendorsList,
        rfqs: rfqsList,
        rfqItems: derivedRfqItems,
        rfqVendors: derivedRfqVendors,
        quotations: derivedQuotations,
        quotationItems: derivedQuotationItems,
        approvals: approvalsList,
        pos: posList,
        invoices: invoicesList,
        activityLogs: logsList,
        notifications: rawNotifs
      }));

    } catch (e) {
      console.error('Error syncing with MySQL backend:', e);
      setBackendConnected(false);
    }
  };

  // Session checking and restoration on mount or backendMode toggles
  const checkSession = async () => {
    if (backendMode) {
      const token = localStorage.getItem('vb_jwt_token');
      if (token) {
        try {
          // Check backend health before verification to avoid lockups
          const health = await fetch('http://localhost:5000/health').then(r => r.json()).catch(() => null);
          if (!health || health.status !== 'ok') {
            setBackendConnected(false);
            return;
          }
          setBackendConnected(true);

          const data = await api.getMe();
          const name = db.getUsers().find(u => u.email === data.user.email)?.name || data.user.email.split('@')[0];
          const resolvedUser = {
            id: data.user.userId,
            name,
            email: data.user.email,
            role: data.user.role,
            vendorId: data.user.vendorId
          };
          db.setCurrentUser(resolvedUser);
          setState(prev => ({ ...prev, currentUser: resolvedUser }));
        } catch (err) {
          console.error('Session restoration failed:', err);
          api.clearToken();
          db.setCurrentUser(null);
          setState(prev => ({ ...prev, currentUser: null }));
          setBackendConnected(false);
        }
      } else {
        db.setCurrentUser(null);
        setState(prev => ({ ...prev, currentUser: null }));
      }
    } else {
      // Mock mode: restore user if in local storage
      const user = db.getCurrentUser();
      setState(prev => ({ ...prev, currentUser: user }));
    }
  };

  useEffect(() => {
    checkSession();
  }, [backendMode]);

  // Listen for automatic logout on token expiration (401)
  useEffect(() => {
    const handleSessionExpired = () => {
      db.setCurrentUser(null);
      setState(prev => ({ ...prev, currentUser: null }));
      alert('Your session has expired. Please sign in again.');
    };
    window.addEventListener('vb_session_expired', handleSessionExpired);
    return () => window.removeEventListener('vb_session_expired', handleSessionExpired);
  }, []);

  // Trigger sync on backend mode enable or active user switch
  useEffect(() => {
    if (backendMode && state.currentUser) {
      fetchBackendData();
    }
  }, [backendMode, state.currentUser?.id]);

  const toggleBackendMode = async (enable: boolean) => {
    if (enable) {
      try {
        localStorage.setItem('vb_backend_mode', 'true');
        setBackendModeState(true);
        
        // Health check
        const health = await fetch('http://localhost:5000/health').then(r => r.json()).catch(() => null);
        if (!health || health.status !== 'ok') {
          throw new Error('Backend server is offline.');
        }
        setBackendConnected(true);
        
        // Attempt session restore
        const token = localStorage.getItem('vb_jwt_token');
        if (token) {
          const data = await api.getMe().catch(() => null);
          if (data) {
            const name = db.getUsers().find(u => u.email === data.user.email)?.name || data.user.email.split('@')[0];
            const resolvedUser = {
              id: data.user.userId,
              name,
              email: data.user.email,
              role: data.user.role,
              vendorId: data.user.vendorId
            };
            db.setCurrentUser(resolvedUser);
            setState(prev => ({ ...prev, currentUser: resolvedUser }));
            return;
          }
        }
        
        db.setCurrentUser(null);
        setState(prev => ({ ...prev, currentUser: null }));
      } catch (e: any) {
        alert(`Failed to connect to MySQL backend: ${e.message}\nMake sure backend is running.`);
        localStorage.setItem('vb_backend_mode', 'false');
        setBackendModeState(false);
        setBackendConnected(false);
      }
    } else {
      api.clearToken();
      localStorage.setItem('vb_backend_mode', 'false');
      setBackendModeState(false);
      // Restore mockDb currentUser if it exists
      const user = db.getCurrentUser();
      setState(prev => ({ ...prev, currentUser: user }));
    }
  };

  const login = async (email: string, password: string) => {
    if (backendMode) {
      const data = await api.login(email, password);
      const userObj = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        vendorId: data.user.vendorId
      };
      db.setCurrentUser(userObj);
      setState(prev => ({ ...prev, currentUser: userObj }));
      await fetchBackendData();
    } else {
      const user = db.getUsers().find(u => u.email === email);
      if (!user) {
        throw new Error('Invalid email or password.');
      }
      const expectedPassword = DEFAULT_PASSWORDS[email] || 'Vendor@123';
      if (password !== expectedPassword) {
        throw new Error('Invalid email or password.');
      }
      db.setCurrentUser(user);
      setState(prev => ({ ...prev, currentUser: user }));
    }
  };

  const signup = async (payload: { name: string; email: string; role: UserRole; password: string; vendorId?: string }) => {
    if (backendMode) {
      await api.signup(payload);
    } else {
      const usersList = db.getUsers();
      if (usersList.some(u => u.email === payload.email)) {
        throw new Error('Email already registered');
      }
      const newUser = {
        id: `u-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        vendorId: payload.vendorId
      };
      db.setUsers([...usersList, newUser]);
      DEFAULT_PASSWORDS[payload.email] = payload.password;
    }
  };

  const logout = async () => {
    if (backendMode) {
      await api.logout().catch(() => {});
    }
    db.setCurrentUser(null);
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const markNotificationsAsRead = async () => {
    if (backendMode) {
      await api.markNotificationsRead().catch(() => {});
      fetchBackendData();
    } else {
      const notifs = db.getNotifications();
      const updated = notifs.map(n => ({ ...n, read: true }));
      db.setNotifications(updated);
    }
  };

  return {
    ...state,
    currentUser: state.currentUser as User,
    backendMode,
    backendConnected,
    toggleBackendMode,
    login,
    signup,
    logout,
    markNotificationsAsRead,
    triggerBackendSync: fetchBackendData
  };
};
