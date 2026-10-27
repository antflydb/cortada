import type { AnalysisDocument, PageSignals, SourceDocument, Suggestion } from "@/lib/types";
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
};

function headingStructureIsValid(headings: ParsedPage["headings"]): boolean {
  if (!headings.length) return false;
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level - headings[index - 1].level > 1) return false;
  }
  return true;
}

function suggestion(id: string, severity: Suggestion["severity"], title: string, detail: string): Suggestion {
  return { id, severity, title, detail };
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
  if (!signals.title) suggestions.push(suggestion("title", "critical", "Write a descriptive page title", "Use a unique 10–70 character title that names the subject and outcome."));
  if (!signals.metaDescription) suggestions.push(suggestion("meta", "warning", "Add a useful meta description", "Summarize the page in roughly 70–170 characters using concrete language."));
  if (!signals.singleH1) suggestions.push(suggestion("h1", "critical", "Use exactly one H1", "Give the page one clear primary heading and place subsections under H2/H3 headings."));
  if (!signals.headingStructure) suggestions.push(suggestion("headings", "warning", "Repair the heading hierarchy", "Avoid skipping heading levels so answer engines can reconstruct the page outline."));
  if (!signals.sufficientDepth) suggestions.push(suggestion("depth", "warning", "Answer the topic more completely", "Add definitions, examples, constraints, and decision criteria—not filler—to reach useful topical depth."));
  if (!signals.faqContent) suggestions.push(suggestion("faq", "opportunity", "Add direct question-and-answer sections", "Use real customer questions as headings followed by concise, self-contained answers."));
  if (!signals.structuredData) suggestions.push(suggestion("schema", "opportunity", "Publish structured data", "Add valid JSON-LD appropriate to the page, such as Organization, Product, Article, or FAQPage."));
  if (!signals.factualSignals) suggestions.push(suggestion("facts", "warning", "Add verifiable specifics", "Include dates, quantities, performance figures, limitations, or other checkable claims."));
  if (!signals.citations) suggestions.push(suggestion("citations", "opportunity", "Support claims with sources", "Link important claims to authoritative primary sources where appropriate."));
  if (!signals.answerFirstOpening) suggestions.push(suggestion("opening", "warning", "Lead with a direct answer", "Make the opening sentence a complete, quotable explanation of the page’s main subject."));

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
  };
}
