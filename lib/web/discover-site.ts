import "server-only";
import * as cheerio from "cheerio";
import type { ParsedPage } from "@/lib/aeo/analyze";
import { crawlerUserAgent } from "@/lib/product/crawler";
import { assertSafePublicUrl } from "@/lib/security/public-url";
import { fetchAndParsePage } from "./fetch-page";

const MAX_DISCOVERY_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const NON_HTML_EXTENSIONS = /\.(?:avif|css|csv|docx?|gif|ico|jpe?g|js|json|mp3|mp4|pdf|png|pptx?|svg|txt|webm|webp|xlsx?|xml|zip)$/i;

export type SiteDiscovery = {
  rootPage: ParsedPage;
  urls: string[];
  sitemapUrls: string[];
  disallowedPaths: string[];
};

async function readBounded(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_DISCOVERY_BYTES) throw new Error("Discovery file exceeds the 1 MB limit");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_DISCOVERY_BYTES) {
      await reader.cancel();
      throw new Error("Discovery file exceeds the 1 MB limit");
    }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}

async function fetchDiscoveryText(input: string, expectedHostname: string): Promise<string> {
  let current = await assertSafePublicUrl(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (current.hostname !== expectedHostname) throw new Error("Discovery redirects must remain on the audited host");
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": crawlerUserAgent(), Accept: "application/xml,text/xml,text/plain,*/*;q=.1" },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) throw new Error("Discovery redirect could not be followed safely");
      current = await assertSafePublicUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Discovery resource returned HTTP ${response.status}`);
    return readBounded(response);
  }
  return "";
}

export function parseRobotsText(text: string): { sitemapUrls: string[]; disallowedPaths: string[] } {
  const sitemapUrls: string[] = [];
  const disallowedPaths: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "").trim();
    const sitemap = line.match(/^sitemap\s*:\s*(\S+)/i)?.[1];
    if (sitemap) sitemapUrls.push(sitemap);
    const disallow = line.match(/^disallow\s*:\s*(\S+)/i)?.[1];
    if (disallow && disallow !== "/") disallowedPaths.push(disallow);
    if (disallow === "/") disallowedPaths.push("/");
  }
  return { sitemapUrls: [...new Set(sitemapUrls)], disallowedPaths: [...new Set(disallowedPaths)] };
}

export function parseSitemapXml(xml: string): { pageUrls: string[]; nestedSitemaps: string[] } {
  const $ = cheerio.load(xml, { xmlMode: true });
  const locations = $("loc").map((_, element) => $(element).text().trim()).get().filter(Boolean);
  return xml.includes("<sitemapindex")
    ? { pageUrls: [], nestedSitemaps: locations }
    : { pageUrls: locations, nestedSitemaps: [] };
}

function normalizedPageUrl(value: string, hostname: string): string | undefined {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.hostname !== hostname || NON_HTML_EXTENSIONS.test(url.pathname)) return undefined;
    if (/\/(?:logout|signout)(?:\/|$)/i.test(url.pathname)) return undefined;
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function robotsRuleMatches(path: string, rule: string): boolean {
  const anchored = rule.endsWith("$");
  const body = anchored ? rule.slice(0, -1) : rule;
  const pattern = body.split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
}

function allowedByRobots(value: string, disallowedPaths: string[]): boolean {
  const url = new URL(value);
  return !disallowedPaths.some((rule) => rule && robotsRuleMatches(`${url.pathname}${url.search}`, rule));
}

export async function discoverSite(input: string, limit: number): Promise<SiteDiscovery> {
  const rootPage = await fetchAndParsePage(input);
  const rootUrl = new URL(rootPage.url);
  const origin = rootUrl.origin;
  let robots = { sitemapUrls: [] as string[], disallowedPaths: [] as string[] };

  try {
    robots = parseRobotsText(await fetchDiscoveryText(`${origin}/robots.txt`, rootUrl.hostname));
  } catch {
    // A missing robots file is not a crawl failure. SSRF and host checks still apply to every fetch.
  }

  const sitemapCandidates = robots.sitemapUrls.length ? robots.sitemapUrls : [`${origin}/sitemap.xml`];
  const sitemapUrls: string[] = [];
  const sitemapPages: string[] = [];
  for (const candidate of sitemapCandidates.slice(0, 3)) {
    try {
      if (new URL(candidate).hostname !== rootUrl.hostname) continue;
      const parsed = parseSitemapXml(await fetchDiscoveryText(candidate, rootUrl.hostname));
      sitemapUrls.push(candidate);
      sitemapPages.push(...parsed.pageUrls);
      for (const nested of parsed.nestedSitemaps.slice(0, 5)) {
        if (new URL(nested).hostname !== rootUrl.hostname) continue;
        const child = parseSitemapXml(await fetchDiscoveryText(nested, rootUrl.hostname));
        sitemapUrls.push(nested);
        sitemapPages.push(...child.pageUrls);
        if (sitemapPages.length >= limit * 4) break;
      }
    } catch {
      // Fall back to same-host links from the audited root page.
    }
    if (sitemapPages.length >= limit * 4) break;
  }

  const candidates = [rootPage.url, ...sitemapPages, ...rootPage.internalLinks];
  const urls = [...new Set(candidates
    .map((value) => normalizedPageUrl(value, rootUrl.hostname))
    .filter((value): value is string => Boolean(value)))]
    .filter((value) => allowedByRobots(value, robots.disallowedPaths))
    .slice(0, limit);

  if (!urls.includes(rootPage.url) && allowedByRobots(rootPage.url, robots.disallowedPaths)) urls.unshift(rootPage.url);
  const bounded = urls.slice(0, limit);
  if (!bounded.length) throw new Error("robots.txt does not allow Cortada to audit this site");
  return { rootPage, urls: bounded, sitemapUrls, disallowedPaths: robots.disallowedPaths };
}
