import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/api";
import { getCurrentShop } from "@/lib/current-shop";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const membership = await getCurrentShop();

    if (!membership) {
      throw new ApiError("You must be signed in to change your password.", 401);
    }

    const body = await readJsonBody(request);
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || newPassword.length < 8) {
      throw new ApiError("Enter your current password and a new password with at least 8 characters.", 400);
    }

    if (currentPassword === newPassword) {
      throw new ApiError("Your new password must be different from your current password.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: membership.userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash || !(await compare(currentPassword, user.passwordHash))) {
      throw new ApiError("Your current password is incorrect.", 400);
    }

    await prisma.user.update({
      where: { id: membership.userId },
      data: { passwordHash: await hash(newPassword, 12) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error, "password change");
  }
}
