import { NextResponse } from "next/server";
import { connectionStatus } from "@/lib/antfly/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await connectionStatus());
  } catch (error) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: error instanceof Error ? error.message : "Antfly is unavailable",
      },
      { status: 503 },
    );
  }
}
