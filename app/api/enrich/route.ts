import { NextResponse } from "next/server";

interface EnrichmentResult {
  category: string;
  estimated_expiry_days: number | null;
}

const ENRICHMENT_STUBS: Record<string, EnrichmentResult> = {
  milk: { category: "Dairy", estimated_expiry_days: 7 },
  chicken: { category: "Meat", estimated_expiry_days: 3 },
  beef: { category: "Meat", estimated_expiry_days: 4 },
  salmon: { category: "Seafood", estimated_expiry_days: 2 },
  yogurt: { category: "Dairy", estimated_expiry_days: 10 },
  eggs: { category: "Dairy", estimated_expiry_days: 21 },
  lettuce: { category: "Produce", estimated_expiry_days: 5 },
  spinach: { category: "Produce", estimated_expiry_days: 4 },
  apple: { category: "Produce", estimated_expiry_days: 14 },
  banana: { category: "Produce", estimated_expiry_days: 5 },
  bread: { category: "Bakery", estimated_expiry_days: 6 },
  cheese: { category: "Dairy", estimated_expiry_days: 14 },
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function getEnrichment(name: string): EnrichmentResult {
  const normalized = normalizeName(name);
  return ENRICHMENT_STUBS[normalized] ?? { category: "Other", estimated_expiry_days: null };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name =
    body && typeof body === "object" && "name" in body && typeof body.name === "string"
      ? body.name
      : "";

  if (!name.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const enrichment = getEnrichment(name);
  return NextResponse.json(enrichment, { status: 200 });
}
