import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api";
import { requireShop } from "@/lib/guard";
import { getRecentSales, getShopSummary } from "@/lib/reports";

/**
 * Summary for the reports screen. The aggregation itself lives in
 * `lib/reports.ts` so the dashboard (server rendered) and this endpoint can
 * never disagree about the numbers.
 */
export async function GET() {
  try {
    const membership = await requireShop("report:view");

    const [summary, sales] = await Promise.all([
      getShopSummary(membership.shopId),
      getRecentSales(membership.shopId),
    ]);

    return NextResponse.json({ summary, sales });
  } catch (error) {
    return toErrorResponse(error, "reports");
  }
}
