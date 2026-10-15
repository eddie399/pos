/** Small, dependency-free input normalisers shared by the API routes. */

export function readString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  return String(value ?? "").trim();
}

export function readOptionalString(value: unknown): string | null {
  const text = readString(value);
  return text.length ? text : null;
}

export function readNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  return Number(readString(value));
}

/** Returns the integer when it is a positive whole number, otherwise null. */
export function readPositiveInteger(value: unknown): number | null {
  const numeric = readNumber(value);

  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

/** Returns the integer when it is zero or a positive whole number, otherwise null. */
export function readNonNegativeInteger(value: unknown): number | null {
  const numeric = readNumber(value);

  if (!Number.isInteger(numeric) || numeric < 0) {
    return null;
  }

  return numeric;
}

export function isNonNegativeNumber(value: unknown): boolean {
  const numeric = readNumber(value);
  return Number.isFinite(numeric) && numeric >= 0;
}

export function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  return request
    .json()
    .then((body: unknown) => (body && typeof body === "object" ? (body as Record<string, unknown>) : {}))
    .catch(() => ({}));
}
