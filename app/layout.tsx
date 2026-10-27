import type { Metadata } from "next";
import "./globals.css";
import { productConfig } from "@/lib/product/config";

export const metadata: Metadata = {
  title: productConfig.metadataTitle,
  description: productConfig.metadataDescription,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        style={{
          "--brand-primary": productConfig.colors.primary,
          "--brand-accent": productConfig.colors.accent,
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
