'use client';

import Script from 'next/script';

export default function GoogleTranslate() {
  return (
    <>
      <div
        id="google_translate_element"
        className="fixed top-0 left-0 z-50 p-2 opacity-80 hover:opacity-100 transition-opacity"
      ></div>
      <Script
        id="google-translate-script"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
        onLoad={() => {
          (window as any).googleTranslateElementInit = () => {
            if ((window as any).google && (window as any).google.translate) {
              new (window as any).google.translate.TranslateElement({
                pageLanguage: 'fr',
                layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE
              }, 'google_translate_element');
            }
          };
        }}
      />
    </>
  );
}
