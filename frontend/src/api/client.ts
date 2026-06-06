const API_BASE = 'http://localhost:5000/api/v1';

// Get JWT token from storage
const getToken = () => localStorage.getItem('vb_jwt_token');

export const api = {
  setToken: (token: string) => localStorage.setItem('vb_jwt_token', token),
  clearToken: () => localStorage.removeItem('vb_jwt_token'),

  // Helper for requests
  request: async (path: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (response.status === 401 && path !== '/auth/login') {
      api.clearToken();
      localStorage.removeItem('vb_current_user');
      window.dispatchEvent(new Event('vb_session_expired'));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Auth endpoints
  login: async (email: string, password: string) => {
    const data = await api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.accessToken) {
      api.setToken(data.accessToken);
    }
    return data;
  },

  signup: async (payload: any) => {
    return api.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getMe: async () => {
    return api.request('/auth/me');
  },

  logout: async () => {
    try {
      const token = getToken();
      await api.request('/auth/logout', { 
        method: 'POST',
        body: JSON.stringify({ refreshToken: token }) 
      });
    } catch (e) {}
    api.clearToken();
  },

  // Vendors
  getVendors: () => api.request('/vendors'),
  createVendor: (vendor: any) => api.request('/vendors', {
    method: 'POST',
    body: JSON.stringify(vendor)
  }),
  updateVendorStatus: (id: string, status: string) => api.request(`/vendors/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),

  // RFQs
  getRFQs: () => api.request('/rfqs'),
  getRFQDetails: (id: string) => api.request(`/rfqs/${id}`),
  createRFQ: (rfq: any) => api.request('/rfqs', {
    method: 'POST',
    body: JSON.stringify(rfq)
  }),

  // Quotations
  submitQuotation: (quote: any) => api.request('/quotations', {
    method: 'POST',
    body: JSON.stringify(quote)
  }),
  awardQuotation: (id: string, rfqId: string) => api.request(`/quotations/${id}/award`, {
    method: 'POST',
    body: JSON.stringify({ rfqId })
  }),

  // Approvals
  getApprovals: () => api.request('/approvals'),
  processApproval: (id: string, status: string, remarks: string) => api.request(`/approvals/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ status, remarks })
  }),

  // POs
  getPOs: () => api.request('/purchase-orders'),
  acknowledgePO: (id: string) => api.request(`/purchase-orders/${id}/acknowledge`, {
    method: 'POST'
  }),

  // Invoices
  getInvoices: () => api.request('/invoices'),
  createInvoice: (poId: string) => api.request('/invoices', {
    method: 'POST',
    body: JSON.stringify({ poId })
  }),
  payInvoice: (id: string) => api.request(`/invoices/${id}/pay`, {
    method: 'POST'
  }),

  // Logs & Dashboard
  getDashboardSummary: () => api.request('/dashboard/summary'),
  getActivityLogs: (search?: string) => api.request(`/activity-logs${search ? `?search=${search}` : ''}`),
  markNotificationsRead: () => api.request('/dashboard/notifications/read', { method: 'POST' })
};
