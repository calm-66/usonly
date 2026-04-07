import type { Metadata } from "next";
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
      <head>
        <script 
          src="https://monitor-70t6v0k0q-calm-66s-projects.vercel.app/monitor.js"
          data-project-id="UsOnly"
          data-api-key="mk_DB6w9D2sJ4flZnNdOWPRAgJ6A8tl9F5D"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}