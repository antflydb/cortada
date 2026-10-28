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
        data-theme-font={productConfig.appearance.font}
        data-theme-corners={productConfig.appearance.corners}
        style={{
          "--brand-primary": productConfig.colors.primary,
          "--brand-accent": productConfig.colors.accent,
          "--brand-background": productConfig.colors.background,
          "--brand-surface": productConfig.colors.surface,
          "--brand-text": productConfig.colors.text,
          "--brand-muted": productConfig.colors.muted,
          "--brand-border": productConfig.colors.border,
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
