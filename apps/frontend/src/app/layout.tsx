import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNICORE",
  description: "Member, area, and project operations dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
