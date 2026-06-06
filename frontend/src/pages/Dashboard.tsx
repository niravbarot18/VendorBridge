import React from 'react';
import { useAppState } from '../hooks/useAppState';
import { db } from '../db/mockDb';
import { Plus, Users, FileText, CheckSquare, IndianRupee, ShieldAlert } from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string, arg?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const state = useAppState();
  const { vendors, rfqs, approvals, pos, currentUser } = state;

  // Compute Metrics
  const activeVendorsCount = vendors.filter(v => v.status === 'ACTIVE').length;
  const activeRFQsCount = rfqs.filter(r => r.status === 'PUBLISHED').length;
  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;

  const totalSpend = pos
    .filter(p => p.status === 'ISSUED' || p.status === 'ACKNOWLEDGED')
    .reduce((sum, p) => sum + p.amount, 0);

  // Category Spend calculation for custom SVG pie/bar chart
  const categorySpend: Record<string, number> = {
    IT: 0,
    Manufacturing: 0,
    Logistics: 0,
    'Office Supplies': 0
  };

  pos.forEach(p => {
    // Find vendor from approval -> quotation
    const appr = approvals.find(a => a.id === p.approvalId);
    if (appr) {
      const quote = db.getQuotations().find(q => q.id === appr.quotationId);
      if (quote) {
        const vendor = vendors.find(v => v.id === quote.vendorId);
        if (vendor && categorySpend[vendor.category] !== undefined) {
          categorySpend[vendor.category] += p.amount;
        }
      }
    }
  });

  // Sample data for monthly chart
  const monthlyData = [
    { month: 'Jan', amount: 150000 },
    { month: 'Feb', amount: 320000 },
    { month: 'Mar', amount: 200000 },
    { month: 'Apr', amount: 450000 },
    { month: 'May', amount: 250000 }, // Matches steelco invoice
    { month: 'Jun', amount: 0 }
  ];

  // Update current month with dynamic spend
  monthlyData[4].amount = totalSpend > 0 ? totalSpend : 250000;

  // Max value for scaling chart
  const maxMonthly = Math.max(...monthlyData.map(d => d.amount), 500000);
  const maxCategory = Math.max(...Object.values(categorySpend), 100000);

  // Filter pending approvals details
  const pendingApprovalsList = approvals
    .filter(a => a.status === 'PENDING')
    .map(a => {
      const q = db.getQuotations().find(quote => quote.id === a.quotationId);
      const rfq = q ? rfqs.find(r => r.id === q.rfqId) : null;
      const vendor = q ? vendors.find(v => v.id === q.vendorId) : null;
      return {
        approval: a,
        rfq,
        vendor,
        amount: q ? q.totalPrice : 0
      };
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.5rem' }}>
          Welcome back, {currentUser.name}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Here is a summary of the VendorBridge procurement pipeline.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-label">
            <Users size={16} color="var(--primary)" />
            <span>Active Vendors</span>
          </div>
          <div className="metric-value">{activeVendorsCount}</div>
          <div className="metric-trend up">
            <span>+{vendors.filter(v => v.status === 'ACTIVE').length} Onboarded</span>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">
            <FileText size={16} color="var(--info)" />
            <span>Active RFQs</span>
          </div>
          <div className="metric-value">{activeRFQsCount}</div>
          <div className="metric-trend up">
            <span>{rfqs.filter(r => r.status === 'PUBLISHED').length} Bidding</span>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">
            <CheckSquare size={16} color="var(--warning)" />
            <span>Pending Approvals</span>
          </div>
          <div className="metric-value">{pendingApprovalsCount}</div>
          <div className="metric-trend down">
            <span>{pendingApprovalsCount} Action Items</span>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">
            <IndianRupee size={16} color="var(--success)" />
            <span>Procurement Spend</span>
          </div>
          <div className="metric-value">₹{totalSpend.toLocaleString('en-IN')}</div>
          <div className="metric-trend up">
            <span>GST Calculations Active</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      {currentUser.role !== 'VENDOR' && (
        <div className="card" style={{ padding: '1.25rem 1.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Quick Actions:</span>
            {currentUser.role === 'PROCUREMENT_OFFICER' || currentUser.role === 'ADMIN' ? (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => onNavigate('rfqs')}>
                  <Plus size={14} /> Create RFQ
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('vendors')}>
                  <Plus size={14} /> Add Vendor
                </button>
              </>
            ) : null}
            {currentUser.role === 'MANAGER' ? (
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('approvals')}>
                Review Pending Approvals
              </button>
            ) : null}
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('reports')}>
              View Audit Logs
            </button>
          </div>
        </div>
      )}

      {/* Spend Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Monthly Spend Trends */}
        <div className="card">
          <div className="card-title">Monthly spend (2026)</div>
          <div className="custom-chart-container">
            {monthlyData.map((d, index) => {
              const heightPct = `${(d.amount / maxMonthly) * 80}%`;
              return (
                <div key={index} className="chart-bar-wrapper">
                  <div className="chart-bar" style={{ height: heightPct }}>
                    <div className="chart-tooltip">₹{d.amount.toLocaleString('en-IN')}</div>
                  </div>
                  <span className="chart-label">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spend by Category */}
        <div className="card">
          <div className="card-title">Spend by Category (INR)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
            {Object.entries(categorySpend).map(([category, amt], index) => {
              const pct = maxCategory > 0 ? (amt / maxCategory) * 100 : 0;
              const barColors = ['var(--primary)', 'var(--secondary)', 'var(--success)', 'var(--info)'];
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 500 }}>{category}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>₹{amt.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${pct}%`, 
                        backgroundColor: barColors[index % barColors.length], 
                        borderRadius: '4px',
                        transition: 'width 1s ease-out'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Approvals Action Queue */}
      {currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN' || currentUser.role === 'PROCUREMENT_OFFICER' ? (
        <div className="card">
          <div className="card-title">
            <span>Pending Approvals Queue</span>
            <span className="badge badge-warning">{pendingApprovalsCount} pending</span>
          </div>
          {pendingApprovalsList.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem 0', color: 'var(--text-muted)' }}>
              <ShieldAlert size={36} strokeWidth={1.5} />
              <p>No approvals require review at this time.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>RFQ / Purchase Description</th>
                    <th>Vendor</th>
                    <th>Bid Amount</th>
                    <th>Requested Timeline</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovalsList.map(({ approval, rfq, vendor, amount }) => (
                    <tr key={approval.id}>
                      <td style={{ fontWeight: 600 }}>{rfq ? rfq.title : 'N/A'}</td>
                      <td>{vendor ? vendor.companyName : 'N/A'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>₹{amount.toLocaleString('en-IN')}</td>
                      <td>{rfq ? `${rfq.deadline}` : 'N/A'}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => onNavigate('approvals')}>
                          Review Bid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
