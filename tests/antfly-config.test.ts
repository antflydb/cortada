import { describe, expect, it } from "vitest";
import { antflySearchIndexes } from "@/lib/antfly/search-indexes";

describe("antflySearchIndexes", () => {
  it("uses the active full-text index when embeddings are disabled", () => {
    expect(
      antflySearchIndexes({
        embeddingsEnabled: false,
        embeddingIndex: "cortada_evidence_v1",
        fullTextIndex: "full_text_index_v0",
      }),
    ).toEqual(["full_text_index_v0"]);
  });

  it("uses only the vector index for hybrid search", () => {
    expect(
      antflySearchIndexes({
        embeddingsEnabled: true,
        embeddingIndex: "cortada_evidence_v1",
        fullTextIndex: "full_text_index_v0",
      }),
    ).toEqual(["cortada_evidence_v1"]);
  });

  it("falls back to full-text search when no embedding index is configured", () => {
    expect(
      antflySearchIndexes({
        embeddingsEnabled: true,
        fullTextIndex: "full_text_index_v0",
      }),
    ).toEqual(["full_text_index_v0"]);
  });
});
