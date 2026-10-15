const developmentFallbackSecret = "duka-insecure-development-secret";

const configuredSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

if (!configuredSecret) {
  console.warn(
    "[duka] No AUTH_SECRET or NEXTAUTH_SECRET is set. Falling back to an insecure development secret. Never run a shop on this.",
  );
}

/**
 * Single source of truth for the JWT signing/encryption secret.
 *
 * `auth.ts` (session issuing) and `proxy.ts` (session reading) must agree on
 * this value. When they disagree, the proxy cannot decrypt the session cookie
 * and every protected page bounces back to /login even though sign-in worked.
 */
export const authSecret = configuredSecret || developmentFallbackSecret;
