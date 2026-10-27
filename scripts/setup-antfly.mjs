import { readFile } from "node:fs/promises";
import { AntflyClient } from "@antfly/sdk";

function normalizeBaseUrl(value) {
  const normalized = value.replace(/\/+$/, "");
  if (/\/db\/v1$/i.test(normalized)) return normalized;
  return `${normalized}/db/v1`;
}

const baseUrl = normalizeBaseUrl(process.env.ANTFLY_URL || "http://127.0.0.1:8080");
const table = (process.env.ANTFLY_TABLE || "default").trim();
const fullTextIndex = (process.env.ANTFLY_FULL_TEXT_INDEX || "full_text_index_v0").trim();
const embeddingsEnabled = process.env.ANTFLY_ENABLE_EMBEDDINGS === "true";
const embeddingIndex = process.env.ANTFLY_EMBEDDING_INDEX?.trim();
const apiKey = process.env.ANTFLY_SETUP_API_KEY?.trim() || process.env.ANTFLY_API_KEY?.trim();
const createMissing = process.argv.includes("--create");

if (embeddingsEnabled && !embeddingIndex) {
  throw new Error("ANTFLY_EMBEDDING_INDEX is required when ANTFLY_ENABLE_EMBEDDINGS=true");
}

const client = new AntflyClient({
  baseUrl,
  headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
});

const tables = await client.tables.list();
if (!tables.some((candidate) => candidate.name === table)) {
  throw new Error(`Antfly table "${table}" does not exist. Create it before running Cortada.`);
}

let indexes;
try {
  indexes = await client.indexes.list(table);
} catch (error) {
  throw new Error(
    `Could not inspect indexes for "${table}". Run setup with a temporary provisioning key in ANTFLY_SETUP_API_KEY. ${error instanceof Error ? error.message : ""}`.trim(),
  );
}

const indexNames = new Set(indexes.map((index) => index.config.name));
if (!indexNames.has(fullTextIndex)) {
  throw new Error(`Full-text index "${fullTextIndex}" was not found on table "${table}".`);
}

if (embeddingsEnabled && embeddingIndex && !indexNames.has(embeddingIndex)) {
  if (!createMissing) {
    throw new Error(`Embedding index "${embeddingIndex}" was not found. Re-run with --create using a provisioning key.`);
  }

  const configUrl = new URL("../config/antfly.embedding-index.json", import.meta.url);
  const config = JSON.parse(await readFile(configUrl, "utf8"));
  await client.indexes.create(table, { ...config, name: embeddingIndex });
  console.log(`Created Antfly embedding index "${embeddingIndex}" on table "${table}".`);
}

console.log(`Antfly setup is ready: table=${table}, fullText=${fullTextIndex}, embeddings=${embeddingsEnabled ? embeddingIndex : "disabled"}.`);
