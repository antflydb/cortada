import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type ResolvedAddress = { address: string; family: number };
type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isPrivateIpv4(mapped);
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

const defaultResolver: Resolver = async (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

export async function assertSafePublicUrl(input: string, resolver: Resolver = defaultResolver): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a valid website URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new Error("Only standard HTTP and HTTPS ports are supported");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Local and private network addresses are not supported");
  }
  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new Error("Local and private network addresses are not supported");
  }
  const addresses = await resolver(hostname);
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("The website resolves to a local or private network address");
  }
  url.hash = "";
  return url;
}
