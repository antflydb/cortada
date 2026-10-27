import "server-only";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { assertSafePublicUrl } from "@/lib/security/public-url";
import type { ParsedPage } from "@/lib/aeo/analyze";
import type { AssetDocument, DiscoveredAsset, SourceDocument } from "@/lib/types";
import { crawlerUserAgent } from "@/lib/product/crawler";

const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const MAX_IMAGES = 50;
const MAX_PDFS = 20;

async function readBoundedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) throw new Error("The page is larger than the 2 MB ingestion limit");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error("The page is larger than the 2 MB ingestion limit");
    }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}

async function fetchWithSafeRedirects(input: string): Promise<{ response: Response; finalUrl: URL }> {
  let current = await assertSafePublicUrl(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": crawlerUserAgent(), Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The website returned a redirect without a destination");
      if (redirects === MAX_REDIRECTS) throw new Error("The website redirected too many times");
      current = await assertSafePublicUrl(new URL(location, current).toString());
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error("The website redirected too many times");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function absoluteHttpUrl(value: string | undefined, baseUrl: URL): string | undefined {
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return undefined;
  try {
    const resolved = new URL(value, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return undefined;
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return undefined;
  }
}

function numericAttribute(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return parsed > 0 ? parsed : undefined;
}

function discoverAssets($: cheerio.CheerioAPI, finalUrl: URL): DiscoveredAsset[] {
  const assets: DiscoveredAsset[] = [];
  const seen = new Set<string>();

  $("img[src],img[data-src]").each((_, element) => {
    if (assets.filter((asset) => asset.assetKind === "image").length >= MAX_IMAGES) return;
    const image = $(element);
    const url = absoluteHttpUrl(image.attr("src") || image.attr("data-src"), finalUrl);
    if (!url || seen.has(`image:${url}`)) return;
    const width = numericAttribute(image.attr("width"));
    const height = numericAttribute(image.attr("height"));
    if ((width && width <= 1) || (height && height <= 1)) return;
    if (image.attr("role") === "presentation" || image.attr("aria-hidden") === "true") return;
    const figure = image.closest("figure");
    const caption = cleanText(figure.find("figcaption").first().text());
    const parent = image.parent();
    const parentTag = parent.get(0)?.tagName?.toLowerCase();
    const parentText = parentTag && !["body", "main", "article", "section"].includes(parentTag)
      ? cleanText(parent.text()).slice(0, 280)
      : "";
    seen.add(`image:${url}`);
    assets.push({
      assetKind: "image",
      url,
      title: cleanText(image.attr("title") || caption || image.attr("alt") || ""),
      altText: cleanText(image.attr("alt") || ""),
      context: caption || parentText,
      mimeType: "image/*",
      width,
      height,
    });
  });

  $("a[href]").each((_, element) => {
    if (assets.filter((asset) => asset.assetKind === "pdf").length >= MAX_PDFS) return;
    const link = $(element);
    const url = absoluteHttpUrl(link.attr("href"), finalUrl);
    if (!url || seen.has(`pdf:${url}`)) return;
    const parsed = new URL(url);
    const declaredType = (link.attr("type") || "").toLowerCase();
    if (!parsed.pathname.toLowerCase().endsWith(".pdf") && declaredType !== "application/pdf") return;
    const label = cleanText(link.text() || link.attr("aria-label") || link.attr("title") || "");
    seen.add(`pdf:${url}`);
    assets.push({
      assetKind: "pdf",
      url,
      title: label,
      altText: "",
      context: cleanText(link.parent().text()).slice(0, 280),
      mimeType: "application/pdf",
    });
  });

  return assets;
}

export function parsePageHtml(html: string, finalUrl: URL): ParsedPage {
  const $ = cheerio.load(html);
  const assets = discoverAssets($, finalUrl);
  $("script:not([type='application/ld+json']), style, noscript, svg, iframe").remove();
  const title = cleanText($("title").first().text() || $("h1").first().text() || finalUrl.hostname);
  const description = cleanText($("meta[name='description']").attr("content") || "");
  const headings = $("h1,h2,h3,h4,h5,h6")
    .map((_, element) => ({
      level: Number(element.tagName.slice(1)),
      text: cleanText($(element).text()),
    }))
    .get()
    .filter((heading) => heading.text);
  const text = cleanText($("main").text() || $("article").text() || $("body").text()).slice(0, 500_000);
  const externalLinkCount = $("a[href]")
    .map((_, element) => $(element).attr("href"))
    .get()
    .filter((href) => {
      try {
        return new URL(href, finalUrl).hostname !== finalUrl.hostname;
      } catch {
        return false;
      }
    }).length;
  const faqText = `${headings.map((heading) => heading.text).join(" ")} ${text.slice(0, 20_000)}`;
  return {
    url: finalUrl.toString(),
    title,
    description,
    text,
    headings,
    externalLinkCount,
    hasFaqLanguage: /\b(faq|frequently asked|who|what|when|where|why|how)\b/i.test(faqText),
    hasStructuredData: $("script[type='application/ld+json']").length > 0,
    assets,
  };
}

export async function fetchAndParsePage(input: string): Promise<ParsedPage> {
  const { response, finalUrl } = await fetchWithSafeRedirects(input);
  if (!response.ok) throw new Error(`The website returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("The URL did not return an HTML page");
  }
  return parsePageHtml(await readBoundedText(response), finalUrl);
}

export function toSourceDocument(page: ParsedPage, brandName: string, fetchedAt: string, namespace: string): SourceDocument {
  const normalizedUrl = new URL(page.url).toString();
  const contentHash = createHash("sha256").update(page.text).digest("hex");
  const id = `${namespace}:source:${createHash("sha256").update(normalizedUrl).digest("hex").slice(0, 24)}`;
  return {
    id,
    type: "source",
    workspaceId: namespace,
    brandName,
    url: normalizedUrl,
    hostname: new URL(normalizedUrl).hostname,
    title: page.title,
    description: page.description,
    text: page.text,
    headings: page.headings.map((heading) => heading.text),
    wordCount: page.text.split(/\s+/).filter(Boolean).length,
    fetchedAt,
    contentHash,
  };
}

function mediaHostAllowlist(pageUrl: string): Set<string> {
  const hosts = new Set([new URL(pageUrl).hostname.toLowerCase()]);
  for (const value of (process.env.CORTADA_MEDIA_HOST_ALLOWLIST || "").split(",")) {
    const host = value.trim().toLowerCase();
    if (/^[a-z0-9.-]+$/.test(host)) hosts.add(host);
  }
  return hosts;
}

export function toAssetDocuments(
  page: ParsedPage,
  source: SourceDocument,
  discoveredAt: string,
): AssetDocument[] {
  const allowedHosts = mediaHostAllowlist(page.url);
  return page.assets.map((asset) => {
    const hostname = new URL(asset.url).hostname.toLowerCase();
    const digest = createHash("sha256").update(`${asset.assetKind}:${asset.url}`).digest("hex").slice(0, 24);
    return {
      id: `${source.workspaceId}:asset:${digest}`,
      type: "asset",
      workspaceId: source.workspaceId,
      sourceId: source.id,
      brandName: source.brandName,
      sourceUrl: source.url,
      assetKind: asset.assetKind,
      url: asset.url,
      ...(asset.assetKind === "pdf" && allowedHosts.has(hostname) ? { pdfUrl: asset.url } : {}),
      hostname,
      title: asset.title,
      altText: asset.altText,
      context: asset.context,
      mimeType: asset.mimeType,
      ...(asset.width ? { width: asset.width } : {}),
      ...(asset.height ? { height: asset.height } : {}),
      indexable: allowedHosts.has(hostname),
      discoveredAt,
    };
  });
}
