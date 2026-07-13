import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lutest Dashboard",
  description: "Local scan dashboard for Lutest static graph and reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full bg-[oklch(0.09_0.015_260)]">
        {children}
      </body>
    </html>
  );
}
