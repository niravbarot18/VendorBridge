import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { FileSpreadsheet, Download, Activity, Award, Star } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export const Reports: React.FC = () => {
  const { activityLogs, vendors, pos } = useAppState();
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
    try {
      const dataToExport = pos.map(po => {
        const vendorName = vendors.find(v => v.id === po.approvalId)?.companyName || 'N/A'; // Resolve vendor if possible
        return {
          'PO Number': po.poNumber,
          'Contract Value (INR)': po.amount,
          'Status': po.status,
          'Issued Date': po.issuedAt ? new Date(po.issuedAt).toLocaleDateString() : 'N/A'
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Spend Summary');
      XLSX.writeFile(wb, 'VendorBridge_Spend_Analytics_2026.xlsx');
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExportExcelSuccess(false);
    }
  };

  const handleExportPdf = () => {
    setExportPdfSuccess(true);
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica');

      // Title & Header info
      doc.setFontSize(18);
      doc.setTextColor(15, 21, 36);
      doc.text('VendorBridge ERP - Compliance Audit Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);
      doc.text(`Filter query: "${logSearch || 'All logs'}" | Role: "${roleFilter || 'All roles'}"`, 14, 32);

      // Table Header Background
      doc.setFillColor(15, 21, 36);
      doc.rect(14, 38, 182, 8, 'F');
      
      // Header Text
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('Timestamp', 16, 43);
      doc.text('Actor', 65, 43);
      doc.text('Action', 110, 43);
      doc.text('Details', 145, 43);

      doc.setTextColor(0, 0, 0);
      let y = 52;
      filteredLogs.forEach((log) => {
        if (y > 275) {
          doc.addPage();
          doc.setFillColor(15, 21, 36);
          doc.rect(14, 15, 182, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text('Timestamp', 16, 20);
          doc.text('Actor', 65, 20);
          doc.text('Action', 110, 20);
          doc.text('Details', 145, 20);
          doc.setTextColor(0, 0, 0);
          y = 29;
        }

        const dateStr = new Date(log.timestamp).toLocaleDateString() + ' ' + new Date(log.timestamp).toLocaleTimeString();
        doc.text(dateStr, 16, y);
        doc.text(log.actorName.substring(0, 20), 65, y);
        doc.text(log.action.substring(0, 15), 110, y);
        
        // Wrap/truncate long details to fit
        const detailsText = log.details.length > 30 ? log.details.substring(0, 27) + '...' : log.details;
        doc.text(detailsText, 145, y);
        
        y += 9;
      });

      doc.save('VendorBridge_Audit_Trail_Report.pdf');
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExportPdfSuccess(false);
    }
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
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
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
