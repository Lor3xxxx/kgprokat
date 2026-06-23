import { PrismaClient } from "@prisma/client";

// Singleton, чтобы в dev-режиме не плодить подключения при hot-reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// На Netlify строка подключения к Postgres приходит в NETLIFY_DATABASE_URL,
// локально — в DATABASE_URL. Берём ту, что доступна.
const datasourceUrl = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
