import { LegalGate } from '@/shared/components/legal/legal-gate';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { Toaster } from "@/shared/components/ui/toaster";
import { PanelAccessProvider } from "@/shared/providers/panel-access-provider";
import { RouteGuard } from "@/shared/components/route-guard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MeatShop",
  description: "Gestão profissional para açougues, pedidos e entregas.",
};

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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:p-3 focus:text-slate-950 focus:shadow-lg">
          Pular para o conteúdo
        </a>
        <PanelAccessProvider>
          <RouteGuard><LegalGate>{children}</LegalGate></RouteGuard>
        </PanelAccessProvider>
        <Toaster />
      </body>
    </html>
  );
}
