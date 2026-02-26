import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addToastListener } from '../lib/toast';

const DURATION_MS = 4000;

export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cleanup = addToastListener((msg) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage(msg);
      timeoutRef.current = setTimeout(() => {
        setMessage(null);
        timeoutRef.current = null;
      }, DURATION_MS);
    });
    return () => {
      cleanup();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!message) return null;

  const toastEl = (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 20px',
        backgroundColor: '#374151',
        color: '#f9fafb',
        borderRadius: 8,
        fontSize: 14,
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        zIndex: 2147483647,
        maxWidth: 'min(420px, calc(100vw - 48px))',
        border: '1px solid #4b5563',
      }}
    >
      {message}
    </div>
  );

  return createPortal(toastEl, document.body);
}
