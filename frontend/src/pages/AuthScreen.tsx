import React, { useState } from 'react';
import { db } from '../db/mockDb';
import { KeyRound, Mail, Lock, User as UserIcon, Store, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../types';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (payload: { name: string; email: string; role: UserRole; password: string; vendorId?: string }) => Promise<void>;
  backendMode: boolean;
  backendConnected: boolean;
  toggleBackendMode: (enable: boolean) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onSignup,
  backendMode,
  backendConnected,
  toggleBackendMode
}) => {
  const [view, setView] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD'>('LOGIN');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Signup specific
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Forgot password specific
  const [forgotEmail, setForgotEmail] = useState('');

  const vendors = db.getVendors().filter(v => v.status === 'ACTIVE');

  // Input Validation
  const validateEmail = (input: string) => {
    return /\S+@\S+\.\S+/.test(input);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await onLogin(email, password);
      setSuccessMsg('Logged in successfully! Redirecting...');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (name.trim().length < 2) {
      setErrorMsg('Name must be at least 2 characters.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (!selectedVendorId) {
      setErrorMsg('Please select a Supplier Company to link your account.');
      return;
    }

    setLoading(true);
    try {
      await onSignup({
        name,
        email,
        password,
        role: 'VENDOR',
        vendorId: selectedVendorId
      });
      setSuccessMsg('Registration completed! You can now log in.');
      // Reset fields
      setName('');
      setEmail('');
      setPassword('');
      setSelectedVendorId('');
      setView('LOGIN');
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateEmail(forgotEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setSuccessMsg(`A password reset link has been dispatched to ${forgotEmail} (Simulated).`);
      setForgotEmail('');
      setLoading(false);
    }, 1000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)',
      padding: '2rem 1.5rem',
      position: 'relative',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Backend / Mock switch at the very top right */}
      <div style={{
        position: 'absolute',
        top: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '0.4rem 0.85rem',
        zIndex: 50
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: backendMode ? (backendConnected ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)' }}>
          {backendMode ? (backendConnected ? 'MySQL: Active' : 'MySQL: Offline') : 'Mock DB: Local'}
        </span>
        <input
          type="checkbox"
          checked={backendMode}
          onChange={(e) => toggleBackendMode(e.target.checked)}
          style={{ cursor: 'pointer', width: '14px', height: '14px' }}
          title="Toggle Live Express + MySQL Backend Sync"
        />
      </div>

      <div style={{ maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* App Logo Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.25rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #6366f1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.025em',
            }}>
              VendorBridge
            </span>
            <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>ERP</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Centralized Procurement & Supplier Management Portal
          </p>
        </div>

        {/* Card Body */}
        <div className="card" style={{ padding: '2.5rem 2rem' }}>

          {/* Notification Messages */}
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid rgba(220, 38, 38, 0.15)',
              borderRadius: '8px',
              color: 'var(--danger)',
              fontSize: '0.825rem',
              marginBottom: '1.5rem',
              animation: 'fadeIn var(--transition-fast)'
            }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--success-bg)',
              border: '1px solid rgba(5, 150, 105, 0.15)',
              borderRadius: '8px',
              color: 'var(--success)',
              fontSize: '0.825rem',
              marginBottom: '1.5rem',
              animation: 'fadeIn var(--transition-fast)'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {view === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, marginBottom: '0.25rem' }}>Account Sign-In</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Enter your credentials to access your dashboard.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} /> Email Address
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Lock size={14} /> Password
                  </label>
                  <span
                    onClick={() => setView('FORGOT_PASSWORD')}
                    style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Forgot Password?
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Don't have a supplier account?{' '}
                <span onClick={() => { setView('SIGNUP'); setErrorMsg(null); setSuccessMsg(null); }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Register Supplier
                </span>
              </div>
            </form>
          )}

          {/* VIEW: SIGNUP */}
          {view === 'SIGNUP' && (
            <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, marginBottom: '0.25rem' }}>Supplier Registration</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Create your Vendor account and link to your registered company.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserIcon size={14} /> Full Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} /> Email Address
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="sales@supplier.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock size={14} /> Choose Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Store size={14} /> Representing Supplier
                </label>
                <select
                  className="form-select"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  required
                  disabled={loading}
                  style={{ width: '100%', backgroundColor: '#0f1524', color: 'white' }}
                >
                  <option value="">-- Select Company --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.companyName} ({v.location})
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={loading}>
                {loading ? 'Creating Account...' : 'Register'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Already registered?{' '}
                <span onClick={() => { setView('LOGIN'); setErrorMsg(null); setSuccessMsg(null); }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Sign In
                </span>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT_PASSWORD */}
          {view === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, marginBottom: '0.25rem' }}>Reset Password</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Enter your email address and we will forward password recovery credentials.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} /> Registered Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={loading}>
                {loading ? 'Sending link...' : 'Send Recovery Instructions'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Back to{' '}
                <span onClick={() => { setView('LOGIN'); setErrorMsg(null); setSuccessMsg(null); }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Sign In
                </span>
              </div>
            </form>
          )}

        </div>

        {/* Demo Seed Credentials Helper Block */}
        <div className="card" style={{ padding: '1.25rem', fontSize: '0.8rem', borderStyle: 'dashed' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <KeyRound size={12} color="var(--primary)" /> Seed Login Credentials (Dev/Test):
          </div>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-muted)' }}>
            <li><strong>Admin:</strong> admin@vendorbridge.com / Admin@123</li>
            <li><strong>Procurement:</strong> priya@vendorbridge.com / Officer@123</li>
            <li><strong>Manager:</strong> rajesh@vendorbridge.com / Manager@123</li>
            <li><strong>Vendor:</strong> user@techcorp.com / Vendor@123</li>
          </ul>
        </div>

      </div>
    </div>
  );
};
