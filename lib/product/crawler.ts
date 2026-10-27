import "server-only";
import { productConfig } from "./config";

export function crawlerUserAgent(): string {
  const configured = process.env.CORTADA_FETCH_USER_AGENT?.trim();
  if (configured && configured.length <= 200 && /^[\x20-\x7e]+$/.test(configured)) return configured;

  const productToken = productConfig.name.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "AEO-Auditor";
  return `${productToken}-AEO-Auditor/0.2 (+${productConfig.repositoryUrl})`;
}
