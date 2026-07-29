import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'FluxoAÊ - Gestão Financeira',
  description: 'Seu copiloto financeiro inteligente.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FluxoAÊ',
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  formatDetection: {
    telephone: false,
  },
}

import { QueryProvider } from '@/components/providers/QueryProvider';
import { PwaRegister } from '@/components/providers/PwaRegister';
import { SyncProvider } from '@/components/providers/SyncProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <SyncProvider>
            <PwaRegister />
            {children}
            <Toaster 
              theme="light" 
              position="top-right" 
              richColors 
            />
          </SyncProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
