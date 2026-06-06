import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { db, logActivity, createNotification } from '../db/mockDb';
import { api } from '../api/client';
import { Approval, PurchaseOrder, Quotation, RFQ, Vendor } from '../types';
import { AlertCircle, CheckCircle, XCircle, Clock, ShieldCheck, CheckSquare, Sparkles } from 'lucide-react';

export const Approvals: React.FC = () => {
  const { approvals, quotations, rfqs, vendors, currentUser, rfqItems, quotationItems, backendMode, triggerBackendSync } = useAppState();
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  // Filter approvals based on current user role
  // Managers see pending, admins/procurement officers see all histories
  const isManager = currentUser.role === 'MANAGER';
  const displayApprovals = isManager 
    ? approvals.filter(a => a.status === 'PENDING')
    : approvals;

  const activeApproval = approvals.find(a => a.id === selectedApprovalId);

  // Derive referenced entities
  const getApprovalDetails = (appr: Approval) => {
    const quote = quotations.find(q => q.id === appr.quotationId);
    const rfq = quote ? rfqs.find(r => r.id === quote.rfqId) : null;
    const vendor = quote ? vendors.find(v => v.id === quote.vendorId) : null;
    const items = rfq ? rfqItems.filter(ri => ri.rfqId === rfq.id) : [];
    const qItems = quote ? quotationItems.filter(qi => qi.quotationId === quote.id) : [];

    return { quote, rfq, vendor, rfqItems: items, quoteItems: qItems };
  };

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedApprovalId || !activeApproval) return;
    if (!remarks.trim()) {
      alert('Mandatory Remarks: Please enter remarks/comments before completing approval action.');
      return;
    }

    if (backendMode) {
      try {
        await api.processApproval(selectedApprovalId, status, remarks);
        alert(`Approval status successfully set to: ${status}`);
        await triggerBackendSync();
        setRemarks('');
        setSelectedApprovalId(null);
      } catch (err: any) {
        alert(`Failed to process approval: ${err.message}`);
      }
      return;
    }

    const { quote, rfq, vendor } = getApprovalDetails(activeApproval);
    if (!quote || !rfq || !vendor) return;

    // 1. Update Approval status and remarks
    const updatedApprovals = approvals.map(a => {
      if (a.id === selectedApprovalId) {
        return {
          ...a,
          status,
          remarks,
          actionedAt: new Date().toISOString()
        };
      }
      return a;
    });
    db.setApprovals(updatedApprovals);

    if (status === 'APPROVED') {
      // 2. Generate Purchase Order (PO-2026-NNNN)
      const pos = db.getPOs();
      const currentYear = new Date().getFullYear();
      const nextSequence = String(pos.length + 1).padStart(4, '0');
      const poNumber = `PO-${currentYear}-${nextSequence}`;

      const newPo: PurchaseOrder = {
        id: `po-${Date.now()}`,
        approvalId: selectedApprovalId,
        poNumber,
        amount: quote.totalPrice,
        status: 'ISSUED', // Sent to vendor automatically
        issuedAt: new Date().toISOString()
      };
      db.setPOs([...pos, newPo]);

      // 3. Notify Procurement Officers and Vendor
      createNotification(
        'PROCUREMENT_OFFICER',
        `Award Approved: Purchase Order ${poNumber} generated for "${vendor.companyName}" (₹${quote.totalPrice.toLocaleString('en-IN')}).`
      );
      createNotification(
        'VENDOR',
        `Contract Awarded: Purchase Order ${poNumber} has been issued to your portal. Please review and acknowledge.`,
        vendor.id
      );

      logActivity(
        currentUser.name,
        currentUser.role,
        'Approved Quotation',
        'APPROVAL',
        selectedApprovalId,
        `Approved bid award of ₹${quote.totalPrice.toLocaleString('en-IN')} to "${vendor.companyName}" with remarks: "${remarks}". Generated PO ${poNumber}.`
      );
    } else {
      // 2. Update quotation status back to SUBMITTED if rejected, and reopen RFQ status to PUBLISHED
      const updatedQuotes = quotations.map(q => {
        if (q.id === quote.id) {
          return { ...q, status: 'REJECTED' as const };
        }
        return q;
      });
      db.setQuotations(updatedQuotes);

      const updatedRfqs = rfqs.map(r => {
        if (r.id === rfq.id) {
          return { ...r, status: 'PUBLISHED' as const }; // Reopens RFQ bidding comparison
        }
        return r;
      });
      db.setRFQs(updatedRfqs);

      // 3. Notify Procurement Officer
      createNotification(
        'PROCUREMENT_OFFICER',
        `Award Rejected: Manager declined award recommendation to "${vendor.companyName}". Reason: "${remarks}".`
      );

      logActivity(
        currentUser.name,
        currentUser.role,
        'Rejected Quotation',
        'APPROVAL',
        selectedApprovalId,
        `Rejected bid award to "${vendor.companyName}" with remarks: "${remarks}". RFQ is reopened.`
      );
    }

    setRemarks('');
    setSelectedApprovalId(null);
  };

  const details = activeApproval ? getApprovalDetails(activeApproval) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.5rem' }}>
          Approval Center
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Review procurement awards, audit supplier line items, and authorize purchases.
        </p>
      </div>

      {!selectedApprovalId ? (
        /* Approval Queue */
        <div className="card">
          <div className="card-title">Pending Authorizations Queue</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RFQ / Purchase Title</th>
                  <th>Supplier Awardee</th>
                  <th>Total Purchase (INR)</th>
                  <th>Initiated Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                      No approval items are pending in your queue.
                    </td>
                  </tr>
                ) : (
                  displayApprovals.map(appr => {
                    const info = getApprovalDetails(appr);
                    return (
                      <tr key={appr.id}>
                        <td style={{ fontWeight: 600 }}>{info.rfq?.title || 'N/A'}</td>
                        <td>{info.vendor?.companyName || 'N/A'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          ₹{info.quote?.totalPrice.toLocaleString('en-IN') || '0'}
                        </td>
                        <td>{new Date(appr.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${
                            appr.status === 'APPROVED' ? 'badge-success' : 
                            appr.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {appr.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => setSelectedApprovalId(appr.id)}
                          >
                            Review & Sign
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeApproval ? (
        /* Approval Detail Audit Screen */
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Purchase Details */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span className="badge badge-warning" style={{ marginBottom: '0.25rem' }}>Reviewing Award Request</span>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 600 }}>
                    {details?.rfq?.title}
                  </h2>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedApprovalId(null)}>
                  Back
                </button>
              </div>

              {/* Line Items Grid */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Commercial Bid Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {details?.rfqItems.map(item => {
                    const qItem = details.quoteItems.find(qi => qi.rfqItemId === item.id);
                    return (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.9rem' }}>
                        <div>
                          <strong>{item.description}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty: {item.quantity} {item.unit}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong>₹{qItem ? qItem.totalPrice.toLocaleString('en-IN') : '0'}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{qItem ? qItem.unitPrice.toLocaleString('en-IN') : '0'} / {item.unit}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Awarded Vendor Partner</span>
                  <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{details?.vendor?.companyName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>GSTIN: {details?.vendor?.gstNumber} | {details?.vendor?.location}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivery Lead Time</span>
                  <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{details?.quote?.deliveryDays} Days</div>
                </div>
              </div>
            </div>

            {/* Manager Actions Block */}
            {activeApproval.status === 'PENDING' && isManager && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>
                  Authorize Sign-off & Remarks
                </h3>
                
                <div className="form-group">
                  <label className="form-label">Mandatory Comments / Auditing Remarks *</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Provide details on why this bid is approved or rejected (e.g. Price conforms to budget limits)..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button className="btn btn-danger" onClick={() => handleAction('REJECTED')}>
                    <XCircle size={14} /> Reject Bid Recommendation
                  </button>
                  <button className="btn btn-primary" onClick={() => handleAction('APPROVED')}>
                    <CheckCircle size={14} /> Sign & Approve Purchase Order
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit Timeline Sidebar Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                Procurement Pipeline Trail
              </h3>
              
              <div className="timeline">
                <div className="timeline-item completed">
                  <div className="timeline-content">
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>RFQ Published</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By Priya Sharma</span>
                  </div>
                </div>
                <div className="timeline-item completed">
                  <div className="timeline-content">
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>Quotation Bidded</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By {details?.vendor?.companyName}</span>
                  </div>
                </div>
                <div className="timeline-item completed">
                  <div className="timeline-content">
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>RFQ Awarded & Routed</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By Priya Sharma</span>
                  </div>
                </div>
                <div className={`timeline-item ${activeApproval.status === 'PENDING' ? 'pending' : 'completed'}`}>
                  <div className="timeline-content">
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>Manager Sign-off</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {activeApproval.status === 'PENDING' 
                        ? 'Awaiting Rajesh Patel' 
                        : `${activeApproval.status} - Rajesh Patel`}
                    </span>
                    {activeApproval.remarks && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        "{activeApproval.remarks}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Smart AI helper details */}
            <div className="card" style={{ display: 'flex', gap: '0.75rem', borderLeft: '3px solid var(--secondary)' }}>
              <Sparkles size={24} color="var(--secondary)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>AI Auditing Insight</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  No anomalies detected in GSTIN credentials or billing rates. This contract proposal matches the historical average for {details?.vendor?.category} within a ±5% price margin.
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="card">Approval item not found.</div>
      )}
    </div>
  );
};
