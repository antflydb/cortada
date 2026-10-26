import { NextRequest, NextResponse } from "next/server";

function unauthorized(message = "Authentication required") {
  return new NextResponse(message, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Cortada"' },
  });
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();

  const expectedUser = process.env.CORTADA_BASIC_AUTH_USER?.trim();
  const expectedPassword = process.env.CORTADA_BASIC_AUTH_PASSWORD?.trim();

  if (!expectedUser || !expectedPassword) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      return new NextResponse("Cortada access control is not configured", { status: 503 });
    }
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return unauthorized();
    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (user !== expectedUser || password !== expectedPassword) return unauthorized();
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
