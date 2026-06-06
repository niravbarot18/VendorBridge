import React, { useState, useEffect } from 'react';
import { useAppState } from './hooks/useAppState';
import { initDb, resetDatabase, db } from './db/mockDb';
import { Dashboard } from './pages/Dashboard';
import { Vendors } from './pages/Vendors';
import { RFQs } from './pages/RFQs';
import { VendorPortal } from './pages/VendorPortal';
import { Comparison } from './pages/Comparison';
import { Approvals } from './pages/Approvals';
import { Documents } from './pages/Documents';
import { Reports } from './pages/Reports';
import { AuthScreen } from './pages/AuthScreen';
import { Permission, hasPermission } from './utils/permissions';
import { ProtectedRoute } from './components/ProtectedRoute';
import { User } from './types';

// Icons
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Scale, 
  CheckSquare, 
  FolderLock, 
  LineChart, 
  Bell, 
  RefreshCw, 
  KeyRound,
  Store,
  Menu,
  LogOut,
  Settings,
  User as UserIcon
} from 'lucide-react';

export const App: React.FC = () => {
  // Initialize Database on startup
  useEffect(() => {
    initDb();
  }, []);

  const state = useAppState();
  const { currentUser, users, notifications, markNotificationsAsRead } = state;

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);

  const [updatedName, setUpdatedName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto direct on initial load when current user changes (e.g. login)
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'VENDOR') {
        setActiveTab('vendor-portal');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser?.id]);

  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={state.login}
        onSignup={state.signup}
        backendMode={state.backendMode}
        backendConnected={state.backendConnected}
        toggleBackendMode={state.toggleBackendMode}
      />
    );
  }

  // Filter notifications relevant to current user role / vendor account
  const userNotifications = notifications.filter(n => {
    if (n.role !== currentUser.role) return false;
    if (currentUser.role === 'VENDOR' && n.vendorId !== currentUser.vendorId) return false;
    return true;
  });

  const unreadNotifCount = userNotifications.filter(n => !n.read).length;

  const handleResetDb = () => {
    if (window.confirm("Are you sure you want to reset the database to original seed parameters? This will clear all custom inputs.")) {
      resetDatabase();
      if (currentUser?.role === 'VENDOR') {
        setActiveTab('vendor-portal');
      } else {
        setActiveTab('dashboard');
      }
      alert("Database reset completed successfully!");
    }
  };

  const toggleNotifDropdown = () => {
    if (!showNotifDropdown) {
      markNotificationsAsRead();
    }
    setShowNotifDropdown(!showNotifDropdown);
  };

  const handleNotificationClick = (tabToGo: string) => {
    setActiveTab(tabToGo);
    setShowNotifDropdown(false);
  };

  // Sidebar Menu Items config based on role permissions
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, permission: 'VIEW_DASHBOARD' as Permission },
    { id: 'vendors', label: 'Vendors Registry', icon: <Users size={18} />, permission: 'MANAGE_VENDORS' as Permission },
    { id: 'rfqs', label: 'RFQs Desk', icon: <FileText size={18} />, permission: 'MANAGE_RFQS' as Permission },
    { id: 'vendor-portal', label: 'Vendor Workspace', icon: <Store size={18} />, permission: 'MANAGE_RFQS' as Permission, requiresVendor: true },
    { id: 'comparison', label: 'Bids Comparison', icon: <Scale size={18} />, permission: 'COMPARE_QUOTATIONS' as Permission },
    { id: 'approvals', label: 'Approval Queue', icon: <CheckSquare size={18} />, permission: 'MANAGE_APPROVALS' as Permission },
    { id: 'documents', label: 'Documents Vault', icon: <FolderLock size={18} />, permission: 'MANAGE_DOCUMENTS' as Permission },
    { id: 'reports', label: 'Audit & Reports', icon: <LineChart size={18} />, permission: 'VIEW_REPORTS' as Permission }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    const isVendor = currentUser?.role === 'VENDOR';
    if (item.requiresVendor && !isVendor) return false;
    // Don't show RFQ Desk sidebar link for VENDORS since they interact via Vendor Workspace
    if (item.id === 'rfqs' && isVendor) return false;
    return hasPermission(currentUser?.role || '', item.permission);
  });

  return (
    <div className="app-container">
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{
        transform: mobileMenuOpen ? 'translateX(0)' : undefined
      }}>
        <div className="sidebar-brand">
          <span className="brand-logo">VendorBridge</span>
          <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>ERP</span>
        </div>

        <ul className="sidebar-menu">
          {filteredMenuItems.map(item => (
            <li key={item.id}>
              <a 
                className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        {/* Sidebar bottom buttons (Reset & Logout) */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ width: '100%', fontSize: '0.75rem', gap: '0.35rem', justifyContent: 'flex-start' }}
            onClick={handleResetDb}
          >
            <RefreshCw size={12} />
            <span>Reset Demo Database</span>
          </button>
          
          <button 
            className="btn btn-danger btn-sm" 
            style={{ width: '100%', fontSize: '0.75rem', gap: '0.35rem', justifyContent: 'flex-start' }}
            onClick={state.logout}
          >
            <LogOut size={12} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. TOPBAR HEADER AND SWITCHER */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <header className="topbar no-print">
          {/* Mobile menu toggle */}
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ display: 'none', padding: '0.5rem' }} 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            id="mobile-toggle-btn"
          >
            <Menu size={18} />
          </button>
          
          <style>{`
            @media (max-width: 1024px) {
              #mobile-toggle-btn { display: inline-flex !important; }
              .sidebar.mobile-open { transform: translateX(0) !important; }
              .sidebar { transform: translateX(-100%); }
            }
          `}</style>

          {/* Role switcher completely removed as per RBAC criteria */}
          <div />

          {/* MySQL Backend Sync Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.4rem 0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: state.backendMode ? (state.backendConnected ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)' }}>
              {state.backendMode ? (state.backendConnected ? 'MySQL: Active' : 'MySQL: Offline') : 'Mock DB: Local'}
            </span>
            <input 
              type="checkbox" 
              checked={state.backendMode} 
              onChange={(e) => state.toggleBackendMode(e.target.checked)} 
              style={{ cursor: 'pointer', width: '14px', height: '14px' }}
              title="Toggle Live Express + MySQL Backend Sync"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            
            {/* Notification Bell Dropdown */}
            <div className="notification-bell-container" onClick={toggleNotifDropdown}>
              <Bell size={20} className="notification-bell" />
              {unreadNotifCount > 0 && <span className="notification-badge" />}

              {showNotifDropdown && (
                <div className="notifications-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    <span>In-App Notifications</span>
                    <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setShowNotifDropdown(false)}>Close</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {userNotifications.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem' }}>No notifications.</p>
                    ) : (
                      userNotifications.map(n => {
                        // Determine redirect tab based on message
                        let target = 'dashboard';
                        if (n.message.includes('RFQ') || n.message.includes('quotation')) target = currentUser.role === 'VENDOR' ? 'vendor-portal' : 'rfqs';
                        if (n.message.includes('PO') || n.message.includes('Invoice')) target = 'documents';
                        if (n.message.includes('Approve')) target = 'approvals';

                        return (
                          <div 
                            key={n.id} 
                            className={`notification-item ${n.read ? '' : 'unread'}`} 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleNotificationClick(target)}
                          >
                            <p style={{ margin: 0 }}>{n.message}</p>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Brief with Interactive Dropdown */}
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', padding: '0.35rem 0.5rem', borderRadius: '8px', transition: 'background-color var(--transition-fast)' }}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="profile-brief-trigger"
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }} className="no-mobile">
                  {currentUser.name}
                </span>
              </div>

              {showProfileMenu && (
                <div className="dropdown-menu">
                  <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{currentUser.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{currentUser.email}</div>
                  </div>
                  
                  <button onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }} className="dropdown-item">
                    <UserIcon size={14} />
                    <span>View Profile</span>
                  </button>
                  <button onClick={() => { setUpdatedName(currentUser.name); setShowSettingsModal(true); setShowProfileMenu(false); }} className="dropdown-item">
                    <Settings size={14} />
                    <span>Account Settings</span>
                  </button>
                  <button onClick={() => { setShowPasswordModal(true); setShowProfileMenu(false); }} className="dropdown-item">
                    <KeyRound size={14} />
                    <span>Change Password</span>
                  </button>
                  
                  <div className="dropdown-divider" />
                  
                  <button onClick={() => { state.logout(); setShowProfileMenu(false); }} className="dropdown-item" style={{ color: 'var(--danger)' }}>
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* 3. MAIN ROUTER CONTENT VIEWS */}
        <main className="main-content">
          {activeTab === 'dashboard' && (
            <ProtectedRoute permission="VIEW_DASHBOARD" role={currentUser.role}>
              <Dashboard onNavigate={setActiveTab} />
            </ProtectedRoute>
          )}
          {activeTab === 'vendors' && (
            <ProtectedRoute permission="MANAGE_VENDORS" role={currentUser.role}>
              <Vendors />
            </ProtectedRoute>
          )}
          {activeTab === 'rfqs' && (
            <ProtectedRoute permission="MANAGE_RFQS" role={currentUser.role}>
              <RFQs onNavigate={setActiveTab} />
            </ProtectedRoute>
          )}
          {activeTab === 'vendor-portal' && (
            <ProtectedRoute permission="MANAGE_RFQS" role={currentUser.role}>
              <VendorPortal />
            </ProtectedRoute>
          )}
          {activeTab === 'comparison' && (
            <ProtectedRoute permission="COMPARE_QUOTATIONS" role={currentUser.role}>
              <Comparison />
            </ProtectedRoute>
          )}
          {activeTab === 'approvals' && (
            <ProtectedRoute permission="MANAGE_APPROVALS" role={currentUser.role}>
              <Approvals />
            </ProtectedRoute>
          )}
          {activeTab === 'documents' && (
            <ProtectedRoute permission="MANAGE_DOCUMENTS" role={currentUser.role}>
              <Documents />
            </ProtectedRoute>
          )}
          {activeTab === 'reports' && (
            <ProtectedRoute permission="VIEW_REPORTS" role={currentUser.role}>
              <Reports />
            </ProtectedRoute>
          )}
        </main>
      </div>

      {/* VIEW PROFILE MODAL */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Users size={20} color="var(--primary)" />
              User Profile
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.5rem 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                <strong>{currentUser.name}</strong>
                
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <strong>{currentUser.email}</strong>
                
                <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                <span className="badge badge-info" style={{ width: 'fit-content' }}>{currentUser.role.replace('_', ' ')}</span>
                
                {currentUser.vendorId && (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>Vendor Reference:</span>
                    <strong>{db.getVendors().find(v => v.id === currentUser.vendorId)?.companyName || currentUser.vendorId}</strong>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Users size={20} color="var(--primary)" />
              Account Settings
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (updatedName.trim().length < 2) {
                alert('Name must be at least 2 characters.');
                return;
              }
              const userObj = { ...currentUser, name: updatedName };
              db.setCurrentUser(userObj);
              if (!state.backendMode) {
                const usersList = db.getUsers().map(u => u.id === currentUser.id ? { ...u, name: updatedName } : u);
                db.setUsers(usersList);
              }
              alert('Profile settings updated successfully!');
              setShowSettingsModal(false);
              window.location.reload();
            }}>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={updatedName}
                  onChange={(e) => setUpdatedName(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <KeyRound size={20} color="var(--primary)" />
              Change Password
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newPassword.length < 6) {
                alert('New password must be at least 6 characters long.');
                return;
              }
              if (newPassword !== confirmPassword) {
                alert('New password and confirm password do not match.');
                return;
              }
              alert('Password changed successfully!');
              setOldPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowPasswordModal(false);
            }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
