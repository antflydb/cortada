export type ProductConfig = {
  name: string;
  mark: string;
  eyebrow: string;
  headline: string;
  description: string;
  metadataTitle: string;
  metadataDescription: string;
  repositoryUrl: string;
  vercelDeployUrl: string;
  licenseName: string;
  colors: {
    primary: string;
    accent: string;
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

export const productConfig: ProductConfig = Object.freeze({
  name,
  mark: text(process.env.NEXT_PUBLIC_APP_MARK, name.slice(0, 1).toUpperCase(), 3),
  eyebrow: text(process.env.NEXT_PUBLIC_APP_EYEBROW, "Answer engine intelligence", 80),
  headline: text(process.env.NEXT_PUBLIC_APP_HEADLINE, "Make your company easy to answer.", 100),
  description,
  metadataTitle: text(process.env.NEXT_PUBLIC_APP_TITLE, `${name} — AEO intelligence on Antfly`, 100),
  metadataDescription: text(process.env.NEXT_PUBLIC_APP_META_DESCRIPTION, description, 240),
  repositoryUrl,
  vercelDeployUrl: `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repositoryUrl)}`,
  licenseName: text(process.env.NEXT_PUBLIC_LICENSE_NAME, "Apache-2.0", 40),
  colors: Object.freeze({
    primary: color(process.env.NEXT_PUBLIC_BRAND_PRIMARY, "#176b4d"),
    accent: color(process.env.NEXT_PUBLIC_BRAND_ACCENT, "#e66b2e"),
  }),
});
