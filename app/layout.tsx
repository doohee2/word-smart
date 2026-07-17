import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "워드 스마트",
  description: "오프라인 동작 PWA 영단어 학습 앱",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-background text-on-background min-h-screen flex flex-col md:flex-row antialiased`}>
        <Providers>
          <Navigation />
          <div className="flex-1 flex flex-col md:ml-64 relative min-h-screen pb-24 md:pb-0">
            <Header />
            <main className="flex-1 flex flex-col p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
