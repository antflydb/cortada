import { describe, expect, it } from "vitest";
import { readJsonBody } from "@/lib/security/request-body";

describe("readJsonBody", () => {
  it("parses a bounded JSON body", async () => {
    const request = new Request("https://example.com/api", {
      method: "POST",
      body: JSON.stringify({ query: "antfly" }),
    });
    await expect(readJsonBody(request, 100)).resolves.toEqual({ query: "antfly" });
  });

  it("rejects declared bodies over the limit", async () => {
    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Length": "101" },
      body: "{}",
    });
    await expect(readJsonBody(request, 100)).rejects.toMatchObject({
      message: "Request body is too large",
      status: 413,
    });
  });

  it("rejects invalid JSON", async () => {
    const request = new Request("https://example.com/api", { method: "POST", body: "not-json" });
    await expect(readJsonBody(request, 100)).rejects.toMatchObject({
      message: "Request body must be valid JSON",
      status: 400,
    });
  });
});
