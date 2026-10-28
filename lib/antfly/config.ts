import "server-only";
import { normalizeAntflyBaseUrl } from "./base-url";

export type AntflySettings = {
  baseUrl: string;
  apiKey?: string;
  table: string;
  namespace: string;
  fullTextIndex: string;
  embeddingsEnabled: boolean;
  embeddingIndex?: string;
  assetMetadataSearchEnabled: boolean;
  assetMetadataIndex?: string;
  visualSearchEnabled: boolean;
  visualIndex?: string;
  pdfExtractionEnabled: boolean;
  pdfTextIndex?: string;
};

export function antflySettings(): AntflySettings {
  const baseUrl = normalizeAntflyBaseUrl(process.env.ANTFLY_URL || "http://127.0.0.1:8080");
  const table = (process.env.ANTFLY_TABLE || "default").trim();
  const namespace = (process.env.CORTADA_NAMESPACE || "cortada_dev").trim();

  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(table)) {
    throw new Error("ANTFLY_TABLE must contain only lowercase letters, numbers, underscores, or hyphens");
  }
  if (!/^[a-z][a-z0-9_-]{1,63}$/.test(namespace)) {
    throw new Error("CORTADA_NAMESPACE must be 2-64 lowercase letters, numbers, underscores, or hyphens");
  }

  return {
    baseUrl,
    apiKey: process.env.ANTFLY_API_KEY?.trim() || undefined,
    table,
    namespace,
    fullTextIndex: process.env.ANTFLY_FULL_TEXT_INDEX?.trim() || "full_text_index_v0",
    embeddingsEnabled: process.env.ANTFLY_ENABLE_EMBEDDINGS === "true",
    embeddingIndex: process.env.ANTFLY_EMBEDDING_INDEX?.trim() || undefined,
    assetMetadataSearchEnabled: process.env.ANTFLY_ENABLE_ASSET_SEARCH === "true",
    assetMetadataIndex: process.env.ANTFLY_ASSET_INDEX?.trim() || undefined,
    visualSearchEnabled: process.env.ANTFLY_ENABLE_MULTIMODAL === "true",
    visualIndex: process.env.ANTFLY_VISUAL_INDEX?.trim() || undefined,
    pdfExtractionEnabled: process.env.ANTFLY_ENABLE_PDF_EXTRACTION === "true",
    pdfTextIndex: process.env.ANTFLY_PDF_TEXT_INDEX?.trim() || undefined,
  };
}
