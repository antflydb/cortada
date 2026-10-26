import "server-only";
import { AntflyClient } from "@antfly/sdk";
import { antflySettings } from "./config";

let singleton: AntflyClient | undefined;

export function antflyClient(): AntflyClient {
  if (singleton) return singleton;
  const settings = antflySettings();
  singleton = new AntflyClient({
    baseUrl: settings.baseUrl,
    headers: settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : undefined,
  });
  return singleton;
}
