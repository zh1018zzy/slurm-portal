import type { Metadata } from "next";
import "./globals.css";

// 使用本地字体，避免网络依赖
const fontClass = "font-sans";

// 禁止生成metadata，因为这个是Root Layout
export const metadata: Metadata = {
  // 空的metadata将由locale layout处理
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
