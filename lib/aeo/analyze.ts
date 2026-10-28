import type { AnalysisDocument, DiscoveredAsset, PageSignals, SourceDocument, Suggestion } from "@/lib/types";
import { activeAuditProfile, type AuditProfile } from "./rubrics";

export type ParsedPage = {
  url: string;
  title: string;
  description: string;
  text: string;
  headings: Array<{ level: number; text: string }>;
  externalLinkCount: number;
  hasFaqLanguage: boolean;
  hasStructuredData: boolean;
  assets: DiscoveredAsset[];
  internalLinks: string[];
};

function headingStructureIsValid(headings: ParsedPage["headings"]): boolean {
  if (!headings.length) return false;
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level - headings[index - 1].level > 1) return false;
  }
  return true;
}

function suggestion(
  id: string,
  severity: Suggestion["severity"],
  title: string,
  detail: string,
  evidence: string,
  fix: string,
  example?: string,
): Suggestion {
  return { id, severity, title, detail, evidence, fix, ...(example ? { example } : {}) };
}

export function analyzePage(
  page: ParsedPage,
  source: SourceDocument,
  analyzedAt: string,
  profile: AuditProfile = activeAuditProfile(),
): AnalysisDocument {
  const words = page.text.split(/\s+/).filter(Boolean);
  const firstSentence = page.text.split(/[.!?]/)[0] || "";
  const h1Count = page.headings.filter((heading) => heading.level === 1).length;
  const signals: PageSignals = {
    title: page.title.length >= 10 && page.title.length <= 70,
    metaDescription: page.description.length >= 70 && page.description.length <= 170,
    singleH1: h1Count === 1,
    headingStructure: headingStructureIsValid(page.headings),
    sufficientDepth: words.length >= 300,
    faqContent: page.hasFaqLanguage,
    structuredData: page.hasStructuredData,
    factualSignals: /\b\d+(?:[.,]\d+)?(?:%|x| years?| days?| hours?| users?| customers?)?\b/i.test(page.text),
    citations: page.externalLinkCount >= 2,
    answerFirstOpening: firstSentence.length >= 40 && firstSentence.length <= 240,
  };
  const score = (Object.keys(signals) as Array<keyof PageSignals>).reduce(
    (total, key) => total + (signals[key] ? profile.weights[key] : 0),
    0,
  );
  const suggestions: Suggestion[] = [];
  if (!signals.title) suggestions.push(suggestion("title", "critical", "Write a descriptive page title", "Use a unique 10–70 character title that names the subject and outcome.", `Observed title: “${page.title || "missing"}” (${page.title.length} characters).`, "Replace the document <title> with a specific description of this page.", `<title>${source.brandName}: ${page.headings[0]?.text || "A clear description of this page"}</title>`));
  if (!signals.metaDescription) suggestions.push(suggestion("meta", "warning", "Add a useful meta description", "Summarize the page in roughly 70–170 characters using concrete language.", page.description ? `The current description is ${page.description.length} characters.` : "No meta description was found.", "Add one unique description in the page <head>.", `<meta name="description" content="Learn what ${source.brandName} offers, who it helps, and the evidence behind its approach.">`));
  if (!signals.singleH1) suggestions.push(suggestion("h1", "critical", "Use exactly one H1", "Give the page one clear primary heading and place subsections under H2/H3 headings.", `Cortada found ${h1Count} H1 headings.`, "Keep one page-level H1 and demote other top-level headings.", `<h1>${page.title || source.brandName}</h1>`));
  if (!signals.headingStructure) suggestions.push(suggestion("headings", "warning", "Repair the heading hierarchy", "Avoid skipping heading levels so answer engines can reconstruct the page outline.", `Observed heading sequence: ${page.headings.map((heading) => `H${heading.level}`).join(" → ") || "none"}.`, "Use H2 under the H1, H3 under an H2, and avoid skipped levels."));
  if (!signals.sufficientDepth) suggestions.push(suggestion("depth", "warning", "Answer the topic more completely", "Add definitions, examples, constraints, and decision criteria—not filler—to reach useful topical depth.", `The primary page content contains ${words.length} words.`, "Add concise sections covering what it is, who it is for, how it works, evidence, limitations, and next steps."));
  if (!signals.faqContent) suggestions.push(suggestion("faq", "opportunity", "Add direct question-and-answer sections", "Use real customer questions as headings followed by concise, self-contained answers.", "No question-led or FAQ language was detected in the headings or primary text.", "Add two or three real customer questions with direct answers.", `<h2>How does ${source.brandName} help?</h2>\n<p>${source.brandName} …</p>`));
  if (!signals.structuredData) suggestions.push(suggestion("schema", "opportunity", "Publish structured data", "Add valid JSON-LD appropriate to the page, such as Organization, Product, Article, or FAQPage.", "No JSON-LD script was detected.", "Add schema that matches visible page content and validate it before publishing.", `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"${source.brandName}","url":"${source.url}"}</script>`));
  if (!signals.factualSignals) suggestions.push(suggestion("facts", "warning", "Add verifiable specifics", "Include dates, quantities, performance figures, limitations, or other checkable claims.", "No dates, quantities, percentages, or similarly checkable details were detected.", "Replace broad claims with sourced figures, dates, scope, and limitations."));
  if (!signals.citations) suggestions.push(suggestion("citations", "opportunity", "Support claims with sources", "Link important claims to authoritative primary sources where appropriate.", `Cortada found ${page.externalLinkCount} external source links.`, "Link important factual claims to primary documentation, research, standards, or public datasets."));
  if (!signals.answerFirstOpening) suggestions.push(suggestion("opening", "warning", "Lead with a direct answer", "Make the opening sentence a complete, quotable explanation of the page’s main subject.", `The opening sentence is ${firstSentence.length} characters long.`, "Start with a self-contained 40–240 character statement that identifies the subject and its value.", `${source.brandName} helps [audience] achieve [outcome] by [method].`));

  return {
    id: `${source.id}:${analyzedAt}`,
    type: "analysis",
    workspaceId: source.workspaceId,
    sourceId: source.id,
    brandName: source.brandName,
    url: source.url,
    title: source.title,
    rubric: { id: profile.id, version: profile.version, name: profile.name },
    score,
    grade: score >= profile.grades.excellent ? "excellent" : score >= profile.grades.good ? "good" : "needs-work",
    signals,
    suggestions,
    analyzedAt,
    ...(source.projectId ? { projectId: source.projectId } : {}),
    ...(source.crawlRunId ? { crawlRunId: source.crawlRunId } : {}),
  };
}
