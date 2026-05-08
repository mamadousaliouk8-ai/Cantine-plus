import type { Metadata, Viewport } from "next";
import "./globals.css";
import GoogleTranslate from "@/components/GoogleTranslate";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Cantine+ | La plateforme intelligente de gestion des cantines",
  description:
    "Moins de gaspillage, plus de sens. La plateforme qui connecte Parents, Écoles et Prestataires.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cantine+",
  },
};

export const viewport: Viewport = {
  themeColor: "#328A4A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ServiceWorkerRegister />
        <GoogleTranslate />
        {children}
      </body>
    </html>
  );
}
