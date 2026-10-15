import NextAuth, { type NextAuthOptions, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authSecret } from "@/lib/env";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type ExtendedSession = Session & {
  user: SessionUser;
};

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email or phone",
      credentials: {
        identifier: {
          label: "Email or phone",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!identifier || !password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }, { phone: identifier }],
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          phone: user.phone ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }

      if (!token.userId) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: String(token.userId) },
        select: { id: true, name: true, email: true, phone: true },
      });

      if (dbUser) {
        token.name = dbUser.name;
        token.email = dbUser.email ?? undefined;
        token.phone = dbUser.phone ?? undefined;
      }

      return token;
    },
    async session({ session, token }) {
      const typedSession = session as ExtendedSession;

      if (typedSession.user && token.userId) {
        typedSession.user.id = String(token.userId);
      }

      return typedSession;
    },
  },
};

export const auth = NextAuth(authOptions);
