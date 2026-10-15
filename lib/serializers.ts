/**
 * API response shapes, kept in one place so every endpoint that returns a
 * product, customer or expense returns exactly the same JSON.
 *
 * Two rules these enforce:
 * - Prisma `Decimal` values leave as strings (they serialise to `{}` otherwise,
 *   which silently breaks money in the client).
 * - Dates leave as ISO strings so the client can parse them predictably.
 */

type WithCategory = { category?: { name: string } | null };

export function serializeProduct<T extends { costPrice: unknown; sellingPrice: unknown } & WithCategory>(product: T) {
  const { category, ...rest } = product;

  return {
    ...rest,
    costPrice: String(product.costPrice),
    sellingPrice: String(product.sellingPrice),
    categoryName: category?.name ?? null,
  };
}

export function serializeCustomer<T extends { creditLimit: unknown; createdAt: Date }>(customer: T) {
  return {
    ...customer,
    creditLimit: String(customer.creditLimit),
    createdAt: customer.createdAt.toISOString(),
  };
}

export function serializeExpense(expense: {
  id: string;
  category: string;
  description: string;
  amount: unknown;
  createdBy: string;
  createdAt: Date;
  creator: { name: string };
}) {
  return {
    id: expense.id,
    category: expense.category,
    description: expense.description,
    amount: String(expense.amount),
    createdBy: expense.createdBy,
    createdAt: expense.createdAt.toISOString(),
    creatorName: expense.creator.name,
  };
}

/** Null-safe decimal to string: `0` must never be reported as `null`. */
export function serializeDecimal(value: unknown): string {
  return String(value ?? 0);
}
