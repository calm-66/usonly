import type { Metadata } from "next";
import MonitorProvider from "@/components/MonitorProvider";
import PaymentStatusChecker from "@/components/PaymentStatusChecker";
import "./globals.css";

export const metadata: Metadata = {
  title: "UsOnly - 只属于两个人的私密空间",
  description: "一个只属于两个人的私密空间，用轻松自然的方式分享彼此的日常生活",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <MonitorProvider>
          {children}
          <PaymentStatusChecker />
        </MonitorProvider>
      </body>
    </html>
  );
}
