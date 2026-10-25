import type { Metadata } from "next";
import { Gabarito } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import content from "@/content";
import "./globals.css";

const gabarito = Gabarito({
  variable: "--font-gabarito",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: content.appName,
  description: content.appDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="shipnext"
      className={`${gabarito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-base-100 text-base-content">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
