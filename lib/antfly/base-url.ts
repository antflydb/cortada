export function normalizeAntflyBaseUrl(value: string): string {
  const raw = value.trim().replace(/\/+$/, "");
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error("ANTFLY_URL must be a valid HTTP or HTTPS URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("ANTFLY_URL must be an HTTP or HTTPS URL");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("ANTFLY_URL cannot contain credentials, a query string, or a fragment");
  }

  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.endsWith("/db/v1") ? path : `${path}/db/v1`;
  return url.toString().replace(/\/$/, "");
}
