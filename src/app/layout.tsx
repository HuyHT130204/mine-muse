import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import React from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mine-Muse",
  description: "Create and repurpose Bitcoin mining content",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <React.Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="Mine-Muse" width={64} height={64} />
                <div className="font-brand text-3xl text-gray-900">Mine-Muse</div>
              </div>
            </div>
          }
        >
          {children}
        </React.Suspense>
      </body>
    </html>
  );
}
