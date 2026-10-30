import { describe, expect, it } from "vitest";
import {
  answerabilityStatus,
  availableAnswerabilityModes,
  numericIndexScores,
} from "@/lib/answerability/retrieval";

describe("Antfly Answerability Lab", () => {
  it("exposes only retrieval paths supported by the Antfly configuration", () => {
    expect(availableAnswerabilityModes(false, false)).toEqual(["keyword"]);
    expect(availableAnswerabilityModes(true, false)).toEqual(["keyword", "semantic", "hybrid"]);
    expect(availableAnswerabilityModes(true, true)).toEqual(["keyword", "semantic", "hybrid", "hybrid-reranked"]);
  });

  it("classifies evidence coverage deterministically", () => {
    expect(answerabilityStatus(0)).toBe("not-found");
    expect(answerabilityStatus(1)).toBe("partial");
    expect(answerabilityStatus(3)).toBe("supported");
  });

  it("keeps numeric Antfly index provenance and rejects malformed score values", () => {
    expect(numericIndexScores({ full_text: 0.4, aeo_evidence_v1: 0.8, debug: "ignored" }))
      .toEqual({ full_text: 0.4, aeo_evidence_v1: 0.8 });
    expect(numericIndexScores(null)).toBeUndefined();
  });
});
