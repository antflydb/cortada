import type { AnswerabilityMode, AnswerabilityRun } from "@/lib/types";

export const answerabilityModes: Record<AnswerabilityMode, { label: string; description: string }> = {
  keyword: { label: "Keyword", description: "Antfly BM25 full-text retrieval" },
  semantic: { label: "Semantic", description: "Antfly vector similarity retrieval" },
  hybrid: { label: "Hybrid", description: "BM25 and vectors fused with reciprocal rank fusion" },
  "hybrid-reranked": { label: "Hybrid + reranked", description: "Hybrid retrieval refined and pruned inside Antfly" },
};

export function answerabilityStatus(evidenceCount: number): AnswerabilityRun["status"] {
  if (evidenceCount >= 3) return "supported";
  return evidenceCount ? "partial" : "not-found";
}

export function numericIndexScores(value: unknown): Record<string, number> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number");
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function availableAnswerabilityModes(semanticEnabled: boolean, rerankingEnabled: boolean): AnswerabilityMode[] {
  return [
    "keyword",
    ...(semanticEnabled ? (["semantic", "hybrid"] as AnswerabilityMode[]) : []),
    ...(semanticEnabled && rerankingEnabled ? (["hybrid-reranked"] as AnswerabilityMode[]) : []),
  ];
}
