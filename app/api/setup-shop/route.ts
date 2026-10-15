import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const shopName = String(body.shopName ?? "").trim();
    const ownerName = String(body.ownerName ?? "").trim();
    const ownerEmail = String(body.ownerEmail ?? "").trim();
    const password = String(body.password ?? "");

    if (!shopName || !ownerName || !ownerEmail || password.length < 8) {
      return NextResponse.json(
        { error: "Shop name, owner details, and a password with at least 8 characters are required." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: ownerEmail }, { phone: String(body.ownerPhone ?? "") || undefined }] },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email or phone already exists." },
        { status: 409 },
      );
    }

    const createdUser = await prisma.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        phone: body.ownerPhone ? String(body.ownerPhone).trim() : null,
        passwordHash: await hash(password, 12),
      },
    });

    const shop = await prisma.shop.create({
      data: {
        name: shopName,
        phone: body.shopPhone ? String(body.shopPhone).trim() : null,
        address: body.address ? String(body.address).trim() : null,
        currency: String(body.currency ?? "MWK"),
        members: {
          create: {
            userId: createdUser.id,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      userId: createdUser.id,
      shopId: shop.id,
    });
  } catch (error) {
    console.error("setup-shop failed", error);

    return NextResponse.json(
      { error: "Unable to create the shop setup right now." },
      { status: 500 },
    );
  }
}
