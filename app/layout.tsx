import type { Metadata, Viewport } from "next";
import { Geist, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "拍摄规划 | AI Shot Planner",
  description: "AI摄影导演，生成你的专属九宫格拍摄方案",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "拍摄规划" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1c1917",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${notoSerifSC.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-50">{children}</body>
    </html>
  );
}
