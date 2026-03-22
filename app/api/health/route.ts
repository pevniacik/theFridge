import { getDb } from "@/lib/db/client";

export async function GET() {
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();

    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        status: "error",
        message,
      },
      { status: 503 }
    );
  }
}
