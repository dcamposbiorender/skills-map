import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Skills & Plugins Map",
  description:
    "Browse 1,300+ agent skills and 50+ plugins across finance, sales, HR, marketing, legal, and operations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="max-w-[1400px] mx-auto px-6 py-8 pb-16 text-lg leading-relaxed">
        {children}
      </body>
    </html>
  );
}
