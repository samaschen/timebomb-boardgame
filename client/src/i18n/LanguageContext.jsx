import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './en.json';
import zhCN from './zh-CN.json';
import zhTW from './zh-TW.json';

// Available languages configuration
export const LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  'zh-CN': { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文' },
  'zh-TW': { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文' },
};

// Translation data
const translations = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

// LocalStorage key for persisting language preference
const LANGUAGE_KEY = 'timebomb_language';

// Create context
const LanguageContext = createContext(null);

/**
 * Get nested value from object using dot notation
 * e.g., getNestedValue({ a: { b: 'value' } }, 'a.b') => 'value'
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Replace placeholders in string with values
 * e.g., interpolate('Hello {name}!', { name: 'World' }) => 'Hello World!'
 */
const interpolate = (str, params) => {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
};

/**
 * Language Provider Component
 */
export function LanguageProvider({ children }) {
  // Initialize language from localStorage or default to English
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved && translations[saved]) {
        return saved;
      }
      // Try to detect browser language
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang.startsWith('zh')) {
        // Check for Traditional Chinese regions
        if (browserLang === 'zh-TW' || browserLang === 'zh-HK' || browserLang === 'zh-Hant') {
          return 'zh-TW';
        }
        return 'zh-CN';
      }
    }
    return 'en';
  });

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  // Translation function
  const t = useCallback((key, params) => {
    const currentTranslations = translations[language] || translations.en;
    const fallbackTranslations = translations.en;
    
    // Try to get value from current language
    let value = getNestedValue(currentTranslations, key);
    
    // Fallback to English if not found
    if (value === undefined) {
      value = getNestedValue(fallbackTranslations, key);
    }
    
    // If still not found, return the key
    if (value === undefined) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    
    // Interpolate parameters
    return interpolate(value, params);
  }, [language]);

  // Set language function
  const setLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
    } else {
      console.warn(`Language ${lang} not supported`);
    }
  }, []);

  const value = {
    language,
    setLanguage,
    t,
    languages: LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to use translation
 */
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
