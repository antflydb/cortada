import configuredProfiles from "@/config/audit-profiles.json";
import type { PageSignals } from "@/lib/types";

export type AuditProfile = {
  id: string;
  version: number;
  name: string;
  weights: Readonly<Record<keyof PageSignals, number>>;
  grades: {
    excellent: number;
    good: number;
  };
};

const signalKeys: Array<keyof PageSignals> = [
  "title",
  "metaDescription",
  "singleH1",
  "headingStructure",
  "sufficientDepth",
  "faqContent",
  "structuredData",
  "factualSignals",
  "citations",
  "answerFirstOpening",
];

function parseProfile(id: string, value: unknown): AuditProfile {
  if (!value || typeof value !== "object") throw new Error(`Audit profile "${id}" must be an object`);
  const candidate = value as Record<string, unknown>;
  const weights = candidate.weights as Record<string, unknown> | undefined;
  const grades = candidate.grades as Record<string, unknown> | undefined;
  if (!Number.isInteger(candidate.version) || Number(candidate.version) < 1) throw new Error(`Audit profile "${id}" needs a positive integer version`);
  if (typeof candidate.name !== "string" || !candidate.name.trim()) throw new Error(`Audit profile "${id}" needs a name`);
  if (!weights || !grades) throw new Error(`Audit profile "${id}" needs weights and grades`);

  const parsedWeights = Object.fromEntries(signalKeys.map((key) => {
    const weight = weights[key];
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
      throw new Error(`Audit profile "${id}" has an invalid ${key} weight`);
    }
    return [key, weight];
  })) as Record<keyof PageSignals, number>;
  const total = Object.values(parsedWeights).reduce((sum, weight) => sum + weight, 0);
  if (total !== 100) throw new Error(`Audit profile "${id}" weights must total 100, received ${total}`);

  const excellent = grades.excellent;
  const good = grades.good;
  if (typeof excellent !== "number" || typeof good !== "number" || excellent <= good || good < 0 || excellent > 100) {
    throw new Error(`Audit profile "${id}" has invalid grade thresholds`);
  }

  return {
    id,
    version: Number(candidate.version),
    name: candidate.name.trim(),
    weights: Object.freeze(parsedWeights),
    grades: { excellent, good },
  };
}

const profiles = Object.freeze(Object.fromEntries(
  Object.entries(configuredProfiles).map(([id, profile]) => [id, parseProfile(id, profile)]),
));

export const defaultAuditProfileId = "standard-v1";

export function resolveAuditProfile(value?: string): AuditProfile {
  const id = value?.trim() || defaultAuditProfileId;
  const profile = profiles[id];
  if (!profile) throw new Error(`Unknown CORTADA_AUDIT_PROFILE "${value}". Use ${Object.keys(profiles).join(" or ")}.`);
  return profile;
}

export function activeAuditProfile(): AuditProfile {
  return resolveAuditProfile(process.env.CORTADA_AUDIT_PROFILE);
}

export const auditProfileIds = Object.freeze(Object.keys(profiles));
