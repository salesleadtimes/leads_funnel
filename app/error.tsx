'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Route Error caught by Error Boundary:', error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '40px auto',
        padding: '32px 24px',
        backgroundColor: '#ffffff',
        border: '1px solid #fee2e2',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#dc2626',
          marginBottom: '8px',
        }}
      >
        Something went wrong on this page
      </h2>
      <p
        style={{
          fontSize: '14px',
          color: '#4b5563',
          marginBottom: '20px',
          lineHeight: '1.5',
        }}
      >
        An unexpected error occurred in this view. The rest of the application remains active.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          🔄 Try Again
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          🏠 Return to Dashboard
        </button>
      </div>
    </div>
  );
}
