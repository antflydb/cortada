import { describe, expect, it } from "vitest";
import { auditProfileIds, resolveAuditProfile } from "@/lib/aeo/rubrics";

describe("audit profiles", () => {
  it("defaults to the published standard profile", () => {
    const profile = resolveAuditProfile();
    expect(profile.id).toBe("standard-v1");
    expect(Object.values(profile.weights).reduce((sum, weight) => sum + weight, 0)).toBe(100);
  });

  it("offers a more evidence-weighted authority profile", () => {
    const standard = resolveAuditProfile("standard-v1");
    const authority = resolveAuditProfile("authority-v1");
    expect(authority.weights.factualSignals).toBeGreaterThan(standard.weights.factualSignals);
    expect(authority.weights.citations).toBeGreaterThan(standard.weights.citations);
  });

  it("fails closed on an unknown configured profile", () => {
    expect(() => resolveAuditProfile("unknown-v1")).toThrow(/Unknown CORTADA_AUDIT_PROFILE/);
    expect(auditProfileIds).toEqual(["standard-v1", "authority-v1"]);
  });
});
