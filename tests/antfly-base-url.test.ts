import { describe, expect, it } from "vitest";
import { normalizeAntflyBaseUrl } from "@/lib/antfly/base-url";

describe("normalizeAntflyBaseUrl", () => {
  it("adds the database API path to a local Lite server", () => {
    expect(normalizeAntflyBaseUrl("http://127.0.0.1:8080/"))
      .toBe("http://127.0.0.1:8080/db/v1");
  });

  it("preserves a complete Cloud Lite database API path", () => {
    expect(normalizeAntflyBaseUrl("https://platform.antfly.io/cloud/v1/example/db/v1"))
      .toBe("https://platform.antfly.io/cloud/v1/example/db/v1");
  });

  it("adds the database API path to a Cloud Lite instance root", () => {
    expect(normalizeAntflyBaseUrl("https://platform.antfly.io/cloud/v1/example"))
      .toBe("https://platform.antfly.io/cloud/v1/example/db/v1");
  });

  it.each([
    "ftp://example.com",
    "https://user:secret@example.com",
    "https://example.com?token=secret",
    "not a url",
  ])("rejects an unsafe or malformed base URL: %s", (input) => {
    expect(() => normalizeAntflyBaseUrl(input)).toThrow();
  });
});
