import { prisma } from "@/lib/prisma";

/**
 * Liveness and readiness in one probe: it must fail when the database is
 * unreachable, otherwise uptime monitoring reports a healthy system while every
 * sale is failing. Kept public (see `publicPrefixes` in proxy.ts).
 */
export async function GET() {
  const base = { app: "Duka", timestamp: new Date().toISOString() };

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ...base, ok: true, database: "up" });
  } catch (error) {
    console.error("health check failed", error);
    return Response.json({ ...base, ok: false, database: "down" }, { status: 503 });
  }
}

