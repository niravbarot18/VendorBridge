import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const AccessDenied: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div className="card" style={{
        maxWidth: '450px',
        width: '100%',
        padding: '3rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--danger-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--danger)',
        }}>
          <ShieldAlert size={36} />
        </div>

        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            color: 'var(--text-main)',
          }}>
            403 - Access Denied
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.925rem',
            lineHeight: 1.5,
          }}>
            You do not have the required permissions to access this screen. Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    </div>
  );
};
