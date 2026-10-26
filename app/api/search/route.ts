import { NextResponse } from "next/server";
import { z } from "zod";
import { searchSources } from "@/lib/antfly/repository";

export const runtime = "nodejs";

const requestSchema = z.object({ query: z.string().trim().min(2).max(300) });

export async function POST(request: Request) {
  try {
    const { query } = requestSchema.parse(await request.json());
    return NextResponse.json({ ok: true, hits: await searchSources(query) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Enter at least two characters" }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Search failed" },
      { status: 503 },
    );
  }
}
