import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { receiptNumberFor } from "@/lib/ids";
import { allocateMinor, formatMoney, fromMinor, toMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type SaleLineInput = {
  productId: string;
  quantity: number;
};

export type CreateSaleInput = {
  shopId: string;
  cashierId: string;
  /** Device-minted identity. Makes the create idempotent: retries are free. */
  clientRef: string;
  items: SaleLineInput[];
  customerId?: string | null;
  discount?: number;
  paymentMethod?: string;
};

export type CreatedSale = {
  id: string;
  receiptNumber: string;
  total: string;
  /** True when this client reference had already been recorded. */
  repeated: boolean;
};

/** A 20-line sale on a low-end phone needs more than the 5s default budget. */
const transactionOptions = { timeout: 20_000, maxWait: 10_000 };

/**
 * Records a sale exactly once.
 *
 * Everything that moves money or stock happens in one transaction: sale, items,
 * payments, stock decrements, stock movements, the customer credit ledger and
 * the audit row. Either all of it lands or none of it does.
 */
export async function createSale(input: CreateSaleInput): Promise<CreatedSale> {
  const receiptNumber = receiptNumberFor(input.clientRef);

  const alreadyRecorded = await prisma.sale.findUnique({
    where: { clientRef: input.clientRef },
    select: { id: true, receiptNumber: true, total: true, shopId: true },
  });

  if (alreadyRecorded) {
    if (alreadyRecorded.shopId !== input.shopId) {
      throw new ApiError("This sale reference belongs to a different shop.", 409);
    }

    return {
      id: alreadyRecorded.id,
      receiptNumber: alreadyRecorded.receiptNumber,
      total: String(alreadyRecorded.total),
      repeated: true,
    };
  }

  try {
    return await prisma.$transaction(
      (transaction) => persistSale(transaction, input, receiptNumber),
      transactionOptions,
    );
  } catch (error) {
    // Two identical retries can race between the check and the insert. The
    // unique index on clientRef settles it; the loser returns the winner.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.sale.findUnique({
        where: { clientRef: input.clientRef },
        select: { id: true, receiptNumber: true, total: true },
      });

      if (raced) {
        return { id: raced.id, receiptNumber: raced.receiptNumber, total: String(raced.total), repeated: true };
      }
    }

    throw error;
  }
}

async function persistSale(
  transaction: Prisma.TransactionClient,
  input: CreateSaleInput,
  receiptNumber: string,
): Promise<CreatedSale> {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await transaction.product.findMany({
    where: { id: { in: productIds }, shopId: input.shopId, active: true },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));

  const lines = input.items.map((item) => {
    const product = productsById.get(item.productId);

    if (!product) {
      throw new ApiError("A product in this sale was not found in this shop.", 404);
    }

    if (item.quantity > product.stockQuantity) {
      throw new ApiError(`${product.name} has only ${product.stockQuantity} left in stock.`, 409);
    }

    const unitPriceMinor = toMinor(product.sellingPrice.toString());

    return { product, quantity: item.quantity, lineTotalMinor: unitPriceMinor * item.quantity };
  });

  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const requestedDiscount = Number(input.discount ?? 0);
  const discountMinor = Math.min(
    Math.max(Number.isFinite(requestedDiscount) ? toMinor(requestedDiscount) : 0, 0),
    subtotalMinor,
  );
  const totalMinor = subtotalMinor - discountMinor;

  const customer = await resolveCustomer(transaction, input);
  const isCredit = Boolean(customer);
  const previousBalanceMinor = customer ? await readCustomerBalance(transaction, input.shopId, customer.id) : 0;
  const creditLimitMinor = customer ? toMinor(customer.creditLimit.toString()) : 0;

  // A limit of 0 means "no limit configured" rather than "no credit allowed".
  if (customer && creditLimitMinor > 0 && previousBalanceMinor + totalMinor > creditLimitMinor) {
    throw new ApiError(
      `${customer.name} would go over their credit limit of ${formatMoney(fromMinor(creditLimitMinor))}.`,
      409,
    );
  }

  const sale = await transaction.sale.create({
    data: {
      shopId: input.shopId,
      cashierId: input.cashierId,
      customerId: customer?.id ?? null,
      clientRef: input.clientRef,
      receiptNumber,
      subtotal: fromMinor(subtotalMinor),
      discount: fromMinor(discountMinor),
      total: fromMinor(totalMinor),
      paymentStatus: isCredit ? "PENDING" : "PAID",
    },
  });

  // A credit sale has not been paid yet, so it gets no payment row. The
  // receivable lives on the customer ledger instead.
  if (!isCredit) {
    await transaction.payment.create({
      data: {
        saleId: sale.id,
        method: input.paymentMethod ?? "CASH",
        amount: fromMinor(totalMinor),
        provider: "POS",
        reference: receiptNumber,
      },
    });
  }

  // Push any sale-level discount down onto the lines so the ledger reconciles:
  // sum(item.total) + sale.discount === sale.subtotal.
  const discountByLine = allocateMinor(discountMinor, lines.map((line) => line.lineTotalMinor));

  for (const [index, line] of lines.entries()) {
    const lineDiscountMinor = discountByLine[index] ?? 0;

    await transaction.saleItem.create({
      data: {
        saleId: sale.id,
        productId: line.product.id,
        productNameSnapshot: line.product.name,
        quantity: line.quantity,
        unitCostSnapshot: line.product.costPrice,
        unitPriceSnapshot: line.product.sellingPrice,
        discount: fromMinor(lineDiscountMinor),
        total: fromMinor(line.lineTotalMinor - lineDiscountMinor),
      },
    });

    // Guarded decrement: the read-then-write pattern this replaces let two tills
    // sell the same last unit and drive stock negative.
    const decremented = await transaction.product.updateMany({
      where: { id: line.product.id, shopId: input.shopId, stockQuantity: { gte: line.quantity } },
      data: { stockQuantity: { decrement: line.quantity } },
    });

    if (decremented.count === 0) {
      throw new ApiError(`${line.product.name} ran out while this sale was being processed. Check the cart and try again.`, 409);
    }

    const updated = await transaction.product.findUniqueOrThrow({
      where: { id: line.product.id },
      select: { stockQuantity: true },
    });

    await transaction.stockMovement.create({
      data: {
        shopId: input.shopId,
        productId: line.product.id,
        type: "SALE",
        quantity: line.quantity,
        previousQuantity: updated.stockQuantity + line.quantity,
        newQuantity: updated.stockQuantity,
        referenceType: "SALE",
        referenceId: sale.id,
        reason: `Sale ${receiptNumber}`,
        createdBy: input.cashierId,
      },
    });
  }

  if (customer && totalMinor > 0) {
    await transaction.customerTransaction.create({
      data: {
        shopId: input.shopId,
        customerId: customer.id,
        saleId: sale.id,
        type: "SALE",
        amount: fromMinor(totalMinor),
        balanceAfter: fromMinor(previousBalanceMinor + totalMinor),
        note: `Credit sale ${receiptNumber}`,
        createdBy: input.cashierId,
      },
    });
  }

  await recordAudit(transaction, {
    shopId: input.shopId,
    userId: input.cashierId,
    action: "sale.create",
    entity: "sale",
    entityId: sale.id,
    metadata: {
      clientRef: input.clientRef,
      receiptNumber,
      subtotal: fromMinor(subtotalMinor),
      discount: fromMinor(discountMinor),
      total: fromMinor(totalMinor),
      lineCount: lines.length,
      credit: isCredit,
    },
  });

  return { id: sale.id, receiptNumber, total: String(fromMinor(totalMinor)), repeated: false };
}

async function resolveCustomer(transaction: Prisma.TransactionClient, input: CreateSaleInput) {
  if (!input.customerId) {
    return null;
  }

  const customer = await transaction.customer.findFirst({
    where: { id: input.customerId, shopId: input.shopId, active: true },
  });

  if (!customer) {
    throw new ApiError("That customer was not found in this shop.", 404);
  }

  return customer;
}

/** The credit ledger is the source of truth for a customer's running balance. */
async function readCustomerBalance(
  transaction: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
): Promise<number> {
  const latestEntry = await transaction.customerTransaction.findFirst({
    where: { shopId, customerId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });

  return latestEntry ? toMinor(latestEntry.balanceAfter.toString()) : 0;
}

