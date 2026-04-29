import type { Metadata } from "next";
import "./globals.css";

import Script from "next/script";

export const metadata: Metadata = {
  title: "Cantine+ | La plateforme intelligente de gestion des cantines",
  description: "Moins de gaspillage, plus de sens. La plateforme qui connecte Parents, Écoles et Prestataires.",
  manifest: "/manifest.json",
  themeColor: "#328A4A",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cantine+",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        {/* Barre de traduction universelle */}
        <div id="google_translate_element" className="fixed top-0 left-0 z-50 p-2 opacity-80 hover:opacity-100 transition-opacity"></div>
        {children}
        <Script strategy="beforeInteractive" src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" />
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new window.google.translate.TranslateElement({
                pageLanguage: 'fr',
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
              }, 'google_translate_element');
            }
          `}
        </Script>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
