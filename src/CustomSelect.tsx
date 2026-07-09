import React, { useRef, useEffect } from 'react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: React.ReactNode }[];
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function CustomSelect({ value, onChange, options, style, disabled }: CustomSelectProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.removeAttribute('open');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <details 
      ref={detailsRef}
      className="custom-mobile-select" 
      style={{ position: 'relative', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto', ...style, padding: 0 }}
    >
      <summary 
        style={{ 
          width: '100%', 
          height: '100%',
          padding: style?.padding || '12px', 
          borderRadius: style?.borderRadius || '8px', 
          background: style?.background || 'var(--input-bg)', 
          color: style?.color || '#fff', 
          border: style?.border || '1px solid var(--border-color)', 
          outline: 'none', 
          fontSize: style?.fontSize || '1rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer', 
          listStyle: 'none' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : value}
        </div>
        <span style={{ fontSize: '0.8rem', marginLeft: '8px', flexShrink: 0 }}>▼</span>
      </summary>
      <div 
        style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          background: 'var(--surface-color)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px', 
          marginTop: '4px', 
          zIndex: 50, 
          display: 'flex', 
          flexDirection: 'column', 
          maxHeight: '250px',
          overflowY: 'auto', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)' 
        }}
      >
        {options.map((opt, i) => (
          <button 
            key={opt.value + i}
            type="button" 
            onClick={() => { 
              if (String(opt.value) !== String(value)) onChange(opt.value); 
              detailsRef.current?.removeAttribute('open'); 
            }} 
            style={{ 
              padding: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: String(opt.value) === String(value) ? 'var(--primary-color)' : 'transparent', 
              border: 'none', 
              color: '#fff', 
              borderBottom: '1px solid rgba(255,255,255,0.05)', 
              cursor: 'pointer', 
              textAlign: 'left', 
              fontSize: '1rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => { if (String(opt.value) !== String(value)) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { if (String(opt.value) !== String(value)) e.currentTarget.style.background = 'transparent' }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </details>
  );
}
