import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { db, logActivity, createNotification } from '../db/mockDb';
import { api } from '../api/client';
import { Quotation, Approval, RFQ } from '../types';
import { Award, ArrowRight, Star, Truck, ShieldAlert, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

export const Comparison: React.FC = () => {
  const { rfqs, rfqItems, quotations, quotationItems, vendors, currentUser, backendMode, triggerBackendSync } = useAppState();
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);

  // Filter RFQs that have at least one submission
  const publishedRfqs = rfqs.filter(r => r.status === 'PUBLISHED');

  const activeRfq = rfqs.find(r => r.id === selectedRfqId);
  const activeRfqItems = rfqItems.filter(item => item.rfqId === selectedRfqId);
  const activeQuotes = quotations.filter(q => q.rfqId === selectedRfqId && q.status === 'SUBMITTED');

  // Compute scoring for each quote
  const quotesWithScores = activeQuotes.map(quote => {
    const vendor = vendors.find(v => v.id === quote.vendorId);
    if (!vendor) return null;

    // Find min price & delivery among bids for scoring relative calculation
    const minPrice = Math.min(...activeQuotes.map(q => q.totalPrice));
    const minDelivery = Math.min(...activeQuotes.map(q => q.deliveryDays));

    // Scores (0-100 scale)
    const priceScore = (minPrice / quote.totalPrice) * 100;
    const deliveryScore = (minDelivery / quote.deliveryDays) * 100;
    const ratingScore = (vendor.rating / 5.0) * 100;

    // Weighted Total Score: Price 60% + Delivery 20% + Rating 20%
    const totalScore = (priceScore * 0.6) + (deliveryScore * 0.2) + (ratingScore * 0.2);

    return {
      quote,
      vendor,
      priceScore,
      deliveryScore,
      ratingScore,
      totalScore
    };
  }).filter(Boolean) as {
    quote: Quotation;
    vendor: typeof vendors[0];
    priceScore: number;
    deliveryScore: number;
    ratingScore: number;
    totalScore: number;
  }[];

  // Sort by highest score first
  quotesWithScores.sort((a, b) => b.totalScore - a.totalScore);

  const bestMatch = quotesWithScores[0];

  // AI Recommendation Text Generation
  const generateAIRecommendation = () => {
    if (quotesWithScores.length === 0) return '';
    if (quotesWithScores.length === 1) {
      return `Only one quotation submitted by ${quotesWithScores[0].vendor.companyName}. Pricing is ₹${quotesWithScores[0].quote.totalPrice.toLocaleString('en-IN')}. Recommended to award due to singular bidder availability.`;
    }

    const first = quotesWithScores[0];
    const second = quotesWithScores[1];

    const priceDiff = Math.abs(first.quote.totalPrice - second.quote.totalPrice);
    const speedDiff = Math.abs(first.quote.deliveryDays - second.quote.deliveryDays);

    let text = `Based on a weighted analysis (60% Price, 20% Delivery, 20% Rating), **${first.vendor.companyName}** is the recommended choice with a compatibility score of **${first.totalScore.toFixed(1)}/100**.\n\n`;
    
    if (first.quote.totalPrice <= second.quote.totalPrice) {
      text += `• **Cost Advantage**: ${first.vendor.companyName} offers the lowest total cost of **₹${first.quote.totalPrice.toLocaleString('en-IN')}**, saving ₹${priceDiff.toLocaleString('en-IN')} compared to ${second.vendor.companyName}.\n`;
    } else {
      text += `• **Value Consideration**: Although ${second.vendor.companyName} is cheaper by ₹${priceDiff.toLocaleString('en-IN')}, ${first.vendor.companyName} is recommended due to superior delivery timeline (${first.quote.deliveryDays} vs ${second.quote.deliveryDays} days) and vendor rating (${first.vendor.rating.toFixed(1)}/5).\n`;
    }

    if (first.quote.deliveryDays <= second.quote.deliveryDays) {
      text += `• **Delivery**: Faster delivery lead time by ${speedDiff} days, minimizing downtime.\n`;
    }
    
    text += `• **Risk Rating**: Vendor rating is ${first.vendor.rating.toFixed(1)}/5, representing a stable procurement risk profile.`;

    return text;
  };

  const handleAwardQuote = async (quoteId: string, vendorName: string, amount: number) => {
    if (currentUser.role !== 'PROCUREMENT_OFFICER' && currentUser.role !== 'ADMIN') {
      alert('Only Procurement Officers or Admins can award quotations.');
      return;
    }

    if (backendMode) {
      if (!selectedRfqId) return;
      try {
        await api.awardQuotation(quoteId, selectedRfqId);
        alert('Quotation awarded successfully, routed to Manager for approval.');
        await triggerBackendSync();
        setSelectedRfqId(null);
      } catch (err: any) {
        alert(`Failed to award quotation via MySQL backend: ${err.message}`);
      }
      return;
    }

    // 1. Update awarded quotation status to AWARDED, others for this RFQ to REJECTED
    const updatedQuotes = quotations.map(q => {
      if (q.rfqId === selectedRfqId) {
        if (q.id === quoteId) {
          return { ...q, status: 'AWARDED' as const };
        } else {
          return { ...q, status: 'REJECTED' as const };
        }
      }
      return q;
    });
    db.setQuotations(updatedQuotes);

    // 2. Set RFQ status to CLOSED
    const updatedRfqs = rfqs.map(r => {
      if (r.id === selectedRfqId) {
        return { ...r, status: 'CLOSED' as const }; // Moves to closed, becomes active for approval
      }
      return r;
    });
    db.setRFQs(updatedRfqs);

    // 3. Create Approval Record
    const newApproval: Approval = {
      id: `a-${Date.now()}`,
      quotationId: quoteId,
      approverId: 'u3', // Auto-routes to Rajesh Patel (Manager)
      status: 'PENDING',
      remarks: '',
      createdAt: new Date().toISOString()
    };
    db.setApprovals([...db.getApprovals(), newApproval]);

    // 4. Send Notification to Manager (Rajesh Patel)
    createNotification(
      'MANAGER',
      `Action Required: Approve Procurement Award of ₹${amount.toLocaleString('en-IN')} to "${vendorName}".`
    );

    logActivity(
      currentUser.name,
      currentUser.role,
      'Awarded RFQ',
      'RFQ',
      selectedRfqId || '',
      `Awarded RFQ to "${vendorName}" for ₹${amount.toLocaleString('en-IN')}, routed to Manager for approval.`
    );

    setSelectedRfqId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.5rem' }}>
          Quotation Comparison Engine
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Evaluate vendor bids side-by-side using weighted scoring and AI recommendations.
        </p>
      </div>

      {!selectedRfqId ? (
        /* RFQ Selection Screen */
        <div className="card">
          <div className="card-title">Select Published RFQ to Compare Bids</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RFQ Title</th>
                  <th>Deadline Date</th>
                  <th>Bids Received</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {publishedRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                      No published RFQs pending bid evaluations at this time.
                    </td>
                  </tr>
                ) : (
                  publishedRfqs.map(rfq => {
                    const bidCount = quotations.filter(q => q.rfqId === rfq.id && q.status === 'SUBMITTED').length;
                    return (
                      <tr key={rfq.id}>
                        <td style={{ fontWeight: 600 }}>{rfq.title}</td>
                        <td>{rfq.deadline}</td>
                        <td>
                          <span className={`badge ${bidCount > 0 ? 'badge-success' : 'badge-warning'}`}>
                            {bidCount} {bidCount === 1 ? 'Bid' : 'Bids'} submitted
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ gap: '0.25rem' }} 
                            onClick={() => setSelectedRfqId(rfq.id)}
                            disabled={bidCount === 0}
                          >
                            Compare Bids <ChevronRight size={14} />
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
      ) : (
        /* Comparison Layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge badge-info" style={{ marginBottom: '0.5rem' }}>Comparing {activeQuotes.length} Supplier Bids</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600 }}>
                {activeRfq?.title}
              </h2>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRfqId(null)}>
              Back to RFQs List
            </button>
          </div>

          {/* AI Quotation Recommendation Panel */}
          {quotesWithScores.length > 0 && (
            <div className="card" style={{ border: '1px solid #6366f1', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
                <Sparkles size={18} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  Smart AI Procurement Recommendation
                </h3>
              </div>
              <p 
                style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-main)' }}
                dangerouslySetInnerHTML={{ 
                  __html: generateAIRecommendation()
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} 
              />
            </div>
          )}

          {/* Comparison side by side columns */}
          <div className="compare-grid">
            {quotesWithScores.map(({ quote, vendor, priceScore, deliveryScore, ratingScore, totalScore }, idx) => {
              const isWinner = bestMatch && bestMatch.quote.id === quote.id;
              
              // Get item-level pricing breakdown
              const quoteItems = quotationItems.filter(qi => qi.quotationId === quote.id);

              return (
                <div key={quote.id} className={`comparison-column ${isWinner ? 'winner' : ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {vendor.companyName}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>GSTIN: {vendor.gstNumber}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <span className="comparison-score">{totalScore.toFixed(0)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ 100 compatibility score</span>
                  </div>

                  {/* Parameters */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Quote:</span>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>₹{quote.totalPrice.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Delivery Lead:</span>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Truck size={14} color="var(--text-muted)" />
                        {quote.deliveryDays} Days
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Supplier Rating:</span>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={14} fill="var(--warning)" color="var(--warning)" />
                        {vendor.rating.toFixed(1)} / 5.0
                      </strong>
                    </div>
                  </div>

                  {/* Line Item Breakdown */}
                  <div>
                    <h4 style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Breakdown</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeRfqItems.map(item => {
                        const qItem = quoteItems.find(qi => qi.rfqItemId === item.id);
                        
                        // Check if this is the lowest price for this specific item across all quotes
                        const allItemPricesForThisItem = quotations
                          .filter(q => q.rfqId === selectedRfqId && q.status === 'SUBMITTED')
                          .map(q => {
                            const itemsForQ = quotationItems.filter(qi => qi.quotationId === q.id);
                            const matchingItem = itemsForQ.find(qi => qi.rfqItemId === item.id);
                            return matchingItem ? matchingItem.unitPrice : Infinity;
                          });
                        const isLowestItemPrice = qItem && qItem.unitPrice === Math.min(...allItemPricesForThisItem);

                        return (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem' }}>
                            <span>{item.description}</span>
                            <span style={{ 
                              color: isLowestItemPrice ? 'var(--success)' : 'var(--text-main)', 
                              fontWeight: isLowestItemPrice ? 700 : 500,
                              backgroundColor: isLowestItemPrice ? 'var(--success-bg)' : 'transparent',
                              padding: isLowestItemPrice ? '0.05rem 0.35rem' : '0',
                              borderRadius: '4px'
                            }}>
                              ₹{qItem ? qItem.unitPrice.toLocaleString('en-IN') : '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Terms / Notes */}
                  {quote.notes && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                      Note: "{quote.notes}"
                    </div>
                  )}

                  {/* Award Action */}
                  <button 
                    className={`btn ${isWinner ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => handleAwardQuote(quote.id, vendor.companyName, quote.totalPrice)}
                  >
                    <Award size={16} /> Select & Award Bid
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
};
