import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { db, logActivity } from '../db/mockDb';
import { Vendor } from '../types';
import { Plus, Search, Edit2, AlertOctagon, CheckCircle2, Star, Trash2 } from 'lucide-react';

// Indian GST State codes mapping
const GST_STATE_CODES: Record<string, string> = {
  "27": "Maharashtra",
  "29": "Karnataka",
  "07": "Delhi",
  "19": "West Bengal",
  "09": "Uttar Pradesh",
  "33": "Tamil Nadu",
  "24": "Gujarat"
};

export const Vendors: React.FC = () => {
  const { vendors, currentUser, backendMode, triggerBackendSync } = useAppState();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form States
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [category, setCategory] = useState('IT');
  const [contactEmail, setContactEmail] = useState('');
  const [rating, setRating] = useState(4.0);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'BLACKLISTED'>('ACTIVE');
  const [location, setLocation] = useState('');
  const [gstVerified, setGstVerified] = useState(false);
  const [gstError, setGstError] = useState('');

  // Search & Filter Logic
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.companyName.toLowerCase().includes(search.toLowerCase()) || 
                          v.gstNumber.toLowerCase().includes(search.toLowerCase()) ||
                          v.contactEmail.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === '' || v.category === categoryFilter;
    const matchesStatus = statusFilter === '' || v.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleGstVerify = () => {
    // Validate GST format (Basic: 15 characters alphanumeric, starting with 2 digits)
    const cleanGst = gstin.trim().toUpperCase();
    if (cleanGst.length !== 15) {
      setGstError('GSTIN must be exactly 15 characters.');
      setGstVerified(false);
      return;
    }

    const stateCode = cleanGst.substring(0, 2);
    const resolvedState = GST_STATE_CODES[stateCode];

    if (!resolvedState) {
      setGstError('Invalid state code in GSTIN. Double check digits.');
      setGstVerified(false);
      return;
    }

    setLocation(resolvedState);
    setGstError('');
    setGstVerified(true);
  };

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !gstin || !contactEmail) return;

    if (!gstVerified) {
      handleGstVerify();
      return;
    }

    const newVendor: Vendor = {
      id: `v-${Date.now()}`,
      companyName,
      gstNumber: gstin.toUpperCase(),
      category,
      contactEmail,
      status,
      rating,
      location: location || 'Maharashtra'
    };

    if (backendMode) {
      import('../api/client').then(async ({ api }) => {
        try {
          await api.createVendor({
            companyName,
            gstNumber: gstin.toUpperCase(),
            category,
            contactName: companyName,
            contactEmail,
            location: location || 'Maharashtra',
            rating
          });
          await triggerBackendSync();
        } catch (err: any) {
          alert(err.message);
        }
      });
    } else {
      db.setVendors([...vendors, newVendor]);
      logActivity(
        currentUser.name,
        currentUser.role,
        'Added Vendor',
        'VENDOR',
        newVendor.id,
        `Onboarded supplier ${companyName} with GSTIN ${newVendor.gstNumber} located in ${newVendor.location}`
      );
    }

    // Reset Form & Close Modal
    setCompanyName('');
    setGstin('');
    setCategory('IT');
    setContactEmail('');
    setRating(4.0);
    setStatus('ACTIVE');
    setLocation('');
    setGstVerified(false);
    setGstError('');
    setShowAddModal(false);
  };

  const toggleStatus = (id: string, currentStatus: Vendor['status']) => {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'PROCUREMENT_OFFICER') return;
    
    const nextStatusMap: Record<Vendor['status'], Vendor['status']> = {
      'ACTIVE': 'INACTIVE',
      'INACTIVE': 'BLACKLISTED',
      'BLACKLISTED': 'ACTIVE'
    };

    const newStatus = nextStatusMap[currentStatus];

    if (backendMode) {
      import('../api/client').then(async ({ api }) => {
        try {
          await api.updateVendorStatus(id, newStatus);
          await triggerBackendSync();
        } catch (err: any) {
          alert(err.message);
        }
      });
    } else {
      const updated = vendors.map(v => {
        if (v.id === id) {
          logActivity(
            currentUser.name,
            currentUser.role,
            'Updated Vendor Status',
            'VENDOR',
            id,
            `Changed status of ${v.companyName} from ${currentStatus} to ${newStatus}`
          );
          return { ...v, status: newStatus };
        }
        return v;
      });

      db.setVendors(updated);
    }
  };

  const categories = Array.from(new Set(vendors.map(v => v.category)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.5rem' }}>
            Vendor Registry
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Onboard suppliers, track ratings, and manage GST tax settings.
          </p>
        </div>
        {(currentUser.role === 'ADMIN' || currentUser.role === 'PROCUREMENT_OFFICER') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Onboard New Vendor
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by vendor name, email, or GSTIN..." 
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            className="form-select" 
            style={{ width: '180px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          <select 
            className="form-select" 
            style={{ width: '180px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Vendors List Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Category</th>
                <th>GSTIN</th>
                <th>Location State</th>
                <th>Rating</th>
                <th>Status</th>
                { (currentUser.role === 'ADMIN' || currentUser.role === 'PROCUREMENT_OFFICER') && <th>Actions</th> }
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                    No vendors match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredVendors.map(vendor => (
                  <tr key={vendor.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{vendor.companyName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{vendor.contactEmail}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-info">{vendor.category}</span></td>
                    <td><code style={{ fontSize: '0.85rem' }}>{vendor.gstNumber}</code></td>
                    <td>{vendor.location}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={14} fill="var(--warning)" color="var(--warning)" />
                        <span>{vendor.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        vendor.status === 'ACTIVE' ? 'badge-success' : 
                        vendor.status === 'INACTIVE' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    { (currentUser.role === 'ADMIN' || currentUser.role === 'PROCUREMENT_OFFICER') && (
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ gap: '0.25rem' }} 
                          onClick={() => toggleStatus(vendor.id, vendor.status)}
                          title="Toggle Status"
                        >
                          <Edit2 size={12} /> Status
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              Onboard Vendor Partner
            </h2>
            <form onSubmit={handleAddVendor} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Apex Industrial Supplies" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Indian GSTIN * (15-digit Tax Code)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 27AAAAA1111A1Z1" 
                    value={gstin}
                    onChange={(e) => {
                      setGstin(e.target.value);
                      setGstVerified(false);
                    }}
                    style={{ flex: 1 }}
                    required
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleGstVerify}>
                    Verify GST
                  </button>
                </div>
                {gstVerified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    <CheckCircle2 size={14} /> Resolved State: <strong>{location}</strong>
                  </div>
                )}
                {gstError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    <AlertOctagon size={14} /> {gstError}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select 
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="IT">IT & Tech Hardware</option>
                    <option value="Manufacturing">Manufacturing & Materials</option>
                    <option value="Logistics">Logistics & Supply</option>
                    <option value="Office Supplies">Office Supplies & Furniture</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Rating (1.0 to 5.0)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1.0" 
                    max="5.0" 
                    step="0.1" 
                    value={rating}
                    onChange={(e) => setRating(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="sales@company.com" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="ACTIVE">Active Supplier</option>
                  <option value="INACTIVE">Inactive / Temp Hold</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {gstVerified ? 'Save Vendor' : 'Verify & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
