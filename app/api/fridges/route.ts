/**
 * app/api/fridges/route.ts
 * REST surface for fridge/freezer identity records.
 *
 * GET  /api/fridges          — list all records
 * POST /api/fridges          — create a new record
 *
 * All responses are JSON. Errors include an `error` field so
 * the browser network panel can surface them immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { createFridge, listFridges } from "@/lib/fridges/store";

export async function GET() {
  try {
    const fridges = listFridges();
    return NextResponse.json({ fridges });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/fridges] GET failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name: unknown = body?.name;
    const type: unknown = body?.type;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (type !== "fridge" && type !== "freezer") {
      return NextResponse.json(
        { error: 'type must be "fridge" or "freezer"' },
        { status: 400 }
      );
    }

    const record = createFridge({ name, type });
    return NextResponse.json({ fridge: record }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/fridges] POST failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
