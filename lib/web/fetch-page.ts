import "server-only";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { assertSafePublicUrl } from "@/lib/security/public-url";
import type { ParsedPage } from "@/lib/aeo/analyze";
import type { SourceDocument } from "@/lib/types";

const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Cortada-AEO-Auditor/0.1 (+https://github.com/antflydb)";

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
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
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

export async function fetchAndParsePage(input: string): Promise<ParsedPage> {
  const { response, finalUrl } = await fetchWithSafeRedirects(input);
  if (!response.ok) throw new Error(`The website returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("The URL did not return an HTML page");
  }
  const html = await readBoundedText(response);
  const $ = cheerio.load(html);
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
  };
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
