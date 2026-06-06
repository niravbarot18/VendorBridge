import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { FileSpreadsheet, Download, ShieldCheck, Activity, Award, Star } from 'lucide-react';

export const Reports: React.FC = () => {
  const { activityLogs, vendors } = useAppState();
  const [logSearch, setLogSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Export success states
  const [exportExcelSuccess, setExportExcelSuccess] = useState(false);
  const [exportPdfSuccess, setExportPdfSuccess] = useState(false);

  // Filters Audit Logs
  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(logSearch.toLowerCase()) || 
                          log.actorName.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.details.toLowerCase().includes(logSearch.toLowerCase());
    const matchesRole = roleFilter === '' || log.actorRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleExportExcel = () => {
    setExportExcelSuccess(true);
    setTimeout(() => {
      setExportExcelSuccess(false);
      // Simulate file download by creating a virtual link or showing an alert
      alert('Success: "VendorBridge_Spend_Analytics_2026.xlsx" generated and saved to Downloads folder.');
    }, 1200);
  };

  const handleExportPdf = () => {
    setExportPdfSuccess(true);
    setTimeout(() => {
      setExportPdfSuccess(false);
      alert('Success: "VendorBridge_Audit_Trail_Report.pdf" generated and saved to Downloads folder.');
    }, 1200);
  };

  // Vendor Performance Table
  // Rank active vendors by rating and category
  const activeVendors = vendors
    .filter(v => v.status === 'ACTIVE')
    .sort((a, b) => b.rating - a.rating);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.5rem' }}>
          Reports & Audit Trails
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Review complete chronological action logs and compile custom analytical data exports.
        </p>
      </div>

      {/* Reports and exports panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Export options */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={18} color="var(--primary)" />
              <span>Compile Analytics Sheets</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Compile spend profiles, supplier metrics, and monthly GST breakdowns into downloadable reports.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleExportExcel} style={{ flex: 1, gap: '0.4rem' }}>
              <Download size={14} /> Export Spend Excel
            </button>
            <button className="btn btn-secondary" onClick={handleExportPdf} style={{ flex: 1, gap: '0.4rem' }}>
              <Download size={14} /> Export Audit PDF
            </button>
          </div>
        </div>

        {/* Vendor stats */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="var(--secondary)" />
              <span>Supplier Performance Leaders</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeVendors.slice(0, 3).map((v, i) => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)' }}>#{i + 1}</span>
                  <div>
                    <strong style={{ fontSize: '0.875rem', display: 'block' }}>{v.companyName}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.category} • {v.location}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Star size={12} fill="var(--warning)" color="var(--warning)" />
                  <span>{v.rating.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Complete Audit Logs Grid */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--success)" />
              <span>System Audit Trails</span>
            </div>
          </div>

          {/* Logs Search Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search logs..." 
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: '200px' }}
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
            <select 
              className="form-select"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: '160px' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
              <option value="MANAGER">Manager</option>
              <option value="VENDOR">Vendor</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="table-container">
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Linked Entity</th>
                <th>Event Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem 0' }}>
                    No audit log records match search filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontWeight: 600 }}>{log.actorName}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.actorRole}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        log.action.includes('Approved') || log.action.includes('Acknowledge') ? 'badge-success' :
                        log.action.includes('Reject') ? 'badge-danger' : 
                        log.action.includes('Publish') || log.action.includes('Create') ? 'badge-info' : 'badge-warning'
                      }`} style={{ fontSize: '0.65rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>
                        {log.entityType} ({log.entityId.substring(0, 8)})
                      </code>
                    </td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
