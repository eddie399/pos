/**
 * Demo data for local development and pilot shops.
 *
 *   npm run db:seed      (runs `prisma db seed`, which loads .env)
 *
 * Safe to re-run: if the demo shop already exists it does nothing, so this can
 * never wipe a shop that a real person has been selling from.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_SHOP_NAME = "Duka Demo Shop";
const DEMO_OWNER_EMAIL = "owner@duka.local";
const DEMO_OWNER_PHONE = "+265991234567";
const DEMO_PASSWORD = "password123";

const catalogue = [
  { name: "Sugar 1kg", category: "Groceries", costPrice: 1500, sellingPrice: 1800, stockQuantity: 48, lowStockThreshold: 10, barcode: "6001234500011" },
  { name: "Maize flour 5kg", category: "Groceries", costPrice: 6500, sellingPrice: 7500, stockQuantity: 26, lowStockThreshold: 6, barcode: "6001234500028" },
  { name: "Cooking oil 2L", category: "Groceries", costPrice: 7800, sellingPrice: 9000, stockQuantity: 18, lowStockThreshold: 6, barcode: "6001234500035" },
  { name: "Salt 500g", category: "Groceries", costPrice: 450, sellingPrice: 600, stockQuantity: 60, lowStockThreshold: 12, barcode: "6001234500042" },
  { name: "Tea leaves 250g", category: "Beverages", costPrice: 2600, sellingPrice: 3200, stockQuantity: 24, lowStockThreshold: 8, barcode: "6001234500059" },
  { name: "Fanta 500ml", category: "Beverages", costPrice: 900, sellingPrice: 1200, stockQuantity: 72, lowStockThreshold: 24, barcode: "6001234500066" },
  { name: "Bottled water 500ml", category: "Beverages", costPrice: 400, sellingPrice: 600, stockQuantity: 96, lowStockThreshold: 24, barcode: "6001234500073" },
  { name: "Bath soap bar", category: "Household", costPrice: 1100, sellingPrice: 1400, stockQuantity: 40, lowStockThreshold: 10, barcode: "6001234500080" },
  { name: "Washing powder 500g", category: "Household", costPrice: 2200, sellingPrice: 2750, stockQuantity: 22, lowStockThreshold: 8, barcode: "6001234500097" },
  { name: "Matches box", category: "Household", costPrice: 200, sellingPrice: 300, stockQuantity: 80, lowStockThreshold: 20, barcode: "6001234500103" },
];

const customers = [
  { name: "Mzuzu Traders", phone: "+265888111222", creditLimit: 150000 },
  { name: "Chikondi Banda", phone: "+265999333444", creditLimit: 25000 },
  { name: "Limbe Kiosk", phone: null, creditLimit: 0 },
];

async function main() {
  const existingShop = await prisma.shop.findFirst({ where: { name: DEMO_SHOP_NAME } });

  if (existingShop) {
    console.log(`[seed] "${DEMO_SHOP_NAME}" already exists (${existingShop.id}). Nothing to do.`);
    return;
  }

  const owner = await prisma.user.upsert({
    where: { email: DEMO_OWNER_EMAIL },
    update: {},
    create: {
      name: "Demo Owner",
      email: DEMO_OWNER_EMAIL,
      phone: DEMO_OWNER_PHONE,
      passwordHash: await hash(DEMO_PASSWORD, 12),
    },
  });

  const shop = await prisma.shop.create({
    data: {
      name: DEMO_SHOP_NAME,
      phone: "+265999123456",
      address: "Blantyre, Malawi",
      currency: "MWK",
      members: { create: { userId: owner.id, role: "OWNER" } },
    },
  });

  const categoryIds = new Map();

  for (const item of catalogue) {
    if (!categoryIds.has(item.category)) {
      const category = await prisma.category.upsert({
        where: { shopId_name: { shopId: shop.id, name: item.category } },
        update: {},
        create: { shopId: shop.id, name: item.category },
      });
      categoryIds.set(item.category, category.id);
    }

    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        categoryId: categoryIds.get(item.category),
        name: item.name,
        barcode: item.barcode,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        stockQuantity: item.stockQuantity,
        lowStockThreshold: item.lowStockThreshold,
      },
    });

    // Opening stock is recorded as a movement so the ledger starts complete.
    await prisma.stockMovement.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        type: "RECEIVE",
        quantity: item.stockQuantity,
        previousQuantity: 0,
        newQuantity: item.stockQuantity,
        reason: "Opening stock (seed)",
        createdBy: owner.id,
      },
    });
  }

  for (const customer of customers) {
    await prisma.customer.create({ data: { shopId: shop.id, ...customer } });
  }

  console.log("[seed] Demo shop ready.");
  console.log(`[seed]   shop:  ${shop.name} (${shop.id})`);
  console.log(`[seed]   login: ${DEMO_OWNER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`[seed]   ${catalogue.length} products, ${customers.length} customers, role OWNER`);
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
