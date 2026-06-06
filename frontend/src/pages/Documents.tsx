import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { db, logActivity, createNotification, COMPANY_DETAILS } from '../db/mockDb';
import { api } from '../api/client';
import { Invoice, PurchaseOrder } from '../types';
import { FileText, Printer, Mail, Check, CreditCard, ChevronRight, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';

export const Documents: React.FC = () => {
  const { pos, invoices, approvals, vendors, rfqs, rfqItems, quotationItems, quotations, currentUser, backendMode, triggerBackendSync } = useAppState();
  const [activeSubTab, setActiveSubTab] = useState<'PO' | 'INVOICE'>('PO');
  
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  
  // Email Simulation Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Derive PO details (Approvals, quotes, items, vendors)
  const getPoDetails = (po: PurchaseOrder) => {
    const appr = approvals.find(a => a.id === po.approvalId);
    const quote = appr ? quotations.find(q => q.id === appr.quotationId) : null;
    const vendor = quote ? vendors.find(v => v.id === quote.vendorId) : null;
    const rfq = quote ? rfqs.find(r => r.id === quote.rfqId) : null;
    const lineItems = quote ? quotationItems.filter(qi => qi.quotationId === quote.id) : [];
    
    // Map lines to rfqItem descriptions
    const lineItemDetails = lineItems.map(li => {
      const rfqItem = rfqItems.find(ri => ri.id === li.rfqItemId);
      return {
        description: rfqItem ? rfqItem.description : 'Item',
        quantity: rfqItem ? rfqItem.quantity : 0,
        unit: rfqItem ? rfqItem.unit : 'units',
        unitPrice: li.unitPrice,
        totalPrice: li.totalPrice
      };
    });

    return { po, approval: appr, quotation: quote, vendor, rfq, lines: lineItemDetails };
  };

  const getInvoiceDetails = (invoice: Invoice) => {
    const po = pos.find(p => p.id === invoice.poId);
    const poDetails = po ? getPoDetails(po) : null;
    return { invoice, poDetails };
  };

  // Vendor Action: Acknowledge PO
  const handleAcknowledgePo = async (poId: string) => {
    if (backendMode) {
      try {
        await api.acknowledgePO(poId);
        alert('PO Acknowledged successfully.');
        await triggerBackendSync();
      } catch (err: any) {
        alert(`Failed to acknowledge PO: ${err.message}`);
      }
      return;
    }

    const updated = pos.map(p => {
      if (p.id === poId) {
        logActivity(
          currentUser.name,
          currentUser.role,
          'Acknowledged Purchase Order',
          'PO',
          poId,
          `Vendor acknowledged receipt and accepted delivery schedules for PO ${p.poNumber}`
        );
        
        // Notify Procurement Officer
        createNotification(
          'PROCUREMENT_OFFICER',
          `PO Acknowledged: Vendor has accepted Purchase Order ${p.poNumber} and scheduled dispatch.`
        );

        return { ...p, status: 'ACKNOWLEDGED' as const };
      }
      return p;
    });
    db.setPOs(updated);
  };

  // Vendor Action: Generate Invoice from PO
  const handleGenerateInvoice = async (poId: string) => {
    if (backendMode) {
      try {
        const inv = await api.createInvoice(poId);
        alert(`Invoice generated successfully! Invoice No: ${inv.invoiceNumber}`);
        await triggerBackendSync();
        setActiveSubTab('INVOICE');
        setSelectedInvoiceId(inv.id);
      } catch (err: any) {
        alert(`Failed to generate invoice: ${err.message}`);
      }
      return;
    }

    const po = pos.find(p => p.id === poId);
    if (!po) return;

    const poDetails = getPoDetails(po);
    const vendor = poDetails.vendor;
    if (!vendor) return;

    // GST Tax Logic (18% GST standard)
    // intrastate: CGST 9% + SGST 9% (if vendor state === COMPANY state "Maharashtra")
    // interstate: IGST 18% (if vendor state !== COMPANY state)
    const isSameState = vendor.location.trim().toLowerCase() === COMPANY_DETAILS.state.trim().toLowerCase();
    
    const subtotal = po.amount;
    const taxRate = 0.18;
    const totalTax = subtotal * taxRate;
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isSameState) {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    } else {
      igst = totalTax;
    }

    const totalAmount = subtotal + totalTax;

    const invoicesList = db.getInvoices();
    const invoiceNumber = `INV-2026-${String(invoicesList.length + 1).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      poId: po.id,
      invoiceNumber,
      subtotal,
      cgst,
      sgst,
      igst,
      totalAmount,
      status: 'SENT', // Sent immediately on creation by vendor
      invoiceDate: new Date().toISOString().split('T')[0]
    };

    db.setInvoices([...invoicesList, newInvoice]);

    createNotification(
      'PROCUREMENT_OFFICER',
      `Invoice Received: "${vendor.companyName}" submitted Invoice ${invoiceNumber} for ₹${totalAmount.toLocaleString('en-IN')}.`
    );

    logActivity(
      currentUser.name,
      currentUser.role,
      'Sent Invoice',
      'INVOICE',
      newInvoice.id,
      `Issued commercial invoice ${invoiceNumber} linked to PO ${po.poNumber}. Subtotal: ₹${subtotal.toLocaleString('en-IN')}, Tax: ₹${totalTax.toLocaleString('en-IN')}`
    );

    setActiveSubTab('INVOICE');
    setSelectedInvoiceId(newInvoice.id);
  };

  // Buyer Action: Pay Invoice
  const handlePayInvoice = async (invoiceId: string) => {
    if (backendMode) {
      try {
        await api.payInvoice(invoiceId);
        alert('Invoice payment cleared successfully.');
        await triggerBackendSync();
      } catch (err: any) {
        alert(`Failed to pay invoice: ${err.message}`);
      }
      return;
    }

    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        const po = pos.find(p => p.id === inv.poId);
        const poNumber = po ? po.poNumber : 'N/A';
        
        logActivity(
          currentUser.name,
          currentUser.role,
          'Paid Invoice',
          'INVOICE',
          invoiceId,
          `Processed digital payment clearance for Invoice ${inv.invoiceNumber} (₹${inv.totalAmount.toLocaleString('en-IN')})`
        );
        
        // Notify Vendor
        const poDetails = po ? getPoDetails(po) : null;
        if (poDetails?.vendor) {
          createNotification(
            'VENDOR',
            `Payment Cleared: Invoice ${inv.invoiceNumber} has been paid via bank transfer.`,
            poDetails.vendor.id
          );
        }

        return { ...inv, status: 'PAID' as const };
      }
      return inv;
    });
    db.setInvoices(updated);
  };

  // Open Email Modal Simulation
  const handleOpenEmailModal = (inv: Invoice, poNumber: string, vendorEmail: string, companyName: string) => {
    setEmailTarget(vendorEmail);
    setEmailSubject(`Invoice Submission — ${inv.invoiceNumber} / PO Reference: ${poNumber}`);
    setEmailBody(`Dear Finance Team at ${COMPANY_DETAILS.name},\n\nPlease find attached our invoice ${inv.invoiceNumber} corresponding to Purchase Order ${poNumber}.\n\nTotal Amount: ₹${inv.totalAmount.toLocaleString('en-IN')} (including GST).\n\nKindly process the payment as per agreed terms.\n\nRegards,\n${companyName} Sales Team`);
    setEmailSuccess(false);
    setShowEmailModal(true);
  };

  const handleSendEmailSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sending
    setEmailSuccess(true);
    setTimeout(() => {
      setShowEmailModal(false);
      setEmailSuccess(false);
    }, 1800);
  };

  const activePo = selectedPoId ? pos.find(p => p.id === selectedPoId) : null;
  const poView = activePo ? getPoDetails(activePo) : null;

  const activeInvoice = selectedInvoiceId ? invoices.find(i => i.id === selectedInvoiceId) : null;
  const invoiceView = activeInvoice ? getInvoiceDetails(activeInvoice) : null;

  // Filter lists based on roles (Vendors only see their own documents)
  const isVendor = currentUser.role === 'VENDOR';
  const vendorId = currentUser.vendorId;

  const filteredPos = pos.filter(po => {
    if (!isVendor) return true;
    const details = getPoDetails(po);
    return details.vendor?.id === vendorId;
  });

  const filteredInvoices = invoices.filter(inv => {
    if (!isVendor) return true;
    const details = getInvoiceDetails(inv);
    return details.poDetails?.vendor?.id === vendorId;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header (Hidden on Print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.5rem' }}>
            Documents Vault
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Access official Purchase Orders, generate invoices, and track payments under Indian GST compliances.
          </p>
        </div>
      </div>

      {/* Tabs Selector (Hidden on Print) */}
      {!selectedPoId && !selectedInvoiceId && (
        <div className="no-print" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button 
            className={`btn ${activeSubTab === 'PO' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('PO')}
          >
            Purchase Orders ({filteredPos.length})
          </button>
          <button 
            className={`btn ${activeSubTab === 'INVOICE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('INVOICE')}
          >
            Invoices ({filteredInvoices.length})
          </button>
        </div>
      )}

      {/* 1. PURCHASE ORDERS TAB */}
      {!selectedPoId && !selectedInvoiceId && activeSubTab === 'PO' && (
        <div className="card no-print">
          <div className="card-title">Purchase Orders Registry</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier Partners</th>
                  <th>Amount</th>
                  <th>Issued Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                      No Purchase Orders have been generated yet.
                    </td>
                  </tr>
                ) : (
                  filteredPos.map(po => {
                    const info = getPoDetails(po);
                    return (
                      <tr key={po.id}>
                        <td style={{ fontWeight: 600 }}>{po.poNumber}</td>
                        <td>{info.vendor?.companyName || 'N/A'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>₹{po.amount.toLocaleString('en-IN')}</td>
                        <td>{po.issuedAt ? new Date(po.issuedAt).toLocaleDateString() : '-'}</td>
                        <td>
                          <span className={`badge ${
                            po.status === 'ACKNOWLEDGED' ? 'badge-success' : 
                            po.status === 'ISSUED' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '0.25rem' }}
                            onClick={() => setSelectedPoId(po.id)}
                          >
                            View PO <ChevronRight size={12} />
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
      )}

      {/* 2. INVOICES TAB */}
      {!selectedPoId && !selectedInvoiceId && activeSubTab === 'INVOICE' && (
        <div className="card no-print">
          <div className="card-title">Invoices & GST Ledger</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>PO Ref</th>
                  <th>Supplier</th>
                  <th>GST Rate</th>
                  <th>Total Billing</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                      No supplier invoices submitted yet.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => {
                    const info = getInvoiceDetails(inv);
                    const hasIgst = inv.igst > 0;
                    
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                        <td>{info.poDetails?.po.poNumber}</td>
                        <td>{info.poDetails?.vendor?.companyName}</td>
                        <td>
                          <span className="badge badge-secondary" style={{ textTransform: 'none' }}>
                            {hasIgst ? 'IGST 18%' : 'CGST+SGST 18%'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge ${
                            inv.status === 'PAID' ? 'badge-success' : 
                            inv.status === 'SENT' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '0.25rem' }}
                            onClick={() => setSelectedInvoiceId(inv.id)}
                          >
                            View Invoice <ChevronRight size={12} />
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
      )}

      {/* 3. PO DETAILED DOCUMENT VIEW */}
      {selectedPoId && poView && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPoId(null)}>
              ← Back to PO List
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {isVendor && poView.po.status === 'ISSUED' && (
                <>
                  <button className="btn btn-primary" onClick={() => handleAcknowledgePo(poView.po.id)}>
                    <Check size={16} /> Acknowledge PO Receipt
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleGenerateInvoice(poView.po.id)}>
                    <FileText size={16} /> Generate Invoice
                  </button>
                </>
              )}
              {isVendor && poView.po.status === 'ACKNOWLEDGED' && (
                <button className="btn btn-primary" onClick={() => handleGenerateInvoice(poView.po.id)}>
                  <FileText size={16} /> Generate Invoice from PO
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print Purchase Order
              </button>
            </div>
          </div>

          {/* Letterhead Document */}
          <div className="card print-document" style={{ padding: '3rem', border: '1px solid var(--border-color)', backgroundColor: '#0f1524', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--primary)' }}>
                  {COMPANY_DETAILS.name}
                </h1>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '300px', marginTop: '0.25rem' }}>
                  {COMPANY_DETAILS.address}
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  GSTIN: <strong>{COMPANY_DETAILS.gstin}</strong> (State Code: {COMPANY_DETAILS.stateCode})
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                  PURCHASE ORDER
                </h2>
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  PO Number: <strong>{poView.po.poNumber}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Date: {poView.po.issuedAt ? new Date(poView.po.issuedAt).toLocaleDateString() : '-'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Status: {poView.po.status}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Supplier Details:</h4>
                <strong style={{ fontSize: '1.05rem', display: 'block' }}>{poView.vendor?.companyName}</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', margin: '0.25rem 0' }}>
                  Email: {poView.vendor?.contactEmail}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  GSTIN: <strong>{poView.vendor?.gstNumber}</strong> (State Code Prefix: {poView.vendor?.gstNumber.substring(0, 2)})
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>
                  Location State: {poView.vendor?.location}
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Shipping Destination:</h4>
                <strong>VendorBridge HQ BKC Office</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {COMPANY_DETAILS.address}
                </p>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                  Delivery Timeline: <strong>Within {poView.quotation?.deliveryDays} Days</strong>
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="data-table" style={{ marginBottom: '2rem' }}>
              <thead>
                <tr>
                  <th>Item / Description</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Unit Rate (₹)</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {poView.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{line.description}</td>
                    <td style={{ textAlign: 'right' }}>{line.quantity}</td>
                    <td>{line.unit}</td>
                    <td style={{ textAlign: 'right' }}>₹{line.unitPrice.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{line.totalPrice.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ border: 'none' }}></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, borderTop: '2px solid rgba(255,255,255,0.1)' }}>Total Contract:</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    ₹{poView.po.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Terms and Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '3rem' }}>
              <div>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Standard Terms & Conditions:</h5>
                <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>All goods must conform to specifications detailed in RFQ.</li>
                  <li>Invoices must clearly outline CGST/SGST or IGST depending on state registry.</li>
                  <li>Payment term is Net 30 days from invoice approval date.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', justifyContent: 'flex-end', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
                <div style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                  <div style={{ fontStyle: 'italic', fontWeight: 600, color: 'var(--text-main)' }}>Rajesh Patel</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: '0.25rem', paddingTop: '0.25rem', width: '120px' }}>
                    Authorized Manager
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. INVOICE DETAILED VIEW */}
      {selectedInvoiceId && invoiceView && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoiceId(null)}>
              ← Back to Invoices List
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isVendor && invoiceView.invoice.status === 'SENT' && (
                <button className="btn btn-primary" onClick={() => handlePayInvoice(invoiceView.invoice.id)}>
                  <CreditCard size={16} /> Process & Release Payment (₹{invoiceView.invoice.totalAmount.toLocaleString('en-IN')})
                </button>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={() => handleOpenEmailModal(
                  invoiceView.invoice, 
                  invoiceView.poDetails?.po.poNumber || 'PO', 
                  COMPANY_DETAILS.email, 
                  invoiceView.poDetails?.vendor?.companyName || 'Supplier'
                )}
              >
                <Mail size={16} /> Send via Email
              </button>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print Commercial Invoice
              </button>
            </div>
          </div>

          {/* Printable Invoice Form */}
          <div className="card print-document" style={{ padding: '3rem', border: '1px solid var(--border-color)', backgroundColor: '#0f1524' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>Tax Invoice</span>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem' }}>
                  {invoiceView.poDetails?.vendor?.companyName}
                </h1>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Email: {invoiceView.poDetails?.vendor?.contactEmail}
                </span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  GSTIN: <strong>{invoiceView.poDetails?.vendor?.gstNumber}</strong> (State: {invoiceView.poDetails?.vendor?.location})
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                  INVOICE
                </h2>
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Invoice No: <strong>{invoiceView.invoice.invoiceNumber}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Date: {invoiceView.invoice.invoiceDate}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  PO Ref: <strong>{invoiceView.poDetails?.po.poNumber}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Payment Status: {invoiceView.invoice.status}
                </div>
              </div>
            </div>

            {/* Address Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Billed To (Client):</h4>
                <strong style={{ fontSize: '1.05rem', display: 'block' }}>{COMPANY_DETAILS.name}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {COMPANY_DETAILS.address}
                </p>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  GSTIN: <strong>{COMPANY_DETAILS.gstin}</strong> (State Code: {COMPANY_DETAILS.stateCode})
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="data-table" style={{ marginBottom: '2rem' }}>
              <thead>
                <tr>
                  <th>Billed Description</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Unit Rate (₹)</th>
                  <th style={{ textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoiceView.poDetails?.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{line.description}</td>
                    <td style={{ textAlign: 'right' }}>{line.quantity}</td>
                    <td>{line.unit}</td>
                    <td style={{ textAlign: 'right' }}>₹{line.unitPrice.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{line.totalPrice.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Indian GST calculation breakdown panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Tax Summary Notes:</div>
                {invoiceView.invoice.igst > 0 ? (
                  <p>Interstate purchase subject to <strong>IGST @ 18%</strong> as Supplier State is different from Client billing state.</p>
                ) : (
                  <p>Intrastate purchase subject to <strong>CGST @ 9%</strong> and <strong>SGST @ 9%</strong> as Supplier and Client share the same state registry.</p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Subtotal:</span>
                  <span>₹{invoiceView.invoice.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {invoiceView.invoice.igst > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>IGST (18%):</span>
                    <span>₹{invoiceView.invoice.igst.toLocaleString('en-IN')}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>CGST (9%):</span>
                      <span>₹{invoiceView.invoice.cgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>SGST (9%):</span>
                      <span>₹{invoiceView.invoice.sgst.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Grand Total (INR):</span>
                  <span>₹{invoiceView.invoice.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. EMAIL SIMULATION MODAL */}
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Mail size={20} color="var(--primary)" />
              Email PDF Invoice Attachment
            </h2>

            {emailSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0', color: 'var(--success)' }}>
                <Check size={48} strokeWidth={2.5} style={{ backgroundColor: 'var(--success-bg)', padding: '0.5rem', borderRadius: '50%' }} />
                <strong>Email Dispatched Successfully!</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Simulating AWS SES SMTP send routing...</p>
              </div>
            ) : (
              <form onSubmit={handleSendEmailSimulation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">To Email:</label>
                  <input type="email" className="form-control" value={emailTarget} onChange={(e) => setEmailTarget(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject:</label>
                  <input type="text" className="form-control" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mail Body:</label>
                  <textarea className="form-textarea" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} required style={{ minHeight: '120px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Send Email Attachment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
