'use client';

import { useState, useEffect } from 'react';

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇲🇦' },
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(languages[0]);

  const changeLanguage = (lang: typeof languages[0]) => {
    setCurrentLang(lang);
    setIsOpen(false);
    
    // Google Translate logic: it looks for a cookie named 'googtrans'
    // Format: /source_lang/target_lang (e.g., /fr/en)
    document.cookie = `googtrans=/fr/${lang.code}; path=/`;
    document.cookie = `googtrans=/fr/${lang.code}; domain=.vercel.app; path=/`;
    document.cookie = `googtrans=/fr/${lang.code}; domain=cantine-plus-web.vercel.app; path=/`;
    
    // Reload page to apply translation
    window.location.reload();
  };

  useEffect(() => {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('googtrans='))
      ?.split('=')[1];
    
    if (cookieValue) {
      const code = cookieValue.split('/').pop();
      const lang = languages.find(l => l.code === code);
      if (lang) setCurrentLang(lang);
    }
  }, []);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all text-white font-medium"
      >
        <span>{currentLang.flag}</span>
        <span className="hidden sm:inline">{currentLang.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-48 bg-[#1E5C30] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                  currentLang.code === lang.code ? 'bg-white/5 text-[#F47B20] font-bold' : 'text-white'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
