import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { db, logActivity, createNotification } from '../db/mockDb';
import { RFQ, RFQItem, RFQVendor } from '../types';
import { Plus, Search, Calendar, FileText, CheckCircle, ArrowRight, Trash2 } from 'lucide-react';

interface RFQsProps {
  onNavigate: (tab: string, arg?: string) => void;
}

export const RFQs: React.FC<RFQsProps> = ({ onNavigate }) => {
  const { rfqs, rfqItems, rfqVendors, vendors, currentUser, backendMode, triggerBackendSync } = useAppState();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  
  // Dynamic Line Items State
  const [items, setItems] = useState<{ description: string; quantity: number; unit: string }[]>([
    { description: '', quantity: 1, unit: 'units' }
  ]);

  // Selected Vendor IDs state
  const [assignedVendors, setAssignedVendors] = useState<string[]>([]);

  const activeVendors = vendors.filter(v => v.status === 'ACTIVE');

  // Handle dynamic items
  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'units' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(updated);
  };

  const handleToggleVendor = (vendorId: string) => {
    if (assignedVendors.includes(vendorId)) {
      setAssignedVendors(assignedVendors.filter(id => id !== vendorId));
    } else {
      setAssignedVendors([...assignedVendors, vendorId]);
    }
  };

  const handleCreateRfq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline || assignedVendors.length === 0 || items.some(item => !item.description)) {
      alert('Please fill out all fields, add items, and select at least one vendor.');
      return;
    }

    const rfqId = `rfq-${Date.now()}`;
    const newRfq: RFQ = {
      id: rfqId,
      title,
      description,
      deadline,
      status: 'PUBLISHED', // Start as Published so vendors can bid immediately
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };

    if (backendMode) {
      import('../api/client').then(async ({ api }) => {
        try {
          await api.createRFQ({
            title,
            description,
            deadline: new Date(deadline).toISOString(),
            items: items.map(i => ({
              description: i.description,
              quantity: i.quantity,
              unit: i.unit
            })),
            vendorIds: assignedVendors
          });
          await triggerBackendSync();
        } catch (err: any) {
          alert(err.message);
        }
      });
    } else {
      // Save RFQ
      const updatedRfqs = [newRfq, ...rfqs];
      db.setRFQs(updatedRfqs);

      // Save items
      const newRfqItems: RFQItem[] = items.map((item, index) => ({
        id: `ri-${Date.now()}-${index}`,
        rfqId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit
      }));
      db.setRFQItems([...rfqItems, ...newRfqItems]);

      // Save vendor linkages
      const newRfqVendors: RFQVendor[] = assignedVendors.map((vId, index) => ({
        id: `rv-${Date.now()}-${index}`,
        rfqId,
        vendorId: vId
      }));
      db.setRFQVendors([...rfqVendors, ...newRfqVendors]);

      // Send notifications to each assigned vendor
      assignedVendors.forEach(vId => {
        const vendorObj = vendors.find(v => v.id === vId);
        createNotification(
          'VENDOR',
          `New RFQ Published: "${title}". Bid deadline: ${deadline}.`,
          vId
        );
      });

      logActivity(
        currentUser.name,
        currentUser.role,
        'Published RFQ',
        'RFQ',
        rfqId,
        `Published RFQ "${title}" with ${items.length} line items and assigned ${assignedVendors.length} vendors.`
      );
    }

    // Reset Form
    setTitle('');
    setDescription('');
    setDeadline('');
    setItems([{ description: '', quantity: 1, unit: 'units' }]);
    setAssignedVendors([]);
    setShowCreateModal(false);
  };

  const handleRfqClick = (rfqId: string) => {
    setSelectedRfqId(selectedRfqId === rfqId ? null : rfqId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.5rem' }}>
            Request For Quotations (RFQs)
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Publish specifications, invite suppliers to bid, and manage deadlines.
          </p>
        </div>
        {(currentUser.role === 'ADMIN' || currentUser.role === 'PROCUREMENT_OFFICER') && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Launch New RFQ
          </button>
        )}
      </div>

      {/* RFQ List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {rfqs.map(rfq => {
          const rfqItemDetails = rfqItems.filter(item => item.rfqId === rfq.id);
          const rfqVendorLinks = rfqVendors.filter(rv => rv.rfqId === rfq.id);
          const isExpanded = selectedRfqId === rfq.id;

          // Check if user is a vendor and if this rfq is assigned to them
          const isUserVendor = currentUser.role === 'VENDOR';
          const isAssignedToUser = rfqVendorLinks.some(rv => rv.vendorId === currentUser.vendorId);
          
          if (isUserVendor && !isAssignedToUser) return null; // Vendor only sees assigned RFQs

          return (
            <div 
              key={rfq.id} 
              className={`card ${isExpanded ? 'active' : ''}`}
              style={{ 
                cursor: 'pointer',
                borderColor: isExpanded ? 'var(--primary)' : 'var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
              onClick={() => handleRfqClick(rfq.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={`badge ${
                  rfq.status === 'PUBLISHED' ? 'badge-info' : 
                  rfq.status === 'AWARDED' ? 'badge-success' : 
                  rfq.status === 'CLOSED' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {rfq.status}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <Calendar size={12} />
                  <span>Due: {rfq.deadline}</span>
                </div>
              </div>

              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {rfq.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {rfq.description}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                <span>{rfqItemDetails.length} Line Items</span>
                <span>{rfqVendorLinks.length} Invited Vendors</span>
              </div>

              {isExpanded && (
                <div 
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}
                  onClick={(e) => e.stopPropagation()} // Prevent collapse on click inside
                >
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Specification Items</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {rfqItemDetails.map(item => (
                        <li key={item.id} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px' }}>
                          <span>{item.description}</span>
                          <strong style={{ color: 'var(--text-main)' }}>{item.quantity} {item.unit}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Invited Suppliers</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {rfqVendorLinks.map(rv => {
                        const v = vendors.find(vObj => vObj.id === rv.vendorId);
                        return v ? (
                          <span key={rv.id} className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                            {v.companyName}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {currentUser.role !== 'VENDOR' && rfq.status === 'PUBLISHED' && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                      onClick={() => onNavigate('comparison')}
                    >
                      Compare Bids & Award <ArrowRight size={14} />
                    </button>
                  )}
                  
                  {currentUser.role === 'VENDOR' && rfq.status === 'PUBLISHED' && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                      onClick={() => onNavigate('vendor-portal')}
                    >
                      Submit Quotation <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Launch RFQ Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              Launch Request For Quotation (RFQ)
            </h2>
            <form onSubmit={handleCreateRfq} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-group">
                <label className="form-label">RFQ Title *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Procurement of Core Switches and Servers" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Overview Description</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Provide scope of work, technical guidelines, or shipping requirements..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ width: '220px' }}>
                <label className="form-label">Submission Deadline *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>

              {/* Dynamic Line Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Procurement Line Items *</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                    + Add Line Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Item description (e.g. Dell PowerEdge Server)" 
                        style={{ flex: 1 }}
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        required
                      />
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Qty" 
                        style={{ width: '80px' }}
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                      <select 
                        className="form-select" 
                        style={{ width: '100px' }}
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      >
                        <option value="units">Units</option>
                        <option value="tons">Tons</option>
                        <option value="kg">Kg</option>
                        <option value="hours">Hours</option>
                      </select>
                      {items.length > 1 && (
                        <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.75rem' }} onClick={() => handleRemoveItem(idx)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendor Assignment */}
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Assign Suppliers to Invite * (Select all that apply)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  {activeVendors.map(vendor => (
                    <label key={vendor.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={assignedVendors.includes(vendor.id)}
                        onChange={() => handleToggleVendor(vendor.id)}
                      />
                      <span>{vendor.companyName} ({vendor.category})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish RFQ & Notify Vendors
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
