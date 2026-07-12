import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "도랭킹 팩토리",
  description: "랭킹 숏폼 자동 제작 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
