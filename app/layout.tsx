import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cortada — AEO intelligence on Antfly",
  description: "Audit how clearly your website communicates with answer engines, powered by Antfly.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
