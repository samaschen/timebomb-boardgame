import React from 'react';
import { useTranslation, LANGUAGES } from '../i18n/LanguageContext';

function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div style={{
      position: 'fixed',
      top: 'clamp(8px, 2vw, 16px)',
      right: 'clamp(8px, 2vw, 16px)',
      zIndex: 900,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{
        fontSize: 'clamp(10px, 1.5vw, 12px)',
        color: '#666',
        fontWeight: '500',
      }}>
        🌐
      </span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{
          padding: 'clamp(4px, 1vw, 8px) clamp(8px, 1.5vw, 12px)',
          fontSize: 'clamp(11px, 1.5vw, 13px)',
          borderRadius: '6px',
          border: '1px solid #ddd',
          background: 'white',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          minWidth: 'clamp(80px, 15vw, 120px)',
        }}
      >
        {Object.entries(LANGUAGES).map(([code, { nativeName }]) => (
          <option key={code} value={code}>
            {nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;
