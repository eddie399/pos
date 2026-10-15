import { endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { serializeDecimal } from "@/lib/serializers";

/**
 * Shop level reporting, shared by the dashboard (server rendered) and
 * `/api/reports` (for clients).
 *
 * Every figure is an aggregate over the shop's whole history. An earlier
 * version derived revenue from a `take: 10` list of recent sales, so the totals
 * silently stopped moving once a shop passed ten transactions.
 */

export type ShopSummary = {
  totalSales: number;
  todaySales: number;
  totalRevenue: string;
  todayRevenue: string;
  cashSales: string;
  creditSales: string;
  expenses: string;
  lowStockItems: number;
};

export type RecentSale = {
  id: string;
  receiptNumber: string;
  cashierName: string;
  customerName: string;
  subtotal: string;
  total: string;
  status: string;
  createdAt: string;
};

export async function getShopSummary(shopId: string): Promise<ShopSummary> {
  const today = { gte: startOfDay(new Date()), lte: endOfDay(new Date()) };

  const [totalSales, revenue, todaySales, todayRevenue, cashSales, creditSales, expenses, stockLevels] = await Promise.all([
    prisma.sale.count({ where: { shopId } }),
    prisma.sale.aggregate({ where: { shopId }, _sum: { total: true } }),
    prisma.sale.count({ where: { shopId, createdAt: today } }),
    prisma.sale.aggregate({ where: { shopId, createdAt: today }, _sum: { total: true } }),
    prisma.sale.aggregate({ where: { shopId, customerId: null }, _sum: { total: true } }),
    prisma.sale.aggregate({ where: { shopId, customerId: { not: null } }, _sum: { total: true } }),
    prisma.expense.aggregate({ where: { shopId }, _sum: { amount: true } }),
    prisma.product.findMany({ where: { shopId, active: true }, select: { stockQuantity: true, lowStockThreshold: true } }),
  ]);

  // Comparing two columns needs raw SQL, so it is done in JS for now. Promote it
  // to a denormalised flag if a shop ever carries thousands of lines.
  const lowStockItems = stockLevels.filter((item) => item.stockQuantity <= item.lowStockThreshold).length;

  return {
    totalSales,
    todaySales,
    totalRevenue: serializeDecimal(revenue._sum.total),
    todayRevenue: serializeDecimal(todayRevenue._sum.total),
    cashSales: serializeDecimal(cashSales._sum.total),
    creditSales: serializeDecimal(creditSales._sum.total),
    expenses: serializeDecimal(expenses._sum.amount),
    lowStockItems,
  };
}

export async function getRecentSales(shopId: string, take = 10): Promise<RecentSale[]> {
  const sales = await prisma.sale.findMany({
    where: { shopId },
    include: {
      cashier: { select: { name: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return sales.map((sale) => ({
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    cashierName: sale.cashier.name,
    customerName: sale.customer?.name ?? "Walk-in",
    subtotal: serializeDecimal(sale.subtotal),
    total: serializeDecimal(sale.total),
    status: sale.paymentStatus,
    createdAt: sale.createdAt.toISOString(),
  }));
}

/** Products at or below their low-stock threshold, for the restock list. */
export async function getLowStockProducts(shopId: string, take = 5) {
  const products = await prisma.product.findMany({
    where: { shopId, active: true },
    select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true, unit: true },
    orderBy: { stockQuantity: "asc" },
  });

  return products.filter((product) => product.stockQuantity <= product.lowStockThreshold).slice(0, take);
}
