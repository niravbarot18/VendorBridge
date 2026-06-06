import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { db, logActivity, createNotification } from '../db/mockDb';
import { api } from '../api/client';
import { Quotation, QuotationItem } from '../types';
import { CheckCircle2, AlertCircle, FileSpreadsheet, Hourglass, Award, Send } from 'lucide-react';

export const VendorPortal: React.FC = () => {
  const { rfqs, rfqItems, rfqVendors, quotations, vendors, currentUser, backendMode, triggerBackendSync } = useAppState();
  const [activeRfqId, setActiveRfqId] = useState<string | null>(null);

  // Form States for Quotation
  const [deliveryDays, setDeliveryDays] = useState(10);
  const [notes, setNotes] = useState('');
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});

  // Ensure current user is actually a vendor
  const isVendor = currentUser.role === 'VENDOR';
  const vendorId = currentUser.vendorId;
  const vendorDetail = vendors.find(v => v.id === vendorId);

  if (!isVendor || !vendorId || !vendorDetail) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" />
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Vendor Access Required</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
          Please use the role switcher at the top to change your role to a **Vendor** (e.g. Vikram Gupta, Amit Singh) to test this module.
        </p>
      </div>
    );
  }

  // Find RFQs assigned to this specific vendor
  const assignedRfqLinks = rfqVendors.filter(rv => rv.vendorId === vendorId);
  const assignedRfqs = rfqs.filter(rfq => 
    assignedRfqLinks.some(rv => rv.rfqId === rfq.id)
  );

  const handleOpenBidForm = (rfqId: string) => {
    setActiveRfqId(rfqId);
    setNotes('');
    setDeliveryDays(10);
    
    // Pre-populate prices if quotation exists
    const existingQuote = quotations.find(q => q.rfqId === rfqId && q.vendorId === vendorId);
    if (existingQuote) {
      setNotes(existingQuote.notes);
      setDeliveryDays(existingQuote.deliveryDays);
      const existingQuoteItems = db.getQuotationItems().filter(qi => qi.quotationId === existingQuote.id);
      const priceMap: Record<string, number> = {};
      existingQuoteItems.forEach(qi => {
        priceMap[qi.rfqItemId] = qi.unitPrice;
      });
      setItemPrices(priceMap);
    } else {
      setItemPrices({});
    }
  };

  const handlePriceChange = (rfqItemId: string, priceStr: string) => {
    const price = parseFloat(priceStr) || 0;
    setItemPrices({
      ...itemPrices,
      [rfqItemId]: price
    });
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRfqId) return;

    const currentRfqItems = rfqItems.filter(item => item.rfqId === activeRfqId);
    
    // Validate all prices entered
    const missingPrices = currentRfqItems.some(item => !itemPrices[item.id] || itemPrices[item.id] <= 0);
    if (missingPrices) {
      alert('Please enter a valid price for all line items before submitting.');
      return;
    }

    // Calculate totals
    let totalPrice = 0;
    currentRfqItems.forEach(item => {
      totalPrice += (itemPrices[item.id] || 0) * item.quantity;
    });

    if (backendMode) {
      try {
        const payload = {
          rfqId: activeRfqId,
          vendorId,
          totalPrice,
          deliveryDays,
          notes: notes || undefined,
          items: currentRfqItems.map(item => ({
            rfqItemId: item.id,
            unitPrice: itemPrices[item.id] || 0,
            totalPrice: (itemPrices[item.id] || 0) * item.quantity
          }))
        };
        await api.submitQuotation(payload);
        alert('Quotation submitted successfully to the backend!');
        triggerBackendSync();
        setActiveRfqId(null);
      } catch (err: any) {
        alert(`Failed to submit quotation: ${err.message}`);
      }
      return;
    }

    const quotationId = `q-${Date.now()}`;
    const newQuotation: Quotation = {
      id: quotationId,
      rfqId: activeRfqId,
      vendorId,
      totalPrice,
      deliveryDays,
      notes,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString()
    };

    // Filter out previous quote for same RFQ by this vendor if editing
    const otherQuotes = quotations.filter(q => !(q.rfqId === activeRfqId && q.vendorId === vendorId));
    db.setQuotations([...otherQuotes, newQuotation]);

    // Save quotation items
    const newQuoteItems: QuotationItem[] = currentRfqItems.map((item, idx) => ({
      id: `qi-${Date.now()}-${idx}`,
      quotationId,
      rfqItemId: item.id,
      unitPrice: itemPrices[item.id] || 0,
      totalPrice: (itemPrices[item.id] || 0) * item.quantity
    }));

    const otherQuoteItems = db.getQuotationItems().filter(qi => 
      !otherQuotes.some(oq => oq.id === qi.quotationId)
    );
    db.setQuotationItems([...otherQuoteItems, ...newQuoteItems]);

    // Notify Procurement Officers
    createNotification(
      'PROCUREMENT_OFFICER',
      `New bid quotation submitted by "${vendorDetail.companyName}" for RFQ: "${rfqs.find(r => r.id === activeRfqId)?.title}".`
    );

    logActivity(
      vendorDetail.companyName,
      'VENDOR',
      'Submitted Quotation',
      'QUOTATION',
      quotationId,
      `Submitted total bid of ₹${totalPrice.toLocaleString('en-IN')} with delivery in ${deliveryDays} days.`
    );

    setActiveRfqId(null);
  };

  const activeRfq = rfqs.find(r => r.id === activeRfqId);
  const activeRfqLineItems = activeRfq ? rfqItems.filter(item => item.rfqId === activeRfqId) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem' }}>
            Vendor Portal
          </h1>
          <span className="badge badge-info" style={{ textTransform: 'none' }}>
            Logged in as: {vendorDetail.companyName}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          View invitations, submit commercial quotes, and monitor award statuses.
        </p>
      </div>

      {!activeRfqId ? (
        /* Invited RFQs List */
        <div className="card">
          <div className="card-title">Assigned RFQ Bidding Invitations</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RFQ Title</th>
                  <th>Closing Date</th>
                  <th>RFQ Status</th>
                  <th>Your Quote Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignedRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                      No active RFQ bidding requests assigned to your company.
                    </td>
                  </tr>
                ) : (
                  assignedRfqs.map(rfq => {
                    const quote = quotations.find(q => q.rfqId === rfq.id && q.vendorId === vendorId);
                    
                    return (
                      <tr key={rfq.id}>
                        <td style={{ fontWeight: 600 }}>{rfq.title}</td>
                        <td>{rfq.deadline}</td>
                        <td>
                          <span className={`badge ${
                            rfq.status === 'PUBLISHED' ? 'badge-info' : 
                            rfq.status === 'AWARDED' ? 'badge-success' : 'badge-danger'
                          }`}>
                            {rfq.status}
                          </span>
                        </td>
                        <td>
                          {quote ? (
                            <span className={`badge ${quote.status === 'AWARDED' ? 'badge-success' : 'badge-info'}`} style={{ display: 'flex', width: 'fit-content', gap: '0.25rem', alignItems: 'center' }}>
                              {quote.status === 'AWARDED' ? <Award size={12} /> : <CheckCircle2 size={12} />}
                              {quote.status === 'AWARDED' ? 'Quote Awarded!' : `Bid Submitted (₹${quote.totalPrice.toLocaleString('en-IN')})`}
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ display: 'flex', width: 'fit-content', gap: '0.25rem', alignItems: 'center' }}>
                              <Hourglass size={12} /> Pending Quote
                            </span>
                          )}
                        </td>
                        <td>
                          {rfq.status === 'PUBLISHED' ? (
                            <button className="btn btn-primary btn-sm" onClick={() => handleOpenBidForm(rfq.id)}>
                              {quote ? 'Edit Quotation' : 'Submit Bid'}
                            </button>
                          ) : (
                            <button className="btn btn-secondary btn-sm" disabled>
                              Bidding Closed
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Quotation Submission Form */
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600 }}>
                Quotation Submission Form
              </h2>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                RFQ Ref: {activeRfq?.title}
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveRfqId(null)}>
              Back to List
            </button>
          </div>

          <form onSubmit={handleSubmitQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Line Items Pricing */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>
                Enter Unit Rates for Line Items
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeRfqLineItems.map(item => {
                  const unitPrice = itemPrices[item.id] || 0;
                  const itemTotal = unitPrice * item.quantity;
                  return (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr', 
                        gap: '1.5rem', 
                        alignItems: 'center', 
                        padding: '1rem', 
                        backgroundColor: 'rgba(255,255,255,0.02)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px' 
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{item.description}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty: {item.quantity} {item.unit}</span>
                      </div>
                      
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Unit Price (₹) *</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          min="0"
                          placeholder="Rate"
                          value={itemPrices[item.id] || ''}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          required
                        />
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Line Total</span>
                        <strong style={{ fontSize: '0.95rem' }}>₹{itemTotal.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Guaranteed Delivery Timeline * (Days)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="1"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bidding Notes & Terms (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Standard warranty details, advance requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '1.5rem', 
                marginTop: '1rem' 
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Bid Price (Excluding Taxes):</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                  ₹{Object.entries(itemPrices).reduce((sum, [itemId, price]) => {
                    const item = activeRfqLineItems.find(i => i.id === itemId);
                    return sum + (price * (item ? item.quantity : 0));
                  }, 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveRfqId(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Send size={14} /> Submit Quotation Bid
                </button>
              </div>
            </div>

          </form>
        </div>
      )}
    </div>
  );
};
