export type ProductConfig = {
  name: string;
  mark: string;
  logoUrl?: string;
  eyebrow: string;
  headline: string;
  description: string;
  deployNote: string;
  footerText: string;
  metadataTitle: string;
  metadataDescription: string;
  repositoryUrl: string;
  vercelDeployUrl: string;
  licenseName: string;
  showProjectLinks: boolean;
  showArchitecture: boolean;
  showAntflyAttribution: boolean;
  appearance: {
    font: "sans" | "editorial";
    corners: "square" | "soft" | "rounded";
  };
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
  };
};

function text(value: string | undefined, fallback: string, maxLength = 240): string {
  const candidate = value?.trim();
  return candidate && candidate.length <= maxLength ? candidate : fallback;
}

function httpsUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString().replace(/\/$/, "") : fallback;
  } catch {
    return fallback;
  }
}

function assetUrl(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  if (/^\/[A-Za-z0-9/_\-.]+$/.test(candidate)) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function flag(value: string | undefined, fallback: boolean): boolean {
  const candidate = value?.trim().toLowerCase();
  if (candidate === "true") return true;
  if (candidate === "false") return false;
  return fallback;
}

function option<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const candidate = value?.trim() as T | undefined;
  return candidate && allowed.includes(candidate) ? candidate : fallback;
}

function color(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  return candidate && /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}

const name = text(process.env.NEXT_PUBLIC_APP_NAME, "Cortada", 60);
const description = text(
  process.env.NEXT_PUBLIC_APP_DESCRIPTION,
  `${name} turns your website into structured evidence, then shows where answer engines may struggle to understand or cite it.`,
);
const repositoryUrl = httpsUrl(process.env.NEXT_PUBLIC_REPOSITORY_URL, "https://github.com/antflydb/cortada");
const licenseName = text(process.env.NEXT_PUBLIC_LICENSE_NAME, "Apache-2.0", 40);

export const productConfig: ProductConfig = Object.freeze({
  name,
  mark: text(process.env.NEXT_PUBLIC_APP_MARK, name.slice(0, 1).toUpperCase(), 3),
  logoUrl: assetUrl(process.env.NEXT_PUBLIC_APP_LOGO_URL),
  eyebrow: text(process.env.NEXT_PUBLIC_APP_EYEBROW, "Answer engine intelligence", 80),
  headline: text(process.env.NEXT_PUBLIC_APP_HEADLINE, "Make your company easy to answer.", 100),
  description,
  deployNote: text(process.env.NEXT_PUBLIC_APP_DEPLOY_NOTE, "Open source · Rebrandable · Antfly Lite or Antfly Cloud", 120),
  footerText: text(process.env.NEXT_PUBLIC_APP_FOOTER, `${name} Community · ${licenseName}`, 120),
  metadataTitle: text(process.env.NEXT_PUBLIC_APP_TITLE, `${name} — AEO intelligence on Antfly`, 100),
  metadataDescription: text(process.env.NEXT_PUBLIC_APP_META_DESCRIPTION, description, 240),
  repositoryUrl,
  vercelDeployUrl: `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repositoryUrl)}`,
  licenseName,
  showProjectLinks: flag(process.env.NEXT_PUBLIC_SHOW_PROJECT_LINKS, true),
  showArchitecture: flag(process.env.NEXT_PUBLIC_SHOW_ARCHITECTURE, true),
  showAntflyAttribution: flag(process.env.NEXT_PUBLIC_SHOW_ANTFLY_ATTRIBUTION, true),
  appearance: Object.freeze({
    font: option(process.env.NEXT_PUBLIC_THEME_FONT, ["sans", "editorial"] as const, "sans"),
    corners: option(process.env.NEXT_PUBLIC_THEME_CORNERS, ["square", "soft", "rounded"] as const, "soft"),
  }),
  colors: Object.freeze({
    primary: color(process.env.NEXT_PUBLIC_BRAND_PRIMARY, "#176b4d"),
    accent: color(process.env.NEXT_PUBLIC_BRAND_ACCENT, "#d97732"),
    background: color(process.env.NEXT_PUBLIC_BRAND_BACKGROUND, "#f6f8f7"),
    surface: color(process.env.NEXT_PUBLIC_BRAND_SURFACE, "#ffffff"),
    text: color(process.env.NEXT_PUBLIC_BRAND_TEXT, "#17211e"),
    muted: color(process.env.NEXT_PUBLIC_BRAND_MUTED, "#64706c"),
    border: color(process.env.NEXT_PUBLIC_BRAND_BORDER, "#dce2df"),
  }),
});
