import { describe, expect, it } from "vitest";
import { assertSafePublicUrl, isPrivateAddress } from "@/lib/security/public-url";

describe("public URL protection", () => {
  it.each(["127.0.0.1", "10.0.0.8", "172.16.1.1", "192.168.1.1", "169.254.1.1", "::1", "fd00::1", "::ffff:127.0.0.1"])(
    "rejects private address %s",
    (address) => expect(isPrivateAddress(address)).toBe(true),
  );

  it("accepts a public HTTPS URL with public DNS", async () => {
    const url = await assertSafePublicUrl("https://example.com/guide#section", async () => [
      { address: "93.184.216.34", family: 4 },
    ]);
    expect(url.toString()).toBe("https://example.com/guide");
  });

  it.each([
    "http://localhost/admin",
    "http://127.0.0.1/admin",
    "http://user:pass@example.com/",
    "http://example.com:8080/",
    "file:///etc/passwd",
  ])("rejects unsafe URL %s", async (input) => {
    await expect(
      assertSafePublicUrl(input, async () => [{ address: "93.184.216.34", family: 4 }]),
    ).rejects.toThrow();
  });

  it("rejects a public hostname that resolves privately", async () => {
    await expect(
      assertSafePublicUrl("https://example.com", async () => [{ address: "10.0.0.2", family: 4 }]),
    ).rejects.toThrow(/private network/);
  });
});
