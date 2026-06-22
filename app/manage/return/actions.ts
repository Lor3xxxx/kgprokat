"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ratingChange, ReturnCondition } from "@/lib/domain";

export interface ReturnState {
  error?: string;
}

export async function returnAction(_prev: ReturnState, formData: FormData): Promise<ReturnState> {
  await requireSession();

  const rentalId = Number(formData.get("rentalId"));
  const condition = String(formData.get("condition") || "OK") as ReturnCondition;
  const noReturn = formData.get("noReturn") === "on";
  const fine = Math.max(0, Number(formData.get("fine")) || 0);

  if (!rentalId) return { error: "Не указана аренда" };

  const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
  if (!rental) return { error: "Аренда не найдена" };
  if (rental.status === "CLOSED" || rental.status === "CANCELLED") {
    return { error: "Эта аренда уже закрыта" };
  }

  const change = ratingChange(condition, noReturn);
  const depositReturned = Math.max(0, rental.deposit - fine);

  // Новый статус экземпляра: невозврат → списано, повреждение → на обслуживании, иначе свободно
  const unitStatus = noReturn ? "RETIRED" : condition === "DAMAGE" ? "SERVICE" : "FREE";

  try {
    await prisma.$transaction([
      prisma.rental.update({
        where: { id: rentalId },
        data: {
          status: "CLOSED",
          returnedAt: new Date(),
          conditionOnReturn: condition,
          fine,
          depositReturned,
        },
      }),
      prisma.unit.update({ where: { id: rental.unitId }, data: { status: unitStatus } }),
      prisma.client.update({
        where: { id: rental.clientId },
        data: {
          score: { increment: change.delta },
          ...(change.blacklist ? { blacklisted: true } : {}),
        },
      }),
    ]);
  } catch {
    return { error: "Не удалось оформить возврат" };
  }

  redirect(`/manage/clients/${rental.clientId}`);
}
