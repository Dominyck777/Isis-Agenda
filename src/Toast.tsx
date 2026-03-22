import React, { useState, useEffect } from 'react';
import './Toast.css';

export const toast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  window.dispatchEvent(new CustomEvent('isis-toast', { detail: { message, type } }));
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const handleAdd = (e: any) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, ...e.detail }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    };
    window.addEventListener('isis-toast', handleAdd as EventListener);
    return () => window.removeEventListener('isis-toast', handleAdd as EventListener);
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast-message toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
