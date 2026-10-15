import { NextResponse } from "next/server";

/** An error that is safe to show to the shop user, with an HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Turns anything thrown inside a route handler into a JSON response.
 *
 * Prisma and network failures must never leak a stack trace to the client, and
 * API clients must always receive JSON (never an HTML error page).
 */
export function toErrorResponse(error: unknown, context: string) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status);
  }

  console.error(`${context} failed`, error);
  return jsonError("Something went wrong. Please try again.", 500);
}
