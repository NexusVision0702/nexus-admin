import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ネクビジョ会員登録",
  description: "NexusVision株式会社の会員登録ページです",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      translate="no"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}