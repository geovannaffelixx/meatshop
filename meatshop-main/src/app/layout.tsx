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
        <PanelAccessProvider>
          <RouteGuard>{children}</RouteGuard>
        </PanelAccessProvider>
        <Toaster />
      </body>
    </html>
  );
}
